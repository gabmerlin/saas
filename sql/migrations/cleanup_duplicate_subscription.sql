-- Nettoyage des subscriptions en double
-- Ce script supprime les subscriptions créées pendant l'onboarding pour les plans non-lifetime

-- 1. Identifier les subscriptions en double
-- (celles créées pendant l'onboarding ET celles créées par le webhook BTCPay)

-- 2. Supprimer les subscriptions créées pendant l'onboarding pour les plans non-lifetime
-- (garder seulement celles créées par le webhook BTCPay)

DELETE FROM public.subscription 
WHERE id IN (
  -- Sélectionner les subscriptions créées pendant l'onboarding
  -- (celles qui ont un prix_locked_usd mais pas de transaction_id associé)
  SELECT s.id
  FROM public.subscription s
  LEFT JOIN public.transaction t ON t.tenant_id = s.tenant_id 
    AND t.amount_usd = s.price_locked_usd
    AND t.status = 'completed'
  WHERE s.price_locked_usd IN (17.00, 35.00, 75.00) -- Plans non-lifetime
    AND t.id IS NULL -- Pas de transaction associée
    AND s.created_at > NOW() - INTERVAL '7 days' -- Créées récemment
);

-- 3. Vérifier le résultat
SELECT 
  t.name as tenant_name,
  sp.name as plan_name,
  s.price_locked_usd,
  s.status,
  s.created_at,
  CASE 
    WHEN t2.id IS NOT NULL THEN 'Avec transaction BTCPay'
    ELSE 'Sans transaction BTCPay'
  END as source
FROM public.subscription s
JOIN public.tenants t ON t.id = s.tenant_id
JOIN public.subscription_plan sp ON sp.id = s.plan_id
LEFT JOIN public.transaction t2 ON t2.tenant_id = s.tenant_id 
  AND t2.amount_usd = s.price_locked_usd
  AND t2.status = 'completed'
ORDER BY s.created_at DESC;
