import { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import { User } from '../../types';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Avatar } from '../../components/ui/Avatar';
import { statusBadge } from '../../components/ui/Badge';
import { Search, ChevronLeft, ChevronRight, Eye, Coins } from 'lucide-react';
import { format } from 'date-fns';

interface AdminUser extends User {
  _count?: { skills: number; bookingsAsLearner: number; bookingsAsTeacher: number };
}

export const AdminUsersPage = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedUser, setSelectedUser] = useState<Record<string, unknown> | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [statusModal, setStatusModal] = useState<{ user: AdminUser; status: string } | null>(null);
  const [skcModal, setSkcModal] = useState<AdminUser | null>(null);
  const [skcAmount, setSkcAmount] = useState(0);
  const [skcReason, setSkcReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 15 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await adminApi.getUsers(params);
      setUsers(res.data.users);
      setTotalPages(res.data.totalPages);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [page, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const openUserDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const res = await adminApi.getUserById(id);
      setSelectedUser(res.data);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!statusModal) return;
    setActionLoading(true);
    try {
      await adminApi.updateUserStatus(statusModal.user.id, statusModal.status);
      setStatusModal(null);
      fetchUsers();
    } finally {
      setActionLoading(false);
    }
  };

  const handleAdjustSkc = async () => {
    if (!skcModal || !skcReason) return;
    setActionLoading(true);
    try {
      await adminApi.adjustSkc(skcModal.id, skcAmount, skcReason);
      setSkcModal(null);
      setSkcAmount(0);
      setSkcReason('');
      fetchUsers();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed');
    } finally {
      setActionLoading(false);
    }
  };

  const statusOptions = [
    { value: 'ACTIVE', label: 'Active', class: 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100' },
    { value: 'SUSPENDED', label: 'Suspend', class: 'text-amber-700 bg-amber-50 hover:bg-amber-100' },
    { value: 'BANNED', label: 'Ban', class: 'text-red-700 bg-red-50 hover:bg-red-100' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>

      <Card>
        <CardHeader>
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="BANNED">Banned</option>
            </select>
            <Button type="submit">Search</Button>
          </form>
        </CardHeader>

        <CardBody className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">User</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">SKC</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Skills</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Joined</th>
                    <th className="text-right px-5 py-3 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.map(user => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={user.avatar} name={user.fullName} size="sm" />
                          <div>
                            <p className="font-medium text-gray-900">{user.fullName}</p>
                            <p className="text-xs text-gray-400">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">{statusBadge(user.status)}</td>
                      <td className="px-5 py-3 font-semibold text-amber-600">{user.skc.toFixed(0)}</td>
                      <td className="px-5 py-3 text-gray-500">{user._count?.skills || 0}</td>
                      <td className="px-5 py-3 text-gray-500">
                        {user.createdAt ? format(new Date(user.createdAt), 'dd MMM yyyy') : '-'}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => openUserDetail(user.id)} icon={<Eye className="w-3.5 h-3.5" />} />
                          <Button size="sm" variant="ghost" onClick={() => setSkcModal(user)} icon={<Coins className="w-3.5 h-3.5" />} />
                          {statusOptions.filter(s => s.value !== user.status).map(s => (
                            <button
                              key={s.value}
                              onClick={() => setStatusModal({ user, status: s.value })}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${s.class}`}
                            >
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)} icon={<ChevronLeft className="w-4 h-4" />}>Prev</Button>
                <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} icon={<ChevronRight className="w-4 h-4" />}>Next</Button>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* User Detail Modal */}
      <Modal isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} title="User Details" size="xl">
        {detailLoading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : selectedUser ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar src={selectedUser.avatar as string} name={selectedUser.fullName as string} size="lg" />
              <div>
                <h3 className="text-lg font-bold">{selectedUser.fullName as string}</h3>
                <p className="text-sm text-gray-500">{selectedUser.email as string}</p>
                <p className="text-sm font-semibold text-amber-600 mt-1">{(selectedUser.skc as number).toFixed(0)} SKC</p>
              </div>
            </div>

            {!!(selectedUser.bio as string | undefined) && (
              <p className="text-gray-600 text-sm">{selectedUser.bio as string}</p>
            )}

            <div>
              <h4 className="font-semibold text-gray-900 mb-2">Recent Transactions</h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {((selectedUser.transactions as Array<{ id: number; type: string; amount: number; description: string; createdAt: string }>) || []).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-gray-600 truncate">{tx.description}</span>
                    <span className={`font-semibold ml-2 ${tx.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Status Change Confirm */}
      <Modal isOpen={!!statusModal} onClose={() => setStatusModal(null)} title="Change User Status" size="sm">
        <p className="text-gray-600 mb-4">
          Change <strong>{statusModal?.user.fullName}</strong>'s status to <strong>{statusModal?.status}</strong>?
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStatusModal(null)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={handleStatusChange} loading={actionLoading} className="flex-1">Confirm</Button>
        </div>
      </Modal>

      {/* SKC Adjust Modal */}
      <Modal isOpen={!!skcModal} onClose={() => setSkcModal(null)} title="Adjust SKC" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            User: <strong>{skcModal?.fullName}</strong> (Current: {skcModal?.skc.toFixed(0)} SKC)
          </p>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Amount (positive to add, negative to deduct)</label>
            <input
              type="number"
              value={skcAmount}
              onChange={e => setSkcAmount(parseFloat(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="e.g. 50 or -20"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Reason *</label>
            <input
              type="text"
              value={skcReason}
              onChange={e => setSkcReason(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Enter reason..."
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setSkcModal(null)} className="flex-1">Cancel</Button>
            <Button onClick={handleAdjustSkc} loading={actionLoading} className="flex-1">Apply</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
