// lib/subscription.ts
import { getServiceClient } from './tenants';

export interface CreateSubscriptionParams {
  tenantId: string;
  planKey: 'starter' | 'advanced' | 'professional' | 'lifetime';
  priceUsd: number;
}

export async function createSubscription(params: CreateSubscriptionParams) {
  const dbClient = getServiceClient();
  
  // Récupérer le plan d'abonnement
  const { data: plan, error: planError } = await dbClient
    .from('subscription_plan')
    .select('id, name, price_usd')
    .eq('name', params.planKey === 'lifetime' ? 'Lifetime' : 
                params.planKey === 'starter' ? 'Starter' :
                params.planKey === 'advanced' ? 'Advanced' : 'Professional')
    .single();
    
  if (planError || !plan) {
    throw new Error(`Plan not found: ${params.planKey}`);
  }

  const now = new Date();
  const isLifetime = params.planKey === 'lifetime';
  
  // Pour le plan Lifetime, la période se termine en 2099
  const periodEnd = isLifetime 
    ? new Date('2099-12-31 23:59:59+00')
    : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 jours pour les autres plans

  // Créer l'abonnement
  const { data: subscription, error: subError } = await dbClient
    .from('subscription')
    .insert({
      tenant_id: params.tenantId,
      plan_id: plan.id,
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      price_locked_usd: params.priceUsd,
      is_lifetime: isLifetime
    })
    .select()
    .single();

  if (subError) {
    throw new Error(`Failed to create subscription: ${subError.message}`);
  }

  return subscription;
}

export async function getSubscriptionDetails(tenantId: string) {
  const dbClient = getServiceClient();
  
  const { data, error } = await dbClient
    .rpc('get_subscription_details', { p_tenant_id: tenantId })
    .single();

  if (error) {
    throw new Error(`Failed to get subscription details: ${error.message}`);
  }

  return data;
}

export async function isLifetimeTenant(tenantId: string): Promise<boolean> {
  const dbClient = getServiceClient();
  
  const { data, error } = await dbClient
    .rpc('is_lifetime_tenant', { p_tenant_id: tenantId })
    .single();

  if (error) {
    console.error('Error checking lifetime status:', error);
    return false;
  }

  return data === true;
}

export async function getEmployeeLimit(tenantId: string): Promise<number> {
  const dbClient = getServiceClient();
  
  const { data, error } = await dbClient
    .rpc('get_employee_limit', { p_tenant_id: tenantId })
    .single();

  if (error) {
    console.error('Error getting employee limit:', error);
    return 0;
  }

  return typeof data === 'number' ? data : 0;
}

export async function getModelLimit(tenantId: string): Promise<number> {
  const dbClient = getServiceClient();
  
  const { data, error } = await dbClient
    .rpc('get_model_limit', { p_tenant_id: tenantId })
    .single();

  if (error) {
    console.error('Error getting model limit:', error);
    return 0;
  }

  return typeof data === 'number' ? data : 0;
}
