const nodemailer = require('nodemailer');

async function testSMTP() {
  console.log('Testing SMTP connection...');
  
  // Test configuration
  const config = {
    host: 'mail.marketskrap.com',
    port: 465,
    secure: true,
    auth: {
      user: 'sophia@raiya.info',
      pass: 'Smart@123'
    },
    timeout: 30000
  };
  
  console.log('SMTP Config:', {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.auth.user,
    timeout: config.timeout
  });
  
  try {
    // Create transporter
    console.log('Creating transporter...');
    const transporter = nodemailer.createTransport(config);
    
    // Verify connection
    console.log('Verifying connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');
    
    // Test sending an email
    console.log('Testing email send...');
    const mailOptions = {
      from: '"MailSkrap Test" <sophia@raiya.info>',
      to: 'sophia@raiya.info', // Send to yourself for testing
      subject: 'SMTP Test Email',
      html: '<h2>Test Email</h2><p>This is a test email to verify SMTP configuration.</p>'
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', result.messageId);
    
  } catch (error) {
    console.error('❌ SMTP Error:', error.message);
    console.error('Full error:', error);
  }
}

testSMTP();
