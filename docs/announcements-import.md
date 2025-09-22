# Canvas Announcements Import

This document describes the Canvas announcements import functionality that has been added to the DuNorth system.

## Overview

The system can now import Canvas course announcements using the Canvas API endpoint:
```
/api/v1/courses/${courseId}/discussion_topics?only_announcements=true&per_page=100&include[]=all_dates&include[]=submission_types&include[]=rubric
```

## Database Schema

Announcements are stored in the `announcements` table with the following fields:

- `user_id` (UUID) - References the user who owns the announcement
- `id` (BIGINT) - Canvas announcement ID (primary key with user_id)
- `course_id` (BIGINT) - Canvas course ID
- `title` (TEXT) - Announcement title
- `message` (TEXT) - Announcement content/message
- `posted_at` (TIMESTAMPTZ) - When the announcement was posted
- `created_at` (TIMESTAMPTZ) - When the announcement was created
- `last_reply_at` (TIMESTAMPTZ) - Last reply timestamp
- `html_url` (TEXT) - Canvas URL to the announcement
- `author_name` (TEXT) - Name of the announcement author
- `author_id` (BIGINT) - Canvas user ID of the author
- `read_state` (TEXT) - Read status (read/unread)
- `locked` (BOOLEAN) - Whether the announcement is locked
- `published` (BOOLEAN) - Whether the announcement is published
- `raw_json` (JSONB) - Complete Canvas API response

## API Endpoints

### 1. Bulk Import Announcements
**Endpoint:** `POST /api/sync/import-announcements`

Imports announcements from all courses for the authenticated user.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Response:**
```json
{
  "ok": true,
  "processed": 15,
  "insertedNew": 10,
  "updatedExisting": 5,
  "uniqueAnnouncementsThisRun": 15,
  "imported": 15,
  "details": [
    {"courseId": 12345, "count": 8},
    {"courseId": 67890, "count": 7}
  ]
}
```

### 2. Course Sync (includes announcements)
**Endpoint:** `POST /api/sync/course`

Syncs all course data including announcements for a specific course.

**Body:**
```json
{
  "courseId": 12345
}
```

### 3. Debug Announcements
**Endpoint:** `GET /api/debug/announcements-db`

View imported announcements for debugging purposes.

**Query Parameters:**
- `courseId` (optional) - Filter by specific course
- `limit` (optional, default: 50) - Limit number of results

## Usage Examples

### Import all announcements
```javascript
const response = await fetch('/api/sync/import-announcements', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### View announcements for a specific course
```javascript
const response = await fetch('/api/debug/announcements-db?courseId=12345', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## Canvas API Response Structure

The Canvas API returns announcements as discussion topics with `is_announcement: true`. Key fields include:

- `id` - Unique announcement ID
- `title` - Announcement title
- `message` - HTML content of the announcement
- `posted_at` - Publication timestamp
- `created_at` - Creation timestamp
- `last_reply_at` - Last activity timestamp
- `author` - Author information object
- `html_url` - Direct link to announcement
- `read_state` - User's read status
- `locked` - Whether comments are disabled
- `published` - Publication status

## Error Handling

The import process handles various Canvas API errors:
- 401/403: Authentication issues (skips silently)
- 404: Course or endpoint disabled (returns empty results)
- Other errors: Logged and returned in response details

## Integration

Announcements are automatically imported when:
1. Running the dedicated `/api/sync/import-announcements` endpoint
2. Syncing course data via `/api/sync/course`

The system uses upsert logic (INSERT ... ON CONFLICT DO UPDATE) to handle both new announcements and updates to existing ones.
