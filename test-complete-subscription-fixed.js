// Test complet avec agence valide et agence expirée (corrigé)
require('dotenv').config({ path: './.env.local' });
const { createClient } = require('@supabase/supabase-js');

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Client Supabase avec service role
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createTestData() {
  console.log('🏗️  Création des données de test...');
  
  try {
    // 1. Créer un plan d'abonnement de test
    const { data: plan, error: planError } = await supabase
      .from('subscription_plan')
      .upsert({
        name: 'Test Plan',
        description: 'Plan de test pour les abonnements',
        price_usd: 29.99,
        max_agencies: 1,
        max_employees: 10,
        features: ['feature1', 'feature2'],
        is_active: true
      })
      .select()
      .single();

    if (planError) {
      console.log('⚠️  Plan existant ou erreur:', planError.message);
    } else {
      console.log('✅ Plan créé:', plan.name, '(ID:', plan.id, ')');
    }

    // 2. Créer une agence valide (récente)
    const { data: validTenant, error: validTenantError } = await supabase
      .from('tenants')
      .upsert({
        name: 'Agence Valide Test',
        subdomain: 'agence-valide',
        locale: 'fr',
        theme: {}
      })
      .select()
      .single();

    if (validTenantError) {
      console.log('⚠️  Agence valide existante ou erreur:', validTenantError.message);
    } else {
      console.log('✅ Agence valide créée:', validTenant.name, '(ID:', validTenant.id, ')');
    }

    // 3. Créer une agence expirée (ancienne - 50 jours)
    const oldDate = new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString();
    const { data: expiredTenant, error: expiredTenantError } = await supabase
      .from('tenants')
      .upsert({
        name: 'Agence Expirée Test',
        subdomain: 'agence-expiree',
        locale: 'fr',
        theme: {},
        created_at: oldDate
      })
      .select()
      .single();

    if (expiredTenantError) {
      console.log('⚠️  Agence expirée existante ou erreur:', expiredTenantError.message);
    } else {
      console.log('✅ Agence expirée créée:', expiredTenant.name, '(ID:', expiredTenant.id, ')');
    }

    // 4. Créer un abonnement actif pour l'agence valide
    const validPeriodStart = new Date().toISOString();
    const validPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: validSub, error: validSubError } = await supabase
      .from('subscription')
      .upsert({
        tenant_id: validTenant.id,
        plan_id: plan.id,
        status: 'active',
        current_period_start: validPeriodStart,
        current_period_end: validPeriodEnd,
        price_locked_usd: 29.99
      })
      .select()
      .single();

    if (validSubError) {
      console.log('⚠️  Abonnement valide existant ou erreur:', validSubError.message);
    } else {
      console.log('✅ Abonnement valide créé:', validSub.status, '(ID:', validSub.id, ')');
    }

    // 5. Créer un abonnement expiré pour l'agence expirée
    const expiredPeriodStart = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString();
    const expiredPeriodEnd = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: expiredSub, error: expiredSubError } = await supabase
      .from('subscription')
      .upsert({
        tenant_id: expiredTenant.id,
        plan_id: plan.id,
        status: 'active', // On va le laisser actif pour tester le cron
        current_period_start: expiredPeriodStart,
        current_period_end: expiredPeriodEnd,
        price_locked_usd: 29.99
      })
      .select()
      .single();

    if (expiredSubError) {
      console.log('⚠️  Abonnement expiré existant ou erreur:', expiredSubError.message);
    } else {
      console.log('✅ Abonnement expiré créé:', expiredSub.status, '(ID:', expiredSub.id, ')');
    }

    // 6. Créer des transactions
    const { data: validTrans, error: validTransError } = await supabase
      .from('transaction')
      .upsert({
        tenant_id: validTenant.id,
        plan_id: plan.id,
        btcpay_invoice_id: 'valid-invoice-123',
        amount_usd: 29.99,
        currency: 'USD',
        status: 'paid',
        payment_method: 'BTC',
        paid_at: new Date().toISOString()
      })
      .select()
      .single();

    if (validTransError) {
      console.log('⚠️  Transaction valide existante ou erreur:', validTransError.message);
    } else {
      console.log('✅ Transaction valide créée:', validTrans.status, '(ID:', validTrans.id, ')');
    }

    console.log('\n🎯 Données de test créées avec succès !');
    return {
      plan,
      validTenant,
      expiredTenant,
      validSub,
      expiredSub,
      validTrans
    };

  } catch (error) {
    console.error('❌ Erreur lors de la création des données:', error);
    throw error;
  }
}

async function testEndpoints() {
  console.log('\n🧪 Test des endpoints...');
  
  const cronSecret = process.env.CRON_SECRET || 'test-secret';
  const cronHeaders = { 'Authorization': `Bearer ${cronSecret}` };

  // Test 1: Vérification des abonnements expirés
  console.log('\n1️⃣ Test: Vérification des abonnements expirés');
  try {
    const response = await fetch(`${BASE_URL}/api/cron/check-expired-subscriptions`, {
      method: 'GET',
      headers: cronHeaders
    });
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));
  } catch (error) {
    console.log(`   ❌ Erreur: ${error.message}`);
  }

  // Test 2: Nettoyage des agences non payées
  console.log('\n2️⃣ Test: Nettoyage des agences non payées');
  try {
    const response = await fetch(`${BASE_URL}/api/cron/cleanup-unpaid-agencies`, {
      method: 'GET',
      headers: cronHeaders
    });
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));
  } catch (error) {
    console.log(`   ❌ Erreur: ${error.message}`);
  }

  // Test 3: Statut de l'agence valide
  console.log('\n3️⃣ Test: Statut de l\'agence valide');
  try {
    const response = await fetch(`${BASE_URL}/api/agency/status?subdomain=agence-valide`, {
      method: 'GET'
    });
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));
  } catch (error) {
    console.log(`   ❌ Erreur: ${error.message}`);
  }

  // Test 4: Statut de l'agence expirée
  console.log('\n4️⃣ Test: Statut de l\'agence expirée');
  try {
    const response = await fetch(`${BASE_URL}/api/agency/status?subdomain=agence-expiree`, {
      method: 'GET'
    });
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(data, null, 2));
  } catch (error) {
    console.log(`   ❌ Erreur: ${error.message}`);
  }
}

async function checkDatabaseState() {
  console.log('\n📊 État de la base de données...');
  
  try {
    // Vérifier les abonnements
    const { data: subscriptions, error: subError } = await supabase
      .from('subscription')
      .select(`
        *,
        tenants!inner(name, subdomain),
        subscription_plan!inner(name)
      `)
      .order('created_at', { ascending: false });

    if (subError) {
      console.log('❌ Erreur récupération abonnements:', subError.message);
    } else {
      console.log('\n📋 Abonnements:');
      subscriptions.forEach(sub => {
        const tenant = Array.isArray(sub.tenants) ? sub.tenants[0] : sub.tenants;
        const plan = Array.isArray(sub.subscription_plan) ? sub.subscription_plan[0] : sub.subscription_plan;
        const daysSinceEnd = Math.floor((Date.now() - new Date(sub.current_period_end).getTime()) / (1000 * 60 * 60 * 24));
        console.log(`   - ${tenant?.name || 'Unknown'} (${tenant?.subdomain || 'Unknown'}): ${sub.status}`);
        console.log(`     Plan: ${plan?.name || 'Unknown'}, Période: ${sub.current_period_start} → ${sub.current_period_end}`);
        console.log(`     Jours depuis fin: ${daysSinceEnd} (${daysSinceEnd > 0 ? 'EXPIRÉ' : 'ACTIF'})`);
      });
    }

    // Vérifier les agences
    const { data: tenants, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });

    if (tenantError) {
      console.log('❌ Erreur récupération agences:', tenantError.message);
    } else {
      console.log('\n🏢 Agences:');
      tenants.forEach(tenant => {
        const daysSinceCreation = Math.floor((Date.now() - new Date(tenant.created_at).getTime()) / (1000 * 60 * 60 * 24));
        console.log(`   - ${tenant.name} (${tenant.subdomain}): ${daysSinceCreation} jours`);
        console.log(`     Créée: ${tenant.created_at}`);
      });
    }

  } catch (error) {
    console.error('❌ Erreur lors de la vérification de la base:', error);
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Nettoyage des données de test...');
  
  try {
    // Supprimer les données de test (dans l'ordre inverse des dépendances)
    await supabase.from('transaction').delete().eq('btcpay_invoice_id', 'valid-invoice-123');
    await supabase.from('subscription').delete().in('tenant_id', (await supabase.from('tenants').select('id').in('subdomain', ['agence-valide', 'agence-expiree'])).data?.map(t => t.id) || []);
    await supabase.from('tenants').delete().in('subdomain', ['agence-valide', 'agence-expiree']);
    await supabase.from('subscription_plan').delete().eq('name', 'Test Plan');
    
    console.log('✅ Données de test supprimées');
  } catch (error) {
    console.log('⚠️  Erreur lors du nettoyage:', error.message);
  }
}

async function runCompleteTest() {
  console.log('🚀 Test Complet du Système d\'Abonnement');
  console.log('='.repeat(60));
  
  try {
    // 1. Créer les données de test
    const testData = await createTestData();
    
    // 2. Vérifier l'état initial
    await checkDatabaseState();
    
    // 3. Tester les endpoints
    await testEndpoints();
    
    // 4. Vérifier l'état final
    console.log('\n📊 État final après les tests...');
    await checkDatabaseState();
    
    // 5. Nettoyage
    await cleanupTestData();
    
    console.log('\n' + '='.repeat(60));
    console.log('✨ Test complet terminé !');
    
  } catch (error) {
    console.error('💥 Erreur lors du test:', error);
  }
}

// Exécuter le test
runCompleteTest().catch(console.error);
