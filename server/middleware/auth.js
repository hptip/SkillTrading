const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

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
