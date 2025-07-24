import nodemailer from 'nodemailer';

// Email templates
const templates = {
  invite: (variables) => ({
    subject: 'You have been invited to collaborate on a note',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You have been invited to collaborate!</h2>
        <p>Hello,</p>
        <p>${variables.inviter} has invited you to collaborate on a note in our note-taking app.</p>
        <p>
          <a href="${variables.link}" 
             style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Accept Invitation
          </a>
        </p>
        <p>This invitation will expire in 7 days.</p>
        <p>Best regards,<br>Note Taking App Team</p>
      </div>
    `
  }),
  
  welcome: (variables) => ({
    subject: 'Welcome to Note Taking App!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Note Taking App!</h2>
        <p>Hello ${variables.name},</p>
        <p>Thank you for joining our note-taking platform. You are all set to start creating and organizing your notes.</p>
        <p>
          <a href="${variables.appUrl}" 
             style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Start Taking Notes
          </a>
        </p>
        <p>Best regards,<br>Note Taking App Team</p>
      </div>
    `
  }),
  
  passwordReset: (variables) => ({
    subject: 'Reset your password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Reset Your Password</h2>
        <p>Hello,</p>
        <p>You requested to reset your password. Click the link below to set a new password:</p>
        <p>
          <a href="${variables.resetLink}" 
             style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </p>
        <p>This link will expire in 1 hour. If you did not request this, please ignore this email.</p>
        <p>Best regards,<br>Note Taking App Team</p>
      </div>
    `
  })
};

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST || 'smtp.freesmtpservers.com',
    port: parseInt(process.env.SMTP_PORT) || 25,
    secure: false, // true for 465, false for other ports
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    } : null
  });
};

// Send email function
export const sendEmail = async (templateName, to, variables = {}) => {
  try {
    const template = templates[templateName];
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    const { subject, html } = template(variables);
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@notetakingapp.com',
      to,
      subject,
      html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
};

export default sendEmail;
