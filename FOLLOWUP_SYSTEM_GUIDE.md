# MailSkrap Follow-up Email System

This document describes the automatic follow-up email system that sends follow-up emails to leads based on their engagement with the original campaign.

## Features

### 1. Email Tracking
- **Invisible Pixel Tracking**: Uses industry-standard 1x1 transparent GIF pixels to track email opens
- **Click Tracking**: Tracks link clicks with redirect URLs
- **Real-time Analytics**: Tracks opens, clicks, and engagement in real-time
- **IP and User Agent Tracking**: Captures recipient location and device information

### 2. Follow-up Campaigns
- **Conditional Sending**: Send follow-ups only if original email was not opened/clicked
- **Flexible Timing**: Set follow-up delay from 1 hour to 1 week
- **Template Support**: Use custom follow-up email templates
- **Automatic Processing**: Background service processes follow-ups automatically

### 3. Campaign Management
- **Follow-up Settings**: Configure follow-ups during campaign creation
- **Template Selection**: Choose from follow-up-specific templates
- **Condition Options**: 
  - `not_opened`: Send only if original email wasn't opened
  - `not_clicked`: Send only if original email wasn't clicked
  - `always`: Send follow-up regardless of engagement

## Database Schema

### New Tables Added

#### `email_campaigns` (Updated)
```sql
-- Follow-up campaign settings
has_followup BOOLEAN DEFAULT FALSE,
followup_template_id INT,
followup_subject VARCHAR(500),
followup_delay_hours INT DEFAULT 24,
followup_condition ENUM('not_opened', 'not_clicked', 'always') DEFAULT 'not_opened',
```

#### `email_logs` (Updated)
```sql
-- Follow-up tracking
is_followup BOOLEAN DEFAULT FALSE,
original_campaign_id INT,
followup_sent_at TIMESTAMP NULL,
```

#### `followup_queue` (New)
```sql
CREATE TABLE followup_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NOT NULL,
    contact_id INT NOT NULL,
    email_log_id INT NOT NULL,
    user_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    followup_template_id INT NOT NULL,
    followup_subject VARCHAR(500),
    scheduled_at DATETIME NOT NULL,
    status ENUM('pending', 'sent', 'cancelled', 'failed') DEFAULT 'pending',
    sent_at TIMESTAMP NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## API Endpoints

### Email Tracking
```
GET /api/email/track/:logId
GET /api/email/track/click/:logId?url=<encoded_url>
```

### Campaign Sending (Updated)
```
POST /api/email/campaign
{
  "leads": [...],
  "subject": "Campaign Subject",
  "template": "<html>...</html>",
  "campaignId": "campaign_123",
  "userId": 1,
  "followupSettings": {
    "enabled": true,
    "templateId": 2,
    "subject": "Follow-up Subject",
    "delayHours": 24,
    "condition": "not_opened"
  }
}
```

## Frontend Integration

### Campaign Creation
1. **Enable Follow-up**: Toggle switch in campaign settings
2. **Select Template**: Choose follow-up email template
3. **Set Subject**: Customize follow-up email subject
4. **Configure Timing**: Set delay in hours (1-168)
5. **Choose Condition**: Select when to send follow-up

### UI Components
- Follow-up settings section in campaign creation
- Template filtering for follow-up templates
- Real-time follow-up statistics
- Follow-up queue monitoring

## Backend Services

### Database Service (`databaseService.js`)
- Manages database connections
- Handles email tracking operations
- Processes follow-up queue operations
- Provides analytics and statistics

### Follow-up Service (`followupService.js`)
- Background processor for follow-up emails
- Checks email engagement conditions
- Sends follow-up emails automatically
- Manages follow-up queue status

### Email Service (Updated)
- Adds tracking pixels to emails
- Generates unique tracking IDs
- Integrates with follow-up scheduling

## Configuration

### Environment Variables
```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=mailskrap_db

# Base URL for tracking
BASE_URL=http://localhost:3001

# SMTP Configuration
SMTP_HOST=mail.marketskrap.com
SMTP_PORT=465
SENDER_EMAILS=emma@raiya.info,sophia@raiya.info,olivia@raiya.info
SENDER_PASSWORD=Smart@123
```

## Usage Examples

### 1. Create Campaign with Follow-up
```javascript
const campaign = createCampaign(
  userId,
  "Welcome Campaign",
  "Welcome to our service!",
  template,
  leads,
  settings,
  {
    enabled: true,
    templateId: 2,
    subject: "Did you see our email?",
    delayHours: 24,
    condition: "not_opened"
  }
);
```

### 2. Send Campaign with Tracking
```javascript
const result = await sendCampaign(
  leads,
  subject,
  template,
  {
    campaignId: campaign.id,
    userId: campaign.userId,
    followupSettings: campaign.followupSettings
  }
);
```

### 3. Monitor Follow-up Statistics
```javascript
const stats = await followupService.getFollowupStats(campaignId);
console.log(`Scheduled: ${stats.totalScheduled}`);
console.log(`Sent: ${stats.totalSent}`);
console.log(`Cancelled: ${stats.totalCancelled}`);
```

## Testing

### Run Test Script
```bash
cd server
node test-followup.js
```

### Manual Testing
1. Create a campaign with follow-up enabled
2. Send the campaign
3. Check follow-up queue in database
4. Wait for follow-up delay
5. Verify follow-up email is sent (if conditions met)

## Security Considerations

1. **Tracking Privacy**: Only track opens/clicks, not personal data
2. **Rate Limiting**: Prevents abuse of tracking endpoints
3. **Database Security**: Use prepared statements for all queries
4. **Email Security**: Validate all email addresses and content

## Performance Optimization

1. **Database Indexing**: Optimized indexes for follow-up queries
2. **Background Processing**: Non-blocking follow-up processing
3. **Connection Pooling**: Efficient database connection management
4. **Caching**: Cache frequently accessed data

## Troubleshooting

### Common Issues

1. **Follow-ups not sending**
   - Check database connection
   - Verify follow-up processor is running
   - Check scheduled_at times

2. **Tracking not working**
   - Verify BASE_URL configuration
   - Check email client compatibility
   - Review tracking pixel implementation

3. **Database errors**
   - Verify database schema is up to date
   - Check database credentials
   - Review connection pool settings

### Debug Commands
```bash
# Check follow-up processor status
curl http://localhost:3001/health

# Test tracking endpoint
curl http://localhost:3001/api/email/track/test_123

# View follow-up queue
SELECT * FROM followup_queue WHERE status = 'pending';
```

## Future Enhancements

1. **Advanced Conditions**: Multiple conditions, A/B testing
2. **Sequential Follow-ups**: Multiple follow-up sequences
3. **Personalization**: Dynamic content based on engagement
4. **Analytics Dashboard**: Real-time follow-up performance
5. **Integration**: CRM and marketing automation tools
