'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/supabase/auth';
import { useTenant } from '@/lib/context/TenantContext';
import { supabase } from '@/lib/supabase/client';

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
        const mappedUsers = (data || []).map((membership: any) => ({
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="max-w-6xl mx-auto pt-20">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-slate-900 mb-4">User Management</h1>
            <p className="text-slate-600">Du måste vara admin i en organisation för att komma åt denna sidan.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">User Management</h1>
          <p className="text-slate-600">Hantera användare och roller för organisationen</p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Users List */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
              <h2 className="text-lg font-bold text-white">Användare ({filteredUsers.length})</h2>
            </div>

            {/* Filters */}
            <div className="p-4 border-b border-slate-200 flex gap-2 flex-wrap">
              <input
                type="text"
                placeholder="Sök efter e-post..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-48 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Alla Roller</option>
                <option value="owner">Ägare</option>
                <option value="admin">Admin</option>
                <option value="member">Medlem</option>
              </select>
            </div>

            {/* Users */}
            <div className="divide-y overflow-y-auto flex-1 max-h-96">
              {isLoading ? (
                <div className="p-4 text-center text-slate-600">Laddar...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-slate-600">Inga användare hittades</div>
              ) : (
                filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSelectedUser(u);
                      setNewRole(u.role);
                    }}
                    className={`w-full text-left p-4 hover:bg-slate-50 transition-colors border-l-4 ${
                      selectedUser?.id === u.id ? 'bg-blue-50 border-l-blue-500' : 'border-l-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium text-slate-900">{u.email}</p>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                          u.role === 'owner'
                            ? 'bg-purple-100 text-purple-700'
                            : u.role === 'admin'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {u.role === 'owner' ? 'Ägare' : u.role === 'admin' ? 'Admin' : 'Medlem'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      Medlem sedan {new Date(u.created_at).toLocaleDateString('sv-SE')}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* User Detail */}
          {selectedUser ? (
            <div className="bg-white rounded-lg shadow overflow-hidden flex flex-col max-h-96">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4">
                <h2 className="text-lg font-bold text-white truncate">{selectedUser.email}</h2>
              </div>

              <div className="overflow-y-auto flex-1 p-4 space-y-4">
                {/* User Info */}
                <div className="space-y-2 pb-4 border-b border-slate-200">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Användar ID</p>
                    <p className="text-sm text-slate-900 break-all">{selectedUser.user_id}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 font-medium">Medlem sedan</p>
                    <p className="text-sm text-slate-900">
                      {new Date(selectedUser.created_at).toLocaleDateString('sv-SE')}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 font-medium">Nuvarande Rol</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {selectedUser.role === 'owner' ? 'Ägare' : selectedUser.role === 'admin' ? 'Admin' : 'Medlem'}
                    </p>
                  </div>
                </div>

                {/* Role Change */}
                <div className="space-y-2">
                  <p className="text-xs text-slate-500 font-medium">Ändra Rol</p>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="member">Medlem</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Ägare</option>
                  </select>

                  {newRole !== selectedUser.role && (
                    <button
                      onClick={handleRoleChange}
                      disabled={isUpdating}
                      className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white text-sm rounded-lg transition-colors font-medium"
                    >
                      {isUpdating ? 'Uppdaterar...' : 'Uppdatera Rol'}
                    </button>
                  )}
                </div>
              </div>

              {/* Remove Button */}
              <div className="p-4 border-t border-slate-200">
                <button
                  onClick={handleRemoveUser}
                  disabled={isUpdating}
                  className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-400 text-white text-sm rounded-lg transition-colors font-medium"
                >
                  {isUpdating ? 'Tar bort...' : 'Ta Bort Användare'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center min-h-64">
              <p className="text-slate-600">Välj en användare för att redigera</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
