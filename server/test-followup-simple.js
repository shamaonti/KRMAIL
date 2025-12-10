const followupService = require('./services/followupService');
const emailService = require('./services/emailService');

async function testFollowupSystem() {
  console.log('🧪 Testing Follow-up Email System');
  console.log('=====================================');

  try {
    // Start the follow-up processor
    console.log('🔄 Starting follow-up processor...');
    followupService.startProcessor();

    // Test 1: Schedule a follow-up email
    console.log('\n📅 Test 1: Scheduling a follow-up email...');
    const followupData = {
      campaignId: 'test_campaign_123',
      contactId: 1,
      emailLogId: 'test_log_456',
      userId: 1,
      email: 'test@example.com',
      followupTemplateId: null,
      followupSubject: 'Follow-up: Your previous email',
      original_subject: 'Test Email',
      template_content: null, // Will use default test template
      delayHours: 0.083, // 5 minutes
      condition: 'always'
    };

    const scheduleResult = await followupService.scheduleFollowup(followupData);
    console.log('✅ Schedule result:', scheduleResult);

    // Test 2: Check pending follow-ups
    console.log('\n📋 Test 2: Checking pending follow-ups...');
    const pendingFollowups = await followupService.getPendingFollowups();
    console.log('📧 Pending follow-ups:', pendingFollowups.length);
    pendingFollowups.forEach(followup => {
      console.log(`  - ${followup.email} (scheduled for ${followup.scheduledAt})`);
    });

    // Test 3: Wait a bit and check again
    console.log('\n⏳ Test 3: Waiting 10 seconds before checking again...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    const pendingFollowups2 = await followupService.getPendingFollowups();
    console.log('📧 Pending follow-ups after 10 seconds:', pendingFollowups2.length);

    // Test 4: Get follow-up stats
    console.log('\n📊 Test 4: Getting follow-up statistics...');
    const stats = await followupService.getFollowupStats('test_campaign_123');
    console.log('📈 Follow-up stats:', stats);

    console.log('\n✅ Follow-up system test completed!');
    console.log('\n📝 Note: The follow-up processor runs every 1 minute.');
    console.log('📝 Follow-ups scheduled for 5 minutes will be processed automatically.');
    console.log('📝 Check the console logs for follow-up processing activity.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testFollowupSystem();
