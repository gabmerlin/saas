import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const CreateInvoiceSchema = z.object({
  planId: z.string().uuid(),
  planName: z.string().min(1),
  amount: z.number().positive(),
  currency: z.enum(["BTC", "USDT", "USDC"]),
  tenantId: z.string().uuid(),
  instagramAddon: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planId, planName, amount, currency, tenantId, instagramAddon } = CreateInvoiceSchema.parse(body);

    // Vérifier l'authentification via les headers
    const authHeader = request.headers.get("authorization");
    const sessionToken = request.headers.get("x-session-token");
    
    if (!authHeader && !sessionToken) {
      return NextResponse.json(
        { error: "Token d'authentification manquant" },
        { status: 401 }
      );
    }

    // Créer le client Supabase avec service role pour vérifier le token
    const supabase = createClient({ serviceRole: true });
    
    // Vérifier le token JWT
    const token = authHeader?.replace("Bearer ", "") || sessionToken || "";
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: "Non authentifié", details: authError?.message },
        { status: 401 }
      );
    }

    // Récupérer les informations du plan
    const { data: plan, error: planError } = await supabase
      .from("subscription_plan")
      .select("*")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: "Plan non trouvé" },
        { status: 404 }
      );
    }

    // Configuration BTCPay
    const btcpayUrl = process.env.BTCPAY_URL || "https://pay.qgchatting.com";
    const storeId = process.env.BTCPAY_STORE_ID;
    const apiKey = process.env.BTCPAY_API_KEY;

    if (!btcpayUrl || !storeId || !apiKey) {
      return NextResponse.json(
        { error: "Configuration BTCPay manquante" },
        { status: 500 }
      );
    }

    // Créer l'invoice BTCPay
    const orderId = `plan_${planId}_${Date.now()}`;
    const invoiceData = {
      amount: amount, // Montant en USD
      currency: "USD", // Toujours USD pour BTCPay, il fera la conversion
      metadata: {
        orderId: orderId,
        buyerEmail: user.email,
        itemCode: planId,
        itemDesc: planName,
        requestedCurrency: currency, // Devise crypto demandée par l'utilisateur
      },
      checkout: {
        // Utiliser une URL vide ou une URL qui ne fait rien au lieu de null
        redirectURL: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/owner`,
        notificationURL: `${process.env.NEXT_PUBLIC_APP_URL}/api/btcpay/webhook`,
      },
    };

    const btcpayResponse = await fetch(`${btcpayUrl}/api/v1/stores/${storeId}/invoices`, {
      method: "POST",
      headers: {
        "Authorization": `token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invoiceData),
    });

    if (!btcpayResponse.ok) {
      const errorText = await btcpayResponse.text();
      return NextResponse.json(
        { error: `Erreur BTCPay (${btcpayResponse.status}): ${errorText}` },
        { status: 500 }
      );
    }

    const btcpayInvoice = await btcpayResponse.json();


    // Vérifier que le tenant existe et que l'utilisateur y a accès
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

    // Enregistrer la transaction en base
    const transactionData = {
      tenant_id: tenantId,
      btcpay_invoice_id: btcpayInvoice.id,
      amount_usd: amount, // Montant en USD (essentiel)
      currency: currency, // Devise crypto demandée par l'utilisateur
      status: "pending",
      payment_method: currency,
      plan_id: planId,
      // Les colonnes crypto restent vides (pas critique)
      amount_btc: null,
      amount_usdt: null,
      amount_usdc: null,
    };

    const { data: transaction, error: transactionError } = await supabase
      .from("transaction")
      .insert(transactionData)
      .select()
      .single();

    if (transactionError) {
      return NextResponse.json(
        { error: `Erreur lors de l'enregistrement de la transaction: ${transactionError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      invoiceId: btcpayInvoice.id,
      paymentUrl: btcpayInvoice.checkoutLink,
      transactionId: transaction.id,
    });

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