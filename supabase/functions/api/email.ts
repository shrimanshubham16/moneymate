/**
 * Email Service for FinFlow
 * Uses SendGrid for production email delivery
 * Falls back to console logging in development
 */

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@finflow.app';
const FROM_NAME = Deno.env.get('FROM_NAME') || 'FinFlow';
const IS_PRODUCTION = Deno.env.get('ENVIRONMENT') === 'production';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email via SendGrid
 */
async function sendWithSendGrid(options: EmailOptions): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.error('[EMAIL] SendGrid API key not configured');
    return false;
  }

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email: options.to }],
        }],
        from: {
          email: FROM_EMAIL,
          name: FROM_NAME,
        },
        subject: options.subject,
        content: [
          { type: 'text/html', value: options.html },
          ...(options.text ? [{ type: 'text/plain', value: options.text }] : []),
        ],
      }),
    });

    if (response.ok || response.status === 202) {
      console.log(`[EMAIL] Sent to ${options.to}: ${options.subject}`);
      return true;
    } else {
      const errorText = await response.text();
      console.error(`[EMAIL] SendGrid error: ${response.status} ${errorText}`);
      return false;
    }
  } catch (error) {
    console.error('[EMAIL] SendGrid error:', error);
    return false;
  }
}

/**
 * Development fallback - log email details to console
 */
function logEmail(options: EmailOptions, code?: string): void {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📧 EMAIL (Development Mode)`);
  console.log(`   To: ${options.to}`);
  console.log(`   Subject: ${options.subject}`);
  if (code) {
    console.log(`   🔑 Code: ${code}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

/**
 * Email templates
 */
const templates = {
  verificationEmail: (code: string) => ({
    subject: 'Verify your FinFlow email',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0a0a; color: #fff; padding: 40px; }
          .container { max-width: 500px; margin: 0 auto; background: #1a1a1a; border-radius: 12px; padding: 32px; }
          .logo { text-align: center; margin-bottom: 24px; }
          .logo h1 { color: #00e676; margin: 0; font-size: 28px; }
          .code { background: #2d2d2d; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
          .code span { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #00e676; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 24px; }
          p { line-height: 1.6; color: #ccc; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo"><h1>🌿 FinFlow</h1></div>
          <p>Hello! Please verify your email address by entering this code:</p>
          <div class="code"><span>${code}</span></div>
          <p>This code expires in 15 minutes.</p>
          <p>If you didn't create a FinFlow account, you can safely ignore this email.</p>
          <div class="footer">
            © ${new Date().getFullYear()} FinFlow. Your finances, secured with E2E encryption.
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Your FinFlow verification code is: ${code}\n\nThis code expires in 15 minutes.\n\nIf you didn't create a FinFlow account, you can safely ignore this email.`,
  }),

  passwordResetEmail: (code: string) => ({
    subject: 'Reset your FinFlow password',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0a0a; color: #fff; padding: 40px; }
          .container { max-width: 500px; margin: 0 auto; background: #1a1a1a; border-radius: 12px; padding: 32px; }
          .logo { text-align: center; margin-bottom: 24px; }
          .logo h1 { color: #00e676; margin: 0; font-size: 28px; }
          .code { background: #2d2d2d; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
          .code span { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ff9800; }
          .warning { background: rgba(255, 152, 0, 0.1); border: 1px solid rgba(255, 152, 0, 0.3); border-radius: 8px; padding: 16px; margin: 16px 0; }
          .warning p { color: #ff9800; margin: 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 24px; }
          p { line-height: 1.6; color: #ccc; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo"><h1>🌿 FinFlow</h1></div>
          <p>We received a request to reset your password. Use this code:</p>
          <div class="code"><span>${code}</span></div>
          <div class="warning">
            <p>⚠️ You'll also need your 24-word recovery key to reset your password.</p>
          </div>
          <p>This code expires in 15 minutes.</p>
          <p>If you didn't request this reset, please secure your account immediately.</p>
          <div class="footer">
            © ${new Date().getFullYear()} FinFlow. Your finances, secured with E2E encryption.
          </div>
        </div>
      </body>
      </html>
    `,
    text: `Your FinFlow password reset code is: ${code}\n\n⚠️ You'll also need your 24-word recovery key to reset your password.\n\nThis code expires in 15 minutes.\n\nIf you didn't request this reset, please secure your account immediately.`,
  }),
};

/**
 * Send verification email
 */
export async function sendVerificationEmail(to: string, code: string): Promise<{ success: boolean; devCode?: string }> {
  const template = templates.verificationEmail(code);
  
  if (IS_PRODUCTION && SENDGRID_API_KEY) {
    const success = await sendWithSendGrid({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
    return { success };
  } else {
    logEmail({ to, subject: template.subject, html: template.html }, code);
    return { success: true, devCode: code };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(to: string, code: string): Promise<{ success: boolean; devCode?: string }> {
  const template = templates.passwordResetEmail(code);
  
  if (IS_PRODUCTION && SENDGRID_API_KEY) {
    const success = await sendWithSendGrid({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
    return { success };
  } else {
    logEmail({ to, subject: template.subject, html: template.html }, code);
    return { success: true, devCode: code };
  }
}

