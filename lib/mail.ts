import nodemailer from "nodemailer";

// Sends email through any SMTP server (e.g. Gmail with an app password).
// Needs SMTP_USER, SMTP_PASS and optionally SMTP_HOST, SMTP_PORT and MAIL_FROM in .env.
// A Gmail address works without SMTP_HOST. Without a server, development prints
// the email to the terminal instead.

const user = process.env.SMTP_USER;
const host = process.env.SMTP_HOST || (user?.toLowerCase().endsWith("@gmail.com") ? "smtp.gmail.com" : undefined);
const port = Number(process.env.SMTP_PORT || 465);

const missing = [!host && "SMTP_HOST", !user && "SMTP_USER", !process.env.SMTP_PASS && "SMTP_PASS"].filter(Boolean);

const transporter =
  missing.length === 0
    ? nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass: process.env.SMTP_PASS },
      })
    : null;

export async function sendMail(msg: { to: string; subject: string; text: string; html: string }) {
  if (!transporter) {
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `\n📧 [dev email, not sent: missing ${missing.join(", ")}]\nTo: ${msg.to}\nSubject: ${msg.subject}\n\n${msg.text}\n`,
      );
    } else {
      console.warn(`sendMail: email to ${msg.to} was not sent: missing ${missing.join(", ")}.`);
    }
    return;
  }
  await transporter.sendMail({ from: process.env.MAIL_FROM ?? process.env.SMTP_USER, ...msg });
}
