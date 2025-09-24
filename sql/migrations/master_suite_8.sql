-- ================================
-- MIGRATION 8: Nettoyage final et vérification
-- ================================

-- 1. VÉRIFICATION DE L'ÉTAT ACTUEL
-- ================================

-- 1.1 Vérifier les colonnes restantes dans agency_settings
SELECT 
    'Colonnes actuelles dans agency_settings:' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'agency_settings'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 1.2 Vérifier les tables dédiées
SELECT 
    'Tables dédiées existantes:' as info,
    schemaname,
    tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('payroll_policy', 'strike_policy', 'telegram_settings', 'competition_settings', 'instagram_settings')
ORDER BY tablename;

-- 1.3 Compter les enregistrements dans chaque table
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

-- 2. NETTOYAGE FINAL DES DONNÉES ORPHELINES
-- ================================

-- 2.1 Supprimer les enregistrements agency_settings sans tenant_id valide
DELETE FROM public.agency_settings 
WHERE tenant_id NOT IN (SELECT id FROM public.tenants);

-- 2.2 Supprimer les enregistrements des tables dédiées sans tenant_id valide
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

-- 3. CRÉATION DES ENREGISTREMENTS PAR DÉFAUT MANQUANTS
-- ================================

-- 3.1 Créer des enregistrements par défaut pour les tenants sans configuration
INSERT INTO public.payroll_policy (tenant_id, hourly_enabled, hourly_usd, revenue_share_percent)
SELECT 
    t.id as tenant_id,
    false as hourly_enabled,
    null as hourly_usd,
    0 as revenue_share_percent
FROM public.tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM public.payroll_policy pp 
    WHERE pp.tenant_id = t.id
);

INSERT INTO public.strike_policy (tenant_id, grace_minutes, late_fee_usd, absence_fee_usd, pool_top_count)
SELECT 
    t.id as tenant_id,
    0 as grace_minutes,
    5.00 as late_fee_usd,
    10.00 as absence_fee_usd,
    5 as pool_top_count
FROM public.tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM public.strike_policy sp 
    WHERE sp.tenant_id = t.id
);

INSERT INTO public.telegram_settings (tenant_id, channel_id, daily_digest)
SELECT 
    t.id as tenant_id,
    null as channel_id,
    true as daily_digest
FROM public.tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM public.telegram_settings ts 
    WHERE ts.tenant_id = t.id
);

INSERT INTO public.competition_settings (tenant_id, opt_in, alias)
SELECT 
    t.id as tenant_id,
    false as opt_in,
    null as alias
FROM public.tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM public.competition_settings cs 
    WHERE cs.tenant_id = t.id
);

INSERT INTO public.instagram_settings (tenant_id, enabled)
SELECT 
    t.id as tenant_id,
    false as enabled
FROM public.tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM public.instagram_settings ins 
    WHERE ins.tenant_id = t.id
);

-- 4. VÉRIFICATION ET CORRECTION DES THÈMES
-- ================================

-- 4.1 S'assurer que tous les tenants ont un thème valide
UPDATE public.tenants 
SET theme = jsonb_build_object('preset', 'ocean', 'tokens', '{}'::jsonb)
WHERE theme IS NULL OR theme = '{}'::jsonb;

-- 4.2 Vérifier la structure des thèmes
SELECT 
    'Thèmes avec structure invalide:' as info,
    id,
    name,
    theme
FROM public.tenants
WHERE NOT (theme ? 'preset' AND theme ? 'tokens');

-- 5. CRÉATION DES INDEX MANQUANTS
-- ================================

-- 5.1 Index sur les colonnes theme pour les recherches
CREATE INDEX IF NOT EXISTS idx_tenants_theme_preset ON public.tenants ((theme->>'preset'));
CREATE INDEX IF NOT EXISTS idx_tenants_theme_tokens ON public.tenants USING gin (theme);

-- 6. FONCTIONS UTILITAIRES (si elles n'existent pas déjà)
-- ================================

-- 6.1 Fonction pour obtenir le preset de thème
CREATE OR REPLACE FUNCTION public.get_theme_preset(p_tenant_id uuid)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT t.theme->>'preset'
  FROM public.tenants t
  WHERE t.id = p_tenant_id;
$$;

-- 6.2 Fonction pour obtenir les tokens de thème
CREATE OR REPLACE FUNCTION public.get_theme_tokens(p_tenant_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT t.theme->'tokens'
  FROM public.tenants t
  WHERE t.id = p_tenant_id;
$$;

-- 6.3 Fonction pour mettre à jour le thème
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

-- 7. PERMISSIONS SUR LES FONCTIONS
-- ================================

GRANT EXECUTE ON FUNCTION public.get_theme_preset(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_theme_tokens(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_theme(uuid, text, jsonb) TO authenticated;

-- 8. VÉRIFICATION FINALE
-- ================================

-- 8.1 Vérifier qu'il n'y a plus de colonnes redondantes
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
    RAISE NOTICE '✅ Nettoyage terminé avec succès - Aucune colonne redondante restante';
  END IF;
END $$;

-- 8.2 Statistiques finales
SELECT 
    '=== STATISTIQUES FINALES ===' as info
UNION ALL
SELECT 
    'agency_settings: ' || COUNT(*)::text || ' enregistrements'
FROM public.agency_settings
UNION ALL
SELECT 
    'payroll_policy: ' || COUNT(*)::text || ' enregistrements'
FROM public.payroll_policy
UNION ALL
SELECT 
    'strike_policy: ' || COUNT(*)::text || ' enregistrements'
FROM public.strike_policy
UNION ALL
SELECT 
    'telegram_settings: ' || COUNT(*)::text || ' enregistrements'
FROM public.telegram_settings
UNION ALL
SELECT 
    'competition_settings: ' || COUNT(*)::text || ' enregistrements'
FROM public.competition_settings
UNION ALL
SELECT 
    'instagram_settings: ' || COUNT(*)::text || ' enregistrements'
FROM public.instagram_settings
UNION ALL
SELECT 
    'tenants: ' || COUNT(*)::text || ' enregistrements'
FROM public.tenants;

-- 8.3 Vérifier la cohérence des données
SELECT 
    '=== VÉRIFICATION DE COHÉRENCE ===' as info
UNION ALL
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Tous les tenants ont une configuration payroll'
        ELSE '❌ ' || COUNT(*)::text || ' tenants sans configuration payroll'
    END
FROM public.tenants t
LEFT JOIN public.payroll_policy pp ON pp.tenant_id = t.id
WHERE pp.tenant_id IS NULL
UNION ALL
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Tous les tenants ont une configuration strike'
        ELSE '❌ ' || COUNT(*)::text || ' tenants sans configuration strike'
    END
FROM public.tenants t
LEFT JOIN public.strike_policy sp ON sp.tenant_id = t.id
WHERE sp.tenant_id IS NULL;

-- ================================
-- FIN DE LA MIGRATION 8 - NETTOYAGE FINAL
-- ================================
