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
    let plan;
    const { data: planData, error: planError } = await supabase
      .from("subscription_plan")
      .select("*")
      .eq("id", transaction.plan_id || "default-plan-id")
      .single();

    if (planError || !planData) {
      // Fallback vers le plan Starter si pas de plan spécifique
      const { data: defaultPlan, error: defaultPlanError } = await supabase
        .from("subscription_plan")
        .select("*")
        .eq("name", "Starter")
        .single();
      
      if (defaultPlanError || !defaultPlan) {
        return NextResponse.json(
          { error: "Plan non trouvé" },
          { status: 404 }
        );
      }
      plan = defaultPlan;
    } else {
      plan = planData;
    }

    // Créer l'abonnement
    const now = new Date();
    const periodStart = now;
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 jours

    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscription")
      .insert({
        tenant_id: transaction.tenant_id,
        plan_id: plan.id,
        status: "active",
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        price_locked_usd: transaction.amount_usd,
      })
      .select()
      .single();

    if (subscriptionError) {
      console.error("Erreur création abonnement:", subscriptionError);
      return NextResponse.json(
        { error: "Erreur lors de la création de l'abonnement" },
        { status: 500 }
      );
    }

    // Créer la facture
    const invoiceNumber = `INV-${Date.now()}-${transaction.tenant_id.slice(-8)}`;
    const { error: invoiceError } = await supabase
      .from("invoice")
      .insert({
        tenant_id: transaction.tenant_id,
        subscription_id: subscription.id,
        invoice_number: invoiceNumber,
        amount_usd: transaction.amount_usd,
        tax_amount_usd: 0,
        total_amount_usd: transaction.amount_usd,
        status: "paid",
        due_date: now.toISOString().split('T')[0],
        paid_at: now.toISOString(),
      });

    if (invoiceError) {
      console.error("Erreur création facture:", invoiceError);
      // Ne pas faire échouer le webhook pour une erreur de facture
    }

    return NextResponse.json({ received: true });

  } catch {
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
