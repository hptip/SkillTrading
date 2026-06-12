const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const prisma = new PrismaClient();

// Helper: create transaction
async function createTransaction(prismaClient, userId, type, amount, description, bookingId = null) {
  const user = await prismaClient.user.findUnique({ where: { id: userId } });
  const balanceBefore = user.skc;
  const balanceAfter = balanceBefore + amount;

  await prismaClient.user.update({
    where: { id: userId },
    data: { skc: balanceAfter }
  });

  await prismaClient.transaction.create({
    data: {
      userId,
      type,
      amount,
      balanceBefore,
      balanceAfter,
      description,
      bookingId
    }
  });

  return balanceAfter;
}

// Get my bookings
router.get('/my', authenticate, async (req, res) => {
  try {
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
      }
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
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        skill: true,
        learner: { select: { id: true, fullName: true, avatar: true, email: true } },
        teacher: { select: { id: true, fullName: true, avatar: true, email: true } },
        review: true,
        transactions: true,
      }
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

// Create booking
router.post('/', authenticate, async (req, res) => {
  try {
    const { skillId, scheduledAt, durationHours = 1, message } = req.body;

    const skill = await prisma.skill.findUnique({
      where: { id: parseInt(skillId) },
      include: { teacher: true }
    });

    if (!skill) return res.status(404).json({ message: 'Skill not found' });
    if (skill.status !== 'APPROVED') return res.status(400).json({ message: 'Skill is not available' });
    if (skill.teacherId === req.user.id) {
      return res.status(400).json({ message: 'Cannot book your own skill' });
    }

    const totalPrice = skill.price * parseInt(durationHours);

    if (req.user.skc < totalPrice) {
      return res.status(400).json({ message: `Insufficient SKC. You need ${totalPrice} SKC but have ${req.user.skc} SKC` });
    }

    // Check time conflict for learner
    const scheduledDate = new Date(scheduledAt);
    const endDate = new Date(scheduledDate.getTime() + parseInt(durationHours) * 60 * 60 * 1000);

    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        learnerId: req.user.id,
        status: { in: ['PENDING', 'CONFIRMED'] },
        scheduledAt: {
          gte: new Date(scheduledDate.getTime() - parseInt(durationHours) * 60 * 60 * 1000),
          lte: endDate
        }
      }
    });

    if (conflictingBooking) {
      return res.status(400).json({ message: 'You have a conflicting booking at this time' });
    }

    const booking = await prisma.$transaction(async (tx) => {
      // Deduct SKC from learner (HOLD)
      await createTransaction(tx, req.user.id, 'HOLD', -totalPrice,
        `SKC held for booking skill: ${skill.title}`, null);

      const newBooking = await tx.booking.create({
        data: {
          learnerId: req.user.id,
          teacherId: skill.teacherId,
          skillId: skill.id,
          scheduledAt: scheduledDate,
          durationHours: parseInt(durationHours),
          totalPrice,
          message,
          status: 'PENDING'
        },
        include: {
          skill: { select: { id: true, title: true, category: true } },
          learner: { select: { id: true, fullName: true, avatar: true } },
          teacher: { select: { id: true, fullName: true, avatar: true } },
        }
      });

      // Update transaction with booking ID
      await tx.transaction.updateMany({
        where: { userId: req.user.id, type: 'HOLD', bookingId: null },
        data: { bookingId: newBooking.id }
      });

      return newBooking;
    });

    res.status(201).json(booking);
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Confirm booking (Teacher)
router.put('/:id/confirm', authenticate, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { skill: true }
    });

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.teacherId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
    if (booking.status !== 'PENDING') {
      return res.status(400).json({ message: 'Booking is not in PENDING status' });
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CONFIRMED' }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject booking (Teacher)
router.put('/:id/reject', authenticate, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { reason } = req.body;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { skill: true, learner: true }
    });

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.teacherId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
    if (booking.status !== 'PENDING') {
      return res.status(400).json({ message: 'Booking is not in PENDING status' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED', cancelReason: reason || 'Rejected by teacher' }
      });

      // Refund 100% to learner
      await createTransaction(tx, booking.learnerId, 'REFUND', booking.totalPrice,
        `Refund for rejected booking: ${booking.skill.title}`, bookingId);
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
      include: { skill: true }
    });

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.learnerId !== req.user.id && booking.teacherId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    if (booking.status !== 'CONFIRMED') {
      return res.status(400).json({ message: 'Booking must be CONFIRMED to complete' });
    }

    const teacherEarning = booking.totalPrice * 0.95;
    const platformFee = booking.totalPrice * 0.05;

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'COMPLETED' }
      });

      // Pay teacher 95%
      await createTransaction(tx, booking.teacherId, 'EARN', teacherEarning,
        `Payment for completed session: ${booking.skill.title} (95% after 5% platform fee)`, bookingId);
    });

    res.json({ message: 'Booking completed successfully', teacherEarning, platformFee });
  } catch (error) {
    console.error('Complete booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel booking (Learner)
router.put('/:id/cancel', authenticate, async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id);
    const { reason } = req.body;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { skill: true }
    });

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const isLearner = booking.learnerId === req.user.id;
    const isTeacher = booking.teacherId === req.user.id;

    if (!isLearner && !isTeacher) return res.status(403).json({ message: 'Forbidden' });
    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      return res.status(400).json({ message: 'Cannot cancel this booking' });
    }

    let refundAmount = 0;
    let refundDesc = '';

    if (isTeacher) {
      // Teacher cancels: 100% refund
      refundAmount = booking.totalPrice;
      refundDesc = `Full refund - Teacher cancelled: ${booking.skill.title}`;
    } else {
      // Learner cancels: check time
      const hoursUntilSession = (new Date(booking.scheduledAt) - new Date()) / (1000 * 60 * 60);
      if (hoursUntilSession >= 24) {
        refundAmount = booking.totalPrice;
        refundDesc = `Full refund - Cancelled 24h+ before session: ${booking.skill.title}`;
      } else {
        refundAmount = booking.totalPrice * 0.5;
        refundDesc = `50% refund - Cancelled within 24h: ${booking.skill.title}`;
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED', cancelReason: reason || 'Cancelled by user' }
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

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'DISPUTED', disputeReason: reason }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
