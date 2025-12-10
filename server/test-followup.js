const followupService = require('./services/followupService');
const databaseService = require('./services/databaseService');

async function testFollowupSystem() {
  console.log('🧪 Testing Follow-up Email System...\n');

  try {
    // Initialize database connection
    await databaseService.initialize();
    console.log('✅ Database initialized');

    // Start follow-up processor
    followupService.startProcessor();
    console.log('✅ Follow-up processor started');

    // Test scheduling a follow-up
    const testFollowupData = {
      campaignId: 1,
      contactId: 1,
      emailLogId: 'test_log_123',
      userId: 1,
      email: 'test@example.com',
      followupTemplateId: 1,
      followupSubject: 'Test Follow-up',
      delayHours: 1, // 1 hour delay
      condition: 'not_opened'
    };

    console.log('\n📅 Testing follow-up scheduling...');
    const scheduleResult = await followupService.scheduleFollowup(testFollowupData);
    console.log('Schedule result:', scheduleResult);

    // Test getting pending follow-ups
    console.log('\n📋 Testing pending follow-ups retrieval...');
    const pendingFollowups = await followupService.getPendingFollowups();
    console.log('Pending follow-ups:', pendingFollowups.length);

    // Test follow-up statistics
    console.log('\n📊 Testing follow-up statistics...');
    const stats = await followupService.getFollowupStats(1);
    console.log('Follow-up stats:', stats);

    console.log('\n✅ All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up
    followupService.stopProcessor();
    await databaseService.close();
  }
}

// Run the test
testFollowupSystem();
