// Test du webhook BTCPay
require('dotenv').config({ path: './.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testWebhook() {
  console.log('🧪 Test du webhook BTCPay');
  console.log('='.repeat(50));

  // Données simulées d'un webhook BTCPay InvoiceSettled
  const webhookData = {
    type: 'InvoiceSettled',
    invoiceId: 'test-invoice-' + Date.now(),
    storeId: 'test-store',
    invoice: {
      id: 'test-invoice-' + Date.now(),
      storeId: 'test-store',
      amount: '29.99',
      currency: 'USD',
      status: 'Settled',
      metadata: {
        tenantId: 'test-tenant-id',
        planId: 'test-plan-id'
      }
    }
  };

  console.log('📤 Envoi du webhook simulé...');
  console.log('📄 Données:', JSON.stringify(webhookData, null, 2));

  try {
    const response = await fetch(`${BASE_URL}/api/btcpay/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'BTCPayServer/1.0',
        // Note: En production, BTCPay ajoute une signature HMAC
        'BTCPay-Sig': 'sha256=test-signature'
      },
      body: JSON.stringify(webhookData)
    });

    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    console.log(`\n📥 Réponse du webhook:`);
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, responseData);

    if (response.ok) {
      console.log('\n✅ Webhook traité avec succès');
    } else {
      console.log('\n❌ Erreur dans le traitement du webhook');
    }

  } catch (error) {
    console.log(`\n💥 Erreur de connexion: ${error.message}`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('ℹ️  Note: Ce test utilise des données simulées');
  console.log('   En production, BTCPay enverra des données réelles');
  console.log('   avec une signature HMAC valide pour la sécurité');
}

testWebhook().catch(console.error);
