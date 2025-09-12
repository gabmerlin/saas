// components/invitations/invitation-manager.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Mail, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { createInvitation, getInvitations, revokeInvitation, resendInvitation } from '@/lib/invitations/actions';

interface Invitation {
  id: string;
  email: string;
  role_key: string;
  roles: { key: string; description: string };
  profiles: { full_name: string };
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

interface InvitationManagerProps {
  tenantId: string;
  canManage: boolean;
}

export default function InvitationManager({ tenantId, canManage }: InvitationManagerProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newInvitation, setNewInvitation] = useState({
    email: '',
    role: '',
  });

  const roles = [
    { key: 'admin', description: 'Administrateur' },
    { key: 'manager', description: 'Manager' },
    { key: 'employee', description: 'Employé' },
    { key: 'marketing', description: 'Marketing' },
  ];

  const loadInvitations = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getInvitations(tenantId);
      setInvitations(data);
    } catch {
      toast.error('Erreur lors du chargement des invitations');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    loadInvitations();
  }, [tenantId, loadInvitations]);

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;

    try {
      setCreating(true);
      await createInvitation({
        email: newInvitation.email,
        role: newInvitation.role,
        tenantId,
      });

      toast.success('Invitation envoyée avec succès');
      setNewInvitation({ email: '', role: '' });
      loadInvitations();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la création de l\'invitation');
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (!canManage) return;

    try {
      await revokeInvitation(invitationId);
      toast.success('Invitation révoquée');
      loadInvitations();
    } catch {
      toast.error('Erreur lors de la révocation de l\'invitation');
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    if (!canManage) return;

    try {
      await resendInvitation(invitationId);
      toast.success('Invitation renvoyée');
      loadInvitations();
    } catch {
      toast.error('Erreur lors du renvoi de l\'invitation');
    }
  };

  const getStatusBadge = (invitation: Invitation) => {
    if (invitation.accepted_at) {
      return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Acceptée</Badge>;
    }
    
    const isExpired = new Date(invitation.expires_at) < new Date();
    if (isExpired) {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Expirée</Badge>;
    }
    
    return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />En attente</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      {/* Formulaire de création d'invitation */}
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              Inviter un utilisateur
            </CardTitle>
            <CardDescription>
              Envoyez une invitation par email pour rejoindre votre agence
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateInvitation} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="utilisateur@example.com"
                    value={newInvitation.email}
                    onChange={(e) => setNewInvitation(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rôle</Label>
                  <Select
                    value={newInvitation.role}
                    onValueChange={(value) => setNewInvitation(prev => ({ ...prev, role: value }))}
                    required
                  >
                    
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un rôle" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.key} value={role.key}>
                          {role.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" disabled={creating}>
                {creating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Envoyer l&apos;invitation
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Liste des invitations */}
      <Card>
        <CardHeader>
          <CardTitle>Invitations en cours</CardTitle>
          <CardDescription>
            Gérez les invitations envoyées à votre équipe
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          ) : invitations.length === 0 ? (
            <Alert>
              <AlertDescription>
                Aucune invitation en cours. {canManage && 'Créez votre première invitation ci-dessus.'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{invitation.email}</span>
                      {getStatusBadge(invitation)}
                    </div>
                    <div className="text-sm text-gray-500">
                      Rôle: {invitation.roles.description} • 
                      Invité par: {invitation.profiles.full_name} • 
                      Expire le: {formatDate(invitation.expires_at)}
                    </div>
                  </div>
                  {canManage && !invitation.accepted_at && (
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendInvitation(invitation.id)}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Renvoyer
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRevokeInvitation(invitation.id)}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Révoquer
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}