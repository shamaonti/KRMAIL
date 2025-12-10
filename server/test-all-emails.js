const nodemailer = require('nodemailer');

async function testAllEmails() {
  console.log('Testing email delivery to all accounts...');
  
  const senderEmails = ['emma@raiya.info', 'sophia@raiya.info', 'olivia@raiya.info'];
  const testEmails = ['emma@raiya.info', 'sophia@raiya.info', 'olivia@raiya.info'];
  
  for (let i = 0; i < senderEmails.length; i++) {
    const senderEmail = senderEmails[i];
    const testEmail = testEmails[i];
    
    console.log(`\n--- Testing ${senderEmail} ---`);
    
    const config = {
      host: 'mail.marketskrap.com',
      port: 465,
      secure: true,
      auth: {
        user: senderEmail,
        pass: 'Smart@123'
      },
      timeout: 30000
    };
    
    try {
      const transporter = nodemailer.createTransport(config);
      
      const mailOptions = {
        from: `"MailSkrap Test" <${senderEmail}>`,
        to: testEmail,
        subject: `Test Email from ${senderEmail} - ${new Date().toLocaleString()}`,
        html: `
          <h2>Test Email from ${senderEmail}</h2>
          <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>SMTP Server:</strong> mail.marketskrap.com:465</p>
          <p><strong>Message ID:</strong> Will be generated</p>
          <hr>
          <p><em>If you see this email, the SMTP configuration is working correctly!</em></p>
          <p><strong>Check these locations:</strong></p>
          <ul>
            <li>Inbox of ${testEmail}</li>
            <li>Spam/Junk folder of ${testEmail}</li>
            <li>Sent folder of ${senderEmail}</li>
          </ul>
        `
      };
      
      const result = await transporter.sendMail(mailOptions);
      console.log(`✅ Email sent from ${senderEmail} to ${testEmail}`);
      console.log(`📧 Message ID: ${result.messageId}`);
      
    } catch (error) {
      console.error(`❌ Failed to send from ${senderEmail}:`, error.message);
    }
  }
  
  console.log('\n=== Email Testing Complete ===');
  console.log('Please check:');
  console.log('1. Inbox of each email account');
  console.log('2. Spam/Junk folder of each account');
  console.log('3. Sent folder of each account');
  console.log('4. Wait 5-10 minutes for delivery');
}

testAllEmails();
