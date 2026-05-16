# Stage 1

## REST API Design for Campus Notification Platform

### Core Actions
The notification platform supports the following actions:
- Fetch all notifications for a student
- Fetch unread notifications for a student
- Mark a notification as read
- Mark all notifications as read
- Delete a notification
- Send a notification (admin only)

### REST API Endpoints

#### 1. Get All Notifications
```
GET /api/notifications
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json

Response 200:
{
  "notifications": [
    {
      "id": "uuid",
      "type": "Placement" | "Event" | "Result",
      "message": "string",
      "isRead": false,
      "createdAt": "2026-04-22T17:51:30Z"
    }
  ]
}
```

#### 2. Get Unread Notifications
```
GET /api/notifications?isRead=false
Headers:
  Authorization: Bearer <token>

Response 200:
{
  "notifications": [...],
  "unreadCount": 5
}
```

#### 3. Mark Notification as Read
```
PATCH /api/notifications/:id/read
Headers:
  Authorization: Bearer <token>

Response 200:
{
  "message": "Notification marked as read",
  "id": "uuid"
}
```

#### 4. Mark All Notifications as Read
```
PATCH /api/notifications/read-all
Headers:
  Authorization: Bearer <token>

Response 200:
{
  "message": "All notifications marked as read"
}
```

#### 5. Delete a Notification
```
DELETE /api/notifications/:id
Headers:
  Authorization: Bearer <token>

Response 200:
{
  "message": "Notification deleted"
}
```

#### 6. Send Notification (Admin)
```
POST /api/notifications/send
Headers:
  Authorization: Bearer <token>
  Content-Type: application/json

Request Body:
{
  "type": "Placement",
  "message": "TCS is hiring!",
  "studentIds": ["uuid1", "uuid2"] // or "all"
}

Response 201:
{
  "message": "Notification sent successfully",
  "notificationId": "uuid"
}
```

### Real-Time Notification Mechanism

**WebSockets (Socket.IO)**

When a student logs in, a WebSocket connection is established. When a new notification is sent, the server emits it directly to the connected student's socket room.

```
// Student connects
socket.join(`student_${studentId}`)

// Server emits notification
io.to(`student_${studentId}`).emit('new_notification', {
  id: "uuid",
  type: "Placement",
  message: "TCS is hiring!",
  createdAt: "2026-04-22T17:51:30Z"
})
```

---

# Stage 2

## Database Design

### Recommended Database: PostgreSQL

**Why PostgreSQL:**
- Strong ACID compliance ensures no notification is lost
- Supports complex queries (filtering by type, date, read status)
- Scales well with indexing for large datasets
- Native support for enums, timestamps, and UUIDs

### DB Schema

```sql
CREATE TYPE notification_type AS ENUM ('Placement', 'Event', 'Result');

CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  rollNo VARCHAR(50) UNIQUE NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type notification_type NOT NULL,
  message TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE student_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studentId UUID REFERENCES students(id) ON DELETE CASCADE,
  notificationId UUID REFERENCES notifications(id) ON DELETE CASCADE,
  isRead BOOLEAN DEFAULT FALSE,
  readAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT NOW()
);
```

### Problems as Data Volume Increases
- Query performance degrades without indexes
- Full table scans on 5M+ rows become slow
- WebSocket connections become hard to manage at scale

### Solutions
- Add indexes on frequently queried columns
- Use Redis for caching unread counts
- Use message queues (Bull/RabbitMQ) for sending notifications
- Partition the notifications table by date

### SQL Queries

```sql
-- Get all notifications for a student
SELECT n.id, n.type, n.message, sn.isRead, n.createdAt
FROM notifications n
JOIN student_notifications sn ON n.id = sn.notificationId
WHERE sn.studentId = $1
ORDER BY n.createdAt DESC;

-- Get unread notifications
SELECT n.id, n.type, n.message, n.createdAt
FROM notifications n
JOIN student_notifications sn ON n.id = sn.notificationId
WHERE sn.studentId = $1 AND sn.isRead = false
ORDER BY n.createdAt DESC;

-- Mark as read
UPDATE student_notifications
SET isRead = true, readAt = NOW()
WHERE studentId = $1 AND notificationId = $2;

-- Send notification to all students
INSERT INTO student_notifications (studentId, notificationId)
SELECT id, $1 FROM students;
```

---

# Stage 3

## Query Analysis

### Original Query
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```

### Is this query accurate?
No. Based on the schema, `studentID` and `isRead` are not columns in the `notifications` table — they belong in the `student_notifications` junction table. The query should JOIN both tables.

### Why is it slow?
- No index on `studentID`, `isRead`, or `createdAt`
- Full table scan on 5,000,000 rows
- `ORDER BY createdAt DESC` without an index causes expensive sort operations

### Fixed Query
```sql
SELECT n.id, n.type, n.message, n.createdAt
FROM notifications n
JOIN student_notifications sn ON n.id = sn.notificationId
WHERE sn.studentId = 1042 AND sn.isRead = false
ORDER BY n.createdAt DESC;
```

### Indexes to Add
```sql
CREATE INDEX idx_student_notifications_student_read
ON student_notifications(studentId, isRead);

CREATE INDEX idx_notifications_created_at
ON notifications(createdAt DESC);
```

**Computation cost after fix:** From O(n) full scan to O(log n) index lookup — significantly faster.

### Should we index every column?
No. Indexing every column is bad advice because:
- Indexes slow down INSERT/UPDATE/DELETE operations
- They consume extra disk space
- Only columns used in WHERE, JOIN, and ORDER BY clauses need indexes

### Query: Students who got Placement notification in last 7 days
```sql
SELECT DISTINCT s.id, s.name, s.email
FROM students s
JOIN student_notifications sn ON s.id = sn.studentId
JOIN notifications n ON sn.notificationId = n.id
WHERE n.type = 'Placement'
AND n.createdAt >= NOW() - INTERVAL '7 days';
```

---

# Stage 4

## Performance Optimization for Notification Fetching

### Problem
Fetching notifications on every page load is overwhelming the database.

### Solutions & Tradeoffs

#### 1. Redis Caching
Cache unread notifications per student in Redis with a TTL of 60 seconds.

**Tradeoffs:**
- ✅ Drastically reduces DB load
- ✅ Very fast reads
- ❌ Slight data staleness (up to TTL duration)
- ❌ Extra infrastructure to manage

#### 2. Pagination
Fetch notifications in pages (e.g. 20 at a time) instead of all at once.

**Tradeoffs:**
- ✅ Reduces data transferred per request
- ✅ Easy to implement
- ❌ Requires frontend changes
- ❌ Doesn't reduce DB queries, just their size

#### 3. WebSocket Push Instead of Poll
Instead of fetching on page load, push new notifications via WebSocket only when they arrive.

**Tradeoffs:**
- ✅ Eliminates repeated DB reads
- ✅ Real-time experience
- ❌ Requires persistent connections
- ❌ Complex to scale across multiple servers (needs Redis pub/sub)

#### 4. Unread Count Cache
Cache only the unread count in Redis. Fetch full list only when user opens notification panel.

**Tradeoffs:**
- ✅ Minimal DB load on page load
- ✅ Simple to implement
- ❌ Still hits DB when panel is opened

### Recommended Approach
Combine WebSocket push + Redis caching + pagination for best results.

---

# Stage 5

## Redesigning Bulk Notification System

### Shortcomings of Original Implementation
```
function notify_all(student_ids, message):
  for student_id in student_ids:
    send_email(student_id, message)
    save_to_db(student_id, message)
    push_to_app(student_id, message)
```

- **Sequential processing** — 50,000 students processed one by one, extremely slow
- **No error handling** — if send_email fails, the loop stops or skips silently
- **No retry mechanism** — failed emails are lost forever
- **Tight coupling** — email, DB save, and push happen together; one failure affects all
- **Single point of failure** — if the process crashes midway, no recovery

### What about the 200 failed emails?
With the original code, those 200 students never get notified and there is no way to retry them since failures aren't tracked.

### Should DB save and email happen together?
No. They should be decoupled. DB save should happen first and independently. Email is a side effect that can be retried separately without affecting DB state.

### Redesigned Solution using Message Queue

```
function notify_all(student_ids, message):
  // Step 1: Save all to DB first (bulk insert)
  bulk_insert_to_db(student_ids, message)

  // Step 2: Push all jobs to queue
  for student_id in student_ids:
    queue.push({
      job: "send_email",
      student_id: student_id,
      message: message,
      retries: 0
    })
    queue.push({
      job: "push_to_app",
      student_id: student_id,
      message: message
    })

// Worker processes queue jobs
function worker(job):
  try:
    if job.type == "send_email":
      send_email(job.student_id, job.message)
    elif job.type == "push_to_app":
      push_to_app(job.student_id, job.message)
  except Exception as e:
    if job.retries < 3:
      job.retries += 1
      queue.push(job) // retry
    else:
      log_failure(job) // alert team
```

### Key Improvements
- Bulk DB insert instead of 50,000 individual inserts
- Queue handles failures and retries automatically
- Email and push are decoupled from DB save
- Workers can run in parallel across multiple machines
- Failed jobs are tracked and retried up to 3 times

---

# Stage 6

## Priority Inbox Implementation

### Approach
Priority is determined by:
1. **Type weight**: Placement (3) > Result (2) > Event (1)
2. **Recency**: More recent notifications rank higher within the same type

A **max-heap** (priority queue) is used to efficiently maintain the top 10 notifications as new ones arrive.

### Priority Score Formula
```
priority_score = type_weight * 1000000000 + timestamp_value
```

This ensures type always dominates, and recency breaks ties within the same type.

### How to maintain top 10 efficiently as new notifications arrive
Use a **min-heap of size 10**. For each new notification:
- If heap has fewer than 10 items, push it
- If new item's priority > heap minimum, pop minimum and push new item
- Otherwise discard the new item

This gives O(log 10) = O(1) time per new notification.

### Code

See `notification_app_be/priority_inbox.js` for the full implementation.