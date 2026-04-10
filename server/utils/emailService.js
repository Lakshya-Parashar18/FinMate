import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send a verification email with a styled HTML template.
 * @param {string} to - Recipient email address
 * @param {string} name - User's name
 * @param {string} token - Verification token
 */
export const sendVerificationEmail = async (to, name, token) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const verificationLink = `${frontendUrl}/verify/${token}`;

  const mailOptions = {
    from: `"FinMate" <${process.env.EMAIL_USER}>`,
    to,
    subject: '✅ Verify your FinMate account',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0a0f1f; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #4f46e5, #10b981); padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to FinMate!</h1>
          <p style="color: rgba(255,255,255,0.85); margin-top: 8px; font-size: 14px;">Let the SAVINGS Begin!!</p>
        </div>
        <div style="padding: 32px; color: #cbd5e1;">
          <p style="font-size: 16px;">Hey <strong style="color: #10b981;">${name}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6;">
            Thanks for signing up! Please verify your email address to activate your account and start managing your finances.
          </p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${verificationLink}" 
               style="background: linear-gradient(45deg, #4f46e5, #10b981); color: white; padding: 14px 40px; border-radius: 9999px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
              Verify My Email
            </a>
          </div>
          <p style="font-size: 12px; color: #64748b; text-align: center;">
            This link will expire in <strong>24 hours</strong>.<br/>
            If you didn't create this account, you can safely ignore this email.
          </p>
        </div>
        <div style="background-color: rgba(255,255,255,0.05); padding: 16px; text-align: center; border-top: 1px solid rgba(255,255,255,0.1);">
          <p style="color: #475569; margin: 0; font-size: 12px;">© ${new Date().getFullYear()} FinMate — Your intelligent expense companion</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${to}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};
