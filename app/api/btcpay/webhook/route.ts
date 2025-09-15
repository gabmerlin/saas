import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("btcpay-sig");

    // Vérifier la signature BTCPay
    const webhookSecret = process.env.BTCPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json(
        { error: "Configuration manquante" },
        { status: 500 }
      );
    }

    if (signature) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(body)
        .digest("hex");
      
      if (signature !== `sha256=${expectedSignature}`) {
        return NextResponse.json(
          { error: "Signature invalide" },
          { status: 401 }
        );
      }
    }

    const event = JSON.parse(body);

    // Traiter seulement les événements de paiement
    if (event.type !== "InvoiceSettled") {
      return NextResponse.json({ received: true });
    }

    const invoiceId = event.invoiceId;
    if (!invoiceId) {
      return NextResponse.json(
        { error: "ID de facture manquant" },
        { status: 400 }
      );
    }

    const supabase = createClient({ serviceRole: true });

    // Récupérer la transaction
    const { data: transaction, error: transactionError } = await supabase
      .from("transaction")
      .select("*")
      .eq("btcpay_invoice_id", invoiceId)
      .single();

    if (transactionError || !transaction) {
      return NextResponse.json(
        { error: "Transaction non trouvée" },
        { status: 404 }
      );
    }

    // Mettre à jour le statut de la transaction
    const { error: updateError } = await supabase
      .from("transaction")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", transaction.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour" },
        { status: 500 }
      );
    }

    // Récupérer les informations du plan depuis les métadonnées de la transaction
    // Pour l'instant, on utilise un plan par défaut (Starter)
    const { data: plan, error: planError } = await supabase
      .from("subscription_plan")
      .select("*")
      .eq("name", "Starter")
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { error: "Plan non trouvé" },
        { status: 404 }
      );
    }

    // Pour l'instant, on se contente de marquer la transaction comme payée
    // L'abonnement sera créé lors de la redirection vers le dashboard
    
    // TODO: Implémenter la création automatique de l'abonnement
    // Cela nécessitera de stocker le tenant_id dans la transaction
    // ou de récupérer l'utilisateur et son tenant associé

    return NextResponse.json({ received: true });

  } catch {
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
