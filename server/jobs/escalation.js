const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { expirePendingBookings } = require('../lib/bookingRules');

// Run every hour: expire pending bookings older than 24h and refund
function startEscalationJob() {
  cron.schedule('0 * * * *', async () => {
    try {
      console.log('Escalation job running: expirePendingBookings');
      const count = await expirePendingBookings(prisma);
      console.log(`Escalation job: expired ${count} bookings`);
    } catch (err) {
      console.error('Escalation job error', err);
    }
  });
}

module.exports = { startEscalationJob };
