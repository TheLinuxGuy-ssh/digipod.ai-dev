# Email Monitoring System

A comprehensive backend system for automatic email monitoring, AI-powered draft generation, and dashboard management.

## Overview

The Email Monitoring System provides:

1. **Periodic Email Checking**: Background service that checks emails every 5-10 minutes
2. **IMAP/Gmail Integration**: Support for both Gmail OAuth and IMAP/SMTP connections
3. **Client Filtering**: Only process emails from specific client addresses
4. **Duplicate Prevention**: Track processed emails to avoid reprocessing
5. **AI Draft Generation**: Automatic generation of professional email responses
6. **Dashboard Interface**: Complete UI for managing settings and reviewing drafts

## Architecture

### Core Components

1. **Email Monitor Service** (`src/lib/emailMonitor.ts`)
   - Background service for periodic email checking
   - Handles both Gmail and IMAP connections
   - Manages duplicate prevention and processing queues

2. **API Endpoints**
   - `/api/email-settings` - CRUD operations for email accounts
   - `/api/client-filters` - CRUD operations for client email filters
   - `/api/ai-drafts` - Manage AI-generated drafts
   - `/api/email-monitor/check` - Manual email checking and status

3. **Dashboard Component** (`src/components/EmailMonitorDashboard.tsx`)
   - Complete UI for managing the system
   - Real-time status monitoring
   - Draft review and approval interface

### Database Collections

- `emailSettings` - Email account configurations
- `clientEmailFilters` - Client email addresses to monitor
- `processedEmails` - Tracked emails and their processing status
- `aiDrafts` - AI-generated email drafts
- `todos` - Extracted actionable tasks from emails

## Setup Instructions

### 1. Environment Variables

Ensure these environment variables are set:

```env
GEMINI_API_KEY=your_gemini_api_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=your_google_redirect_uri
IMAP_ENCRYPTION_KEY=your_encryption_key
```

### 2. Firestore Indexes

Create these indexes in Firebase Console:

```
emailSettings:
- userId (ascending)
- isActive (ascending)

clientEmailFilters:
- userId (ascending), createdAt (descending)
- userId (ascending), emailAddress (ascending)

processedEmails:
- userId (ascending), status (ascending)
- userId (ascending), processedAt (descending)

aiDrafts:
- processedEmailId (ascending), status (ascending)
- createdAt (descending)
```

### 3. Migration

Run the migration script to move existing data:

```bash
node scripts/migrate-to-email-monitor.js
```

### 4. Start Background Service

Initialize the background service in your application:

```typescript
import { initializeBackgroundServices } from '@/lib/backgroundService';

// In your server startup
await initializeBackgroundServices();
```

## Usage

### 1. Configure Email Accounts

1. Navigate to the Email Monitor Dashboard
2. Go to "Email Settings" tab
3. Click "Add Email Account"
4. Choose provider (Gmail or IMAP/SMTP)
5. Enter credentials and check interval

### 2. Set Up Client Filters

1. Go to "Client Filters" tab
2. Click "Add Client Filter"
3. Enter client email address
4. Optionally link to a project

### 3. Monitor and Review Drafts

1. Go to "AI Drafts" tab
2. View automatically generated drafts
3. Review, edit, approve, or decline drafts
4. Monitor processing status in real-time

## API Reference

### Email Settings

```typescript
// GET /api/email-settings
// Get all email settings for user

// POST /api/email-settings
{
  provider: 'gmail' | 'imap',
  email: string,
  gmailToken?: string, // For Gmail
  imapHost?: string,   // For IMAP
  imapPort?: number,
  imapSecure?: boolean,
  username?: string,
  password?: string,
  checkInterval: number // minutes
}

// PATCH /api/email-settings
// Update email setting

// DELETE /api/email-settings?id=settingId
// Delete email setting
```

### Client Filters

```typescript
// GET /api/client-filters
// Get all client filters for user

// POST /api/client-filters
{
  emailAddress: string,
  projectId?: string
}

// PATCH /api/client-filters
// Update client filter

// DELETE /api/client-filters?id=filterId
// Delete client filter
```

### AI Drafts

```typescript
// GET /api/ai-drafts?status=draft&projectId=xxx&limit=20
// Get AI drafts with filters

// POST /api/ai-drafts
{
  draftId: string,
  subject?: string,
  body?: string,
  closing?: string,
  signature?: string
}
// Approve and send draft

// PATCH /api/ai-drafts
{
  draftId: string,
  status?: 'declined',
  subject?: string,
  body?: string,
  closing?: string,
  signature?: string
}
// Update draft

// DELETE /api/ai-drafts?id=draftId
// Delete draft
```

### Email Monitor

```typescript
// POST /api/email-monitor/check
// Manually trigger email checking

// GET /api/email-monitor/check
// Get processing status
```

## Features

### Automatic Email Processing

- **Periodic Checking**: Configurable intervals (1-60 minutes)
- **Smart Filtering**: Only process emails from monitored clients
- **Duplicate Prevention**: Track processed emails by ID
- **Error Handling**: Graceful handling of connection issues

### AI Integration

- **Professional Drafts**: Context-aware email responses
- **Todo Extraction**: Automatic extraction of actionable tasks
- **Customizable Tone**: Professional, friendly, or formal responses
- **Project Context**: Use project information for personalized responses

### Dashboard Features

- **Real-time Updates**: Live status monitoring
- **Bulk Operations**: Approve/decline multiple drafts
- **Edit Interface**: Inline draft editing
- **Status Tracking**: Monitor processing pipeline
- **Error Reporting**: Detailed error messages and troubleshooting

### Security

- **Encrypted Storage**: Passwords encrypted at rest
- **User Isolation**: Users can only access their own data
- **Token Management**: Secure OAuth token handling
- **Input Validation**: Comprehensive validation of all inputs

## Troubleshooting

### Common Issues

1. **Emails not being processed**
   - Check email settings are active
   - Verify client filters are configured
   - Check processing status for errors

2. **AI drafts not generating**
   - Verify GEMINI_API_KEY is set
   - Check API quota and limits
   - Review error logs

3. **Connection issues**
   - Verify IMAP/SMTP credentials
   - Check firewall and network settings
   - Test connection manually

### Monitoring

- Check processing status in dashboard
- Monitor Firestore logs for errors
- Review background service logs
- Track API usage and quotas

## Performance Considerations

- **Rate Limiting**: Respect email provider limits
- **Batch Processing**: Process emails in batches
- **Caching**: Cache frequently accessed data
- **Indexing**: Optimize Firestore queries with proper indexes

## Future Enhancements

- **Webhook Support**: Real-time email notifications
- **Advanced Filtering**: Regex and domain-based filters
- **Template System**: Customizable email templates
- **Analytics**: Email processing metrics and insights
- **Multi-language Support**: Internationalization
- **Mobile App**: Native mobile application 