import { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { statusBadge } from '../../components/ui/Badge';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface AdminBooking {
  id: number;
  totalPrice: number;
  status: string;
  scheduledAt: string;
  durationHours: number;
  disputeReason?: string;
  cancelReason?: string;
  createdAt: string;
  skill: { id: number; title: string; category: string };
  learner: { id: number; fullName: string; email: string };
  teacher: { id: number; fullName: string; email: string };
}

export const AdminBookingsPage = () => {
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [disputeModal, setDisputeModal] = useState<AdminBooking | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 15 };
      if (statusFilter) params.status = statusFilter;
      const res = await adminApi.getBookings(params);
      setBookings(res.data.bookings);
      setTotalPages(res.data.totalPages);
      setTotal(res.data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, [page, statusFilter]);

  const handleResolveDispute = async (resolution: string) => {
    if (!disputeModal) return;
    setActionLoading(true);
    try {
      await adminApi.resolveDispute(disputeModal.id, resolution);
      setDisputeModal(null);
      fetchBookings();
    } finally {
      setActionLoading(false);
    }
  };

  const statusOptions = ['', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'DISPUTED'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Bookings Management</h1>
        <p className="text-sm text-gray-500">{total} total bookings</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {statusOptions.map(s => (
                <option key={s} value={s}>{s || 'All Status'}</option>
              ))}
            </select>
          </div>
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
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Learner</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Teacher</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Amount</th>
                    <th className="text-left px-5 py-3 font-medium text-gray-500">Scheduled</th>
                    <th className="text-right px-5 py-3 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {bookings.map(booking => (
                    <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{booking.skill.title}</p>
                        <p className="text-xs text-gray-400">{booking.skill.category}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-gray-700">{booking.learner.fullName}</p>
                      </td>
                      <td className="px-5 py-3">
                        <p className="text-gray-700">{booking.teacher.fullName}</p>
                      </td>
                      <td className="px-5 py-3">{statusBadge(booking.status)}</td>
                      <td className="px-5 py-3 font-semibold text-amber-600">{booking.totalPrice} SKC</td>
                      <td className="px-5 py-3 text-gray-500">
                        {format(new Date(booking.scheduledAt), 'dd MMM, HH:mm')}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end">
                          {booking.status === 'DISPUTED' && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => setDisputeModal(booking)}
                              icon={<AlertTriangle className="w-3.5 h-3.5" />}
                            >
                              Resolve
                            </Button>
                          )}
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

      {/* Dispute Resolution Modal */}
      <Modal isOpen={!!disputeModal} onClose={() => setDisputeModal(null)} title="Resolve Dispute" size="md">
        {disputeModal && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-1.5">
              <p><strong>Skill:</strong> {disputeModal.skill.title}</p>
              <p><strong>Learner:</strong> {disputeModal.learner.fullName} ({disputeModal.learner.email})</p>
              <p><strong>Teacher:</strong> {disputeModal.teacher.fullName} ({disputeModal.teacher.email})</p>
              <p><strong>Amount:</strong> {disputeModal.totalPrice} SKC</p>
              <p><strong>Session:</strong> {format(new Date(disputeModal.scheduledAt), 'dd MMM yyyy, HH:mm')} ({disputeModal.durationHours}h)</p>
              {disputeModal.disputeReason && (
                <p className="text-red-700"><strong>Reason:</strong> {disputeModal.disputeReason}</p>
              )}
            </div>

            <p className="text-sm font-semibold text-gray-700">Select Resolution:</p>

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleResolveDispute('learner_full')}
                disabled={actionLoading}
                className="flex flex-col items-center p-4 border-2 border-blue-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all disabled:opacity-50"
              >
                <span className="text-2xl font-bold text-blue-600">100%</span>
                <span className="text-xs text-blue-600 mt-1">Refund to Learner</span>
                <span className="text-xs text-gray-400">+{disputeModal.totalPrice} SKC</span>
              </button>

              <button
                onClick={() => handleResolveDispute('split')}
                disabled={actionLoading}
                className="flex flex-col items-center p-4 border-2 border-violet-200 rounded-xl hover:border-violet-500 hover:bg-violet-50 transition-all disabled:opacity-50"
              >
                <span className="text-2xl font-bold text-violet-600">50/50</span>
                <span className="text-xs text-violet-600 mt-1">Split Evenly</span>
                <span className="text-xs text-gray-400">{(disputeModal.totalPrice / 2).toFixed(0)} each</span>
              </button>

              <button
                onClick={() => handleResolveDispute('teacher_full')}
                disabled={actionLoading}
                className="flex flex-col items-center p-4 border-2 border-emerald-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all disabled:opacity-50"
              >
                <span className="text-2xl font-bold text-emerald-600">100%</span>
                <span className="text-xs text-emerald-600 mt-1">Pay Teacher</span>
                <span className="text-xs text-gray-400">{(disputeModal.totalPrice * 0.95).toFixed(0)} SKC (95%)</span>
              </button>
            </div>

            <Button variant="outline" onClick={() => setDisputeModal(null)} className="w-full">
              Cancel
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};
