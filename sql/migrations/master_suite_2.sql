-- Migration simple pour ajouter la colonne plan_id à la table transaction
-- La table subscription_plan existe déjà

-- Vérifier si la colonne plan_id existe, sinon l'ajouter
DO $$ 
BEGIN
    -- Vérifier si la colonne plan_id existe dans la table transaction
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transaction' 
        AND column_name = 'plan_id'
        AND table_schema = 'public'
    ) THEN
        -- Ajouter la colonne plan_id si elle n'existe pas
        ALTER TABLE public.transaction 
        ADD COLUMN plan_id uuid REFERENCES public.subscription_plan(id);
        
        RAISE NOTICE 'Colonne plan_id ajoutée à la table transaction';
    ELSE
        RAISE NOTICE 'Colonne plan_id existe déjà dans la table transaction';
    END IF;
END $$;

-- Créer l'index sur plan_id s'il n'existe pas
CREATE INDEX IF NOT EXISTS idx_transaction_plan ON public.transaction(plan_id);

-- Vérifier la structure finale de la table transaction
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'transaction' 
AND table_schema = 'public'
ORDER BY ordinal_position;
