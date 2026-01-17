# Testing Guide: Human-in-the-Loop Review Feature

This guide walks you through testing the review feature with real authenticated users.

## Prerequisites
- Backend running on `localhost:8001`
- Frontend running on `localhost:3000`
- At least one agent with `allow_reviews: true`

## Step-by-Step Test Flow

### 1. **Setup: Create a Review-Enabled Agent**
As a creator:
1. Go to Creator Studio
2. Create or edit an agent
3. Check "Allow Reviews" checkbox
4. Set review cost (e.g., 5 credits)
5. Publish the agent

### 2. **User Side: Request a Review**
As `testclient_user` (or any authenticated user):
1. Login to the marketplace
2. Find the review-enabled agent
3. Run the agent with some inputs
4. After execution completes, click "Request Review" button
5. Enter a note describing what help you need
6. Submit the review request

**Expected behavior:**
- Toast notification: "Review requested successfully"
- Status changes to "Pending"
- Shows animated waiting indicator

### 3. **Creator Side: View Pending Reviews**
As the agent creator:
1. Login to your account
2. Navigate to "Reviews" page
3. Click "Pending Requests" tab

**What you should see:**
- Review card with the user's actual User ID (not "Guest User")
- User's request note
- Timestamp of when it was requested
- "Respond to Review" button

### 4. **Creator Side: Respond to Review**
1. Click "Respond to Review" on any pending review
2. Write a detailed response
3. Click "Send Response"

**Expected behavior:**
- Toast notification: "Response sent! The user has been notified."
- Review moves from Pending to History tab
- Modal closes automatically

### 5. **Creator Side: View History**
1. Click "History" tab in Reviews page

**What you should see:**
- All completed reviews
- Your past responses displayed
- "Completed" status badge (blue)
- User ID and timestamps

### 6. **User Side: View Response**
As the original user:
1. Go to User Dashboard
2. Click "Executions" tab
3. Find your execution with review
4. Click "View Details"

**What you should see:**
- Your original request in amber card
- Creator's response in blue card
- Both timestamps displayed
- Professional layout with icons

## Quick Test with Existing Users

```bash
# User: testclient_user (has agents)
# Password: Password123!

# Or create a new test user:
curl -X POST http://localhost:8001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "reviewer@test.com",
    "username": "reviewer_test",
    "password": "Password123!"
  }'
```

## Verifying Data

Check the database to confirm user_id is being saved:

```python
from app.db.session import SessionLocal
from app.models.execution import AgentExecution

db = SessionLocal()
executions = db.query(AgentExecution).filter(
    AgentExecution.review_status != 'none'
).all()

for ex in executions:
    print(f"Execution: {ex.id}")
    print(f"  User ID: {ex.user_id}")
    print(f"  Status: {ex.review_status}")
    print(f"  Created: {ex.created_at}")
    print()

db.close()
```

## Troubleshooting

**Issue:** Still seeing "Guest User"
- **Solution:** Clear test data and create new executions with authenticated users

**Issue:** Review button not showing
- **Solution:** Check agent has `allow_reviews: true` in database

**Issue:** 401 Unauthorized
- **Solution:** Ensure user is logged in and token is valid

**Issue:** Can't find agent with reviews
- **Solution:** Use Creator Studio to create one or update existing agent to enable reviews
