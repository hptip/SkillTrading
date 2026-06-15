import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { bookingsApi, reviewsApi } from '../lib/api';
import { Booking } from '../types';
import { Card, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { statusBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Avatar } from '../components/ui/Avatar';
import { StarRating } from '../components/ui/StarRating';
import {
  Calendar, Clock, Coins, Check, X, CheckCheck, AlertTriangle, MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';

export const BookingsPage = () => {
  const { user, refreshUser } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<'learner' | 'teacher'>('learner');
  const [statusFilter, setStatusFilter] = useState('');

  const [actionModal, setActionModal] = useState<{ type: string; booking: Booking } | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [reviewModal, setReviewModal] = useState<Booking | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await bookingsApi.getMy({ role, status: statusFilter || undefined });
      setBookings(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBookings(); }, [role, statusFilter]);

  const handleAction = async () => {
    if (!actionModal) return;
    setActionLoading(true);
    try {
      const { type, booking } = actionModal;
      if (type === 'confirm') await bookingsApi.confirm(booking.id);
      else if (type === 'reject') await bookingsApi.reject(booking.id, actionReason);
      else if (type === 'complete') await bookingsApi.complete(booking.id);
      else if (type === 'cancel') await bookingsApi.cancel(booking.id, actionReason);
      else if (type === 'dispute') await bookingsApi.dispute(booking.id, actionReason);
      setActionModal(null);
      setActionReason('');
      fetchBookings();
      refreshUser();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReview = async () => {
    if (!reviewModal) return;
    setReviewLoading(true);
    try {
      await reviewsApi.create({ bookingId: reviewModal.id, rating: reviewRating, comment: reviewComment });
      setReviewModal(null);
      setReviewRating(5);
      setReviewComment('');
      fetchBookings();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Review failed');
    } finally {
      setReviewLoading(false);
    }
  };

  const statusOptions = ['', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'DISPUTED'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
        <p className="text-gray-500 mt-1">Manage your learning and teaching sessions</p>
      </div>

      {/* Role + Status Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex rounded-xl border border-gray-200 bg-white overflow-hidden">
          {(['learner', 'teacher'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`flex-1 px-5 py-2.5 text-sm font-medium transition-colors ${
                role === r ? 'bg-violet-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              As {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          {statusOptions.map(s => (
            <option key={s} value={s}>{s || 'All Status'}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-36 animate-pulse" />
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-lg font-medium text-gray-700">No bookings found</p>
          <p className="text-sm text-gray-500">
            {role === 'learner' ? 'Browse the marketplace to book a skill' : 'Your bookings from learners will appear here'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map(booking => (
            <BookingCard
              key={booking.id}
              booking={booking}
              role={role}
              userId={user!.id}
              onConfirm={() => setActionModal({ type: 'confirm', booking })}
              onReject={() => setActionModal({ type: 'reject', booking })}
              onComplete={() => setActionModal({ type: 'complete', booking })}
              onCancel={() => setActionModal({ type: 'cancel', booking })}
              onDispute={() => setActionModal({ type: 'dispute', booking })}
              onReview={() => setReviewModal(booking)}
            />
          ))}
        </div>
      )}

      {/* Action Modal */}
      <Modal
        isOpen={!!actionModal}
        onClose={() => { setActionModal(null); setActionReason(''); }}
        title={
          actionModal?.type === 'confirm' ? 'Confirm Booking'
          : actionModal?.type === 'reject' ? 'Reject Booking'
          : actionModal?.type === 'complete' ? 'Mark as Completed'
          : actionModal?.type === 'cancel' ? 'Cancel Booking'
          : 'Report Dispute'
        }
        size="sm"
      >
        <div className="space-y-4">
          {(actionModal?.type === 'reject' || actionModal?.type === 'cancel' || actionModal?.type === 'dispute') && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                {actionModal?.type === 'dispute' ? 'Dispute Reason *' : 'Reason (optional)'}
              </label>
              <textarea
                rows={3}
                value={actionReason}
                onChange={e => setActionReason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Enter reason..."
              />
            </div>
          )}

          {actionModal?.type === 'cancel' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
              <strong>Refund policy:</strong> Cancelling 24h+ before → 100% refund. Within 24h → 50% refund.
            </div>
          )}

          {actionModal?.type === 'confirm' && (
            <p className="text-gray-600 text-sm">Confirm this booking? The learner's SKC will remain held until session completion.</p>
          )}
          {actionModal?.type === 'complete' && (
            <p className="text-gray-600 text-sm">Mark this session as completed? Teacher will receive 95% of the booking amount.</p>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setActionModal(null)} className="flex-1">Cancel</Button>
            <Button
              variant={actionModal?.type === 'reject' || actionModal?.type === 'cancel' ? 'danger' : actionModal?.type === 'complete' ? 'success' : 'primary'}
              onClick={handleAction}
              loading={actionLoading}
              className="flex-1"
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>

      {/* Review Modal */}
      <Modal
        isOpen={!!reviewModal}
        onClose={() => setReviewModal(null)}
        title="Write a Review"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Skill: <strong>{reviewModal?.skill?.title}</strong></p>
            <p className="text-sm font-medium text-gray-700 mb-2">Rating:</p>
            <StarRating
              rating={reviewRating}
              size="lg"
              interactive
              onChange={setReviewRating}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Comment (optional)</label>
            <textarea
              rows={4}
              value={reviewComment}
              onChange={e => setReviewComment(e.target.value)}
              placeholder="Share your experience..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setReviewModal(null)} className="flex-1">Cancel</Button>
            <Button onClick={handleReview} loading={reviewLoading} className="flex-1">Submit Review</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

interface BookingCardProps {
  booking: Booking;
  role: 'learner' | 'teacher';
  userId: number;
  onConfirm: () => void;
  onReject: () => void;
  onComplete: () => void;
  onCancel: () => void;
  onDispute: () => void;
  onReview: () => void;
}

const BookingCard = ({ booking, role, onConfirm, onReject, onComplete, onCancel, onDispute, onReview }: BookingCardProps) => {
  const otherPerson = role === 'learner' ? booking.teacher : booking.learner;

  const canReview = role === 'learner'
    && booking.status === 'COMPLETED'
    && !booking.review;

  const daysSinceCompleted = booking.status === 'COMPLETED'
    ? (Date.now() - new Date(booking.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
    : 0;
  const reviewExpired = daysSinceCompleted > 7;

  return (
    <Card>
      <CardBody className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <Avatar src={otherPerson?.avatar} name={otherPerson?.fullName} size="md" />

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">{booking.skill?.title}</h3>
              {statusBadge(booking.status)}
            </div>

            <p className="text-sm text-gray-500 mb-2">
              {role === 'learner' ? 'Teacher' : 'Learner'}: <span className="font-medium text-gray-700">{otherPerson?.fullName}</span>
            </p>

            <div className="flex flex-wrap gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {format(new Date(booking.scheduledAt), 'dd MMM yyyy, HH:mm')}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {booking.durationHours}h
              </span>
              <span className="flex items-center gap-1 font-semibold text-amber-600">
                <Coins className="w-3.5 h-3.5" />
                {booking.totalPrice} SKC
              </span>
            </div>

            {booking.message && (
              <p className="mt-2 text-xs text-gray-400 italic">"{booking.message}"</p>
            )}

            {booking.cancelReason && (
              <p className="mt-2 text-xs text-red-500">Cancel reason: {booking.cancelReason}</p>
            )}

            {booking.review && (
              <div className="mt-2 flex items-center gap-1">
                <StarRating rating={booking.review.rating} />
                <span className="text-xs text-gray-400">You reviewed this</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 shrink-0">
            {/* Teacher actions */}
            {role === 'teacher' && booking.status === 'PENDING' && (
              <>
                <Button size="sm" variant="success" onClick={onConfirm} icon={<Check className="w-3.5 h-3.5" />}>
                  Confirm
                </Button>
                <Button size="sm" variant="danger" onClick={onReject} icon={<X className="w-3.5 h-3.5" />}>
                  Reject
                </Button>
              </>
            )}

            {/* Complete (both) */}
            {booking.status === 'CONFIRMED' && (
              <Button size="sm" variant="success" onClick={onComplete} icon={<CheckCheck className="w-3.5 h-3.5" />}>
                Complete
              </Button>
            )}

            {/* Dispute */}
            {booking.status === 'CONFIRMED' && (
              <Button size="sm" variant="outline" onClick={onDispute} icon={<AlertTriangle className="w-3.5 h-3.5" />}>
                Dispute
              </Button>
            )}

            {/* Cancel (learner: pending/confirmed, teacher: pending/confirmed) */}
            {['PENDING', 'CONFIRMED'].includes(booking.status) && (
              <Button size="sm" variant="ghost" onClick={onCancel} icon={<X className="w-3.5 h-3.5" />}>
                Cancel
              </Button>
            )}

            {/* Review */}
            {canReview && !reviewExpired && (
              <Button size="sm" onClick={onReview} icon={<MessageSquare className="w-3.5 h-3.5" />}>
                Review
              </Button>
            )}
            {canReview && reviewExpired && (
              <span className="text-xs text-gray-400">Review expired</span>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
