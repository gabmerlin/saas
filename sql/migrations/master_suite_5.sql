-- ================================
-- MIGRATION 5: Remplacement On-Demand par Lifetime
-- ================================

-- 1. Supprimer l'ancien plan On-Demand
DELETE FROM public.subscription_plan WHERE name = 'On-Demand';

-- 2. Ajouter le nouveau plan Lifetime
INSERT INTO public.subscription_plan (name, description, price_usd, max_agencies, max_employees, features) VALUES
  ('Lifetime', 'Accès à vie avec fonctionnalités illimitées', 1199.00, 1, null, '{
    "shifts": true, 
    "advanced_reporting": true, 
    "instagram_full": true, 
    "competition": true, 
    "lifetime": true,
    "unlimited_employees": true,
    "unlimited_models": true,
    "unlimited_agencies": true,
    "priority_support": true,
    "all_features": true
  }');

-- 3. Mettre à jour les abonnements existants On-Demand vers Lifetime
UPDATE public.subscription 
SET plan_id = (
  SELECT id FROM public.subscription_plan WHERE name = 'Lifetime'
)
WHERE plan_id = (
  SELECT id FROM public.subscription_plan WHERE name = 'On-Demand'
);

-- 4. Ajouter une colonne pour identifier les abonnements lifetime
ALTER TABLE public.subscription 
ADD COLUMN IF NOT EXISTS is_lifetime boolean DEFAULT false;

-- 5. Marquer les abonnements lifetime
UPDATE public.subscription 
SET is_lifetime = true
WHERE plan_id = (
  SELECT id FROM public.subscription_plan WHERE name = 'Lifetime'
);

-- 6. Mettre à jour les périodes pour les abonnements lifetime (pas d'expiration)
UPDATE public.subscription 
SET current_period_end = '2099-12-31 23:59:59+00'::timestamptz
WHERE is_lifetime = true;

-- 7. Créer un index pour les abonnements lifetime
CREATE INDEX IF NOT EXISTS idx_subscription_lifetime ON public.subscription(is_lifetime);

-- 8. Ajouter une fonction pour vérifier si un tenant a un abonnement lifetime
CREATE OR REPLACE FUNCTION public.is_lifetime_tenant(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.subscription s
    JOIN public.subscription_plan sp ON s.plan_id = sp.id
    WHERE s.tenant_id = p_tenant_id 
    AND s.status = 'active'
    AND (s.is_lifetime = true OR sp.name = 'Lifetime')
  );
$$;

-- 9. Ajouter une fonction pour vérifier les limites d'employés (illimitées pour lifetime)
CREATE OR REPLACE FUNCTION public.get_employee_limit(p_tenant_id uuid)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT CASE 
    WHEN public.is_lifetime_tenant(p_tenant_id) THEN -1 -- -1 = illimité
    ELSE COALESCE(
      (SELECT sp.max_employees 
       FROM public.subscription s
       JOIN public.subscription_plan sp ON s.plan_id = sp.id
       WHERE s.tenant_id = p_tenant_id 
       AND s.status = 'active'
       LIMIT 1), 0
    )
  END;
$$;

-- 10. Ajouter une fonction pour vérifier les limites de modèles (illimitées pour lifetime)
CREATE OR REPLACE FUNCTION public.get_model_limit(p_tenant_id uuid)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT CASE 
    WHEN public.is_lifetime_tenant(p_tenant_id) THEN -1 -- -1 = illimité
    ELSE 10 -- Limite par défaut pour les autres plans
  END;
$$;
