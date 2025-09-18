-- ================================
-- GESTION DES ABONNEMENTS ET EXPIRATION
-- ================================

-- Fonction pour mettre à jour accepted_at d'une invitation
CREATE OR REPLACE FUNCTION public.update_invitation_accepted_at(
  invitation_id uuid,
  accepted_at timestamp with time zone
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.invitation 
  SET accepted_at = update_invitation_accepted_at.accepted_at
  WHERE id = invitation_id;
$$;

-- 1. Fonction pour vérifier si un abonnement est actif
CREATE OR REPLACE FUNCTION public.is_subscription_active(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscription s
    WHERE s.tenant_id = p_tenant_id
      AND s.status = 'active'
      AND s.current_period_end > now()
  );
$$;

-- 2. Fonction pour vérifier si un abonnement expire bientôt (3 jours)
CREATE OR REPLACE FUNCTION public.is_subscription_expiring_soon(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscription s
    WHERE s.tenant_id = p_tenant_id
      AND s.status = 'active'
      AND s.current_period_end > now()
      AND s.current_period_end <= (now() + interval '3 days')
  );
$$;

-- 3. Fonction pour vérifier si un abonnement est expiré
CREATE OR REPLACE FUNCTION public.is_subscription_expired(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscription s
    WHERE s.tenant_id = p_tenant_id
      AND s.status = 'active'
      AND s.current_period_end <= now()
  );
$$;

-- 4. Fonction pour obtenir les détails de l'abonnement
CREATE OR REPLACE FUNCTION public.get_subscription_details(p_tenant_id uuid)
RETURNS TABLE (
  subscription_id uuid,
  plan_name text,
  status text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  days_remaining int,
  is_active boolean,
  is_expiring_soon boolean,
  is_expired boolean
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    s.id as subscription_id,
    sp.name as plan_name,
    s.status,
    s.current_period_start,
    s.current_period_end,
    GREATEST(0, EXTRACT(EPOCH FROM (s.current_period_end - now())) / 86400)::int as days_remaining,
    (s.status = 'active' AND s.current_period_end > now()) as is_active,
    (s.status = 'active' AND s.current_period_end > now() AND s.current_period_end <= (now() + interval '3 days')) as is_expiring_soon,
    (s.status = 'active' AND s.current_period_end <= now()) as is_expired
  FROM public.subscription s
  JOIN public.subscription_plan sp ON sp.id = s.plan_id
  WHERE s.tenant_id = p_tenant_id
  ORDER BY s.created_at DESC
  LIMIT 1;
$$;

-- 5. Fonction pour créer un nouvel abonnement (renouvellement)
CREATE OR REPLACE FUNCTION public.create_renewal_subscription(
  p_tenant_id uuid,
  p_plan_id uuid,
  p_price_usd numeric(10,2)
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription_id uuid;
  v_current_end timestamptz;
  v_new_start timestamptz;
  v_new_end timestamptz;
BEGIN
  -- Récupérer la fin de l'abonnement actuel
  SELECT current_period_end INTO v_current_end
  FROM public.subscription
  WHERE tenant_id = p_tenant_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Si pas d'abonnement actuel, commencer maintenant
  IF v_current_end IS NULL THEN
    v_new_start := now();
  ELSE
    v_new_start := v_current_end;
  END IF;

  -- Nouvelle fin = début + 31 jours
  v_new_end := v_new_start + interval '31 days';

  -- Créer le nouvel abonnement
  INSERT INTO public.subscription (
    tenant_id,
    plan_id,
    status,
    current_period_start,
    current_period_end,
    price_locked_usd
  ) VALUES (
    p_tenant_id,
    p_plan_id,
    'active',
    v_new_start,
    v_new_end,
    p_price_usd
  ) RETURNING id INTO v_subscription_id;

  RETURN v_subscription_id;
END;
$$;

-- 6. Index pour les performances
CREATE INDEX IF NOT EXISTS idx_subscription_tenant_status ON public.subscription(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_subscription_period_end ON public.subscription(current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscription_active_period ON public.subscription(tenant_id, current_period_end) 
  WHERE status = 'active';

-- 7. Permissions sur les fonctions
GRANT EXECUTE ON FUNCTION public.is_subscription_active(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_subscription_expiring_soon(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_subscription_expired(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_subscription_details(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_renewal_subscription(uuid, uuid, numeric) TO authenticated;
