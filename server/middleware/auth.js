const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const JWT_SECRET = process.env.JWT_SECRET || 'skilltrading-render-secret-2026';

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        status: true,
        skc: true,
        avgRating: true,
        totalReviews: true,
        avatar: true,
        bio: true,
      }
    });

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    if (user.status === 'BANNED') {
      return res.status(403).json({ message: 'Tài khoản của bạn đã bị khóa.' });
    }

    if (user.status === 'SUSPENDED') {
      req.userStatusNotice = 'Tài khoản của bạn đang bị đình chỉ. Các khóa học hiện đã bị vô hiệu hóa.';
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('JWT auth error:', error.message);
    return res.status(401).json({ message: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

module.exports = { authenticate, requireAdmin };
