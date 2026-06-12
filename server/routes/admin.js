const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { createTransaction, expirePendingBookings } = require('../lib/bookingRules');

const prisma = new PrismaClient();

// Apply auth + admin middleware to all routes
router.use(authenticate, requireAdmin);

// Dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    await expirePendingBookings(prisma);

    const [
      totalUsers, totalSkills, totalBookings,
      pendingSkills, disputedBookings,
      totalSkc, recentUsers, recentBookings
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.skill.count(),
      prisma.booking.count(),
      prisma.skill.findMany({
        where: { status: 'PENDING' },
        include: { teacher: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.booking.findMany({
        where: { status: 'DISPUTED' },
        include: {
          skill: { select: { title: true } },
          learner: { select: { id: true, fullName: true } },
          teacher: { select: { id: true, fullName: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 10
      }),
      prisma.user.aggregate({ _sum: { skc: true } }),
      prisma.user.findMany({
        where: { role: 'USER' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, fullName: true, email: true, createdAt: true, skc: true }
      }),
      prisma.booking.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          skill: { select: { title: true } },
          learner: { select: { fullName: true } },
        }
      })
    ]);

    const bookingStats = await prisma.booking.groupBy({
      by: ['status'],
      _count: { status: true }
    });

    res.json({
      stats: {
        totalUsers,
        totalSkills,
        totalBookings,
        totalSkc: totalSkc._sum.skc || 0,
        pendingSkillsCount: pendingSkills.length,
        disputedBookingsCount: disputedBookings.length,
      },
      pendingSkills,
      disputedBookings,
      bookingStats,
      recentUsers,
      recentBookings
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===== USER MANAGEMENT =====
router.get('/users', async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    const where = { role: 'USER' };

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        select: {
          id: true, email: true, fullName: true, status: true,
          skc: true, createdAt: true, role: true,
          _count: {
            select: { skills: true, bookingsAsLearner: true, bookingsAsTeacher: true }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    res.json({ users, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        skills: { orderBy: { createdAt: 'desc' } },
        bookingsAsLearner: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { skill: { select: { title: true } }, teacher: { select: { fullName: true } } }
        },
        bookingsAsTeacher: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { skill: { select: { title: true } }, learner: { select: { fullName: true } } }
        },
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!user) return res.status(404).json({ message: 'User not found' });

    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/users/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'SUSPENDED', 'BANNED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const user = await prisma.user.update({
      where: { id: parseInt(req.params.id) },
      data: { status },
      select: { id: true, email: true, fullName: true, status: true }
    });

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/users/:id/adjust-skc', async (req, res) => {
  try {
    const { amount, reason } = req.body;
    if (!amount || !reason) {
      return res.status(400).json({ message: 'Amount and reason are required' });
    }

    const userId = parseInt(req.params.id);
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const newBalance = user.skc + parseFloat(amount);
    if (newBalance < 0) {
      return res.status(400).json({ message: 'SKC cannot go below 0' });
    }

    await prisma.$transaction(async (tx) => {
      await createTransaction(tx, userId, 'ADJUST', parseFloat(amount),
        `Admin adjustment: ${reason}`);
    });

    res.json({ message: 'SKC adjusted successfully', newBalance });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ===== SKILL MANAGEMENT =====
router.get('/skills', async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const where = {};

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } }
      ];
    }

    const [skills, total] = await Promise.all([
      prisma.skill.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          teacher: { select: { id: true, fullName: true, email: true } },
          _count: { select: { bookings: true, reviews: true } }
        }
      }),
      prisma.skill.count({ where })
    ]);

    res.json({ skills, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/skills/:id/approve', async (req, res) => {
  try {
    const skill = await prisma.skill.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'APPROVED', rejectReason: null }
    });
    res.json(skill);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/skills/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ message: 'Rejection reason is required' });

    const skill = await prisma.skill.update({
      where: { id: parseInt(req.params.id) },
      data: { status: 'REJECTED', rejectReason: reason }
    });
    res.json(skill);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/skills/:id', async (req, res) => {
  try {
    const skillId = parseInt(req.params.id);
    // Delete reviews and bookings first
    await prisma.review.deleteMany({ where: { skillId } });
    const bookings = await prisma.booking.findMany({ where: { skillId }, select: { id: true } });
    const bookingIds = bookings.map(b => b.id);
    await prisma.transaction.deleteMany({ where: { bookingId: { in: bookingIds } } });
    await prisma.booking.deleteMany({ where: { skillId } });
    await prisma.skill.delete({ where: { id: skillId } });

    res.json({ message: 'Skill deleted successfully' });
  } catch (error) {
    console.error('Delete skill error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ===== BOOKING MANAGEMENT =====
router.get('/bookings', async (req, res) => {
  try {
    await expirePendingBookings(prisma);

    const { status, page = 1, limit = 20 } = req.query;
    const where = {};
    if (status) where.status = status;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          skill: { select: { id: true, title: true, category: true } },
          learner: { select: { id: true, fullName: true, email: true } },
          teacher: { select: { id: true, fullName: true, email: true } },
        }
      }),
      prisma.booking.count({ where })
    ]);

    res.json({ bookings, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Resolve dispute
router.put('/bookings/:id/resolve-dispute', async (req, res) => {
  try {
    const { resolution } = req.body; // 'learner_full', 'teacher_full', 'split'
    const bookingId = parseInt(req.params.id);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { skill: true }
    });

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.status !== 'DISPUTED') {
      return res.status(400).json({ message: 'Booking is not in DISPUTED status' });
    }
    if (!['learner_full', 'teacher_full', 'split'].includes(resolution)) {
      return res.status(400).json({ message: 'Invalid dispute resolution' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' }
      });

      if (resolution === 'learner_full') {
        await createTransaction(tx, booking.learnerId, 'REFUND', booking.totalPrice,
          `Dispute resolved: Full refund to learner`, bookingId);
      } else if (resolution === 'teacher_full') {
        await createTransaction(tx, booking.teacherId, 'EARN', booking.totalPrice,
          `Dispute resolved: Full payment to teacher`, bookingId);
      } else if (resolution === 'split') {
        const half = booking.totalPrice / 2;
        await createTransaction(tx, booking.learnerId, 'REFUND', half,
          `Dispute resolved: 50% refund to learner`, bookingId);
        await createTransaction(tx, booking.teacherId, 'EARN', half,
          `Dispute resolved: 50% payment to teacher`, bookingId);
      }
    });

    res.json({ message: 'Dispute resolved successfully' });
  } catch (error) {
    console.error('Resolve dispute error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
