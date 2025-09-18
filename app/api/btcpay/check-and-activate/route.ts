import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const CheckAndActivateSchema = z.object({
  tenantId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId } = CheckAndActivateSchema.parse(body);

    // Vérifier l'authentification
    const authHeader = request.headers.get("authorization");
    const sessionToken = request.headers.get("x-session-token");
    
    if (!authHeader && !sessionToken) {
      return NextResponse.json(
        { error: "Token d'authentification manquant" },
        { status: 401 }
      );
    }

    const supabase = createClient({ serviceRole: true });
    const token = authHeader?.replace("Bearer ", "") || sessionToken || "";
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur a accès à ce tenant
    const { data: userTenant, error: userTenantError } = await supabase
      .from("user_tenants")
      .select("tenant_id")
      .eq("user_id", user.id)
      .eq("tenant_id", tenantId)
      .eq("is_owner", true)
      .single();

    if (userTenantError || !userTenant) {
      return NextResponse.json(
        { error: "Accès au tenant non autorisé" },
        { status: 403 }
      );
    }

    // Récupérer les informations de l'agence
    const { data: agency, error: agencyError } = await supabase
      .from("tenants")
      .select("id, name, subdomain")
      .eq("id", tenantId)
      .single();

    if (agencyError || !agency) {
      return NextResponse.json(
        { error: "Agence non trouvée" },
        { status: 404 }
      );
    }

    // Vérifier s'il y a déjà une facture payée
    const { data: paidInvoice, error: invoiceError } = await supabase
      .from('invoice')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'paid')
      .order('paid_at', { ascending: false })
      .limit(1)
      .single();

    if (invoiceError && invoiceError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Erreur lors de la vérification des factures' },
        { status: 500 }
      );
    }

    // Si pas de facture payée, vérifier avec BTCPay
    if (!paidInvoice) {
      // Récupérer la dernière transaction en attente
      const { data: pendingTransaction, error: transactionError } = await supabase
        .from('transaction')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (transactionError || !pendingTransaction) {
        return NextResponse.json(
          { error: 'Aucune transaction en attente trouvée' },
          { status: 404 }
        );
      }

      // Vérifier le statut avec BTCPay
      const btcpayUrl = process.env.BTCPAY_URL || "https://pay.qgchatting.com";
      const storeId = process.env.BTCPAY_STORE_ID;
      const apiKey = process.env.BTCPAY_API_KEY;

      if (!btcpayUrl || !storeId || !apiKey) {
        return NextResponse.json(
          { error: "Configuration BTCPay manquante" },
          { status: 500 }
        );
      }

      const btcpayResponse = await fetch(`${btcpayUrl}/api/v1/stores/${storeId}/invoices/${pendingTransaction.btcpay_invoice_id}`, {
        method: "GET",
        headers: {
          "Authorization": `token ${apiKey}`,
        },
      });

      if (!btcpayResponse.ok) {
        return NextResponse.json(
          { error: "Erreur lors de la vérification BTCPay" },
          { status: 500 }
        );
      }

      const btcpayInvoice = await btcpayResponse.json();

      if (btcpayInvoice.status === "Settled") {
        // Mettre à jour la transaction
        const { error: updateError } = await supabase
          .from('transaction')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString()
          })
          .eq('id', pendingTransaction.id);

        if (updateError) {
          return NextResponse.json(
            { error: 'Erreur lors de la mise à jour de la transaction' },
            { status: 500 }
          );
        }

        // Créer la facture payée
        const invoiceNumber = `INV-${Date.now()}-${tenantId.slice(-8)}`;
        const { error: invoiceCreateError } = await supabase
          .from('invoice')
          .insert({
            tenant_id: tenantId,
            invoice_number: invoiceNumber,
            amount_usd: pendingTransaction.amount_usd,
            tax_amount_usd: 0,
            total_amount_usd: pendingTransaction.amount_usd,
            status: 'paid',
            due_date: new Date().toISOString().split('T')[0],
            paid_at: new Date().toISOString(),
          });

        if (invoiceCreateError) {
          console.error("Erreur lors de la création de la facture:", invoiceCreateError);
        }

        return NextResponse.json({
          ok: true,
          message: 'Paiement confirmé et agence activée',
          agency: {
            id: agency.id,
            name: agency.name,
            subdomain: agency.subdomain
          }
        });
      } else {
        return NextResponse.json(
          { error: 'Paiement non confirmé par BTCPay' },
          { status: 400 }
        );
      }
    } else {
      // Il y a déjà une facture payée, l'agence est accessible
      return NextResponse.json({
        ok: true,
        message: 'Facture payée trouvée - Agence accessible',
        agency: {
          id: agency.id,
          name: agency.name,
          subdomain: agency.subdomain
        }
      });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Données invalides", details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
