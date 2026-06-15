const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

const prisma = new PrismaClient();

// Get all approved skills (marketplace)
router.get('/', async (req, res) => {
  try {
    const { category, minPrice, maxPrice, sortBy, search, page = 1, limit = 12 } = req.query;

    const where = { status: 'APPROVED', isPublished: true };

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
            select: { id: true, fullName: true, avatar: true, avgRating: true, totalReviews: true }
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
          select: { id: true, fullName: true, avatar: true, bio: true, avgRating: true, totalReviews: true, createdAt: true }
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
    const { title, description, category, price, coverImage, galleryImages, availabilitySlots, isPublished = false } = req.body;

    if (req.user.status === 'SUSPENDED') {
      return res.status(403).json({ message: 'Tài khoản của bạn đang bị đình chỉ. Bạn không thể tạo hoặc công khai khóa học mới.' });
    }

    if (!title || !description || !category || !price) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin khóa học.' });
    }

    if (price < 30 || price > 300) {
      return res.status(400).json({ message: 'Giá mỗi giờ phải từ 30 đến 300 SKC.' });
    }

    const normalizedSlots = Array.isArray(availabilitySlots) ? availabilitySlots : [];

    const skill = await prisma.skill.create({
      data: {
        title,
        description,
        category,
        price: parseFloat(price),
        teacherId: req.user.id,
        coverImage: coverImage || null,
        galleryImages: Array.isArray(galleryImages) ? galleryImages : [],
        availabilitySlots: normalizedSlots,
        isPublished: Boolean(isPublished) && req.user.status === 'ACTIVE',
        status: Boolean(isPublished) && req.user.status === 'ACTIVE' ? 'APPROVED' : 'PENDING',
        rejectReason: null
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
    const { title, description, category, price, coverImage, galleryImages, availabilitySlots, isPublished } = req.body;

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
    if (req.user.status === 'SUSPENDED') {
      return res.status(403).json({ message: 'Tài khoản của bạn đang bị đình chỉ, nên không thể chỉnh sửa khóa học đang hoạt động.' });
    }
    if (skill.bookings.length > 0) {
      return res.status(400).json({ message: 'Không thể chỉnh sửa khóa học khi đang có lịch học đang hoạt động.' });
    }

    if (price && (price < 30 || price > 300)) {
      return res.status(400).json({ message: 'Giá mỗi giờ phải từ 30 đến 300 SKC.' });
    }

    const shouldPublish = Boolean(isPublished);

    const updated = await prisma.skill.update({
      where: { id: skillId },
      data: {
        title: title ?? undefined,
        description: description ?? undefined,
        category: category ?? undefined,
        price: price ? parseFloat(price) : undefined,
        coverImage: coverImage ?? undefined,
        galleryImages: galleryImages ? (Array.isArray(galleryImages) ? galleryImages : []) : undefined,
        availabilitySlots: availabilitySlots ? (Array.isArray(availabilitySlots) ? availabilitySlots : []) : undefined,
        isPublished: shouldPublish,
        status: shouldPublish ? 'APPROVED' : 'PENDING',
        rejectReason: shouldPublish ? null : 'Khóa học chưa được công khai',
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
