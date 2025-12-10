# Campaign Management Guide

This guide explains how to use the new campaign management functionality in MailSkrap.

## Features Implemented

### 1. CSV Upload Functionality
- **Drag & Drop Support**: Upload CSV files by dragging them onto the upload area
- **File Validation**: Only accepts .csv files
- **Data Parsing**: Automatically parses CSV headers and extracts lead information
- **Duplicate Detection**: Prevents duplicate email addresses
- **Error Handling**: Shows detailed error messages for invalid data

**Supported CSV Columns:**
- `Email` (required)
- `First Name`
- `Last Name`
- `Company`
- `Phone`
- `Country`
- `City`
- Any additional custom fields

**Sample CSV Format:**
```csv
Email,First Name,Last Name,Company,Phone,Country,City
john.doe@example.com,John,Doe,Acme Corp,+1-555-0101,USA,New York
jane.smith@testcompany.com,Jane,Smith,Test Company,+1-555-0102,USA,Los Angeles
```

### 2. Campaign Creation
- **Campaign Setup**: Create campaigns with name, subject, and template
- **Template Selection**: Choose from existing email templates
- **Lead Management**: Upload and manage lead lists
- **Settings Configuration**: Configure timezone, sending hours, and delays

**Campaign Creation Steps:**
1. Enter campaign name
2. Set email subject
3. Select email template
4. Upload leads via CSV
5. Configure campaign settings
6. Click "Create Campaign"

### 3. Email Sending Functionality
- **SMTP Integration**: Uses configured SMTP settings
- **Template Rendering**: Automatically replaces variables in templates
- **Batch Processing**: Sends emails with configurable delays
- **Progress Tracking**: Shows real-time sending progress
- **Error Handling**: Handles failed sends gracefully

**SMTP Configuration (Default):**
- Server: `mail.marketskrap.com`
- Port: `465` (SSL)
- Email: `sophia@raiya.info`
- Password: `Smart@123`

**Template Variables:**
- `{Name}` - Full name (First + Last)
- `{FirstName}` - First name only
- `{LastName}` - Last name only
- `{Company}` - Company name
- `{Email}` - Email address
- Any custom fields from CSV

### 4. Analytics & Tracking
- **Real-time Metrics**: Track sends, opens, clicks, replies, and bounces
- **Performance Rates**: Calculate open rate, click rate, reply rate, bounce rate
- **Campaign History**: View results from previous campaigns
- **Overall Analytics**: Aggregate metrics across all campaigns

**Metrics Tracked:**
- Total emails sent
- Open rate
- Click rate
- Reply rate
- Bounce rate
- Delivery rate
- Engagement score

## How to Use

### Step 1: Prepare Your Data
1. Create a CSV file with your lead data
2. Ensure the first row contains headers
3. Include at least an "Email" column
4. Add additional columns as needed (First Name, Last Name, Company, etc.)

### Step 2: Create Email Templates
1. Navigate to Email Templates page
2. Create a new template with your email content
3. Use variables like `{Name}`, `{Company}` for personalization
4. Save the template

### Step 3: Create a Campaign
1. Go to Campaign Management page
2. Enter campaign details:
   - Campaign name
   - Email subject
   - Select email template
3. Upload your CSV file with leads
4. Configure campaign settings:
   - Timezone
   - Sending hours
   - Delay between emails
   - A/B testing options
5. Click "Create Campaign"

### Step 4: Send the Campaign
1. Review campaign details
2. Click "Send Campaign"
3. Monitor sending progress
4. View results and analytics

### Step 5: Monitor Results
1. View real-time sending progress
2. Check campaign analytics
3. Review individual email results
4. Export results if needed

## Technical Details

### File Structure
```
src/
├── components/
│   ├── CSVUploader.tsx          # CSV upload component
│   └── CampaignAnalytics.tsx    # Analytics display component
├── lib/
│   ├── email.ts                 # Email sending functionality
│   ├── campaigns.ts             # Campaign management
│   └── templates.ts             # Template management
└── pages/dashboard/
    └── CampaignPage.tsx         # Main campaign page
```

### Data Storage
- **Campaigns**: Stored in localStorage under `mailskrap_campaigns_data`
- **Templates**: Stored in localStorage under `mailskrap_templates`
- **Email Config**: Stored in localStorage under `mailskrap_email_config`
- **Results**: Stored in localStorage under `mailskrap_campaigns`

### API Integration
The system is designed to work with a backend API. Currently, it falls back to demo mode when the API is not available. To integrate with a real backend:

1. Implement the `/api/send-email` endpoint
2. Update the `sendEmail` function in `src/lib/email.ts`
3. Configure proper SMTP settings
4. Add database storage for campaigns and results

### Demo Mode
When the backend API is not available, the system runs in demo mode:
- Simulates email sending with delays
- Generates realistic analytics data
- Stores all data in localStorage
- Shows demo indicators in the UI

## Troubleshooting

### Common Issues

**CSV Upload Fails:**
- Ensure file is in CSV format
- Check that first row contains headers
- Verify email addresses are valid
- Remove any special characters from headers

**Template Variables Not Working:**
- Use exact variable names: `{Name}`, `{Company}`, etc.
- Ensure CSV contains the corresponding columns
- Check template content for typos

**Emails Not Sending:**
- Verify SMTP configuration
- Check network connectivity
- Ensure email addresses are valid
- Review error messages in console

**Analytics Not Updating:**
- Refresh the page after sending
- Check localStorage for data
- Verify campaign status is "sent"

### Error Messages

- **"No valid leads found"**: CSV file is empty or has no valid email addresses
- **"Duplicate email address"**: Same email appears multiple times
- **"Invalid email format"**: Email address doesn't contain @ symbol
- **"Template not found"**: Selected template doesn't exist
- **"Campaign validation failed"**: Required fields are missing

## Future Enhancements

Planned features for future releases:
- Email sequence automation
- Advanced segmentation
- A/B testing implementation
- Real-time tracking pixels
- Unsubscribe management
- Advanced reporting
- API rate limiting
- Database integration
- Email scheduling
- Template versioning

## Support

For technical support or questions:
1. Check the browser console for error messages
2. Verify all required fields are filled
3. Test with the sample CSV file provided
4. Review the troubleshooting section above
