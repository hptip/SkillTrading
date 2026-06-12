import { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { statusBadge } from '../../components/ui/Badge';
import { Search, Check, X, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface AdminSkill {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  status: string;
  rejectReason?: string;
  createdAt: string;
  teacher: { id: number; fullName: string; email: string };
  _count: { bookings: number; reviews: number };
}

export const AdminSkillsPage = () => {
  const [skills, setSkills] = useState<AdminSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [approveId, setApproveId] = useState<number | null>(null);
  const [rejectModal, setRejectModal] = useState<AdminSkill | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [deleteModal, setDeleteModal] = useState<AdminSkill | null>(null);
  const [detailModal, setDetailModal] = useState<AdminSkill | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 15 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await adminApi.getSkills(params);
      setSkills(res.data.skills);
      setTotalPages(res.data.totalPages);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSkills(); }, [page, statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSkills();
  };

  const handleApprove = async () => {
    if (!approveId) return;
    setActionLoading(true);
    try {
      await adminApi.approveSkill(approveId);
      setApproveId(null);
      fetchSkills();
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await adminApi.rejectSkill(rejectModal.id, rejectReason);
      setRejectModal(null);
      setRejectReason('');
      fetchSkills();
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal) return;
    setActionLoading(true);
    try {
      await adminApi.deleteSkill(deleteModal.id);
      setDeleteModal(null);
      fetchSkills();
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Skills Management</h1>
        <p className="text-sm text-gray-500">{total} total skills</p>
      </div>

      <Card>
        <CardHeader>
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search skills..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
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
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Skill</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Teacher</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Price</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Bookings</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Created</th>
                    <th className="text-right px-5 py-3 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {skills.map(skill => (
                    <tr key={skill.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <button
                          className="text-left"
                          onClick={() => setDetailModal(skill)}
                        >
                          <p className="font-medium text-gray-900 hover:text-violet-600">{skill.title}</p>
                          <p className="text-xs text-gray-400">{skill.category}</p>
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-gray-700">{skill.teacher.fullName}</p>
                        <p className="text-xs text-gray-400">{skill.teacher.email}</p>
                      </td>
                      <td className="px-5 py-3">{statusBadge(skill.status)}</td>
                      <td className="px-5 py-3 font-semibold text-amber-600">{skill.price} SKC</td>
                      <td className="px-5 py-3 text-gray-500">{skill._count.bookings}</td>
                      <td className="px-5 py-3 text-gray-500">{format(new Date(skill.createdAt), 'dd MMM')}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {skill.status === 'PENDING' && (
                            <>
                              <Button size="sm" variant="success" onClick={() => setApproveId(skill.id)} icon={<Check className="w-3.5 h-3.5" />} />
                              <Button size="sm" variant="danger" onClick={() => setRejectModal(skill)} icon={<X className="w-3.5 h-3.5" />} />
                            </>
                          )}
                          {skill.status === 'APPROVED' && (
                            <Button size="sm" variant="danger" onClick={() => setRejectModal(skill)} icon={<X className="w-3.5 h-3.5" />} />
                          )}
                          {skill.status === 'REJECTED' && (
                            <Button size="sm" variant="success" onClick={() => setApproveId(skill.id)} icon={<Check className="w-3.5 h-3.5" />} />
                          )}
                          <Button size="sm" variant="ghost" onClick={() => setDeleteModal(skill)} icon={<Trash2 className="w-3.5 h-3.5 text-red-500" />} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

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

      {/* Detail Modal */}
      <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title="Skill Details" size="lg">
        {detailModal && (
          <div className="space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold">{detailModal.title}</h3>
                <p className="text-sm text-gray-500">{detailModal.category} · {detailModal.price} SKC/hr</p>
              </div>
              {statusBadge(detailModal.status)}
            </div>
            <p className="text-gray-700 text-sm">{detailModal.description}</p>
            <div className="bg-gray-50 rounded-xl p-3 text-sm">
              <p><strong>Teacher:</strong> {detailModal.teacher.fullName} ({detailModal.teacher.email})</p>
              <p><strong>Bookings:</strong> {detailModal._count.bookings}</p>
              <p><strong>Reviews:</strong> {detailModal._count.reviews}</p>
              {detailModal.rejectReason && <p className="text-red-600"><strong>Reject Reason:</strong> {detailModal.rejectReason}</p>}
            </div>
          </div>
        )}
      </Modal>

      {/* Approve Confirm */}
      <Modal isOpen={!!approveId} onClose={() => setApproveId(null)} title="Approve Skill" size="sm">
        <p className="text-gray-600 mb-4">This skill will be visible on the marketplace.</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setApproveId(null)} className="flex-1">Cancel</Button>
          <Button variant="success" onClick={handleApprove} loading={actionLoading} className="flex-1">Approve</Button>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={!!rejectModal} onClose={() => { setRejectModal(null); setRejectReason(''); }} title="Reject Skill" size="sm">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Rejection Reason *</label>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Explain why..."
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setRejectModal(null)} className="flex-1">Cancel</Button>
            <Button variant="danger" onClick={handleReject} loading={actionLoading} className="flex-1">Reject</Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} title="Delete Skill" size="sm">
        <p className="text-gray-600 mb-4">
          Permanently delete <strong>{deleteModal?.title}</strong>? This will also delete all associated bookings and reviews.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setDeleteModal(null)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={handleDelete} loading={actionLoading} className="flex-1">Delete</Button>
        </div>
      </Modal>
    </div>
  );
};
