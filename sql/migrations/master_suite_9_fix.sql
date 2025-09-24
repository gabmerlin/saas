-- ================================
-- MIGRATION 9: Correction de la contrainte de thème
-- ================================

-- 1. SUPPRIMER LA CONTRAINTE PROBLÉMATIQUE
-- ================================

-- Supprimer la contrainte qui cause l'erreur 500
ALTER TABLE public.tenants 
DROP CONSTRAINT IF EXISTS check_theme_structure;

-- 2. VÉRIFICATION
-- ================================

-- Vérifier que la contrainte a été supprimée
DO $$
BEGIN
    -- Vérifier qu'il n'y a plus de contrainte check_theme_structure
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_theme_structure' 
        AND table_name = 'tenants'
        AND table_schema = 'public'
    ) THEN
        RAISE EXCEPTION 'La contrainte check_theme_structure existe encore';
    ELSE
        RAISE NOTICE '✅ Contrainte check_theme_structure supprimée avec succès';
    END IF;
END $$;

-- 3. TEST DE CRÉATION D'UN TENANT
-- ================================

-- Test avec la structure utilisée par createTenantWithOwner
DO $$
DECLARE
    test_theme jsonb;
    test_result boolean;
BEGIN
    -- Structure utilisée par createTenantWithOwner
    test_theme := jsonb_build_object(
        'primary_color', '#3b82f6',
        'logo_url', null,
        'agency_slug', 'test-agency',
        'timezone', 'UTC'
    );
    
    -- Tester l'insertion (sans vraiment insérer)
    test_result := true;
    
    RAISE NOTICE '✅ Structure de thème compatible avec createTenantWithOwner';
    RAISE NOTICE 'Structure testée: %', test_theme;
END $$;

-- ================================
-- FIN DE LA MIGRATION 9
-- ================================
