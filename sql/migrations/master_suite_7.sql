-- ================================
-- MIGRATION 7: Nettoyage des doublons et incohérences
-- ================================

-- 1. MIGRATION DES DONNÉES DES COLONNES JSONB VERS LES TABLES DÉDIÉES
-- ================================

-- 1.1 Migration des données payroll
DO $$
BEGIN
    -- Migrer les données de agency_settings.payroll vers payroll_policy
    INSERT INTO public.payroll_policy (tenant_id, hourly_enabled, hourly_usd, revenue_share_percent)
    SELECT 
        as_table.tenant_id,
        COALESCE((as_table.payroll->>'hourly_enabled')::boolean, false) as hourly_enabled,
        COALESCE((as_table.payroll->>'hourly_usd')::numeric(10,2), null) as hourly_usd,
        COALESCE((as_table.payroll->>'revenue_share_percent')::numeric(5,2), 0) as revenue_share_percent
    FROM public.agency_settings as_table
    WHERE as_table.payroll IS NOT NULL 
    AND as_table.payroll != '{}'::jsonb
    AND NOT EXISTS (
        SELECT 1 FROM public.payroll_policy pp 
        WHERE pp.tenant_id = as_table.tenant_id
    );
    
    RAISE NOTICE 'Migration payroll terminée';
END $$;

-- 1.2 Migration des données strike
DO $$
BEGIN
    -- Migrer les données de agency_settings.strike vers strike_policy
    INSERT INTO public.strike_policy (tenant_id, grace_minutes, late_fee_usd, absence_fee_usd, pool_top_count)
    SELECT 
        as_table.tenant_id,
        COALESCE((as_table.strike->>'grace_minutes')::int, 0) as grace_minutes,
        COALESCE((as_table.strike->>'late_fee_usd')::numeric(10,2), 5.00) as late_fee_usd,
        COALESCE((as_table.strike->>'absence_fee_usd')::numeric(10,2), 10.00) as absence_fee_usd,
        COALESCE((as_table.strike->>'pool_top_count')::int, 5) as pool_top_count
    FROM public.agency_settings as_table
    WHERE as_table.strike IS NOT NULL 
    AND as_table.strike != '{}'::jsonb
    AND NOT EXISTS (
        SELECT 1 FROM public.strike_policy sp 
        WHERE sp.tenant_id = as_table.tenant_id
    );
    
    RAISE NOTICE 'Migration strike terminée';
END $$;

-- 1.3 Migration des données telegram
DO $$
BEGIN
    -- Migrer les données de agency_settings.telegram vers telegram_settings
    INSERT INTO public.telegram_settings (tenant_id, channel_id, daily_digest)
    SELECT 
        as_table.tenant_id,
        as_table.telegram->>'channel_id' as channel_id,
        COALESCE((as_table.telegram->>'daily_digest')::boolean, true) as daily_digest
    FROM public.agency_settings as_table
    WHERE as_table.telegram IS NOT NULL 
    AND as_table.telegram != '{}'::jsonb
    AND NOT EXISTS (
        SELECT 1 FROM public.telegram_settings ts 
        WHERE ts.tenant_id = as_table.tenant_id
    );
    
    RAISE NOTICE 'Migration telegram terminée';
END $$;

-- 1.4 Migration des données competition
DO $$
BEGIN
    -- Migrer les données de agency_settings.competition vers competition_settings
    INSERT INTO public.competition_settings (tenant_id, opt_in, alias)
    SELECT 
        as_table.tenant_id,
        COALESCE((as_table.competition->>'opt_in')::boolean, false) as opt_in,
        as_table.competition->>'alias' as alias
    FROM public.agency_settings as_table
    WHERE as_table.competition IS NOT NULL 
    AND as_table.competition != '{}'::jsonb
    AND NOT EXISTS (
        SELECT 1 FROM public.competition_settings cs 
        WHERE cs.tenant_id = as_table.tenant_id
    );
    
    RAISE NOTICE 'Migration competition terminée';
END $$;

-- 1.5 Migration des données Instagram
DO $$
BEGIN
    -- Migrer les données de agency_settings vers instagram_settings
    INSERT INTO public.instagram_settings (tenant_id, enabled)
    SELECT 
        as_table.tenant_id,
        COALESCE(as_table.instagram_enabled, false) as enabled
    FROM public.agency_settings as_table
    WHERE (as_table.instagram_enabled IS NOT NULL OR as_table.instagram_addon IS NOT NULL)
    AND NOT EXISTS (
        SELECT 1 FROM public.instagram_settings ins 
        WHERE ins.tenant_id = as_table.tenant_id
    );
    
    RAISE NOTICE 'Migration Instagram terminée';
END $$;

-- 2. UNIFICATION DE LA GESTION DES THÈMES
-- ================================

-- 2.1 Migrer les thèmes de agency_settings vers tenants
DO $$
BEGIN
    -- Mettre à jour la colonne theme de tenants avec les données de agency_settings
    UPDATE public.tenants 
    SET theme = jsonb_build_object(
        'preset', COALESCE(as_table.theme_preset, 'ocean'),
        'tokens', COALESCE(as_table.theme_tokens, '{}'::jsonb)
    )
    FROM public.agency_settings as_table
    WHERE tenants.id = as_table.tenant_id
    AND (as_table.theme_preset IS NOT NULL OR as_table.theme_tokens IS NOT NULL);
    
    RAISE NOTICE 'Migration thèmes terminée';
END $$;

-- 3. SUPPRESSION DES COLONNES REDONDANTES
-- ================================

-- 3.1 Supprimer les colonnes JSONB redondantes de agency_settings
ALTER TABLE public.agency_settings 
DROP COLUMN IF EXISTS payroll,
DROP COLUMN IF EXISTS strike,
DROP COLUMN IF EXISTS telegram,
DROP COLUMN IF EXISTS competition,
DROP COLUMN IF EXISTS instagram_addon,
DROP COLUMN IF EXISTS instagram_enabled;

-- 3.2 Supprimer les colonnes de thème redondantes de agency_settings
ALTER TABLE public.agency_settings 
DROP COLUMN IF EXISTS theme_preset,
DROP COLUMN IF EXISTS theme_tokens;

-- 4. NETTOYAGE DES DONNÉES ORPHELINES
-- ================================

-- 4.1 Supprimer les enregistrements agency_settings sans tenant_id valide
DELETE FROM public.agency_settings 
WHERE tenant_id NOT IN (SELECT id FROM public.tenants);

-- 4.2 Supprimer les enregistrements des tables dédiées sans tenant_id valide
DELETE FROM public.payroll_policy 
WHERE tenant_id NOT IN (SELECT id FROM public.tenants);

DELETE FROM public.strike_policy 
WHERE tenant_id NOT IN (SELECT id FROM public.tenants);

DELETE FROM public.telegram_settings 
WHERE tenant_id NOT IN (SELECT id FROM public.tenants);

DELETE FROM public.competition_settings 
WHERE tenant_id NOT IN (SELECT id FROM public.tenants);

DELETE FROM public.instagram_settings 
WHERE tenant_id NOT IN (SELECT id FROM public.tenants);

-- 5. AJOUT DE CONTRAINTES DE VALIDATION
-- ================================

-- 5.1 Ajouter des contraintes de validation pour les thèmes
ALTER TABLE public.tenants 
ADD CONSTRAINT check_theme_structure 
CHECK (theme ? 'preset' AND theme ? 'tokens');

-- 5.2 Ajouter des contraintes pour les valeurs par défaut
UPDATE public.tenants 
SET theme = jsonb_build_object('preset', 'ocean', 'tokens', '{}'::jsonb)
WHERE theme IS NULL OR theme = '{}'::jsonb;

-- 6. CRÉATION D'INDEX POUR LES PERFORMANCES
-- ================================

-- 6.1 Index sur les colonnes theme pour les recherches
-- Note: Pour les colonnes text, on utilise un index btree standard, pas GIN
CREATE INDEX IF NOT EXISTS idx_tenants_theme_preset ON public.tenants ((theme->>'preset'));
CREATE INDEX IF NOT EXISTS idx_tenants_theme_tokens ON public.tenants USING gin (theme);

-- 7. FONCTIONS UTILITAIRES POUR LA GESTION DES THÈMES
-- ================================

-- 7.1 Fonction pour obtenir le preset de thème
CREATE OR REPLACE FUNCTION public.get_theme_preset(p_tenant_id uuid)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT t.theme->>'preset'
  FROM public.tenants t
  WHERE t.id = p_tenant_id;
$$;

-- 7.2 Fonction pour obtenir les tokens de thème
CREATE OR REPLACE FUNCTION public.get_theme_tokens(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT t.theme->'tokens'
  FROM public.tenants t
  WHERE t.id = p_tenant_id;
$$;

-- 7.3 Fonction pour mettre à jour le thème
CREATE OR REPLACE FUNCTION public.update_theme(
  p_tenant_id uuid,
  p_preset text DEFAULT NULL,
  p_tokens jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_theme jsonb;
BEGIN
  -- Récupérer le thème actuel
  SELECT theme INTO current_theme
  FROM public.tenants
  WHERE id = p_tenant_id;
  
  -- Mettre à jour le preset si fourni
  IF p_preset IS NOT NULL THEN
    current_theme := jsonb_set(current_theme, '{preset}', to_jsonb(p_preset));
  END IF;
  
  -- Mettre à jour les tokens si fournis
  IF p_tokens IS NOT NULL THEN
    current_theme := jsonb_set(current_theme, '{tokens}', p_tokens);
  END IF;
  
  -- Sauvegarder
  UPDATE public.tenants
  SET theme = current_theme
  WHERE id = p_tenant_id;
END;
$$;

-- 8. PERMISSIONS SUR LES NOUVELLES FONCTIONS
-- ================================

GRANT EXECUTE ON FUNCTION public.get_theme_preset(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_theme_tokens(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_theme(uuid, text, jsonb) TO authenticated;

-- 9. VÉRIFICATION FINALE
-- ================================

-- 9.1 Vérifier qu'il n'y a plus de colonnes redondantes
DO $$
DECLARE
  column_count int;
BEGIN
  SELECT COUNT(*) INTO column_count
  FROM information_schema.columns
  WHERE table_name = 'agency_settings'
  AND table_schema = 'public'
  AND column_name IN ('payroll', 'strike', 'telegram', 'competition', 'instagram_addon', 'instagram_enabled', 'theme_preset', 'theme_tokens');
  
  IF column_count > 0 THEN
    RAISE EXCEPTION 'Il reste % colonnes redondantes dans agency_settings', column_count;
  ELSE
    RAISE NOTICE 'Nettoyage terminé avec succès - Aucune colonne redondante restante';
  END IF;
END $$;

-- 9.2 Statistiques finales
SELECT 
  'agency_settings' as table_name,
  COUNT(*) as record_count
FROM public.agency_settings
UNION ALL
SELECT 
  'payroll_policy' as table_name,
  COUNT(*) as record_count
FROM public.payroll_policy
UNION ALL
SELECT 
  'strike_policy' as table_name,
  COUNT(*) as record_count
FROM public.strike_policy
UNION ALL
SELECT 
  'telegram_settings' as table_name,
  COUNT(*) as record_count
FROM public.telegram_settings
UNION ALL
SELECT 
  'competition_settings' as table_name,
  COUNT(*) as record_count
FROM public.competition_settings
UNION ALL
SELECT 
  'instagram_settings' as table_name,
  COUNT(*) as record_count
FROM public.instagram_settings;

-- ================================
-- FIN DE LA MIGRATION 7
-- ================================
