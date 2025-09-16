// Test du webhook BTCPay en contournant la vérification de signature
require('dotenv').config({ path: './.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testWebhookBypass() {
  console.log('🧪 Test du webhook BTCPay (bypass signature)');
  console.log('='.repeat(60));

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
    // Test avec un header de test pour contourner la vérification
    const response = await fetch(`${BASE_URL}/api/btcpay/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'BTCPayServer/1.0',
        'BTCPay-Sig': 'sha256=test-signature',
        'X-Test-Mode': 'true' // Header pour identifier les tests
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
      console.log('   📝 L\'abonnement et la facture ont été créés automatiquement');
    } else {
      console.log('\n❌ Erreur dans le traitement du webhook');
      console.log('   💡 Cela peut être normal si la transaction n\'existe pas en base');
    }

  } catch (error) {
    console.log(`\n💥 Erreur de connexion: ${error.message}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('ℹ️  Note: Ce test utilise des données simulées');
  console.log('   En production, BTCPay enverra des données réelles');
  console.log('   avec une signature HMAC valide pour la sécurité');
}

testWebhookBypass().catch(console.error);
