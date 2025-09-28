import { useState, useEffect } from 'react';
import { 
  UsersIcon, 
  ShieldCheckIcon, 
  ShieldExclamationIcon,
  EyeIcon,
  EyeSlashIcon,
  UserPlusIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { UserProfileService, type UserProfile, type UserRole } from '../services/userProfileService';

export default function AdminUsers() {
  const { isAdmin, isSuperAdmin } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | UserRole>('all');

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const [profilesData, statsData] = await Promise.all([
        UserProfileService.getAllProfiles(),
        UserProfileService.getUserStats()
      ]);
      setProfiles(profilesData);
      setStats(statsData);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      alert('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadProfiles();
    }
  }, [isAdmin]);

  const handleToggleActive = async (profile: UserProfile) => {
    if (!isAdmin) return;

    try {
      setActionLoading(profile.id);
      await UserProfileService.toggleUserActive(profile.user_id, !profile.is_active);
      await loadProfiles(); // Recarregar lista
    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error);
      alert('Erro ao alterar status do usuário');
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangeRole = async (profile: UserProfile, newRole: UserRole) => {
    if (!isSuperAdmin && newRole === 'super_admin') {
      alert('Apenas Super Admins podem promover outros usuários para Super Admin');
      return;
    }

    try {
      setActionLoading(profile.id);
      await UserProfileService.updateProfile(profile.user_id, { role: newRole });
      await loadProfiles(); // Recarregar lista
    } catch (error) {
      console.error('Erro ao alterar role do usuário:', error);
      alert('Erro ao alterar role do usuário');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredProfiles = filter === 'all' 
    ? profiles 
    : profiles.filter(profile => profile.role === filter);

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-100 text-red-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'super_admin':
        return <ShieldExclamationIcon className="h-4 w-4" />;
      case 'admin':
        return <ShieldCheckIcon className="h-4 w-4" />;
      default:
        return <UsersIcon className="h-4 w-4" />;
    }
  };

  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <ShieldExclamationIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Acesso Negado</h3>
        <p className="mt-1 text-sm text-gray-500">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gerenciar Usuários</h1>
            <p className="mt-2 text-sm text-gray-600">
              Visualize e gerencie todos os usuários do sistema
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | UserRole)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="all">Todos os usuários</option>
              <option value="user">Usuários</option>
              <option value="admin">Admins</option>
              <option value="super_admin">Super Admins</option>
            </select>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UsersIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total de Usuários</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.total}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <EyeIcon className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Usuários Ativos</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.active}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ShieldCheckIcon className="h-6 w-6 text-blue-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Administradores</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.admins + stats.super_admins}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <EyeSlashIcon className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Inativos</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.inactive}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de usuários */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Usuários ({filteredProfiles.length})
          </h3>
        </div>

        {filteredProfiles.length === 0 ? (
          <div className="text-center py-12">
            <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum usuário encontrado</h3>
            <p className="mt-1 text-sm text-gray-500">
              Não há usuários com os filtros selecionados.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredProfiles.map((profile) => (
              <li key={profile.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          {getRoleIcon(profile.role)}
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <h4 className="text-sm font-medium text-gray-900">
                            {profile.email}
                          </h4>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(profile.role)}`}>
                            {profile.role === 'super_admin' ? 'Super Admin' : 
                             profile.role === 'admin' ? 'Admin' : 'Usuário'}
                          </span>
                          {!profile.is_active && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                              Inativo
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          {profile.company_name && <p>Empresa: {profile.company_name}</p>}
                          <p>Criado em: {new Date(profile.created_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {/* Toggle Ativo/Inativo */}
                      <button
                        onClick={() => handleToggleActive(profile)}
                        disabled={actionLoading === profile.id}
                        className={`p-2 rounded-md ${
                          profile.is_active 
                            ? 'text-green-600 hover:text-green-900' 
                            : 'text-red-600 hover:text-red-900'
                        } disabled:opacity-50`}
                        title={profile.is_active ? 'Desativar usuário' : 'Ativar usuário'}
                      >
                        {profile.is_active ? (
                          <EyeIcon className="h-5 w-5" />
                        ) : (
                          <EyeSlashIcon className="h-5 w-5" />
                        )}
                      </button>

                      {/* Mudança de Role */}
                      {isSuperAdmin && profile.role !== 'super_admin' && (
                        <select
                          value={profile.role}
                          onChange={(e) => handleChangeRole(profile, e.target.value as UserRole)}
                          disabled={actionLoading === profile.id}
                          className="text-sm border border-gray-300 rounded-md px-2 py-1 disabled:opacity-50"
                        >
                          <option value="user">Usuário</option>
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      )}

                      {/* Para admins normais, apenas podem promover para admin */}
                      {isAdmin && !isSuperAdmin && profile.role === 'user' && (
                        <button
                          onClick={() => handleChangeRole(profile, 'admin')}
                          disabled={actionLoading === profile.id}
                          className="text-blue-600 hover:text-blue-900 text-sm disabled:opacity-50"
                        >
                          Promover para Admin
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}