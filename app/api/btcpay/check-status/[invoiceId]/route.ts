import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const { invoiceId } = await params;

    if (!invoiceId) {
      return NextResponse.json(
        { error: "ID de facture manquant" },
        { status: 400 }
      );
    }

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

    // Récupérer la transaction depuis la base
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

    const btcpayResponse = await fetch(`${btcpayUrl}/api/v1/stores/${storeId}/invoices/${invoiceId}`, {
      method: "GET",
      headers: {
        "Authorization": `token ${apiKey}`,
      },
    });

    if (!btcpayResponse.ok) {
      return NextResponse.json(
        { error: "Erreur lors de la vérification du statut" },
        { status: 500 }
      );
    }

    const btcpayInvoice = await btcpayResponse.json();

    // Mapper les statuts BTCPay vers nos statuts
    let status = "pending";
    if (btcpayInvoice.status === "Settled") {
      status = "paid";
    } else if (btcpayInvoice.status === "Expired") {
      status = "expired";
    } else if (btcpayInvoice.status === "Invalid") {
      status = "cancelled";
    }

    // Mettre à jour la transaction si le statut a changé
    if (status !== transaction.status) {
      const updateData: {
        status: string;
        paid_at?: string;
        amount_btc?: number;
        amount_usdt?: number;
        amount_usdc?: number;
      } = { status };
      
      if (status === "paid") {
        updateData.paid_at = new Date().toISOString();
        if (btcpayInvoice.btcPaid) {
          updateData.amount_btc = parseFloat(btcpayInvoice.btcPaid);
        }
        if (btcpayInvoice.amount) {
          updateData.amount_usdt = parseFloat(btcpayInvoice.amount);
          updateData.amount_usdc = parseFloat(btcpayInvoice.amount);
        }
      }

      await supabase
        .from("transaction")
        .update(updateData)
        .eq("id", transaction.id);
    }

    return NextResponse.json({
      status,
      transactionId: transaction.id,
      amount: transaction.amount_usd,
      currency: transaction.currency,
      paidAt: transaction.paid_at,
    });

  } catch {
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    );
  }
}
