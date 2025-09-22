-- ================================
-- MIGRATION 6: Simplification des plans - Tous les plans ont les mêmes fonctionnalités
-- ================================

-- 1. Mettre à jour tous les plans pour avoir les mêmes fonctionnalités
-- Seules les limites d'employés et de modèles diffèrent

-- Plan Starter : 3 employés max, 5 modèles max
UPDATE public.subscription_plan
SET features = '{
  "shifts": true, 
  "basic_reporting": true, 
  "advanced_reporting": true, 
  "instagram_basic": true, 
  "instagram_full": true, 
  "competition": true, 
  "priority_support": true, 
  "all_features": true
}',
    max_employees = 17
WHERE name = 'Starter';

-- Plan Advanced : 10 employés max, 15 modèles max  
UPDATE public.subscription_plan
SET features = '{
  "shifts": true, 
  "basic_reporting": true, 
  "advanced_reporting": true, 
  "instagram_basic": true, 
  "instagram_full": true, 
  "competition": true, 
  "priority_support": true, 
  "all_features": true
}',
    max_employees = 35
WHERE name = 'Advanced';

-- Plan Professional : 25 employés max, 50 modèles max
UPDATE public.subscription_plan
SET features = '{
  "shifts": true, 
  "basic_reporting": true, 
  "advanced_reporting": true, 
  "instagram_basic": true, 
  "instagram_full": true, 
  "competition": true, 
  "priority_support": true, 
  "all_features": true
}',
    max_employees = 70
WHERE name = 'Professional';

-- Plan Lifetime : employés illimités, modèles illimités
UPDATE public.subscription_plan
SET features = '{
  "shifts": true, 
  "basic_reporting": true, 
  "advanced_reporting": true, 
  "instagram_basic": true, 
  "instagram_full": true, 
  "competition": true, 
  "priority_support": true, 
  "all_features": true,
  "unlimited_employees": true,
  "unlimited_models": true,
  "lifetime": true
}',
    max_employees = null
WHERE name = 'Lifetime';

-- 2. Ajouter une colonne pour les limites de modèles par plan
ALTER TABLE public.subscription_plan 
ADD COLUMN IF NOT EXISTS max_models int DEFAULT 10;

-- 3. Définir les limites de modèles pour chaque plan
UPDATE public.subscription_plan SET max_models = 4 WHERE name = 'Starter';
UPDATE public.subscription_plan SET max_models = 7 WHERE name = 'Advanced';
UPDATE public.subscription_plan SET max_models = 50 WHERE name = 'Professional';
UPDATE public.subscription_plan SET max_models = null WHERE name = 'Lifetime'; -- null = illimité

-- 4. Mettre à jour la fonction pour les limites de modèles
CREATE OR REPLACE FUNCTION public.get_model_limit(p_tenant_id uuid)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT CASE 
    WHEN public.is_lifetime_tenant(p_tenant_id) THEN -1 -- -1 = illimité
    ELSE COALESCE(
      (SELECT sp.max_models 
       FROM public.subscription s
       JOIN public.subscription_plan sp ON s.plan_id = sp.id
       WHERE s.tenant_id = p_tenant_id 
       AND s.status = 'active'
       LIMIT 1), 10
    )
  END;
$$;
