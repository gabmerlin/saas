// Test simple des endpoints cron
const CRON_SECRET = '79a253ab252fdecdd83b725f94d880532b8dec8ec791b36c0b6951114c88b5cb';
const BASE_URL = 'http://localhost:3000';

async function testEndpoint(name, path) {
  try {
    console.log(`\n🧪 Test de ${name}: ${path}`);
    
    const response = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Succès:', JSON.stringify(data, null, 2));
    } else {
      const text = await response.text();
      console.log('❌ Erreur:', text.substring(0, 200) + '...');
    }
  } catch (error) {
    console.error('💥 Erreur de connexion:', error.message);
  }
}

async function main() {
  console.log('🚀 Test des endpoints cron');
  console.log('Clé utilisée:', CRON_SECRET.substring(0, 20) + '...');
  
  await testEndpoint('Vérification abonnements expirés', '/api/cron/check-expired-subscriptions');
  await testEndpoint('Nettoyage agences non payées', '/api/cron/cleanup-unpaid-agencies');
  
  console.log('\n✨ Tests terminés');
}

main().catch(console.error);
