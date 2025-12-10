const followupService = require('./services/followupService');
const emailService = require('./services/emailService');

async function testCampaignWithFollowup() {
  console.log('🧪 Testing Campaign with Follow-up System');
  console.log('==========================================');

  try {
    // Start the follow-up processor
    console.log('🔄 Starting follow-up processor...');
    followupService.startProcessor();

    // Simulate campaign data
    const campaignData = {
      campaignId: 'campaign_test_' + Date.now(),
      userId: 1,
      leads: [
        { email: 'test1@example.com', firstName: 'John', lastName: 'Doe' },
        { email: 'test2@example.com', firstName: 'Jane', lastName: 'Smith' }
      ],
      subject: 'Test Campaign Email',
      template: '<h2>Hello {FirstName}!</h2><p>This is a test campaign email.</p>',
      followupSettings: {
        enabled: true,
        templateId: null,
        template: {
          content: '<h2>Follow-up Email</h2><p>Hi {FirstName}, this is a follow-up email!</p>'
        },
        subject: 'Follow-up: Your previous email',
        delayHours: 0.083, // 5 minutes
        condition: 'always'
      }
    };

    console.log('\n📧 Test 1: Sending campaign emails...');
    
    // Simulate sending campaign emails
    const emailResults = [];
    for (const lead of campaignData.leads) {
      // Replace template variables
      let htmlBody = campaignData.template;
      htmlBody = htmlBody.replace(/{FirstName}/g, lead.firstName);
      htmlBody = htmlBody.replace(/{LastName}/g, lead.lastName);
      
      // Simulate email sending
      const emailData = {
        to: lead.email,
        subject: campaignData.subject,
        htmlBody: htmlBody,
        logId: `${campaignData.campaignId}_${Date.now()}_${lead.email}`,
        lead: lead,
        campaignId: campaignData.campaignId,
        userId: campaignData.userId
      };

      // For testing, we'll simulate successful sends
      emailResults.push({
        success: true,
        email: lead.email,
        messageId: `msg_${Date.now()}_${lead.email}`,
        sentAt: new Date().toISOString()
      });

      console.log(`  ✅ Simulated email sent to ${lead.email}`);
    }

    console.log(`📊 Campaign results: ${emailResults.filter(r => r.success).length} successful sends`);

    // Schedule follow-up emails
    console.log('\n📅 Test 2: Scheduling follow-up emails...');
    const { template, subject, delayHours, condition } = campaignData.followupSettings;
    
    for (const emailResult of emailResults.filter(r => r.success)) {
      const lead = campaignData.leads.find(l => l.email === emailResult.email);
      if (!lead) continue;

      const followupData = {
        campaignId: campaignData.campaignId,
        contactId: 1,
        emailLogId: `${campaignData.campaignId}_${Date.now()}_${lead.email}`,
        userId: campaignData.userId,
        email: lead.email,
        followupTemplateId: campaignData.followupSettings.templateId,
        followupSubject: subject,
        original_subject: campaignData.subject,
        template_content: template?.content,
        delayHours: delayHours,
        condition: condition
      };

      const result = await followupService.scheduleFollowup(followupData);
      if (result.success) {
        console.log(`  📅 Scheduled follow-up for ${lead.email} at ${result.scheduledAt}`);
      } else {
        console.error(`  ❌ Failed to schedule follow-up for ${lead.email}:`, result.error);
      }
    }

    // Check pending follow-ups
    console.log('\n📋 Test 3: Checking pending follow-ups...');
    const pendingFollowups = await followupService.getPendingFollowups();
    console.log(`📧 Found ${pendingFollowups.length} pending follow-ups:`);
    pendingFollowups.forEach(followup => {
      const scheduledTime = new Date(followup.scheduledAt);
      const now = new Date();
      const timeUntil = Math.round((scheduledTime - now) / 1000 / 60);
      console.log(`  - ${followup.email} (scheduled for ${scheduledTime.toLocaleString()}, ${timeUntil} minutes from now)`);
    });

    // Get follow-up stats
    console.log('\n📊 Test 4: Follow-up statistics...');
    const stats = await followupService.getFollowupStats(campaignData.campaignId);
    console.log('📈 Follow-up stats:', stats);

    console.log('\n✅ Campaign with follow-up test completed!');
    console.log('\n📝 Next steps:');
    console.log('  1. The follow-up processor runs every 1 minute');
    console.log('  2. Follow-ups are scheduled for 5 minutes from now');
    console.log('  3. Check the console logs for follow-up processing activity');
    console.log('  4. Follow-up emails will be sent automatically when due');

    // Show current time and when follow-ups will be processed
    const now = new Date();
    const followupTime = new Date(now.getTime() + (delayHours * 60 * 60 * 1000));
    console.log(`\n⏰ Current time: ${now.toLocaleString()}`);
    console.log(`⏰ Follow-ups will be processed around: ${followupTime.toLocaleString()}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testCampaignWithFollowup();
