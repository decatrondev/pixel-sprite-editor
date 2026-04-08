import { useEffect, useState } from 'react';
import { adminApi } from '../services/api';
import { toast } from '../components/common/Toast';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import type { AdminStats, AdminUser, AdminProject, AdminActivity } from '../types/api';

type Tab = 'dashboard' | 'users' | 'projects' | 'activity';

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('dashboard');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'users', label: 'Usuarios' },
    { key: 'projects', label: 'Proyectos' },
    { key: 'activity', label: 'Actividad' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Super Admin</h1>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'users' && <UsersTab />}
      {tab === 'projects' && <ProjectsTab />}
      {tab === 'activity' && <ActivityTab />}
    </div>
  );
}

// --- Dashboard ---
function DashboardTab() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    adminApi.getStats().then(r => setStats(r.data.stats)).catch(() => toast('Error cargando stats', 'error'));
  }, []);

  if (!stats) return <Loader />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Usuarios" value={stats.users.total} sub={`${stats.users.active} activos`} color="indigo" />
      <StatCard label="Proyectos" value={stats.projects.total} sub={`${stats.projects.sprites} sprites, ${stats.projects.pixelart} pixel art`} color="purple" />
      <StatCard label="Base de datos" value={stats.system.dbSize} sub={`Uploads: ${stats.system.uploadsSize}`} color="blue" />
      <StatCard label="Uptime" value={stats.system.uptime} sub={`Node ${stats.system.nodeVersion}`} color="green" />
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub: string; color: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-50 border-indigo-100',
    purple: 'bg-purple-50 border-purple-100',
    blue: 'bg-blue-50 border-blue-100',
    green: 'bg-green-50 border-green-100',
  };
  return (
    <div className={`rounded-xl p-5 border ${colors[color] || colors.indigo}`}>
      <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  );
}

// --- Users ---
function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [confirm, setConfirm] = useState<{ open: boolean; userId: number; action: string; data: Record<string, unknown> }>({ open: false, userId: 0, action: '', data: {} });

  const loadUsers = () => {
    adminApi.getUsers().then(r => setUsers(r.data.users)).catch(() => toast('Error cargando usuarios', 'error'));
  };

  useEffect(() => { loadUsers(); }, []);

  const handleAction = async () => {
    try {
      await adminApi.updateUser(confirm.userId, confirm.data as { role?: string; is_active?: boolean });
      toast('Usuario actualizado', 'success');
      loadUsers();
    } catch {
      toast('Error actualizando usuario', 'error');
    }
    setConfirm({ open: false, userId: 0, action: '', data: {} });
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Usuario</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Rol</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Proyectos</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Ultimo login</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map(user => (
              <tr key={user.id} className={`${!user.is_active ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-medium text-gray-900">{user.username}</td>
                <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">
                  {parseInt(user.sprite_count) + parseInt(user.pixelart_count)}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">
                  {user.last_login ? new Date(user.last_login).toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Nunca'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {user.role !== 'admin' && (
                      <button onClick={() => setConfirm({ open: true, userId: user.id, action: `Hacer admin a ${user.username}?`, data: { role: 'admin' } })}
                        className="text-xs text-indigo-600 hover:text-indigo-800">Admin</button>
                    )}
                    {user.role === 'admin' && user.username !== 'anthonydeca' && (
                      <button onClick={() => setConfirm({ open: true, userId: user.id, action: `Quitar admin a ${user.username}?`, data: { role: 'user' } })}
                        className="text-xs text-gray-600 hover:text-gray-800">Quitar admin</button>
                    )}
                    <button onClick={() => setConfirm({ open: true, userId: user.id, action: `${user.is_active ? 'Desactivar' : 'Activar'} a ${user.username}?`, data: { is_active: !user.is_active } })}
                      className={`text-xs ${user.is_active ? 'text-red-600 hover:text-red-800' : 'text-green-600 hover:text-green-800'}`}>
                      {user.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConfirmDialog open={confirm.open} title="Confirmar" message={confirm.action}
        onConfirm={handleAction} onCancel={() => setConfirm({ open: false, userId: 0, action: '', data: {} })} />
    </>
  );
}

// --- Projects ---
function ProjectsTab() {
  const [projects, setProjects] = useState<{ sprites: AdminProject[]; pixelart: AdminProject[] }>({ sprites: [], pixelart: [] });
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: number; name: string } | null>(null);

  const loadProjects = () => {
    adminApi.getProjects().then(r => setProjects(r.data.projects)).catch(() => toast('Error cargando proyectos', 'error'));
  };

  useEffect(() => { loadProjects(); }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await adminApi.deleteProject(deleteTarget.type, deleteTarget.id);
      toast('Proyecto eliminado', 'success');
      loadProjects();
    } catch {
      toast('Error eliminando proyecto', 'error');
    }
    setDeleteTarget(null);
  };

  const allProjects = [
    ...projects.sprites.map(p => ({ ...p, type: 'sprites' as const })),
    ...projects.pixelart.map(p => ({ ...p, type: 'pixelart' as const }))
  ].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Proyecto</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Usuario</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Actualizado</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {allProjects.map(p => (
              <tr key={`${p.type}-${p.id}`}>
                <td className="px-4 py-3 font-medium text-gray-900">{p.project_name}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.type === 'sprites' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {p.type === 'sprites' ? 'Sprite' : 'Pixel Art'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{p.username}</td>
                <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell">
                  {new Date(p.updated_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => setDeleteTarget({ type: p.type, id: p.id, name: p.project_name })}
                    className="text-xs text-red-600 hover:text-red-800">Eliminar</button>
                </td>
              </tr>
            ))}
            {allProjects.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Sin proyectos</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <ConfirmDialog open={!!deleteTarget} title="Eliminar proyecto" danger
        message={`Eliminar "${deleteTarget?.name}"? Esta accion no se puede deshacer.`}
        confirmText="Eliminar" onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} />
    </>
  );
}

// --- Activity ---
function ActivityTab() {
  const [activity, setActivity] = useState<AdminActivity | null>(null);

  useEffect(() => {
    adminApi.getActivity().then(r => setActivity(r.data.activity)).catch(() => toast('Error cargando actividad', 'error'));
  }, []);

  if (!activity) return <Loader />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <ActivitySection title="Logins recientes" items={activity.recentLogins.map(l => ({
        primary: l.username,
        secondary: new Date(l.last_login).toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
      }))} />
      <ActivitySection title="Proyectos recientes" items={activity.recentProjects.map(p => ({
        primary: p.project_name,
        secondary: `${p.username} - ${p.type}`
      }))} />
      <ActivitySection title="Registros recientes" items={activity.recentUsers.map(u => ({
        primary: u.username,
        secondary: new Date(u.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })
      }))} />
    </div>
  );
}

function ActivitySection({ title, items }: { title: string; items: { primary: string; secondary: string }[] }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h3 className="font-semibold text-gray-900 mb-3 text-sm">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-400">Sin actividad</p>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => (
            <div key={i} className="flex justify-between items-center py-1.5 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-900">{item.primary}</span>
              <span className="text-xs text-gray-400">{item.secondary}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Loader() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}
