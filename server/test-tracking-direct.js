/**
 * DIRECT TRACKING API TEST
 * Test if tracking endpoint is working
 */

const axios = require('axios');
const mysql = require('mysql2/promise');
require('dotenv').config();

const APP_URL = process.env.APP_URL || 'http://localhost:3001';

async function testTrackingAPI() {
  console.log('🧪 TESTING TRACKING API DIRECTLY\n');
  console.log('=' .repeat(70));
  
  let connection;
  
  try {
    // Connect to DB
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'mailskrap_db'
    });
    
    console.log('✅ Database connected\n');
    
    // Get latest sent campaign
    const [campaigns] = await connection.query(
      `SELECT id, name FROM email_campaigns 
       WHERE status = 'sent' 
       ORDER BY completed_at DESC 
       LIMIT 1`
    );
    
    if (campaigns.length === 0) {
      console.log('❌ No sent campaigns found');
      return;
    }
    
    const campaignId = campaigns[0].id;
    console.log(`📧 Testing with Campaign: ${campaigns[0].name} (ID: ${campaignId})\n`);
    
    // Get a lead from this campaign
    const [leads] = await connection.query(
      `SELECT email, status, opened_at, open_count 
       FROM campaign_data 
       WHERE campaign_id = ? 
       LIMIT 1`,
      [campaignId]
    );
    
    if (leads.length === 0) {
      console.log('❌ No leads found for this campaign');
      return;
    }
    
    const testEmail = leads[0].email;
    console.log('📨 Test Email:', testEmail);
    console.log('📊 Before Test:');
    console.log(`   Status: ${leads[0].status}`);
    console.log(`   Opened at: ${leads[0].opened_at}`);
    console.log(`   Open count: ${leads[0].open_count}\n`);
    
    // Build tracking URL
    const trackingUrl = `${APP_URL}/api/track/open?cid=${campaignId}&email=${encodeURIComponent(testEmail)}&t=${Date.now()}`;
    
    console.log('🔗 Tracking URL:');
    console.log('-'.repeat(70));
    console.log(trackingUrl);
    console.log('-'.repeat(70));
    console.log('\n');
    
    // Test the endpoint
    console.log('📡 Calling tracking endpoint...\n');
    
    try {
      const response = await axios.get(trackingUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      console.log('✅ Response received!');
      console.log(`   Status: ${response.status}`);
      console.log(`   Content-Type: ${response.headers['content-type']}`);
      console.log(`   Content-Length: ${response.headers['content-length']} bytes\n`);
      
      if (response.status !== 200) {
        console.log('❌ Expected status 200, got', response.status);
        return;
      }
      
      if (response.headers['content-type'] !== 'image/gif') {
        console.log('❌ Expected Content-Type: image/gif');
        console.log('   Got:', response.headers['content-type']);
        return;
      }
      
      console.log('✅ Tracking pixel returned correctly!\n');
      
    } catch (error) {
      console.log('❌ FAILED to call tracking endpoint!');
      console.log(`   Error: ${error.message}\n`);
      
      if (error.code === 'ECONNREFUSED') {
        console.log('🔧 FIX: Server is not running on port 3001');
        console.log('   Run: npm start\n');
      } else if (error.code === 'ENOTFOUND') {
        console.log('🔧 FIX: Cannot resolve ngrok URL');
        console.log('   1. Check if ngrok is running');
        console.log('   2. Update APP_URL in .env');
        console.log('   3. Restart server\n');
      }
      return;
    }
    
    // Wait for database to update
    console.log('⏳ Waiting 2 seconds for database update...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if database was updated
    const [updatedLeads] = await connection.query(
      `SELECT email, status, opened_at, open_count 
       FROM campaign_data 
       WHERE campaign_id = ? AND email = ?`,
      [campaignId, testEmail]
    );
    
    if (updatedLeads.length > 0) {
      const updated = updatedLeads[0];
      console.log('📊 After Test:');
      console.log(`   Status: ${updated.status}`);
      console.log(`   Opened at: ${updated.opened_at}`);
      console.log(`   Open count: ${updated.open_count}\n`);
      
      // Compare before and after
      if (updated.open_count > leads[0].open_count) {
        console.log('✅ SUCCESS! Open count increased!');
        console.log(`   ${leads[0].open_count} → ${updated.open_count}\n`);
      } else {
        console.log('⚠️  Open count did NOT increase');
        console.log('   Database update may have failed\n');
      }
      
      if (updated.opened_at !== leads[0].opened_at && updated.opened_at !== null) {
        console.log('✅ SUCCESS! opened_at timestamp updated!\n');
      } else if (updated.opened_at === null) {
        console.log('❌ FAILED! opened_at is still NULL');
        console.log('   Check track.js database queries\n');
      }
      
      if (updated.status === 'opened' && leads[0].status === 'sent') {
        console.log('✅ SUCCESS! Status changed from sent → opened\n');
      } else if (updated.status !== 'opened') {
        console.log('⚠️  Status did not change to "opened"');
        console.log(`   Current status: ${updated.status}\n`);
      }
    }
    
    // Check campaign counter
    const [campaign] = await connection.query(
      `SELECT opened_count FROM email_campaigns WHERE id = ?`,
      [campaignId]
    );
    
    console.log('📧 Campaign Statistics:');
    console.log(`   Opened count: ${campaign[0].opened_count}\n`);
    
    // Final summary
    console.log('=' .repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('=' .repeat(70));
    console.log('\nIf all checks passed, tracking is working!');
    console.log('\n🔍 If email tracking still not working:');
    console.log('\n1. Check email HTML source:');
    console.log('   - Open the email');
    console.log('   - Right-click → "Show original" (Gmail) or "View source"');
    console.log('   - Search for: api/track/open');
    console.log('   - Verify the URL is present\n');
    console.log('2. Check if images are loading:');
    console.log('   - Gmail: Click "Display images below"');
    console.log('   - Outlook: Click "Download pictures"');
    console.log('   - Check browser Network tab for tracking request\n');
    console.log('3. Check server logs:');
    console.log('   - Look for: "🔍 OPEN TRACKING REQUEST"');
    console.log('   - If not appearing, image is not loading\n');
    console.log('4. Test in different email clients:');
    console.log('   - Gmail (web)');
    console.log('   - Outlook (desktop)');
    console.log('   - Yahoo Mail\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

console.log('\n🚀 Starting tracking API test...\n');
testTrackingAPI();