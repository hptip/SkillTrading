const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const prisma = new PrismaClient();

// Get all approved skills (marketplace)
router.get('/', async (req, res) => {
  try {
    const { category, minPrice, maxPrice, sortBy, search, page = 1, limit = 12 } = req.query;

    const where = { status: 'APPROVED' };

    if (category) where.category = category;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    let orderBy = { createdAt: 'desc' };
    if (sortBy === 'price_asc') orderBy = { price: 'asc' };
    if (sortBy === 'price_desc') orderBy = { price: 'desc' };
    if (sortBy === 'rating') orderBy = { avgRating: 'desc' };
    if (sortBy === 'popular') orderBy = { totalReviews: 'desc' };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [skills, total] = await Promise.all([
      prisma.skill.findMany({
        where,
        orderBy,
        skip,
        take: parseInt(limit),
        include: {
          teacher: {
            select: { id: true, fullName: true, avatar: true }
          },
          _count: { select: { bookings: true } }
        }
      }),
      prisma.skill.count({ where })
    ]);

    res.json({ skills, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    console.error('Get skills error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.skill.findMany({
      where: { status: 'APPROVED' },
      select: { category: true },
      distinct: ['category']
    });
    res.json(categories.map(c => c.category));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get my skills (teacher view)
router.get('/my', authenticate, async (req, res) => {
  try {
    const skills = await prisma.skill.findMany({
      where: { teacherId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { bookings: true, reviews: true } }
      }
    });
    res.json(skills);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get skill by ID
router.get('/:id', async (req, res) => {
  try {
    const skill = await prisma.skill.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        teacher: {
          select: { id: true, fullName: true, avatar: true, bio: true, createdAt: true }
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            learner: { select: { id: true, fullName: true, avatar: true } }
          }
        },
        _count: { select: { bookings: true } }
      }
    });

    if (!skill) {
      return res.status(404).json({ message: 'Skill not found' });
    }

    res.json(skill);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create skill
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, description, category, price } = req.body;

    if (!title || !description || !category || !price) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (price < 30 || price > 300) {
      return res.status(400).json({ message: 'Price must be between 30 and 300 SKC' });
    }

    const skill = await prisma.skill.create({
      data: {
        title,
        description,
        category,
        price: parseFloat(price),
        teacherId: req.user.id,
        status: 'PENDING'
      },
      include: {
        teacher: { select: { id: true, fullName: true, avatar: true } }
      }
    });

    res.status(201).json(skill);
  } catch (error) {
    console.error('Create skill error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update skill
router.put('/:id', authenticate, async (req, res) => {
  try {
    const skillId = parseInt(req.params.id);
    const { title, description, category, price } = req.body;

    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      include: {
        bookings: {
          where: { status: { in: ['PENDING', 'CONFIRMED'] } }
        }
      }
    });

    if (!skill) return res.status(404).json({ message: 'Skill not found' });
    if (skill.teacherId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
    if (skill.bookings.length > 0) {
      return res.status(400).json({ message: 'Cannot edit skill with active bookings' });
    }

    if (price && (price < 30 || price > 300)) {
      return res.status(400).json({ message: 'Price must be between 30 and 300 SKC' });
    }

    const updated = await prisma.skill.update({
      where: { id: skillId },
      data: {
        title,
        description,
        category,
        price: price ? parseFloat(price) : undefined,
        status: 'PENDING', // Re-submit for approval
        rejectReason: null,
      }
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete skill
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const skillId = parseInt(req.params.id);

    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      include: { bookings: true }
    });

    if (!skill) return res.status(404).json({ message: 'Skill not found' });
    if (skill.teacherId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
    if (skill.bookings.length > 0) {
      return res.status(400).json({ message: 'Cannot delete skill with existing bookings' });
    }

    await prisma.skill.delete({ where: { id: skillId } });
    res.json({ message: 'Skill deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
