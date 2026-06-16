const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const {
  ACTIVE_BOOKING_STATUSES,
  bookingsOverlap,
  createTransaction,
  expirePendingBookings,
  getBookingEndAt,
  roundSkc,
} = require('../lib/bookingRules');

// Get my bookings
router.get('/my', authenticate, async (req, res) => {
  try {
    await expirePendingBookings(prisma);

    const { role, status } = req.query;
    const where = {};

    if (role === 'learner') where.learnerId = req.user.id;
    else if (role === 'teacher') where.teacherId = req.user.id;
    else where.OR = [{ learnerId: req.user.id }, { teacherId: req.user.id }];

    if (status) where.status = status;

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        skill: { select: { id: true, title: true, category: true, price: true } },
        learner: { select: { id: true, fullName: true, avatar: true } },
        teacher: { select: { id: true, fullName: true, avatar: true } },
        review: true,
      },
    });

    res.json(bookings);
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get booking by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    await expirePendingBookings(prisma);

    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        skill: true,
        learner: { select: { id: true, fullName: true, avatar: true, email: true } },
        teacher: { select: { id: true, fullName: true, avatar: true, email: true } },
        review: true,
        transactions: true,
      },
    });

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (booking.learnerId !== req.user.id && booking.teacherId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

function parseVietnamDateTime(value) {
  if (value instanceof Date) return new Date(value);

  const raw = String(value ?? '').trim();
  if (!raw) return new Date(NaN);

  const normalized = raw.includes(' ') ? raw.replace(' ', 'T') : raw;

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/.test(normalized)) {
    return new Date(`${normalized}+07:00`);
  }

  if (/Z$/.test(normalized) || /[+-]\d{2}:?\d{2}$/.test(normalized)) {
    return new Date(normalized);
  }

  return new Date(`${normalized}+07:00`);
}

function getVietnamParts(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
}

function parseVietnamPart(parts, type) {
  const match = parts.find((part) => part.type === type);
  return match ? match.value : '';
}

function isSlotMatch(scheduledAt, slot) {
  const scheduledDate = parseVietnamDateTime(scheduledAt);
  const parts = getVietnamParts(scheduledDate);
  const weekday = parseVietnamPart(parts, 'weekday');
  const dayMap = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  const dayNumber = dayMap[weekday] || 0;
  const hour = parseVietnamPart(parts, 'hour');
  const minute = parseVietnamPart(parts, 'minute');
  const currentTime = `${hour}:${minute}`;
  const nextHour = `${String((Number.parseInt(hour, 10) + 1) % 24).padStart(2, '0')}`;
  const endTime = `${nextHour}:${minute}`;

  return Number(slot.day) === dayNumber && currentTime === slot.start && endTime === slot.end;
}

// Create booking
router.post('/', authenticate, async (req, res) => {
  try {
    const { skillId, scheduledAt, durationHours = 1, message } = req.body;
    const parsedSkillId = parseInt(skillId);
    const duration = Number(durationHours);
    const scheduledDate = parseVietnamDateTime(scheduledAt);

    if (!parsedSkillId || Number.isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ message: 'Skill and schedule are required' });
    }
    if (!Number.isFinite(duration) || duration !== 1) {
      return res.status(400).json({ message: 'Khóa học này chỉ hỗ trợ đặt đúng 1 giờ theo khung cố định.' });
    }
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ message: 'Scheduled time must be in the future' });
    }

    const skill = await prisma.skill.findUnique({
      where: { id: parsedSkillId },
      include: { teacher: true },
    });

    if (!skill) return res.status(404).json({ message: 'Skill not found' });
    if (!skill.isPublished || skill.status !== 'APPROVED') return res.status(400).json({ message: 'Khóa học này hiện không mở để đăng ký.' });
    if (skill.teacherId === req.user.id) {
      return res.status(400).json({ message: 'Cannot book your own skill' });
    }
    if (skill.teacher.status !== 'ACTIVE') {
      return res.status(400).json({ message: 'Teacher account is not active' });
    }

    const availabilitySlots = Array.isArray(skill.availabilitySlots) ? skill.availabilitySlots : [];
    const slotMatch = availabilitySlots.find((slot) => isSlotMatch(scheduledDate, slot));

    if (!slotMatch) {
      return res.status(400).json({ message: 'Bạn chỉ được chọn khung giờ cố định do người dạy bật.' });
    }

    const totalPrice = roundSkc(skill.price * duration);
    const learner = await prisma.user.findUnique({ where: { id: req.user.id } });

    if (!learner || learner.skc < totalPrice) {
      return res.status(400).json({
        message: `Insufficient SKC. You need ${totalPrice} SKC but have ${learner?.skc || 0} SKC`,
      });
    }

    const endDate = new Date(scheduledDate.getTime() + duration * 60 * 60 * 1000);
    const relatedActiveBookings = await prisma.booking.findMany({
      where: {
        status: { in: ACTIVE_BOOKING_STATUSES },
        OR: [
          { learnerId: req.user.id },
          { teacherId: req.user.id },
          { learnerId: skill.teacherId },
          { teacherId: skill.teacherId },
        ],
      },
      select: {
        id: true,
        learnerId: true,
        teacherId: true,
        scheduledAt: true,
        durationHours: true,
      },
    });

    const conflictingBooking = relatedActiveBookings.find((booking) => (
      bookingsOverlap(scheduledDate, endDate, new Date(booking.scheduledAt), getBookingEndAt(booking))
    ));

    if (conflictingBooking) {
      const isTeacherConflict = conflictingBooking.learnerId === skill.teacherId
        || conflictingBooking.teacherId === skill.teacherId;
      return res.status(400).json({
        message: isTeacherConflict
          ? 'Teacher already has an active booking at this time'
          : 'You already have an active booking at this time',
      });
    }

    const booking = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          learnerId: req.user.id,
          teacherId: skill.teacherId,
          skillId: skill.id,
          scheduledAt: scheduledDate,
          durationHours: duration,
          totalPrice,
          message,
          slotDay: slotMatch.day,
          slotStartTime: slotMatch.start,
          slotEndTime: slotMatch.end,
          timezone: skill.timezone || 'Asia/Ho_Chi_Minh',
          status: 'PENDING',
        },
        include: {
          skill: { select: { id: true, title: true, category: true } },
          learner: { select: { id: true, fullName: true, avatar: true } },
          teacher: { select: { id: true, fullName: true, avatar: true } },
        },
      });

      await createTransaction(
        tx,
        req.user.id,
        'HOLD',
        -totalPrice,
        `SKC held for booking skill: ${skill.title}`,
        newBooking.id
      );

      return newBooking;
    });

    res.status(201).json(booking);
  } catch (error) {
    console.error('Create booking error:', error);
    const message = error.message === 'SKC balance cannot be negative'
      ? 'Insufficient SKC'
      : 'Server error';
    res.status(message === 'Insufficient SKC' ? 400 : 500).json({ message });
  }
});

// Confirm booking completion (teacher or learner)
router.post('/:id/confirm', authenticate, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    if (req.user.id !== booking.teacherId && req.user.id !== booking.learnerId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const now = new Date();
    const updates = {};
    if (req.user.id === booking.teacherId) updates.teacherConfirmedAt = now;
    if (req.user.id === booking.learnerId) updates.learnerConfirmedAt = now;

    const updated = await prisma.booking.update({ where: { id: bookingId }, data: updates });

    // If both parties confirmed and booking not already completed, finalize and credit teacher
    const finalBooking = await prisma.booking.findUnique({ where: { id: bookingId } });
    if (finalBooking.teacherConfirmedAt && finalBooking.learnerConfirmedAt && finalBooking.status !== 'COMPLETED') {
      await prisma.$transaction(async (tx) => {
        await tx.booking.update({ where: { id: bookingId }, data: { status: 'COMPLETED' } });
        const teacherAmount = Number(finalBooking.totalPrice) * 0.95; // teacher receives 95%
        await createTransaction(tx, finalBooking.teacherId, 'REVENUE', teacherAmount, `Revenue for booking ${finalBooking.id}`, finalBooking.id);
      });
    }

    res.json({ message: 'Confirmation recorded' });
  } catch (error) {
    console.error('Confirm booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Confirm booking (Teacher)
router.put('/:id/confirm', authenticate, async (req, res) => {
  try {
    await expirePendingBookings(prisma);

    const bookingId = parseInt(req.params.id);
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { skill: true },
    });

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.teacherId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
    if (booking.status !== 'PENDING') {
      return res.status(400).json({ message: 'Booking is not in PENDING status' });
    }

    const now = new Date();
    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED', teacherConfirmedAt: now },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject booking (Teacher)
router.put('/:id/reject', authenticate, async (req, res) => {
  try {
    await expirePendingBookings(prisma);

    const bookingId = parseInt(req.params.id);
    const { reason } = req.body;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { skill: true, learner: true },
    });

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.teacherId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
    if (booking.status !== 'PENDING') {
      return res.status(400).json({ message: 'Booking is not in PENDING status' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED', cancelReason: reason || 'Rejected by teacher' },
      });

      await createTransaction(
        tx,
        booking.learnerId,
        'REFUND',
        booking.totalPrice,
        `Refund for rejected booking: ${booking.skill.title}`,
        bookingId
      );
    });

    res.json({ message: 'Booking rejected and refund issued' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Complete booking (Teacher or Learner)
router.put('/:id/complete', authenticate, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { skill: true },
    });

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.learnerId !== req.user.id && booking.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (booking.status !== 'CONFIRMED') {
      return res.status(400).json({ message: 'Booking must be CONFIRMED to complete' });
    }

    const teacherEarning = roundSkc(booking.totalPrice * 0.95);
    const platformFee = roundSkc(booking.totalPrice * 0.05);

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'COMPLETED' },
      });

      await createTransaction(
        tx,
        booking.teacherId,
        'EARN',
        teacherEarning,
        `Payment for completed session: ${booking.skill.title} (95% after 5% platform fee)`,
        bookingId
      );
    });

    res.json({ message: 'Booking completed successfully', teacherEarning, platformFee });
  } catch (error) {
    console.error('Complete booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel booking (Learner or Teacher)
router.put('/:id/cancel', authenticate, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { reason } = req.body;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { skill: true },
    });

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const isLearner = booking.learnerId === req.user.id;
    const isTeacher = booking.teacherId === req.user.id;

    if (!isLearner && !isTeacher) return res.status(403).json({ message: 'Forbidden' });
    if (!ACTIVE_BOOKING_STATUSES.includes(booking.status)) {
      return res.status(400).json({ message: 'Cannot cancel this booking' });
    }

    let refundAmount = 0;
    let refundDesc = '';

    if (isTeacher) {
      refundAmount = booking.totalPrice;
      refundDesc = `Full refund - Teacher cancelled: ${booking.skill.title}`;
    } else {
      // New cancellation policy:
      // - If learner cancels BEFORE teacher confirmed (PENDING): full refund (100%)
      // - If learner cancels AFTER teacher confirmed (CONFIRMED): 50% refund
      if (booking.status === 'PENDING') {
        refundAmount = booking.totalPrice;
        refundDesc = `Full refund - Learner cancelled before teacher confirmed: ${booking.skill.title}`;
      } else if (booking.status === 'CONFIRMED') {
        refundAmount = roundSkc(booking.totalPrice * 0.5);
        refundDesc = `50% refund - Learner cancelled after teacher confirmed: ${booking.skill.title}`;
      } else {
        refundAmount = 0;
        refundDesc = `No refund for this cancellation: ${booking.skill.title}`;
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED', cancelReason: reason || 'Cancelled by user' },
      });

      if (refundAmount > 0) {
        await createTransaction(tx, booking.learnerId, 'REFUND', refundAmount, refundDesc, bookingId);
      }
    });

    res.json({ message: 'Booking cancelled', refundAmount });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Dispute booking
router.put('/:id/dispute', authenticate, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { reason } = req.body;
    const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.learnerId !== req.user.id && booking.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (booking.status !== 'CONFIRMED') {
      return res.status(400).json({ message: 'Can only dispute confirmed bookings' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Dispute reason is required' });
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'DISPUTED', disputeReason: reason },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
