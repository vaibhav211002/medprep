const nodemailer = require('nodemailer');

function isConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function transporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

/**
 * Notify the admin that a student submitted a question paper.
 * Silently no-ops (returns false) if SMTP isn't configured -- the
 * submission is still saved to the database/admin dashboard either way.
 */
async function notifyAdminOfSubmission({ studentName, studentEmail, subjectName, note, attachmentPath, fileName }) {
  if (!isConfigured()) return false;

  await transporter().sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: process.env.ADMIN_NOTIFY_EMAIL || process.env.SMTP_USER,
    subject: `New PYQ submission${subjectName ? ` - ${subjectName}` : ''}`,
    text:
      `A student submitted a question paper.\n\n` +
      `Name: ${studentName || '(not provided)'}\n` +
      `Email: ${studentEmail}\n` +
      `Subject: ${subjectName || '(not specified)'}\n` +
      `Note: ${note || '(none)'}\n\n` +
      `The file is also attached and visible in your admin dashboard.`,
    attachments: [{ filename: fileName, path: attachmentPath }],
  });

  return true;
}

module.exports = { isConfigured, notifyAdminOfSubmission };
