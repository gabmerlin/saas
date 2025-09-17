-- Ajouter la colonne accepted_at à la table invitation
ALTER TABLE public.invitation 
ADD COLUMN IF NOT EXISTS accepted_at timestamptz;

-- Ajouter un index sur accepted_at pour les performances
CREATE INDEX IF NOT EXISTS idx_invitation_accepted_at ON public.invitation(accepted_at);
