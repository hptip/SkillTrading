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
import { Coins, Calendar, Clock, User, Star, ArrowLeft, MessageSquare, Images, CalendarRange } from 'lucide-react';
import { format } from 'date-fns';
import { getNextWeeklySlotDate } from '../lib/slotUtils';

export const SkillDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [skill, setSkill] = useState<Skill | null>(null);
  const [loading, setLoading] = useState(true);
  const [bookingModal, setBookingModal] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    durationHours: 1,
    message: ''
  });
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await skillsApi.getById(parseInt(id!));
        setSkill(res.data);
        if (res.data?.availabilitySlots?.length) {
          setSelectedSlot(`${res.data.availabilitySlots[0].day}|${res.data.availabilitySlots[0].start}`);
        }
      } catch {
        navigate('/marketplace');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id, navigate]);

  const totalCost = skill ? skill.price * bookingForm.durationHours : 0;
  const selectedSlotData = skill?.availabilitySlots?.find((slot) => `${slot.day}|${slot.start}` === selectedSlot) || null;
  const scheduledPreview = selectedSlotData ? getNextWeeklySlotDate(selectedSlotData.day, selectedSlotData.start) : '';

  const handleBook = async () => {
    setBookingError('');
    if (!selectedSlotData) {
      setBookingError('Vui lòng chọn một khung giờ cố định để đặt lịch.');
      return;
    }
    const scheduledAt = getNextWeeklySlotDate(selectedSlotData.day, selectedSlotData.start);
    if (!scheduledAt || new Date(scheduledAt) <= new Date()) {
      setBookingError('Khung giờ này đã hết hạn, vui lòng chọn khung khác.');
      return;
    }
    setBookingLoading(true);
    try {
      await bookingsApi.create({
        skillId: skill!.id,
        scheduledAt,
        durationHours: 1,
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

            {skill.coverImage && (
              <div className="mt-6 rounded-2xl border border-gray-100 overflow-hidden bg-gray-50">
                <img src={skill.coverImage} alt={skill.title} className="h-72 w-full object-cover" />
              </div>
            )}

            {skill.galleryImages && skill.galleryImages.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-3">
                  <Images className="w-4 h-4 text-violet-500" /> Ảnh minh họa
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {skill.galleryImages.map((image, index) => (
                    <img key={`${image}-${index}`} src={image} alt={`${skill.title} gallery ${index + 1}`} className="h-28 w-full rounded-xl object-cover border border-gray-100" />
                  ))}
                </div>
              </div>
            )}
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
              <label className="text-sm font-medium text-gray-700 block mb-1">Khung giờ cố định</label>
              <div className="grid gap-2">
                {skill?.availabilitySlots?.map((slot) => {
                  const value = `${slot.day}|${slot.start}`;
                  const isSelected = selectedSlot === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSelectedSlot(value)}
                      className={`rounded-xl border px-3 py-3 text-left transition ${isSelected ? 'border-violet-500 bg-violet-50' : 'border-gray-200 bg-white hover:border-violet-200'}`}
                    >
                      <div className="text-sm font-semibold text-gray-900">{['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][Number(slot.day) % 7]} · {slot.start}–{slot.end}</div>
                      <div className="text-xs text-gray-500">Lịch học đầu tiên: {getNextWeeklySlotDate(slot.day, slot.start)}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Hệ thống sẽ tự tạo lịch học đúng 1 giờ theo khung cố định bạn chọn, theo múi giờ Việt Nam.
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
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Khung đã chọn:</span>
                <span className="font-semibold text-amber-700">{selectedSlotData ? `${['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][Number(selectedSlotData.day) % 7]} ${selectedSlotData.start}–${selectedSlotData.end}` : 'Chưa chọn'}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Lịch học đầu tiên:</span>
                <span>{scheduledPreview ? format(new Date(scheduledPreview), 'dd/MM/yyyy HH:mm') : '—'}</span>
              </div>
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
