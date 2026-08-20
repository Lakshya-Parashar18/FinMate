import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const assetsPath = path.resolve(__dirname, '../assets');
const logoPath = path.resolve(assetsPath, 'logo.png');
const lockPath = path.resolve(assetsPath, 'lock.png');
const lightningPath = path.resolve(assetsPath, 'lightning.png');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 4000,
  greetingTimeout: 4000,
  socketTimeout: 4000,
});

/**
 * Generate verification email HTML content using logo.png in glowing squircle container.
 * @param {string} name - User's name
 * @param {string} token - Verification token
 * @param {boolean} useCid - Use CID attachment for actual email sending
 * @returns {string} HTML string
 */
export const getVerificationEmailHtml = (name = 'Lakshya', token = 'sample-verification-token', useCid = false, isPreview = false) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const verificationLink = `${frontendUrl}/verify/${token}`;
  const year = new Date().getFullYear();

  // For actual emails: use CID inline attachment (works in Gmail/Outlook)
  // For browser preview: embed as base64 data URI (works from any port, no HTTP needed)
  let logoSrc, logoSrcSmall, lockSrc, lightningSrc;
  if (useCid) {
    logoSrc = 'cid:finmate_logo_glowing';
    logoSrcSmall = 'cid:finmate_logo_glowing_small';
    lockSrc = 'cid:finmate_lock_icon';
    lightningSrc = 'cid:finmate_lightning_icon';
  } else {
    // For browser preview: use public hosted URLs of pre-rendered glowing assets
    logoSrc = 'https://iili.io/COOWGxn.png';
    logoSrcSmall = 'https://iili.io/COOhBTP.png';
    lockSrc = 'https://img.icons8.com/puffy/32/94a3b8/lock.png';
    lightningSrc = 'https://img.icons8.com/sf-black-filled/64/94a3b8/lightning-bolt.png';
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirm Your FinMate Account</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    
    body {
      margin: 0;
      padding: 0;
      background-color: #0b0f19;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      color: #94a3b8;
    }
    
    table {
      border-collapse: collapse;
    }

    a {
      color: #38bdf8;
      text-decoration: none;
    }

    .glow-btn:hover {
      background: #2563eb !important;
      box-shadow: 0 16px 36px -6px rgba(59, 130, 246, 0.6) !important;
    }
  </style>
</head>
<body style="margin: 0; padding: 48px 12px; background-color: #0b0f19;">

  <!-- Outer Email Container -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" align="center" style="background-color: #0b0f19; width: 100%;">
    <tr>
      <td align="center">
        
        <!-- Main Card Container (580px max width) -->
        <table role="presentation" width="580" cellspacing="0" cellpadding="0" border="0" style="max-width: 580px; width: 100%; background-color: #111827; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.6);">
          
          <!-- TOP GLOWING ACCENT LINE -->
          <tr>
            <td style="height: 3px; background: linear-gradient(90deg, #6366f1 0%, #06b6d4 50%, #10b981 100%); line-height: 3px; font-size: 0;">&nbsp;</td>
          </tr>

          <!-- BRAND HEADER BAR -->
          <tr>
            <td style="padding: 28px 40px; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="vertical-align: middle;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="vertical-align: middle;">
                          <!-- Logo Icon Container Box -->
                          <img src="${logoSrcSmall}" width="80" height="80" style="display: block; width: 80px; height: 80px; border: 0; outline: none;" alt="FinMate Logo" />
                        </td>
                        <td style="vertical-align: middle; padding-left: 0px;">
                          <span style="font-size: 21px; font-weight: 800; color: #ffffff; letter-spacing: -0.03em; font-family: 'Plus Jakarta Sans', sans-serif;">FinMate</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; padding: 5px 12px; border-radius: 9999px; background: rgba(52, 211, 153, 0.1); border: 1px solid rgba(52, 211, 153, 0.25); color: #34d399; font-size: 11px; font-weight: 700; letter-spacing: 0.05em;">
                      ACCOUNT ACTIVATION
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- HERO BANNER SECTION -->
          <tr>
            <td style="padding: 10px 40px 0 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td width="195" height="55" style="width: 195px; height: 55px; line-height: 0; font-size: 0;">&nbsp;</td>
                  <td rowspan="2" width="110" height="110" align="center" valign="middle" style="width: 110px; height: 110px; line-height: 0; font-size: 0; background: linear-gradient(to bottom, transparent 55px, rgba(99, 102, 241, 0.2) 55px, rgba(99, 102, 241, 0.2) 56px, #121826 56px);">
                    <img src="${logoSrc}" width="110" height="110" style="display: block; width: 110px; height: 110px; border: 0; outline: none; margin: 0;" alt="FinMate" />
                  </td>
                  <td width="195" height="55" style="width: 195px; height: 55px; line-height: 0; font-size: 0;">&nbsp;</td>
                </tr>
                <tr>
                  <td height="55" style="width: 195px; height: 55px; background: #121826; border-top: 1px solid rgba(99, 102, 241, 0.2); border-left: 1px solid rgba(99, 102, 241, 0.2); border-top-left-radius: 16px; line-height: 0; font-size: 0;">&nbsp;</td>
                  <td height="55" style="width: 195px; height: 55px; background: #121826; border-top: 1px solid rgba(99, 102, 241, 0.2); border-right: 1px solid rgba(99, 102, 241, 0.2); border-top-right-radius: 16px; line-height: 0; font-size: 0;">&nbsp;</td>
                </tr>
                <tr>
                  <td colspan="3" style="background: #121826; border-left: 1px solid rgba(99, 102, 241, 0.2); border-right: 1px solid rgba(99, 102, 241, 0.2); border-bottom: 1px solid rgba(99, 102, 241, 0.2); border-bottom-left-radius: 16px; border-bottom-right-radius: 16px; padding: 0 28px 24px 28px; text-align: center;">
                    <h2 style="color: #ffffff; font-size: 22px; font-weight: 800; margin: 0 0 8px 0; letter-spacing: -0.025em; font-family: 'Plus Jakarta Sans', sans-serif;">
                      Confirm Your Email Address
                    </h2>
                    <p style="color: #cbd5e1; font-size: 14px; margin: 0; line-height: 1.5; font-family: 'Plus Jakarta Sans', sans-serif;">
                      One click away from activating your intelligent finance dashboard.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- MAIN BODY CONTENT -->
          <tr>
            <td style="padding: 32px 40px 36px 40px;">
              
              <p style="color: #ffffff; font-size: 16px; font-weight: 400; margin: 0 0 14px 0;">
                Hi <strong style="font-weight: 700;">${name}</strong>,
              </p>

              <p style="color: #cbd5e1; font-size: 15px; line-height: 1.65; margin: 0 0 28px 0;">
                Thank you for signing up for FinMate. Please confirm your email address to complete your registration and secure your account.
              </p>

              <!-- PRIMARY CTA BUTTON -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${verificationLink}" 
                       target="_blank"
                       class="glow-btn"
                       style="background: #3b82f6; color: #ffffff; padding: 16px 40px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 15px; display: inline-block; box-shadow: 0 12px 28px -4px rgba(59, 130, 246, 0.45); letter-spacing: -0.01em; transition: all 0.25s ease;">
                      Verify Account &amp; Access Dashboard &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- SECURITY MATRIX BADGES -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 32px 0;">
                <tr>
                  <td align="center" style="padding: 12px 16px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="font-size: 12px; color: #94a3b8; font-weight: 600; padding: 0 8px; vertical-align: middle;">
                          <img src="${lockSrc}" width="14" height="14" style="vertical-align: middle; display: inline-block; margin-right: 4px; width: 14px; height: 14px; border: 0; outline: none;" alt="Lock" />
                          <span style="vertical-align: middle;">256-Bit Encrypted</span>
                        </td>
                        <td style="font-size: 12px; color: rgba(255, 255, 255, 0.15); vertical-align: middle;">•</td>
                        <td style="font-size: 12px; color: #94a3b8; font-weight: 600; padding: 0 8px; vertical-align: middle;">
                          <img src="${lightningSrc}" width="14" height="14" style="vertical-align: middle; display: inline-block; margin-right: 4px; width: 14px; height: 14px; border: 0; outline: none;" alt="Lightning" />
                          <span style="vertical-align: middle;">Instant Activation</span>
                        </td>
                        <td style="font-size: 12px; color: rgba(255, 255, 255, 0.15); vertical-align: middle;">•</td>
                        <td style="font-size: 12px; color: #94a3b8; font-weight: 600; padding: 0 8px; vertical-align: middle;">
                          🛡 <span style="vertical-align: middle;">Bank-Grade Privacy</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="color: #64748b; font-size: 13px; text-align: center; margin: 0 0 32px 0; font-weight: 500;">
                This link will remain active for <span style="color: #cbd5e1; font-weight: 700;">24 hours</span>.
              </p>

              <!-- FALLBACK LINK CONTAINER -->
              <div style="background-color: #0b0f19; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 18px 20px; margin: 0 0 32px 0;">
                <p style="font-size: 13px; font-weight: 700; color: #e2e8f0; margin: 0 0 6px 0;">
                  Trouble clicking the button?
                </p>
                <p style="font-size: 12px; color: #64748b; margin: 0 0 10px 0;">
                  Paste this direct link into your browser:
                </p>
                <div style="background-color: rgba(255, 255, 255, 0.03); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 8px; padding: 10px 14px; word-break: break-all; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; color: #38bdf8; -webkit-user-select: all; user-select: all;">
                  <a href="${verificationLink}" style="color: #38bdf8; text-decoration: none;">${verificationLink}</a>
                </div>
              </div>

              <!-- DIVIDER -->
              <div style="border-top: 1px solid rgba(255, 255, 255, 0.06); margin: 32px 0 24px 0;"></div>

              <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 0;">
                You received this automated security message because a FinMate account was created with this email address. If this wasn't you, you can safely ignore this message.
              </p>

            </td>
          </tr>

          <!-- CARD FOOTER -->
          <tr>
            <td style="background-color: #0b0f19; padding: 28px 40px; border-top: 1px solid rgba(255, 255, 255, 0.06); text-align: center;">
              <p style="color: #cbd5e1; font-size: 13px; margin: 0 0 6px 0; font-weight: 700; letter-spacing: -0.01em;">
                FinMate Technologies
              </p>
              <p style="color: #64748b; font-size: 12px; margin: 0;">
                Security &amp; Account Support: <a href="mailto:finmate.support01@gmail.com" style="color: #38bdf8; text-decoration: none;">finmate.support01@gmail.com</a>
              </p>
            </td>
          </tr>

        </table>

        <!-- SUB FOOTER LEGAL -->
        <table role="presentation" width="580" cellspacing="0" cellpadding="0" border="0" style="max-width: 580px; width: 100%; margin-top: 20px;">
          <tr>
            <td align="center" style="color: #475569; font-size: 11px; font-weight: 500;">
              © ${year} FinMate Inc. All rights reserved. Confidential security communication.
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

  ${isPreview ? `
    <!-- SUPPORT MODAL (PREVIEW ONLY) -->
    <div id="supportModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(11, 15, 25, 0.85); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); z-index: 99999; font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;">
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 420px; max-width: 90%; background: #111827; border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 16px; padding: 24px; box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5), 0 0 20px rgba(56, 189, 248, 0.15); color: #ffffff;">
        <!-- Stylised Cross Button -->
        <button onclick="closeSupport()" style="position: absolute; top: 16px; right: 16px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); color: #94a3b8; font-size: 18px; font-weight: 700; cursor: pointer; padding: 0; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 10px; line-height: 1; transition: all 0.3s ease;" onmouseover="this.style.background='rgba(239, 68, 68, 0.15)'; this.style.color='#ef4444'; this.style.borderColor='rgba(239, 68, 68, 0.3)'; this.style.transform='rotate(90deg)';" onmouseout="this.style.background='rgba(255, 255, 255, 0.05)'; this.style.color='#94a3b8'; this.style.borderColor='rgba(255, 255, 255, 0.1)'; this.style.transform='rotate(0deg)';">&times;</button>
        
        <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 700; color: #ffffff;">Contact FinMate Support</h3>
        <p style="margin: 0 0 20px 0; font-size: 13px; color: #94a3b8; line-height: 1.4;">Send a direct support message to <strong>finmate.support01@gmail.com</strong>.</p>
        
        <form id="supportForm" onsubmit="submitSupport(event)">
          <div style="margin-bottom: 14px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #cbd5e1; margin-bottom: 6px;">Your Email Address</label>
            <input type="email" id="supportUserEmail" required style="width: 100%; padding: 10px 12px; background: #0b0f19; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: #ffffff; font-size: 13px; outline: none; box-sizing: border-box;" />
          </div>
          <div style="margin-bottom: 14px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #cbd5e1; margin-bottom: 6px;">Message Subject</label>
            <input type="text" id="supportSubject" required style="width: 100%; padding: 10px 12px; background: #0b0f19; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: #ffffff; font-size: 13px; outline: none; box-sizing: border-box;" />
          </div>
          <div style="margin-bottom: 20px;">
            <label style="display: block; font-size: 12px; font-weight: 600; color: #cbd5e1; margin-bottom: 6px;">Your Message</label>
            <textarea id="supportMessage" required rows="4" style="width: 100%; padding: 10px 12px; background: #0b0f19; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: #ffffff; font-size: 13px; outline: none; resize: none; box-sizing: border-box;"></textarea>
          </div>
          
          <div style="display: flex; justify-content: flex-end; gap: 10px;">
            <button type="button" onclick="closeSupport()" style="padding: 10px 16px; background: rgba(255, 255, 255, 0.05); border: none; border-radius: 8px; color: #cbd5e1; font-size: 13px; font-weight: 600; cursor: pointer;">Cancel</button>
            <button type="submit" style="padding: 10px 20px; background: #3b82f6; border: none; border-radius: 8px; color: #ffffff; font-size: 13px; font-weight: 600; cursor: pointer;">Send Message</button>
          </div>
        </form>
        
        <div id="supportStatus" style="display: none; text-align: center; padding: 20px 0;">
          <div id="supportStatusSpinner" style="display: inline-block; width: 30px; height: 30px; border: 3px solid rgba(56, 189, 248, 0.2); border-radius: 50%; border-top-color: #38bdf8; animation: support-spin 1s ease-in-out infinite; margin-bottom: 12px;"></div>
          <div id="supportStatusCheck" style="display: none; font-size: 32px; color: #10b981; margin-bottom: 12px;">✓</div>
          <div id="supportStatusError" style="display: none; font-size: 32px; color: #ef4444; margin-bottom: 12px;">✗</div>
          <p id="supportStatusText" style="margin: 0; font-size: 14px; color: #cbd5e1;"></p>
        </div>
      </div>
    </div>
    
    <style>
      @keyframes support-spin {
        to { transform: rotate(360deg); }
      }
    </style>

    <script>
      document.addEventListener('DOMContentLoaded', function() {
        var mailtoLinks = document.querySelectorAll('a[href^="mailto:"]');
        mailtoLinks.forEach(function(link) {
          link.addEventListener('click', function(e) {
            e.preventDefault();
            openSupport();
          });
        });
      });
      
      function openSupport() {
        document.getElementById('supportForm').style.display = 'block';
        document.getElementById('supportStatus').style.display = 'none';
        document.getElementById('supportModal').style.display = 'block';
      }
      
      function closeSupport() {
        document.getElementById('supportModal').style.display = 'none';
      }
      
      function submitSupport(e) {
        e.preventDefault();
        var email = document.getElementById('supportUserEmail').value;
        var subject = document.getElementById('supportSubject').value;
        var message = document.getElementById('supportMessage').value;
        
        document.getElementById('supportForm').style.display = 'none';
        document.getElementById('supportStatus').style.display = 'block';
        document.getElementById('supportStatusSpinner').style.display = 'inline-block';
        document.getElementById('supportStatusCheck').style.display = 'none';
        document.getElementById('supportStatusError').style.display = 'none';
        document.getElementById('supportStatusText').innerText = 'Sending message to support...';
        
        fetch('/api/auth/send-support-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, subject: subject, message: message })
        })
        .then(function(res) {
          return res.json().then(function(data) {
            if (res.ok) {
              document.getElementById('supportStatusSpinner').style.display = 'none';
              document.getElementById('supportStatusCheck').style.display = 'block';
              document.getElementById('supportStatusText').innerText = 'Support message sent successfully!';
            } else {
              throw new Error(data.message || 'Failed to send message');
            }
          });
        })
        .catch(function(err) {
          document.getElementById('supportStatusSpinner').style.display = 'none';
          document.getElementById('supportStatusError').style.display = 'block';
          document.getElementById('supportStatusText').innerText = err.message || 'Error sending support message';
        });
      }
    </script>
  ` : ''}

</body>
</html>
  `;
};

/**
 * Send an email verification email with a state-of-the-art, ultra-premium dark fintech HTML template.
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
    subject: 'Confirm your FinMate account',
    text: `Hi ${name},\n\nThank you for signing up for FinMate. Please confirm your email address by visiting this link:\n${verificationLink}\n\nThis link will remain active for 24 hours.\n\nBest regards,\nFinMate Team`,
    html: getVerificationEmailHtml(name, token, false),
    attachments: [],
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${to}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

/**
 * Send support message from customer to support email.
 * @param {string} fromEmail - User's contact email
 * @param {string} subject - Email subject
 * @param {string} textContent - Email body content
 */
export const sendSupportMessage = async (fromEmail, subject, textContent) => {
  const mailOptions = {
    from: `"FinMate User Support" <${process.env.EMAIL_USER || 'support@finmate.app'}>`,
    to: 'finmate.support01@gmail.com',
    replyTo: fromEmail,
    subject: `[Support Query] ${subject}`,
    text: `You received a support query from ${fromEmail}:\n\n${textContent}\n\n---\nSent via FinMate Email Service Portal.`,
  };

  const sendPromise = transporter.sendMail(mailOptions);
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('SMTP Connection Timeout')), 4000)
  );

  try {
    await Promise.race([sendPromise, timeoutPromise]);
    console.log(`Support query from ${fromEmail} forwarded to finmate.support01@gmail.com`);
    return { success: true };
  } catch (error) {
    console.error('SMTP sending failed, falling back to local file storage. Error:', error.message);

    // Fallback: Save to a local support queries JSON file inside the server directory
    const logPath = path.resolve(__dirname, '../support_queries.json');
    let queries = [];
    try {
      if (fs.existsSync(logPath)) {
        queries = JSON.parse(fs.readFileSync(logPath, 'utf8'));
      }
    } catch (e) { }

    queries.push({
      timestamp: new Date().toISOString(),
      fromEmail,
      subject,
      textContent
    });

    fs.writeFileSync(logPath, JSON.stringify(queries, null, 2));
    console.log(`[LOCAL STORAGE] Saved support query from ${fromEmail} to support_queries.json`);
    return { fallback: true };
  }
};

/**
 * Generate Budget Alert HTML content
 */
export const getBudgetWarningEmailHtml = (name = 'User', categoryName = 'Overall Budget', spent = 0, limit = 0, percentage = 80) => {
  const isExceeded = percentage >= 100;
  const badgeColor = isExceeded ? '#ef4444' : '#f59e0b';
  const badgeText = isExceeded ? 'BUDGET EXCEEDED (100%)' : 'BUDGET WARNING (80%)';
  const year = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${badgeText}</title>
  <style>
    body { margin: 0; padding: 32px 12px; background-color: #0b0f19; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #94a3b8; }
    .card { max-width: 580px; margin: 0 auto; background: #111827; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.08); padding: 32px; box-shadow: 0 30px 60px rgba(0,0,0,0.6); }
    .badge { display: inline-block; padding: 6px 14px; background: ${isExceeded ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'}; border: 1px solid ${badgeColor}; color: ${badgeColor}; font-weight: 700; font-size: 0.78rem; border-radius: 20px; letter-spacing: 0.05em; margin-bottom: 16px; }
    .title { color: #f8fafc; font-size: 1.4rem; font-weight: 700; margin: 0 0 12px 0; }
    .stat-box { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px; margin: 20px 0; }
    .stat-row { display: flex; justify-content: space-between; margin-bottom: 8px; color: #cbd5e1; font-weight: 600; }
    .bar-bg { width: 100%; height: 10px; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden; margin-top: 10px; }
    .bar-fill { height: 100%; background: ${badgeColor}; width: ${Math.min(percentage, 100)}%; border-radius: 10px; }
    .footer { text-align: center; font-size: 0.75rem; color: #64748b; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${badgeText}</div>
    <h2 class="title">Budget Limit Alert for ${categoryName}</h2>
    <p>Hi ${name},</p>
    <p>Your spending for <strong>${categoryName}</strong> has reached <strong>${percentage}%</strong> of your monthly limit.</p>
    <div class="stat-box">
      <div class="stat-row">
        <span>Spent: ₹${spent.toLocaleString('en-IN')}</span>
        <span>Limit: ₹${limit.toLocaleString('en-IN')}</span>
      </div>
      <div class="bar-bg">
        <div class="bar-fill"></div>
      </div>
    </div>
    <p>Sign in to your FinMate workspace to review your spending and adjust your budget goals.</p>
    <div class="footer">&copy; ${year} FinMate Financial Technologies. All rights reserved.</div>
  </div>
</body>
</html>
  `;
};

/**
 * Generate High-Value Transaction Alert HTML
 */
export const getHighValueAlertEmailHtml = (name = 'User', description = 'Transaction', amount = 0, threshold = 10000) => {
  const year = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>High-Value Transaction Warning</title>
  <style>
    body { margin: 0; padding: 32px 12px; background-color: #0b0f19; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #94a3b8; }
    .card { max-width: 580px; margin: 0 auto; background: #111827; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.08); padding: 32px; box-shadow: 0 30px 60px rgba(0,0,0,0.6); }
    .badge { display: inline-block; padding: 6px 14px; background: rgba(59, 130, 246, 0.15); border: 1px solid #3b82f6; color: #3b82f6; font-weight: 700; font-size: 0.78rem; border-radius: 20px; margin-bottom: 16px; }
    .title { color: #f8fafc; font-size: 1.4rem; font-weight: 700; margin: 0 0 12px 0; }
    .stat-box { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px; margin: 20px 0; }
    .amount { font-size: 1.8rem; font-weight: 800; color: #38bdf8; margin: 8px 0; }
    .footer { text-align: center; font-size: 0.75rem; color: #64748b; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">HIGH-VALUE ALERT</div>
    <h2 class="title">Large Expense Detected</h2>
    <p>Hi ${name},</p>
    <p>A new transaction crossed your alert threshold of <strong>₹${threshold.toLocaleString('en-IN')}</strong>:</p>
    <div class="stat-box">
      <div style="color: #cbd5e1; font-weight: 600;">${description}</div>
      <div class="amount">₹${amount.toLocaleString('en-IN')}</div>
    </div>
    <p>If you did not authorize this transaction, please review your account settings immediately.</p>
    <div class="footer">&copy; ${year} FinMate Financial Technologies. All rights reserved.</div>
  </div>
</body>
</html>
  `;
};

/**
 * Generate Goal Milestone Celebration HTML
 */
export const getGoalMilestoneEmailHtml = (name = 'User', goalName = 'Savings Goal', currentAmount = 0, targetAmount = 0, percentage = 50) => {
  const year = new Date().getFullYear();
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Goal Milestone Reached!</title>
  <style>
    body { margin: 0; padding: 32px 12px; background-color: #0b0f19; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #94a3b8; }
    .card { max-width: 580px; margin: 0 auto; background: #111827; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.08); padding: 32px; box-shadow: 0 30px 60px rgba(0,0,0,0.6); }
    .badge { display: inline-block; padding: 6px 14px; background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #10b981; font-weight: 700; font-size: 0.78rem; border-radius: 20px; margin-bottom: 16px; }
    .title { color: #f8fafc; font-size: 1.4rem; font-weight: 700; margin: 0 0 12px 0; }
    .stat-box { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 20px; margin: 20px 0; }
    .bar-bg { width: 100%; height: 10px; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden; margin-top: 10px; }
    .bar-fill { height: 100%; background: #10b981; width: ${Math.min(percentage, 100)}%; border-radius: 10px; }
    .footer { text-align: center; font-size: 0.75rem; color: #64748b; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">🎉 MILESTONE REACHED (${percentage}%)</div>
    <h2 class="title">Congratulations on your progress!</h2>
    <p>Hi ${name},</p>
    <p>Great job! You have reached <strong>${percentage}%</strong> of your savings target for <strong>${goalName}</strong>.</p>
    <div class="stat-box">
      <div style="display: flex; justify-content: space-between; color: #cbd5e1; font-weight: 600;">
        <span>Saved: ₹${currentAmount.toLocaleString('en-IN')}</span>
        <span>Target: ₹${targetAmount.toLocaleString('en-IN')}</span>
      </div>
      <div class="bar-bg">
        <div class="bar-fill"></div>
      </div>
    </div>
    <p>Keep up the great work! Your financial freedom journey is moving forward.</p>
    <div class="footer">&copy; ${year} FinMate Financial Technologies. All rights reserved.</div>
  </div>
</body>
</html>
  `;
};

/**
 * Send Budget Warning Email
 */
export const sendBudgetAlertEmail = async (to, name, categoryName, spent, limit, percentage) => {
  const isExceeded = percentage >= 100;
  const subject = isExceeded
    ? `🚨 Alert: Monthly Budget Exceeded for ${categoryName} (100%)`
    : `⚠️ Warning: Budget Limit ${percentage}% Reached for ${categoryName}`;

  const mailOptions = {
    from: `"FinMate Alerts" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html: getBudgetWarningEmailHtml(name, categoryName, spent, limit, percentage)
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[ALERT DISPATCHED] Budget warning sent to ${to} (${categoryName}: ${percentage}%)`);
  } catch (err) {
    console.error(`[ALERT ERROR] Failed to send budget alert to ${to}:`, err.message);
  }
};

/**
 * Send High-Value Alert Email
 */
export const sendHighValueAlertEmail = async (to, name, description, amount, threshold) => {
  const mailOptions = {
    from: `"FinMate Alerts" <${process.env.EMAIL_USER}>`,
    to,
    subject: `🔔 High-Value Transaction Alert: ₹${amount.toLocaleString('en-IN')}`,
    html: getHighValueAlertEmailHtml(name, description, amount, threshold)
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[ALERT DISPATCHED] High-value alert sent to ${to} (Amount: ${amount})`);
  } catch (err) {
    console.error(`[ALERT ERROR] Failed to send high-value alert to ${to}:`, err.message);
  }
};

/**
 * Send Goal Milestone Email
 */
export const sendGoalMilestoneEmail = async (to, name, goalName, currentAmount, targetAmount, percentage) => {
  const mailOptions = {
    from: `"FinMate Goals" <${process.env.EMAIL_USER}>`,
    to,
    subject: `🎉 Milestone Reached: ${percentage}% saved for ${goalName}!`,
    html: getGoalMilestoneEmailHtml(name, goalName, currentAmount, targetAmount, percentage)
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[ALERT DISPATCHED] Goal milestone email sent to ${to} (${goalName}: ${percentage}%)`);
  } catch (err) {
    console.error(`[ALERT ERROR] Failed to send goal milestone email to ${to}:`, err.message);
  }
};
