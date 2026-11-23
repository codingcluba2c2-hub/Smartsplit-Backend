const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

const sendOTP = async (email, otp) => {
  const mailOptions = {
    from: `"SmartSplit" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify your SmartSplit account',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #6366f1; text-align: center;">SmartSplit</h2>
        <p>Hello,</p>
        <p>Your verification code is:</p>
        <div style="background: #f3f4f6; color: #1f2937; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; border-radius: 10px; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code will expire in 15 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">© 2024 SmartSplit. All rights reserved.</p>
      </div>
    `
  };

  if (!process.env.EMAIL_USER || process.env.EMAIL_USER.includes('your-email')) {
    console.log(`\n-----------------------------------------`);
    console.log(`[DEV] Verification OTP for ${email}: ${otp}`);
    console.log(`-----------------------------------------\n`);
    return Promise.resolve({ message: 'OTP logged to console' });
  }

  return transporter.sendMail(mailOptions);
};

const sendReportEmail = async ({ to, groupName, reportId, summary, note, pdfBase64, senderName }) => {
  const mailOptions = {
    from: `"SmartSplit Enterprise" <${process.env.EMAIL_USER || 'no-reply@smartsplit.app'}>`,
    to: to,
    subject: `📊 Official Financial Report - ${groupName} [${reportId || 'STATEMENT'}]`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 28px 24px; color: #ffffff; text-align: left;">
          <div style="display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 8px;">
            Official Financial Statement
          </div>
          <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px;">SmartSplit Enterprise</h1>
          <p style="margin: 4px 0 0; font-size: 14px; opacity: 0.9;">Group: <strong>${groupName}</strong> &bull; Report ID: <span style="font-family: monospace;">${reportId || 'SSR-REPORT'}</span></p>
        </div>

        <!-- Body Content -->
        <div style="padding: 24px;">
          <p style="font-size: 15px; color: #334155; line-height: 1.5; margin: 0 0 16px;">
            Hello,
          </p>
          <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px;">
            ${senderName ? `<strong>${senderName}</strong> has shared` : 'Attached is'} the official group financial statement and audit summary for <strong>${groupName}</strong>.
          </p>

          ${note ? `
            <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px; font-style: italic; color: #475569; font-size: 13px;">
              "${note}"
            </div>
          ` : ''}

          <!-- Financial Snapshot Table -->
          <div style="background: #f1f5f9; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
            <h3 style="margin: 0 0 12px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 800;">
              Executive Financial Snapshot
            </h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Total Expenses:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: 800; color: #0f172a;">₹${Number(summary?.totalExpense || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Settled Amount:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: 800; color: #059669;">₹${Number(summary?.settledAmount || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Pending Dues:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: 800; color: #d97706;">₹${Number(summary?.pendingDues || 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b;">Total Group Members:</td>
                <td style="padding: 6px 0; text-align: right; font-weight: 800; color: #0f172a;">${summary?.totalMembers || 0} Members</td>
              </tr>
            </table>
          </div>

          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 10px; padding: 12px; font-size: 12px; color: #065f46; margin-bottom: 24px;">
            &check; <strong>Verified Audit Document:</strong> The complete itemized PDF statement has been attached to this email.
          </div>

          <p style="font-size: 13px; color: #94a3b8; margin: 0;">
            Generated securely by SmartSplit Enterprise Financial Engine.
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
          &copy; ${new Date().getFullYear()} SmartSplit &bull; All calculations mathematically verified.
        </div>
      </div>
    `,
    attachments: []
  };

  if (pdfBase64) {
    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, '').replace(/^data:image\/[^;]+;base64,/, '');
    mailOptions.attachments.push({
      filename: `SmartSplit_${(groupName || 'Report').replace(/[^a-zA-Z0-9]/g, '_')}_Statement.pdf`,
      content: Buffer.from(cleanBase64, 'base64'),
      contentType: 'application/pdf'
    });
  }

  if (!process.env.EMAIL_USER || process.env.EMAIL_USER.includes('your-email')) {
    console.log(`\n-----------------------------------------`);
    console.log(`[DEV EMAIL] Report Email sent to ${to} for Group "${groupName}"`);
    if (pdfBase64) console.log(`[DEV EMAIL] Attachment included (PDF size: ${mailOptions.attachments[0]?.content?.length || 0} bytes)`);
    console.log(`-----------------------------------------\n`);
    return Promise.resolve({ success: true, message: 'Email logged in dev mode' });
  }

  return transporter.sendMail(mailOptions);
};

module.exports = { sendOTP, sendReportEmail };
