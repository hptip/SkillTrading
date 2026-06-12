import { useState, useEffect } from 'react';
import { adminApi } from '../../lib/api';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Users, BookOpen, Calendar, Coins, Clock, AlertTriangle, Check, X } from 'lucide-react';
import { format } from 'date-fns';

interface DashboardData {
  stats: {
    totalUsers: number;
    totalSkills: number;
    totalBookings: number;
    totalSkc: number;
    pendingSkillsCount: number;
    disputedBookingsCount: number;
  };
  pendingSkills: Array<{ id: number; title: string; category: string; price: number; teacher: { fullName: string }; createdAt: string }>;
  disputedBookings: Array<{ id: number; totalPrice: number; skill: { title: string }; learner: { fullName: string }; teacher: { fullName: string }; disputeReason?: string }>;
  bookingStats: Array<{ status: string; _count: { status: number } }>;
  recentUsers: Array<{ id: number; fullName: string; email: string; createdAt: string; skc: number }>;
}

export const AdminDashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [approveSkill, setApproveSkill] = useState<number | null>(null);
  const [rejectSkill, setRejectSkill] = useState<{ id: number; title: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [disputeModal, setDisputeModal] = useState<DashboardData['disputedBookings'][0] | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await adminApi.getDashboard();
      setData(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleApprove = async (id: number) => {
    setActionLoading(true);
    try {
      await adminApi.approveSkill(id);
      setApproveSkill(null);
      fetchData();
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectSkill || !rejectReason.trim()) return;
    setActionLoading(true);
    try {
      await adminApi.rejectSkill(rejectSkill.id, rejectReason);
      setRejectSkill(null);
      setRejectReason('');
      fetchData();
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveDispute = async (resolution: string) => {
    if (!disputeModal) return;
    setActionLoading(true);
    try {
      await adminApi.resolveDispute(disputeModal.id, resolution);
      setDisputeModal(null);
      fetchData();
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-28 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Total Users', value: data?.stats.totalUsers, icon: <Users className="w-6 h-6" />, color: 'text-blue-600 bg-blue-50' },
    { label: 'Total Skills', value: data?.stats.totalSkills, icon: <BookOpen className="w-6 h-6" />, color: 'text-violet-600 bg-violet-50' },
    { label: 'Total Bookings', value: data?.stats.totalBookings, icon: <Calendar className="w-6 h-6" />, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'SKC in Circulation', value: data?.stats.totalSkc?.toFixed(0), icon: <Coins className="w-6 h-6" />, color: 'text-amber-600 bg-amber-50' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(stat => (
          <Card key={stat.label}>
            <CardBody className="p-5">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
                {stat.icon}
              </div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{stat.label}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
          <Clock className="w-8 h-8 text-amber-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-amber-800">{data?.stats.pendingSkillsCount} Skills Pending</p>
            <p className="text-sm text-amber-600">Awaiting your review</p>
          </div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-red-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-800">{data?.stats.disputedBookingsCount} Active Disputes</p>
            <p className="text-sm text-red-600">Require resolution</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Skills */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Pending Skills
            </h2>
          </CardHeader>
          <CardBody className="p-0">
            {data?.pendingSkills.length === 0 ? (
              <p className="p-6 text-gray-400 text-sm text-center">No pending skills</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {data?.pendingSkills.map(skill => (
                  <div key={skill.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{skill.title}</p>
                      <p className="text-xs text-gray-400">{skill.teacher.fullName} · {skill.category} · {skill.price} SKC</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" variant="success" onClick={() => setApproveSkill(skill.id)} icon={<Check className="w-3.5 h-3.5" />} />
                      <Button size="sm" variant="danger" onClick={() => setRejectSkill({ id: skill.id, title: skill.title })} icon={<X className="w-3.5 h-3.5" />} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Disputed Bookings */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Disputed Bookings
            </h2>
          </CardHeader>
          <CardBody className="p-0">
            {data?.disputedBookings.length === 0 ? (
              <p className="p-6 text-gray-400 text-sm text-center">No active disputes</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {data?.disputedBookings.map(booking => (
                  <div key={booking.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{booking.skill.title}</p>
                      <p className="text-xs text-gray-400">
                        {booking.learner.fullName} → {booking.teacher.fullName} · {booking.totalPrice} SKC
                      </p>
                    </div>
                    <Button size="sm" variant="danger" onClick={() => setDisputeModal(booking)}>
                      Resolve
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Recent Users */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-gray-900">Recent Users</h2>
        </CardHeader>
        <CardBody className="p-0">
          <div className="divide-y divide-gray-50">
            {data?.recentUsers.map(user => (
              <div key={user.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-amber-600">{user.skc.toFixed(0)} SKC</p>
                  <p className="text-xs text-gray-400">{format(new Date(user.createdAt), 'dd MMM yyyy')}</p>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Approve Confirm */}
      <Modal isOpen={!!approveSkill} onClose={() => setApproveSkill(null)} title="Approve Skill" size="sm">
        <p className="text-gray-600 mb-4">Approve this skill? It will appear on the marketplace immediately.</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setApproveSkill(null)} className="flex-1">Cancel</Button>
          <Button variant="success" onClick={() => approveSkill && handleApprove(approveSkill)} loading={actionLoading} className="flex-1">
            Approve
          </Button>
        </div>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={!!rejectSkill} onClose={() => { setRejectSkill(null); setRejectReason(''); }} title="Reject Skill" size="sm">
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">Rejecting: <strong>{rejectSkill?.title}</strong></p>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Rejection Reason *</label>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Explain why this skill was rejected..."
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setRejectSkill(null)} className="flex-1">Cancel</Button>
            <Button variant="danger" onClick={handleReject} loading={actionLoading} className="flex-1">Reject</Button>
          </div>
        </div>
      </Modal>

      {/* Dispute Modal */}
      <Modal isOpen={!!disputeModal} onClose={() => setDisputeModal(null)} title="Resolve Dispute" size="md">
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 text-sm">
            <p><strong>Skill:</strong> {disputeModal?.skill.title}</p>
            <p><strong>Learner:</strong> {disputeModal?.learner.fullName}</p>
            <p><strong>Teacher:</strong> {disputeModal?.teacher.fullName}</p>
            <p><strong>Amount:</strong> {disputeModal?.totalPrice} SKC</p>
            {disputeModal?.disputeReason && <p><strong>Reason:</strong> {disputeModal.disputeReason}</p>}
          </div>
          <p className="text-sm font-medium text-gray-700">Select resolution:</p>
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResolveDispute('learner_full')}
              loading={actionLoading}
              className="flex-col h-auto py-3"
            >
              <span className="text-xs">Learner</span>
              <span className="font-bold">100%</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResolveDispute('split')}
              loading={actionLoading}
              className="flex-col h-auto py-3"
            >
              <span className="text-xs">Split</span>
              <span className="font-bold">50/50</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResolveDispute('teacher_full')}
              loading={actionLoading}
              className="flex-col h-auto py-3"
            >
              <span className="text-xs">Teacher</span>
              <span className="font-bold">100%</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
