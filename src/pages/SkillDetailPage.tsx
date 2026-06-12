import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { skillsApi, bookingsApi } from '../lib/api';
import { Skill, Review } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Badge, statusBadge } from '../components/ui/Badge';
import { StarRating } from '../components/ui/StarRating';
import { Avatar } from '../components/ui/Avatar';
import { Coins, Calendar, Clock, User, Star, ArrowLeft, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

export const SkillDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [skill, setSkill] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingModal, setBookingModal] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    scheduledAt: '',
    durationHours: 1,
    message: ''
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await skillsApi.getById(parseInt(id!));
        setSkill(res.data);
      } catch {
        navigate('/marketplace');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const totalCost = skill ? skill.price * bookingForm.durationHours : 0;

  const handleBook = async () => {
    setBookingError('');
    if (!bookingForm.scheduledAt) {
      setBookingError('Please select a date and time');
      return;
    }
    if (new Date(bookingForm.scheduledAt) <= new Date()) {
      setBookingError('Scheduled time must be in the future');
      return;
    }
    setBookingLoading(true);
    try {
      await bookingsApi.create({
        skillId: skill!.id,
        scheduledAt: bookingForm.scheduledAt,
        durationHours: bookingForm.durationHours,
        message: bookingForm.message
      });
      setBookingSuccess(true);
      await refreshUser();
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Booking failed';
      setBookingError(message);
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-48 bg-gray-200 rounded-2xl" />
      </div>
    );
  }

  if (!skill) return null;

  const isOwnSkill = user?.id === skill.teacherId;
  const canBook = user && !isOwnSkill && skill.status === 'APPROVED';

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{skill.category}</Badge>
                {statusBadge(skill.status)}
              </div>
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-full">
                <Coins className="w-4 h-4" />
                <span className="font-bold">{skill.price} SKC/hr</span>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-3">{skill.title}</h1>

            <div className="flex items-center gap-3 mb-4">
              <StarRating rating={skill.avgRating} size="md" />
              <span className="text-sm text-gray-600">
                {skill.avgRating.toFixed(1)} ({skill.totalReviews} reviews)
              </span>
            </div>

            <p className="text-gray-700 leading-relaxed">{skill.description}</p>
          </div>

          {/* Teacher info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5" /> About the Teacher
            </h2>
            <div className="flex items-start gap-4">
              <Avatar src={skill.teacher?.avatar} name={skill.teacher?.fullName} size="lg" />
              <div>
                <h3 className="font-semibold text-gray-900">{skill.teacher?.fullName}</h3>
                {skill.teacher?.bio && (
                  <p className="text-gray-600 text-sm mt-1">{skill.teacher.bio}</p>
                )}
                <p className="text-xs text-gray-400 mt-2">
                  Member since {skill.teacher?.createdAt ? format(new Date(skill.teacher.createdAt), 'MMM yyyy') : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Reviews */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5" /> Reviews ({skill.totalReviews})
            </h2>
            {skill.reviews && skill.reviews.length > 0 ? (
              <div className="space-y-4">
                {skill.reviews.map((review: Review) => (
                  <div key={review.id} className="flex gap-3 pb-4 border-b border-gray-100 last:border-0">
                    <Avatar src={review.learner?.avatar} name={review.learner?.fullName} size="sm" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-900">{review.learner?.fullName}</span>
                        <StarRating rating={review.rating} />
                        <span className="text-xs text-gray-400">{format(new Date(review.createdAt), 'dd MMM yyyy')}</span>
                      </div>
                      {review.comment && <p className="text-sm text-gray-600">{review.comment}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">No reviews yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Booking */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
            <div className="text-center mb-5">
              <div className="text-3xl font-bold text-amber-600">{skill.price} SKC</div>
              <div className="text-sm text-gray-500">per hour</div>
            </div>

            {canBook ? (
              <>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => setBookingModal(true)}
                  icon={<Calendar className="w-4 h-4" />}
                >
                  Book Session
                </Button>
                <p className="text-xs text-center text-gray-400 mt-2">
                  Your balance: {user?.skc.toFixed(0)} SKC
                </p>
              </>
            ) : isOwnSkill ? (
              <div className="text-center text-sm text-gray-500 bg-gray-50 rounded-xl p-3">
                This is your skill
              </div>
            ) : !user ? (
              <Button className="w-full" size="lg" onClick={() => navigate('/login')}>
                Sign in to Book
              </Button>
            ) : null}

            <div className="mt-5 space-y-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-500" />
                <span>Platform fee: 5% of session price</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <span>Free cancellation 24h before</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <Modal
        isOpen={bookingModal}
        onClose={() => { setBookingModal(false); setBookingSuccess(false); setBookingError(''); }}
        title="Book a Session"
        size="md"
      >
        {bookingSuccess ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Booking Submitted!</h3>
            <p className="text-gray-500 mb-4">Your booking is pending teacher confirmation. SKC has been held from your balance.</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setBookingModal(false)} className="flex-1">
                Continue
              </Button>
              <Button onClick={() => navigate('/bookings')} className="flex-1">
                View Bookings
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Date & Time</label>
              <input
                type="datetime-local"
                value={bookingForm.scheduledAt}
                onChange={e => setBookingForm({ ...bookingForm, scheduledAt: e.target.value })}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Duration (hours)</label>
              <select
                value={bookingForm.durationHours}
                onChange={e => setBookingForm({ ...bookingForm, durationHours: parseInt(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {[1, 1.5, 2, 2.5, 3].map(h => <option key={h} value={h}>{h} hour{h > 1 ? 's' : ''}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Message (optional)</label>
              <textarea
                rows={3}
                value={bookingForm.message}
                onChange={e => setBookingForm({ ...bookingForm, message: e.target.value })}
                placeholder="Introduce yourself and your learning goals..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Session cost:</span>
                <span className="font-bold text-amber-700">{totalCost} SKC</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Your balance after:</span>
                <span>{((user?.skc || 0) - totalCost).toFixed(0)} SKC</span>
              </div>
            </div>

            {bookingError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {bookingError}
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setBookingModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handleBook}
                loading={bookingLoading}
                className="flex-1"
                icon={<Calendar className="w-4 h-4" />}
              >
                Confirm Booking
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
