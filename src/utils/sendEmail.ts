import nodemailer from "nodemailer";

interface SendEmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

/**
 * Sends an email using nodemailer.
 * @param options - Object containing email options: recipient, subject, and message body.
 */
export const sendEmail = async (options: SendEmailOptions): Promise<void> => {
  // Create a transporter using Gmail service
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Configure the mail options
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  // Send the email
  await transporter.sendMail(mailOptions);
};
