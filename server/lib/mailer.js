const nodemailer = require('nodemailer');

let transporter = null;
if (process.env.EMAIL_SMTP_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SMTP_HOST,
    port: Number(process.env.EMAIL_SMTP_PORT || 587),
    secure: process.env.EMAIL_SMTP_SECURE === 'true',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
} else {
  console.warn('Email config not set - mailer disabled.');
}

async function sendMail(opts) {
  if (!transporter) {
    console.warn('Mailer not configured, skipping send:', opts);
    return;
  }
  return transporter.sendMail(opts);
}

module.exports = { sendMail };
