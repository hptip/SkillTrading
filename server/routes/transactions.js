const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

// Get my transactions
router.get('/my', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const where = { userId: req.user.id };
    if (type) where.type = type;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          booking: {
            select: {
              id: true,
              skill: { select: { title: true } }
            }
          }
        }
      }),
      prisma.transaction.count({ where })
    ]);

    res.json({ transactions, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
