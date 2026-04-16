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
        <p>This code will expire in 10 minutes.</p>
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

module.exports = { sendOTP };
