#!/usr/bin/env node

/**
 * Script de test pour le système d'abonnement
 * Usage: node scripts/test-subscription-system.js
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSubscriptionSystem() {
  console.log('🧪 Test du système d\'abonnement...\n');

  try {
    // 1. Tester les fonctions SQL
    console.log('1. Test des fonctions SQL...');
    
    const { data: testTenant } = await supabase
      .from('tenants')
      .select('id')
      .limit(1)
      .single();

    if (testTenant) {
      // Test is_subscription_active
      const { data: isActive } = await supabase
        .rpc('is_subscription_active', { p_tenant_id: testTenant.id });
      console.log(`   ✅ is_subscription_active: ${isActive}`);

      // Test is_subscription_expiring_soon
      const { data: isExpiringSoon } = await supabase
        .rpc('is_subscription_expiring_soon', { p_tenant_id: testTenant.id });
      console.log(`   ✅ is_subscription_expiring_soon: ${isExpiringSoon}`);

      // Test is_subscription_expired
      const { data: isExpired } = await supabase
        .rpc('is_subscription_expired', { p_tenant_id: testTenant.id });
      console.log(`   ✅ is_subscription_expired: ${isExpired}`);

      // Test get_subscription_details
      const { data: details } = await supabase
        .rpc('get_subscription_details', { p_tenant_id: testTenant.id });
      console.log(`   ✅ get_subscription_details:`, details);
    }

    // 2. Tester les abonnements expirés
    console.log('\n2. Test des abonnements expirés...');
    
    const { data: expiredSubscriptions } = await supabase
      .from('subscription')
      .select(`
        id,
        tenant_id,
        status,
        current_period_end,
        tenants!inner(
          id,
          name,
          subdomain
        )
      `)
      .eq('status', 'active')
      .lt('current_period_end', new Date().toISOString());

    console.log(`   📊 Abonnements expirés trouvés: ${expiredSubscriptions?.length || 0}`);

    // 3. Tester les abonnements expirant bientôt
    console.log('\n3. Test des abonnements expirant bientôt...');
    
    const threeDaysFromNow = new Date(Date.now() + (3 * 24 * 60 * 60 * 1000));
    
    const { data: expiringSubscriptions } = await supabase
      .from('subscription')
      .select(`
        id,
        tenant_id,
        status,
        current_period_end,
        tenants!inner(
          id,
          name,
          subdomain
        )
      `)
      .eq('status', 'active')
      .gte('current_period_end', new Date().toISOString())
      .lte('current_period_end', threeDaysFromNow.toISOString());

    console.log(`   📊 Abonnements expirant bientôt: ${expiringSubscriptions?.length || 0}`);

    // 4. Tester les plans d'abonnement
    console.log('\n4. Test des plans d\'abonnement...');
    
    const { data: plans } = await supabase
      .from('subscription_plan')
      .select('*')
      .eq('is_active', true);

    console.log(`   📊 Plans actifs: ${plans?.length || 0}`);
    plans?.forEach(plan => {
      console.log(`      - ${plan.name}: $${plan.price_usd}`);
    });

    // 5. Tester les notifications
    console.log('\n5. Test des notifications...');
    
    const { data: notifications } = await supabase
      .from('notification')
      .select('*')
      .eq('type', 'subscription_expiring')
      .order('created_at', { ascending: false })
      .limit(5);

    console.log(`   📊 Notifications d'expiration récentes: ${notifications?.length || 0}`);

    console.log('\n✅ Tests terminés avec succès!');
    
  } catch (error) {
    console.error('❌ Erreur lors des tests:', error);
    process.exit(1);
  }
}

// Exécuter les tests
testSubscriptionSystem();
