const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { createTransaction } = require('../lib/bookingRules');

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' });
  next();
}

// Public: get active QR config
router.get('/qr-config', async (req, res) => {
  try {
    const config = await prisma.depositQRConfig.findFirst({ where: { isActive: true } });
    res.json(config || null);
  } catch (error) {
    console.error('Get QR config error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: create/update QR config
router.post('/qr-config', authenticate, requireAdmin, async (req, res) => {
  try {
    const { qrImageUrl, bankName, bankAccount, accountHolder, description, isActive = true } = req.body;
    if (!qrImageUrl || !bankName) return res.status(400).json({ message: 'qrImageUrl and bankName are required' });

    // deactivate others if isActive
    if (isActive) {
      await prisma.depositQRConfig.updateMany({ where: { isActive: true }, data: { isActive: false } });
    }

    const created = await prisma.depositQRConfig.create({
      data: { qrImageUrl, bankName, bankAccount: bankAccount || '', accountHolder: accountHolder || '', description: description || '', isActive }
    });

    res.status(201).json(created);
  } catch (error) {
    console.error('Create QR config error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Payment tiers (public)
router.get('/tiers', async (req, res) => {
  try {
    const tiers = await prisma.paymentTier.findMany({ where: { active: true }, orderBy: { amount: 'asc' } });
    res.json(tiers);
  } catch (error) {
    console.error('Get tiers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: create tier
router.post('/tiers', authenticate, requireAdmin, async (req, res) => {
  try {
    const { amount, skc, active = true } = req.body;
    if (!amount || !skc) return res.status(400).json({ message: 'amount and skc are required' });

    const tier = await prisma.paymentTier.create({ data: { amount: Number(amount), skc: Number(skc), active: Boolean(active) } });
    res.status(201).json(tier);
  } catch (error) {
    console.error('Create tier error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: list all deposits
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const deposits = await prisma.deposit.findMany({ orderBy: { createdAt: 'desc' }, include: { user: { select: { id: true, email: true, fullName: true } } } });
    res.json(deposits);
  } catch (error) {
    console.error('List deposits error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// User submits a deposit (after scanning QR)
router.post('/submit', authenticate, async (req, res) => {
  try {
    const { tierId, amount, username, email, transferProofImage } = req.body;
    if (!username || !email) return res.status(400).json({ message: 'username and email are required' });

    let numericAmount = amount ? Number(amount) : null;
    let skc = 0;

    if (tierId) {
      const tier = await prisma.paymentTier.findUnique({ where: { id: Number(tierId) } });
      if (!tier) return res.status(400).json({ message: 'Invalid tier' });
      numericAmount = tier.amount;
      skc = tier.skc;
    } else if (numericAmount) {
      // find matching tier by amount
      const tier = await prisma.paymentTier.findFirst({ where: { amount: numericAmount } });
      if (tier) skc = tier.skc;
      else return res.status(400).json({ message: 'Invalid amount or tier' });
    } else {
      return res.status(400).json({ message: 'amount or tierId is required' });
    }

    const deposit = await prisma.deposit.create({
      data: {
        userId: req.user.id,
        amount: numericAmount,
        skc,
        status: 'PENDING',
        username,
        email,
        transferProofImage: transferProofImage || null,
      }
    });

    res.status(201).json(deposit);
  } catch (error) {
    console.error('Submit deposit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// User: get my deposits
router.get('/my', authenticate, async (req, res) => {
  try {
    const deposits = await prisma.deposit.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } });
    res.json(deposits);
  } catch (error) {
    console.error('Get my deposits error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: approve deposit
router.put('/:id/approve', authenticate, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deposit = await prisma.deposit.findUnique({ where: { id } });
    if (!deposit) return res.status(404).json({ message: 'Deposit not found' });
    if (deposit.status !== 'PENDING') return res.status(400).json({ message: 'Deposit already processed' });

    await prisma.$transaction(async (tx) => {
      await tx.deposit.update({ where: { id }, data: { status: 'APPROVED' } });
      await createTransaction(tx, deposit.userId, 'DEPOSIT', deposit.skc, `Deposit approved: ${deposit.amount}`);
    });

    res.json({ message: 'Deposit approved' });
  } catch (error) {
    console.error('Approve deposit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: reject deposit
router.put('/:id/reject', authenticate, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ message: 'Rejection reason is required' });

    const deposit = await prisma.deposit.update({ where: { id }, data: { status: 'REJECTED', adminNotes: reason } });
    res.json(deposit);
  } catch (error) {
    console.error('Reject deposit error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
