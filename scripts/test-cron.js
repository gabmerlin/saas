#!/usr/bin/env node

/**
 * Script de test pour les tâches cron
 * Usage: node scripts/test-cron.js [check-expired|cleanup-unpaid]
 */

const CRON_SECRET = process.env.CRON_SECRET || 'test-secret';
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function testCron(endpoint) {
  try {
    console.log(`🧪 Test de l'endpoint: ${endpoint}`);
    
    const response = await fetch(`${BASE_URL}/api/cron/${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const text = await response.text();
      console.log('❌ Erreur HTTP:', response.status, text);
      return;
    }

    const data = await response.json();
    console.log('✅ Succès:', data);
    
  } catch (error) {
    console.error('💥 Erreur de connexion:', error.message);
  }
}

async function main() {
  const endpoint = process.argv[2];
  
  if (!endpoint) {
    console.log('Usage: node scripts/test-cron.js [check-expired|cleanup-unpaid]');
    console.log('');
    console.log('Endpoints disponibles:');
    console.log('  check-expired    - Vérifier les abonnements expirés');
    console.log('  cleanup-unpaid   - Nettoyer les agences non payées');
    process.exit(1);
  }

  if (!['check-expired', 'cleanup-unpaid'].includes(endpoint)) {
    console.log('❌ Endpoint invalide. Utilisez: check-expired ou cleanup-unpaid');
    process.exit(1);
  }

  await testCron(endpoint);
}

main().catch(console.error);
