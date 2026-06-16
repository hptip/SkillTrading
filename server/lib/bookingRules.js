const ACTIVE_BOOKING_STATUSES = ['PENDING', 'CONFIRMED'];
const MS_PER_HOUR = 60 * 60 * 1000;

function roundSkc(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function getBookingEndAt(booking) {
  return new Date(new Date(booking.scheduledAt).getTime() + Number(booking.durationHours) * MS_PER_HOUR);
}

function bookingsOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

async function createTransaction(prismaClient, userId, type, amount, description, bookingId = null) {
  const numericAmount = roundSkc(amount);
  if (!Number.isFinite(numericAmount)) {
    throw new Error('Invalid transaction amount');
  }

  const user = await prismaClient.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found');
  }

  const balanceBefore = roundSkc(user.skc);
  const balanceAfter = roundSkc(balanceBefore + numericAmount);
  if (balanceAfter < 0) {
    throw new Error('SKC balance cannot be negative');
  }

  await prismaClient.user.update({
    where: { id: userId },
    data: { skc: balanceAfter },
  });

  return prismaClient.transaction.create({
    data: {
      userId,
      type,
      amount: numericAmount,
      balanceBefore,
      balanceAfter,
      description,
      bookingId,
    },
  });
}

async function expirePendingBookings(prismaClient) {
  // Auto-expiry/cancellation of PENDING bookings has been disabled.
  // However, we implement auto-confirm for bookings where the teacher
  // marked the session as done but the learner didn't confirm within 12 hours.
  const now = new Date();
  const twelveHoursAgo = new Date(now.getTime() - 12 * MS_PER_HOUR);

  const toAutoConfirm = await prismaClient.booking.findMany({
    where: {
      status: 'CONFIRMED',
      teacherDoneAt: { lt: twelveHoursAgo },
      learnerConfirmedAt: null,
    },
  });

  let processed = 0;

  for (const booking of toAutoConfirm) {
    try {
      await prismaClient.$transaction(async (tx) => {
        const nowTs = new Date();
        await tx.booking.update({ where: { id: booking.id }, data: { learnerConfirmedAt: nowTs, status: 'COMPLETED' } });
        const teacherAmount = roundSkc(Number(booking.totalPrice) * 0.95);
        await createTransaction(tx, booking.teacherId, 'REVENUE', teacherAmount, `Auto-confirm revenue for booking ${booking.id}`, booking.id);
      });
      processed += 1;
    } catch (err) {
      console.error('Auto-confirm error for booking', booking.id, err);
    }
  }

  return processed;
}

module.exports = {
  ACTIVE_BOOKING_STATUSES,
  createTransaction,
  expirePendingBookings,
  getBookingEndAt,
  bookingsOverlap,
  roundSkc,
};
