import nodemailer from "nodemailer";

// Sends email through any SMTP server (e.g. Gmail with an app password).
// Needs SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and optionally MAIL_FROM in .env.
// Without them, development prints the email to the terminal instead.

const configured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = configured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: Number(process.env.SMTP_PORT ?? 465) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

export async function sendMail(msg: { to: string; subject: string; text: string; html: string }) {
  if (!transporter) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n📧 [dev email, SMTP not configured]\nTo: ${msg.to}\nSubject: ${msg.subject}\n\n${msg.text}\n`);
    } else {
      console.warn("sendMail: SMTP is not configured; email to", msg.to, "was not sent.");
    }
    return;
  }
  await transporter.sendMail({ from: process.env.MAIL_FROM ?? process.env.SMTP_USER, ...msg });
}
