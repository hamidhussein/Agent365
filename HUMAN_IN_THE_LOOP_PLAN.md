# Feature Proposal: Human-in-the-Loop (Creator Consultation)

This feature allows users to request a manual review from the Agent's Creator if they are unsatisfied with the AI-generated results. This turns the Agent functionality into a hybrid AI + Human Service.

## 1. Core Workflow

1.  **Run Agent**: The User executes an agent as normal.
2.  **Unsatisfied?**: The User sees a "Request Creator Review" button on the result page.
3.  **Request**: The User adds a comment explaining what they need (e.g., "The tone is too formal, can you help?").
4.  **Queued**: The execution status changes to `AWAITING_REVIEW`.
5.  **Notification**: The Creator receives a notification in their dashboard.
6.  **Review**: The Creator opens the execution, reviews the AI output and the User's request.
7.  **Action**: The Creator can:
    *   **Edit Output**: Manually correct the result.
    *   **Reply**: Send a message back to the User.
    *   **Rerun**: Rerun the agent with tweaked parameters on behalf of the user.
8.  **Completion**: The User is notified that their review is complete.

## 2. Database Changes

### New Table: `ExecutionReview`
Or update existing `AgentExecution` table:
*   `review_status`: `ENUM('NONE', 'PENDING', 'IN_PROGRESS', 'COMPLETED')`
*   `review_request_note`: `Text` (User's explanation)
*   `review_response_note`: `Text` (Creator's reply)
*   `reviewed_at`: `DateTime`

### Agent Model Update
*   `allow_reviews`: `Boolean` (Does the creator offer this service?)
*   `review_cost`: `Integer` (Optional: Extra credits charged for a human review)

## 3. Frontend Implementation

### For the User
*   **Run Result Page**: Add a "Ask Expert" / "Request Review" button.
*   **Dashboard**: A "Reviews" tab to track pending requests.

### For the Creator
*   **Creator Dashboard**: A new "Inbox" or "Consultations" section.
*   **Review Interface**: A split view showing:
    *   (Left) User's Inputs & Context
    *   (Middle) AI's Current Output
    *   (Right) Chat/Feedback panel to reply to the User.

## 4. Monetization (Optional)
This creates a new revenue stream.
*   **Standard Run**: 5 Credits.
*   **Run + Expert Review**: 50 Credits (Premium Service).

## 5. Technical Stack
*   **Backend**: FastAPI generic endpoints for status updates.
*   **Real-time**: Polling or WebSockets for status updates (initially Polling is fine).
*   **Email**: Optional email alerts to the Creator when a review is requested.
