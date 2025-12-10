# Follow-up Email Testing Guide

This guide explains how to test the follow-up email functionality that has been implemented.

## Overview

The follow-up email system allows you to automatically send follow-up emails after the original campaign emails are sent. For testing purposes, the system is configured with a 5-minute delay.

## Features Implemented

### 1. Backend Follow-up Service
- **Location**: `server/services/followupService.js`
- **Features**:
  - In-memory follow-up storage (for testing without database)
  - Automatic follow-up processing every 1 minute
  - Support for different follow-up conditions (not opened, not clicked, always)
  - Fallback to database when available

### 2. Frontend Integration
- **Location**: `src/pages/dashboard/CampaignPage.tsx`
- **Features**:
  - Follow-up settings in campaign creation
  - Default 5-minute delay for testing
  - Support for custom follow-up templates
  - Real-time display of delay in minutes/hours

### 3. Email Integration
- **Location**: `server/routes/email.js`
- **Features**:
  - Automatic follow-up scheduling when campaigns are sent
  - Integration with existing email service
  - Support for custom follow-up templates

## Testing the Follow-up System

### Method 1: Using the Frontend Interface

1. **Start the server**:
   ```bash
   cd server
   npm start
   ```

2. **Start the frontend**:
   ```bash
   npm run dev
   ```

3. **Create a campaign with follow-up**:
   - Go to the Campaign Management page
   - Enable "Follow-up Email" toggle
   - Set delay to 0.083 hours (5 minutes)
   - Choose a follow-up template or leave blank for default
   - Upload some test leads
   - Create and send the campaign

4. **Monitor the follow-ups**:
   - Check the server console for follow-up scheduling logs
   - Wait 5 minutes and check for follow-up processing logs
   - Check your email for the follow-up messages

### Method 2: Using Test Scripts

1. **Test the follow-up service directly**:
   ```bash
   cd server
   node test-followup-simple.js
   ```

2. **Test the full campaign flow**:
   ```bash
   cd server
   node test-campaign-with-followup.js
   ```

### Method 3: Manual Testing via API

1. **Send a campaign with follow-up settings**:
   ```bash
   curl -X POST http://localhost:3001/api/email/campaign \
     -H "Content-Type: application/json" \
     -d '{
       "leads": [{"email": "test@example.com", "firstName": "John", "lastName": "Doe"}],
       "subject": "Test Campaign",
       "template": "<h2>Hello {FirstName}!</h2><p>This is a test email.</p>",
       "config": {"delayBetweenEmails": 200},
       "campaignId": "test_campaign_123",
       "userId": 1,
       "followupSettings": {
         "enabled": true,
         "subject": "Follow-up: Your previous email",
         "delayHours": 0.083,
         "condition": "always"
       }
     }'
   ```

## Follow-up Email Content

### Default Test Template
When no custom template is provided, the system uses this default template:
```html
<h2>Follow-up Email</h2>
<p>Hi there,</p>
<p>This is a follow-up email sent X minutes after the original email was successfully delivered.</p>
<p><strong>REPLY SENT X MINUTES AFTER SUCCESSFULLY</strong></p>
<p>Thank you for your interest!</p>
<p>Best regards,<br>The MailSkrap Team</p>
```

### Custom Templates
You can create custom follow-up templates in the Email Templates page with `template_type: 'followup'`.

## Configuration

### Timing Settings
- **Follow-up processor check interval**: 1 minute (for testing)
- **Default follow-up delay**: 5 minutes (0.083 hours)
- **Minimum delay**: 0.01 hours (36 seconds)
- **Maximum delay**: 168 hours (1 week)

### Follow-up Conditions
- **not_opened**: Send follow-up only if original email was not opened
- **not_clicked**: Send follow-up only if original email was not clicked
- **always**: Always send follow-up regardless of engagement

## Monitoring and Logs

### Server Console Logs
Look for these log messages:
- `🔄 Follow-up email processor started`
- `📅 Scheduled follow-up email for [email] at [time]`
- `📧 Processing follow-up for [email]`
- `✅ Follow-up sent successfully to [email]`

### Follow-up Statistics
The system tracks:
- Total scheduled follow-ups
- Successfully sent follow-ups
- Cancelled follow-ups (due to conditions)
- Failed follow-ups

## Troubleshooting

### Common Issues

1. **Follow-ups not being sent**:
   - Check if the follow-up processor is running
   - Verify the delay time has passed
   - Check server console for error messages

2. **Database connection issues**:
   - The system automatically falls back to in-memory storage
   - Check console logs for "Database not available" messages

3. **SMTP issues**:
   - Verify SMTP configuration in `server/config.env`
   - Check email service logs for connection errors

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` in your environment.

## Production Considerations

When moving to production:
1. Set up proper database connection
2. Adjust follow-up processor interval to 5-15 minutes
3. Configure proper SMTP settings
4. Set up email tracking for open/click conditions
5. Implement proper error handling and retry logic

## Files Modified

- `server/services/followupService.js` - Main follow-up service
- `server/routes/email.js` - Email route integration
- `src/pages/dashboard/CampaignPage.tsx` - Frontend interface
- `server/test-followup-simple.js` - Simple test script
- `server/test-campaign-with-followup.js` - Full campaign test script
