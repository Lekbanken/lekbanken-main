'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
import { supabase } from '@/lib/supabase/client';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Input } from '@/components/ui';
import {
  UsersIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

interface MembershipRow {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  users?: { email?: string | null } | null;
}

interface TenantUser {
  id: string;
  email: string;
  user_id: string;
  role: string;
  created_at: string;
}

export default function UsersPage() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();

  // States
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<TenantUser | null>(null);
  const [newRole, setNewRole] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Load users
  useEffect(() => {
    if (!user || !currentTenant) return;

    const loadUsers = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_tenant_memberships')
          .select('*, users(email)')
          .eq('tenant_id', currentTenant.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading users:', error);
          return;
        }

        // Type-safe mapping
        const mappedUsers = (data || []).map((membership: MembershipRow) => ({
          id: membership.id,
          email: membership.users?.email || '',
          user_id: membership.user_id,
          role: membership.role,
          created_at: membership.created_at,
        }));

        setUsers(mappedUsers);
      } catch (err) {
        console.error('Error loading users:', err);
      }
      setIsLoading(false);
    };

    loadUsers();
  }, [user, currentTenant]);

  const handleRoleChange = async () => {
    if (!selectedUser || !newRole || !currentTenant) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('user_tenant_memberships')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', selectedUser.id)
        .eq('tenant_id', currentTenant.id);

      if (error) {
        console.error('Error updating role:', error);
        alert('Det gick inte att uppdatera rollen.');
      } else {
        const updatedUsers = users.map((u) =>
          u.id === selectedUser.id ? { ...u, role: newRole } : u
        );
        setUsers(updatedUsers);
        setSelectedUser({ ...selectedUser, role: newRole });
        setNewRole('');
        alert('Rollen har uppdaterats.');
      }
    } catch (err) {
      console.error('Error updating role:', err);
      alert('Det gick inte att uppdatera rollen.');
    }
    setIsUpdating(false);
  };

  const handleRemoveUser = async () => {
    if (!selectedUser || !currentTenant) return;

    if (!window.confirm('Är du säker på att du vill ta bort denna användare från organisationen?')) {
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('user_tenant_memberships')
        .delete()
        .eq('id', selectedUser.id)
        .eq('tenant_id', currentTenant.id);

      if (error) {
        console.error('Error removing user:', error);
        alert('Det gick inte att ta bort användaren.');
      } else {
        const updatedUsers = users.filter((u) => u.id !== selectedUser.id);
        setUsers(updatedUsers);
        setSelectedUser(null);
        alert('Användaren har tagits bort.');
      }
    } catch (err) {
      console.error('Error removing user:', err);
      alert('Det gick inte att ta bort användaren.');
    }
    setIsUpdating(false);
  };

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch = u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = !roleFilter || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (!user || !currentTenant) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Användare</h1>
          <p className="text-muted-foreground mt-1">Du måste vara admin i en organisation för att komma åt denna sidan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Användare</h1>
        <p className="text-muted-foreground mt-1">Hantera användare och roller för organisationen</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{users.length}</div>
            <div className="text-sm text-muted-foreground">Totalt</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-500">
              {users.filter((u) => u.role === 'owner').length}
            </div>
            <div className="text-sm text-muted-foreground">Ägare</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-accent">
              {users.filter((u) => u.role === 'admin').length}
            </div>
            <div className="text-sm text-muted-foreground">Admins</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-foreground">
              {users.filter((u) => u.role === 'member').length}
            </div>
            <div className="text-sm text-muted-foreground">Medlemmar</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Users List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5 text-muted-foreground" />
              Användare ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Sök efter e-post..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg text-sm bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Alla Roller</option>
                <option value="owner">Ägare</option>
                <option value="admin">Admin</option>
                <option value="member">Medlem</option>
              </select>
            </div>

            {/* Users */}
            <div className="divide-y divide-border max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">Laddar...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">Inga användare hittades</div>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSelectedUser(u);
                      setNewRole(u.role);
                    }}
                    className={`w-full text-left p-4 hover:bg-muted transition-colors border-l-4 ${
                      selectedUser?.id === u.id ? 'bg-primary/5 border-l-primary' : 'border-l-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                          {u.email.charAt(0).toUpperCase()}
                        </div>
                        <p className="font-medium text-foreground">{u.email}</p>
                      </div>
                      <Badge
                        variant={
                          u.role === 'owner' ? 'primary' :
                          u.role === 'admin' ? 'accent' : 'outline'
                        }
                      >
                        {u.role === 'owner' ? 'Ägare' : u.role === 'admin' ? 'Admin' : 'Medlem'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground ml-11">
                      Medlem sedan {new Date(u.created_at).toLocaleDateString('sv-SE')}
                    </p>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Detail */}
        {selectedUser ? (
          <Card>
            <CardHeader className="bg-primary/5">
              <CardTitle className="text-foreground truncate">{selectedUser.email}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* User Info */}
              <div className="space-y-3 pb-4 border-b border-border">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Användar ID</p>
                  <p className="text-sm text-foreground break-all">{selectedUser.user_id}</p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground font-medium">Medlem sedan</p>
                  <p className="text-sm text-foreground">
                    {new Date(selectedUser.created_at).toLocaleDateString('sv-SE')}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground font-medium">Nuvarande Roll</p>
                  <Badge
                    variant={
                      selectedUser.role === 'owner' ? 'primary' :
                      selectedUser.role === 'admin' ? 'accent' : 'outline'
                    }
                  >
                    {selectedUser.role === 'owner' ? 'Ägare' : selectedUser.role === 'admin' ? 'Admin' : 'Medlem'}
                  </Badge>
                </div>
              </div>

              {/* Role Change */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Ändra Roll</p>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="member">Medlem</option>
                  <option value="admin">Admin</option>
                  <option value="owner">Ägare</option>
                </select>

                {newRole !== selectedUser.role && (
                  <Button
                    onClick={handleRoleChange}
                    disabled={isUpdating}
                    className="w-full"
                  >
                    <PencilIcon className="h-4 w-4 mr-1" />
                    {isUpdating ? 'Uppdaterar...' : 'Uppdatera Roll'}
                  </Button>
                )}
              </div>

              {/* Remove Button */}
              <Button
                onClick={handleRemoveUser}
                disabled={isUpdating}
                variant="outline"
                className="w-full text-red-600 hover:bg-red-50"
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                {isUpdating ? 'Tar bort...' : 'Ta Bort Användare'}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 flex items-center justify-center min-h-64">
              <p className="text-muted-foreground">Välj en användare för att redigera</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
