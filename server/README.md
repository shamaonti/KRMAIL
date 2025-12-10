# MailSkrap Backend Server

This is the backend API server for the MailSkrap email campaign system. It provides real SMTP email sending functionality using your configured SMTP server.

## Features

- ✅ **Real SMTP Email Sending** - Uses your SMTP server (mail.marketskrap.com)
- ✅ **Multiple Sender Emails** - Rotates between emma@raiya.info, sophia@raiya.info, olivia@raiya.info
- ✅ **Bulk Email Processing** - Send multiple emails with rate limiting
- ✅ **Template Variable Replacement** - Automatically replaces {Name}, {Company}, etc.
- ✅ **Campaign Management** - Create, update, and track campaigns
- ✅ **Rate Limiting** - Prevents spam and protects your SMTP server
- ✅ **Error Handling** - Comprehensive error handling and logging
- ✅ **Security** - CORS, Helmet, and input validation

## Quick Start

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Configure Environment

The server uses `config.env` for configuration. Key settings:

```env
# SMTP Configuration
SMTP_HOST=mail.marketskrap.com
SMTP_PORT=465
SMTP_SECURE=true
SENDER_EMAILS=emma@raiya.info,sophia@raiya.info,olivia@raiya.info
SENDER_PASSWORD=Smart@123

# Server Configuration
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

### 3. Start the Server

```bash
# Development mode (with auto-restart)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3001`

### 4. Test the Connection

Visit `http://localhost:3001/health` to verify the server is running.

## API Endpoints

### Email Endpoints

#### `POST /api/email/send`
Send a single email.

**Request Body:**
```json
{
  "to": "recipient@example.com",
  "subject": "Test Email",
  "htmlBody": "<h1>Hello {Name}</h1><p>Welcome to {Company}!</p>",
  "textBody": "Hello {Name}, Welcome to {Company}!",
  "from": "sophia@raiya.info" // Optional, will rotate if not provided
}
```

**Response:**
```json
{
  "success": true,
  "message": "Email sent successfully",
  "data": {
    "success": true,
    "messageId": "<message-id>",
    "senderEmail": "sophia@raiya.info",
    "sentAt": "2024-01-01T12:00:00.000Z",
    "status": "Sent"
  }
}
```

#### `POST /api/email/bulk`
Send multiple emails with rate limiting.

**Request Body:**
```json
{
  "emails": [
    {
      "to": "user1@example.com",
      "subject": "Welcome",
      "htmlBody": "<h1>Hello {Name}</h1>"
    },
    {
      "to": "user2@example.com", 
      "subject": "Welcome",
      "htmlBody": "<h1>Hello {Name}</h1>"
    }
  ],
  "options": {
    "delayBetweenEmails": 200
  }
}
```

#### `POST /api/email/test`
Send a test email to verify SMTP configuration.

**Request Body:**
```json
{
  "to": "your-email@example.com",
  "subject": "Test Email from MailSkrap"
}
```

#### `GET /api/email/verify`
Verify SMTP connection.

**Query Parameters:**
- `senderEmail` (optional) - Test specific sender email

#### `GET /api/email/config`
Get SMTP configuration (for debugging).

### Campaign Endpoints

#### `GET /api/campaigns`
Get all campaigns.

**Query Parameters:**
- `userId` (optional) - Filter by user ID

#### `POST /api/campaigns`
Create a new campaign.

**Request Body:**
```json
{
  "userId": 1,
  "name": "Welcome Campaign",
  "subject": "Welcome to our service",
  "templateId": 1,
  "template": "<h1>Hello {Name}</h1><p>Welcome to {Company}!</p>",
  "leads": [
    {
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "company": "Acme Corp"
    }
  ],
  "settings": {
    "timezone": "UTC",
    "delayBetweenEmails": 200
  }
}
```

#### `PUT /api/campaigns/:id`
Update a campaign.

#### `DELETE /api/campaigns/:id`
Delete a campaign.

#### `GET /api/campaigns/:id/analytics`
Get campaign analytics.

## SMTP Configuration

The server is configured to use your SMTP server:

- **Host:** `mail.marketskrap.com`
- **Port:** `465` (SSL)
- **Security:** SSL/TLS
- **Sender Emails:** 
  - emma@raiya.info
  - sophia@raiya.info
  - olivia@raiya.info
- **Password:** Smart@123

The system automatically rotates between sender emails to distribute the load and avoid rate limits.

## Template Variables

The system supports automatic variable replacement in email templates:

- `{Name}` - Full name (First + Last)
- `{FirstName}` - First name only
- `{LastName}` - Last name only
- `{Company}` - Company name
- `{Email}` - Email address
- Any custom fields from your CSV data

## Rate Limiting

The server includes rate limiting to protect your SMTP server:

- **Window:** 15 minutes
- **Max Requests:** 100 per IP
- **Delay Between Emails:** 200ms (configurable)

## Error Handling

The server provides detailed error messages for common issues:

- **SMTP Connection Failed** - Check SMTP credentials and server status
- **Invalid Email Format** - Email validation errors
- **Rate Limit Exceeded** - Too many requests
- **Missing Required Fields** - Validation errors

## Testing

### 1. Test SMTP Connection

```bash
curl http://localhost:3001/api/email/verify
```

### 2. Send Test Email

```bash
curl -X POST http://localhost:3001/api/email/test \
  -H "Content-Type: application/json" \
  -d '{"to": "your-email@example.com"}'
```

### 3. Test Campaign Sending

```bash
curl -X POST http://localhost:3001/api/email/campaign \
  -H "Content-Type: application/json" \
  -d '{
    "leads": [
      {
        "email": "test@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "company": "Test Corp"
      }
    ],
    "subject": "Test Campaign",
    "template": "<h1>Hello {Name}</h1><p>Welcome to {Company}!</p>"
  }'
```

## Frontend Integration

The frontend is already configured to use this backend. When the backend is running:

1. The frontend will automatically connect to `http://localhost:3001`
2. Real emails will be sent through your SMTP server
3. If the backend is not available, it falls back to demo mode

## Troubleshooting

### Common Issues

**SMTP Connection Failed:**
- Verify SMTP credentials in `config.env`
- Check if the SMTP server is accessible
- Ensure port 465 is not blocked by firewall

**CORS Errors:**
- Update `CORS_ORIGIN` in `config.env` to match your frontend URL
- Default is `http://localhost:5173` for Vite dev server

**Rate Limiting:**
- Increase `RATE_LIMIT_MAX_REQUESTS` in `config.env`
- Add delays between email sends

**Email Not Sending:**
- Check server logs for detailed error messages
- Verify recipient email format
- Test with a simple email first

### Logs

The server provides detailed logging:

- **Morgan** - HTTP request logging
- **Console** - Application and error logging
- **Email Service** - SMTP operation logging

## Production Deployment

For production deployment:

1. **Environment Variables:** Use proper environment variables instead of `config.env`
2. **Database:** Replace in-memory storage with a real database
3. **SSL:** Use HTTPS in production
4. **Monitoring:** Add application monitoring and logging
5. **Security:** Implement proper authentication and authorization

## Support

For issues or questions:

1. Check the server logs for error messages
2. Verify SMTP configuration
3. Test with the provided endpoints
4. Check the frontend console for API errors
