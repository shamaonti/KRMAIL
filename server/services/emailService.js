const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.smtpConfig = {
      host: process.env.SMTP_HOST || 'mail.marketskrap.com',
      port: parseInt(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE === 'true' || true,
      auth: {
        user: process.env.SENDER_EMAILS?.split(',')[0] || 'sophia@raiya.info',
        pass: process.env.SENDER_PASSWORD || 'Smart@123'
      },
      timeout: parseInt(process.env.SMTP_TIMEOUT) || 30000
    };

    this.senderEmails = process.env.SENDER_EMAILS?.split(',') || [
      'emma@raiya.info',
      'sophia@raiya.info', 
      'olivia@raiya.info'
    ];
    
    this.currentSenderIndex = 0;
    this.transporters = new Map();
  }

  // Get or create transporter for a specific sender email
  getTransporter(senderEmail = null) {
    const email = senderEmail || this.senderEmails[this.currentSenderIndex];
    
    if (this.transporters.has(email)) {
      return this.transporters.get(email);
    }

    const transporter = nodemailer.createTransport({
      host: 'mail.marketskrap.com',
      port: 465,
      secure: true,
      auth: {
        user: email,
        pass: 'Smart@123'
      },
      timeout: 30000
    });

    this.transporters.set(email, transporter);
    return transporter;
  }

  // Rotate sender emails to distribute load
  getNextSenderEmail() {
    const email = this.senderEmails[this.currentSenderIndex];
    this.currentSenderIndex = (this.currentSenderIndex + 1) % this.senderEmails.length;
    return email;
  }

  // Verify SMTP connection
  async verifyConnection(senderEmail = null) {
    try {
      const transporter = this.getTransporter(senderEmail);
      await transporter.verify();
      return { success: true, message: 'SMTP connection verified' };
    } catch (error) {
      console.error('SMTP verification failed:', error);
      return { 
        success: false, 
        message: 'SMTP connection failed', 
        error: error.message 
      };
    }
  }

  // Send single email
  async sendEmail(emailData) {
    const {
      to,
      subject,
      htmlBody,
      textBody,
      from = null,
      replyTo = null,
      attachments = []
    } = emailData;

    try {
      // Validate required fields
      if (!to || !subject || (!htmlBody && !textBody)) {
        throw new Error('Missing required fields: to, subject, and htmlBody or textBody are required');
      }

      // Get sender email (rotate if not specified)
      const senderEmail = from || this.getNextSenderEmail();
      const transporter = this.getTransporter(senderEmail);

      // Prepare email options
      const mailOptions = {
        from: `"MailSkrap" <${senderEmail}>`,
        to: to,
        subject: subject,
        html: htmlBody,
        text: textBody || this.htmlToText(htmlBody),
        replyTo: replyTo || senderEmail,
        attachments: attachments
      };

      // Send email
      const result = await transporter.sendMail(mailOptions);
      
      console.log(`✅ Email sent successfully to ${to} from ${senderEmail}`);
      console.log(`📧 Message ID: ${result.messageId}`);

      return {
        success: true,
        messageId: result.messageId,
        senderEmail: senderEmail,
        sentAt: new Date().toISOString(),
        status: 'Sent'
      };

    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error);
      
      return {
        success: false,
        error: error.message,
        senderEmail: from || this.senderEmails[this.currentSenderIndex],
        sentAt: new Date().toISOString(),
        status: 'Failed'
      };
    }
  }

  // Send multiple emails with rate limiting
  async sendBulkEmails(emails, options = {}) {
    const {
      delayBetweenEmails = 200, // milliseconds
      maxConcurrent = 1,
      onProgress = null
    } = options;

    const results = [];
    const totalEmails = emails.length;

    console.log(`📧 Starting bulk email send: ${totalEmails} emails`);

    for (let i = 0; i < emails.length; i++) {
      try {
        const emailData = emails[i];
        const result = await this.sendEmail(emailData);
        
        results.push({
          index: i,
          email: emailData.to,
          ...result
        });

        // Progress callback
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: totalEmails,
            percentage: Math.round(((i + 1) / totalEmails) * 100),
            lastResult: result
          });
        }

        // Add delay between emails (except for the last one)
        if (i < emails.length - 1 && delayBetweenEmails > 0) {
          await new Promise(resolve => setTimeout(resolve, delayBetweenEmails));
        }

      } catch (error) {
        console.error(`❌ Error sending email ${i + 1}/${totalEmails}:`, error);
        
        results.push({
          index: i,
          email: emails[i]?.to || 'unknown',
          success: false,
          error: error.message,
          sentAt: new Date().toISOString(),
          status: 'Error'
        });
      }
    }

    // Calculate summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`📊 Bulk email send completed: ${successful} successful, ${failed} failed`);

    return {
      results,
      summary: {
        total: totalEmails,
        successful,
        failed,
        successRate: totalEmails > 0 ? (successful / totalEmails) * 100 : 0
      }
    };
  }

  // Convert HTML to plain text (simple implementation)
  htmlToText(html) {
    if (!html) return '';
    
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace &nbsp; with space
      .replace(/&amp;/g, '&') // Replace &amp; with &
      .replace(/&lt;/g, '<') // Replace &lt; with <
      .replace(/&gt;/g, '>') // Replace &gt; with >
      .replace(/&quot;/g, '"') // Replace &quot; with "
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  }

  // Get SMTP configuration (for debugging)
  getSmtpConfig() {
    return {
      host: this.smtpConfig.host,
      port: this.smtpConfig.port,
      secure: this.smtpConfig.secure,
      timeout: this.smtpConfig.timeout,
      senderEmails: this.senderEmails,
      currentSenderIndex: this.currentSenderIndex
    };
  }

  // Test email sending
  async testEmail(to, subject = 'Test Email from MailSkrap') {
    const testHtml = `
      <h2>Test Email</h2>
      <p>This is a test email from MailSkrap backend.</p>
      <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
      <p><strong>SMTP Server:</strong> ${this.smtpConfig.host}:${this.smtpConfig.port}</p>
      <hr>
      <p><em>If you received this email, the SMTP configuration is working correctly!</em></p>
    `;

    return await this.sendEmail({
      to,
      subject,
      htmlBody: testHtml
    });
  }
}

module.exports = new EmailService();
