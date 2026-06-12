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
  const cutoff = new Date(Date.now() - 24 * MS_PER_HOUR);
  const expiredBookings = await prismaClient.booking.findMany({
    where: {
      status: 'PENDING',
      createdAt: { lte: cutoff },
    },
    include: {
      skill: { select: { title: true } },
    },
  });

  for (const booking of expiredBookings) {
    await prismaClient.$transaction(async (tx) => {
      const current = await tx.booking.findUnique({
        where: { id: booking.id },
        include: { skill: { select: { title: true } } },
      });

      if (!current || current.status !== 'PENDING') return;

      await tx.booking.update({
        where: { id: current.id },
        data: {
          status: 'CANCELLED',
          cancelReason: 'Auto-cancelled because teacher did not respond within 24 hours',
        },
      });

      await createTransaction(
        tx,
        current.learnerId,
        'REFUND',
        current.totalPrice,
        `Full refund - booking expired: ${current.skill.title}`,
        current.id
      );
    });
  }

  return expiredBookings.length;
}

module.exports = {
  ACTIVE_BOOKING_STATUSES,
  createTransaction,
  expirePendingBookings,
  getBookingEndAt,
  bookingsOverlap,
  roundSkc,
};
