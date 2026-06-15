export type UserRole = 'USER' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED';
export type SkillStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED';
export type TransactionType = 'BONUS' | 'HOLD' | 'RELEASE' | 'EARN' | 'SPEND' | 'REFUND' | 'ADJUST' | 'FEE';

export interface User {
  id: number;
  email: string;
  fullName: string;
  bio?: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  skc: number;
  avgRating?: number;
  totalReviews?: number;
  createdAt?: string;
}

export interface AvailabilitySlot {
  day: string;
  start: string;
  end: string;
  label: string;
}

export interface Skill {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  status: SkillStatus;
  rejectReason?: string;
  teacherId: number;
  coverImage?: string;
  galleryImages?: string[];
  availabilitySlots?: AvailabilitySlot[];
  isPublished?: boolean;
  timezone?: string;
  teacher?: Pick<User, 'id' | 'fullName' | 'avatar' | 'bio' | 'avgRating' | 'totalReviews' | 'createdAt'>;
  avgRating: number;
  totalReviews: number;
  createdAt: string;
  updatedAt: string;
  _count?: { bookings: number };
  reviews?: Review[];
}

export interface Booking {
  id: number;
  learnerId: number;
  teacherId: number;
  skillId: number;
  scheduledAt: string;
  durationHours: number;
  slotDay?: string;
  slotStartTime?: string;
  slotEndTime?: string;
  totalPrice: number;
  status: BookingStatus;
  message?: string;
  disputeReason?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
  skill?: Pick<Skill, 'id' | 'title' | 'category' | 'price'>;
  learner?: Pick<User, 'id' | 'fullName' | 'avatar'>;
  teacher?: Pick<User, 'id' | 'fullName' | 'avatar'>;
  review?: Review;
}

export interface Review {
  id: number;
  bookingId: number;
  learnerId: number;
  skillId: number;
  teacherId: number;
  rating: number;
  comment?: string;
  createdAt: string;
  learner?: Pick<User, 'id' | 'fullName' | 'avatar'>;
  skill?: Pick<Skill, 'id' | 'title'>;
}

export interface Transaction {
  id: number;
  userId: number;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  bookingId?: number;
  createdAt: string;
  booking?: { id: number; skill: { title: string } };
}
