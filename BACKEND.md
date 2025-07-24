# Note-Taking App Backend API

## Overview
This is a comprehensive backend API for a full-stack note-taking application built with Node.js, Express, Supabase, Stripe, and SMTP email functionality.

## Architecture
- **Framework**: Express.js with ES6 modules
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with JWT tokens
- **Payments**: Stripe for subscription management
- **Email**: Nodemailer with SMTP
- **Deployment**: Designed for Render.com

## Database Schema

### Tables

#### `folders`
- `id` (UUID, Primary Key)
- `owner_uid` (UUID, Foreign Key to auth.users)
- `name` (TEXT)
- `parent_folder_id` (UUID, Self-referencing FK)
- `created_at` (TIMESTAMPTZ)

#### `notes`
- `id` (UUID, Primary Key)
- `owner_uid` (UUID, Foreign Key to auth.users)
- `folder_id` (UUID, Foreign Key to folders)
- `title` (TEXT)
- `body` (TEXT)
- `draft` (BOOLEAN)
- `encrypted` (BOOLEAN)
- `updated_at` (TIMESTAMPTZ)

#### `tags`
- `id` (UUID, Primary Key)
- `name` (TEXT, Unique)

#### `note_tags` (Junction Table)
- `note_id` (UUID, Foreign Key to notes)
- `tag_id` (UUID, Foreign Key to tags)
- Primary Key: (note_id, tag_id)

#### `note_permissions`
- `note_id` (UUID, Foreign Key to notes)
- `collaborator_uid` (UUID, Foreign Key to auth.users)
- `can_edit` (BOOLEAN)
- `can_comment` (BOOLEAN)
- Primary Key: (note_id, collaborator_uid)

#### `share_invitations`
- `id` (UUID, Primary Key)
- `note_id` (UUID, Foreign Key to notes)
- `email` (TEXT)
- `role` (TEXT: 'view', 'comment', 'edit')
- `invited_by_uid` (UUID, Foreign Key to auth.users)
- `status` (TEXT, Default: 'pending')
- `token` (TEXT)
- `expiry` (TIMESTAMPTZ, Default: now() + 7 days)

#### `user_settings`
- `uid` (UUID, Primary Key)
- `theme` (TEXT, Default: 'system')
- `font` (TEXT, Default: 'inter')
- `reduced_motion` (BOOLEAN, Default: false)

#### `user_subscriptions`
- `uid` (UUID, Primary Key)
- `stripe_customer_id` (TEXT)
- `plan` (TEXT, Default: 'free')
- `status` (TEXT, Default: 'inactive')
- `current_period_end` (TIMESTAMPTZ)

#### `payment_events`
- `id` (UUID, Primary Key)
- `uid` (UUID)
- `stripe_event_id` (TEXT)
- `type` (TEXT)
- `payload` (JSONB)
- `received_at` (TIMESTAMPTZ)

## API Endpoints

### Health Check
- **GET** `/health`
- **Response**: `{"ok": true, "message": "Note Taking App API is running"}`

### Stripe Webhook
- **POST** `/api/stripe/webhook`
- **Purpose**: Handle Stripe webhook events
- **Authentication**: Stripe signature verification
- **Events Handled**:
  - `checkout.session.completed`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `customer.subscription.deleted`

### Create Checkout Session
- **POST** `/api/billing/checkout-session`
- **Authentication**: Bearer token required
- **Request Body**:
  ```json
  {
    "priceId": "price_1234567890",
    "successUrl": "https://app.com/success",
    "cancelUrl": "https://app.com/cancel"
  }
  ```
- **Response**:
  ```json
  {
    "ok": true,
    "data": {
      "url": "https://checkout.stripe.com/...",
      "sessionId": "cs_1234567890"
    }
  }
  ```

### Invite Collaborator
- **POST** `/api/notes/:noteId/share`
- **Authentication**: Bearer token required
- **Request Body**:
  ```json
  {
    "email": "collaborator@example.com",
    "role": "edit"
  }
  ```
- **Response**:
  ```json
  {
    "ok": true,
    "data": {
      "invitationId": "uuid",
      "email": "collaborator@example.com",
      "role": "edit",
      "status": "pending",
      "emailSent": true
    }
  }
  ```

### Move Note
- **POST** `/api/notes/:noteId/move`
- **Authentication**: Bearer token required
- **Request Body**:
  ```json
  {
    "folderId": "uuid-or-null"
  }
  ```
- **Response**:
  ```json
  {
    "ok": true,
    "data": {
      "noteId": "uuid",
      "title": "Note Title",
      "folderId": "uuid",
      "folderName": "Folder Name",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  }
  ```

### Search Notes
- **POST** `/api/search`
- **Authentication**: Bearer token required
- **Request Body**:
  ```json
  {
    "query": "search terms",
    "limit": 20
  }
  ```
- **Response**:
  ```json
  {
    "ok": true,
    "data": [
      {
        "id": "uuid",
        "title": "Note Title",
        "snippet": "Note content preview...",
        "updated_at": "2024-01-01T00:00:00Z",
        "folder_name": "Folder Name"
      }
    ]
  }
  ```

## Authentication

All endpoints (except health check and Stripe webhook) require a Bearer token in the Authorization header:
```
Authorization: Bearer <supabase-jwt-token>
```

The token is validated using Supabase Auth's `getUser()` method.

## Environment Variables

### Required
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_SECRET_KEY=sk_test_or_live_key
STRIPE_WEBHOOK_SECRET=whsec_webhook_secret
```

### Optional
```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=username
SMTP_PASS=password
FROM_EMAIL=noreply@yourapp.com
APP_URL=https://yourapp.com
PORT=3000
```

## Email Templates

The system includes three email templates:

1. **Invitation Email**: Sent when users are invited to collaborate
2. **Welcome Email**: Sent to new users
3. **Password Reset Email**: Sent for password reset requests

## Error Handling

All endpoints return consistent error responses:
```json
{
  "ok": false,
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad Request (missing/invalid parameters)
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (resource doesn't exist)
- `409`: Conflict (duplicate resource)
- `500`: Internal Server Error

## Security Features

1. **JWT Authentication**: All endpoints validate Supabase JWT tokens
2. **Permission Checks**: Users can only access/modify their own resources
3. **Stripe Webhook Verification**: Webhook signatures are verified
4. **SQL Injection Protection**: Using Supabase client with parameterized queries
5. **CORS Protection**: Configurable CORS settings

## Deployment

### Render.com Deployment
1. Connect your GitHub repository
2. Set environment variables in Render dashboard
3. Use build command: `npm install`
4. Use start command: `npm start`

### Environment Setup
1. Create Supabase project and get credentials
2. Set up Stripe account and get API keys
3. Configure SMTP settings for email delivery
4. Set all required environment variables

## Testing

### Manual Testing with cURL

Test health endpoint:
```bash
curl -X GET http://localhost:3000/health
```

Test search (requires valid JWT):
```bash
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{"query": "test", "limit": 10}'
```

## File Structure

```
/
├── api/
│   ├── supabaseClient.js     # Supabase client configuration
│   ├── sendEmail.js          # Email service with templates
│   ├── stripeWebhook.js      # Stripe webhook handler
│   ├── createCheckout.js     # Stripe checkout session creation
│   ├── inviteCollaborator.js # Collaboration invitation
│   ├── moveNote.js           # Note organization
│   └── searchNotes.js        # Full-text search
├── server.js                 # Express server setup
├── package.json              # Dependencies and scripts
├── .env                      # Environment variables
└── BACKEND.md               # This documentation
```

## Dependencies

### Production
- `@supabase/supabase-js`: Supabase client
- `stripe`: Stripe payment processing
- `nodemailer`: Email sending
- `express`: Web framework
- `cors`: Cross-origin resource sharing
- `dotenv`: Environment variable loading

### Development
- `node`: v18+ required

## Future Enhancements

1. **Rate Limiting**: Implement request rate limiting
2. **Caching**: Add Redis caching for frequently accessed data
3. **File Uploads**: Support for note attachments
4. **Real-time Updates**: WebSocket support for collaborative editing
5. **Advanced Search**: Full-text search with PostgreSQL FTS
6. **Audit Logging**: Track all user actions
7. **API Versioning**: Version the API for backward compatibility
8. **Monitoring**: Add application performance monitoring
9. **Testing**: Comprehensive unit and integration tests
10. **Documentation**: OpenAPI/Swagger documentation

## Support

For issues and questions:
1. Check the server logs for error details
2. Verify environment variables are set correctly
3. Ensure database migrations have been applied
4. Test individual endpoints with proper authentication

## License

MIT License - See LICENSE file for details.
