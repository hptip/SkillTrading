const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const prisma = new PrismaClient();

// Get reviews for a skill
router.get('/skill/:skillId', async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { skillId: parseInt(req.params.skillId) },
      orderBy: { createdAt: 'desc' },
      include: {
        learner: { select: { id: true, fullName: true, avatar: true } }
      }
    });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get reviews for a teacher
router.get('/teacher/:teacherId', async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { teacherId: parseInt(req.params.teacherId) },
      orderBy: { createdAt: 'desc' },
      include: {
        learner: { select: { id: true, fullName: true, avatar: true } },
        skill: { select: { id: true, title: true } }
      }
    });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create review
router.post('/', authenticate, async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body;

    if (!bookingId || !rating) {
      return res.status(400).json({ message: 'Booking ID and rating are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(bookingId) },
      include: { review: true }
    });

    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.learnerId !== req.user.id) {
      return res.status(403).json({ message: 'Only the learner can review' });
    }
    if (booking.status !== 'COMPLETED') {
      return res.status(400).json({ message: 'Can only review completed bookings' });
    }
    if (booking.review) {
      return res.status(400).json({ message: 'This booking has already been reviewed' });
    }

    // Check 7-day limit
    const completedAt = booking.updatedAt;
    const daysSinceCompleted = (new Date() - new Date(completedAt)) / (1000 * 60 * 60 * 24);
    if (daysSinceCompleted > 7) {
      return res.status(400).json({ message: 'Review period has expired (7 days after completion)' });
    }

    const review = await prisma.$transaction(async (tx) => {
      const newReview = await tx.review.create({
        data: {
          bookingId: parseInt(bookingId),
          learnerId: req.user.id,
          skillId: booking.skillId,
          teacherId: booking.teacherId,
          rating: parseInt(rating),
          comment
        },
        include: {
          learner: { select: { id: true, fullName: true, avatar: true } }
        }
      });

      // Update skill average rating
      const skillReviews = await tx.review.aggregate({
        where: { skillId: booking.skillId },
        _avg: { rating: true },
        _count: { rating: true }
      });

      await tx.skill.update({
        where: { id: booking.skillId },
        data: {
          avgRating: skillReviews._avg.rating || 0,
          totalReviews: skillReviews._count.rating
        }
      });

      const teacherReviews = await tx.review.aggregate({
        where: { teacherId: booking.teacherId },
        _avg: { rating: true },
        _count: { rating: true }
      });

      await tx.user.update({
        where: { id: booking.teacherId },
        data: {
          avgRating: teacherReviews._avg.rating || 0,
          totalReviews: teacherReviews._count.rating
        }
      });

      return newReview;
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
