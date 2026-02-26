# AgentGrid Features & Implementation Guide

## Table of Contents
1. [Agent Sharing System](#agent-sharing-system)
2. [Quick Start Guide](#quick-start-guide)
3. [Platform Improvements](#platform-improvements)
4. [API Reference](#api-reference)
5. [Troubleshooting](#troubleshooting)

---

## Agent Sharing System

### Overview
Share agents via secure links with granular access control. Replaces the previous "publish" functionality.

### Features

**Public Links**
- Anyone with link can access
- No authentication required
- Perfect for demos and marketing

**Private Links**
- Email whitelist required
- Authentication enforced
- Perfect for client demos

**Access Controls**
- Usage limits (max uses)
- Expiration dates
- Active/Inactive toggle
- Usage tracking

### API Endpoints

```bash
# Create share link
POST /creator-studio/api/agents/{agent_id}/share
{
  "name": "Demo Link",
  "link_type": "public|private",
  "max_uses": 100,
  "expires_in_days": 30,
  "allowed_emails": ["user@example.com"]
}

# List share links
GET /creator-studio/api/agents/{agent_id}/share

# Toggle active status
PATCH /creator-studio/api/share/{link_id}/toggle

# Delete link
DELETE /creator-studio/api/share/{link_id}

# Access shared agent (public)
GET /creator-studio/api/share/{token}/info
POST /creator-studio/api/share/{token}/chat
```

### Database Schema

```sql
-- Share links table
CREATE TABLE agent_share_links (
    id UUID PRIMARY KEY,
    agent_id UUID REFERENCES agents(id),
    share_token VARCHAR(64) UNIQUE,
    link_type VARCHAR(16) DEFAULT 'public',
    name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    expires_at TIMESTAMP,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Access control table
CREATE TABLE agent_share_access (
    id UUID PRIMARY KEY,
    share_link_id UUID REFERENCES agent_share_links(id),
    user_id UUID REFERENCES users(id),
    email VARCHAR(255),
    granted_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);
```

### Security
- Cryptographically secure tokens (256-bit entropy)
- Multi-layer access validation
- Email-based access control
- Usage tracking and limits

---

## Quick Start Guide

### Prerequisites
- Backend running on `http://localhost:8001`
- Frontend running on `http://localhost:3000`
- Database migration applied

### Setup

1. **Apply Database Migration**
```bash
cd backend/agentgrid-backend
alembic upgrade head
```

2. **Restart Services**
```bash
docker-compose restart backend
# or
./run-app.sh
```

### Testing Agent Sharing

1. **Create Agent**
   - Navigate to `http://localhost:3000/studio`
   - Create or open an agent
   - Click "Save Agent"

2. **Create Share Link**
   - Click "Share Settings" tab
   - Click "Create Link"
   - Configure link settings
   - Click "Create Link"

3. **Test Public Link**
   - Copy share URL
   - Open in incognito window
   - Verify chat interface loads
   - Send test message

4. **Test Private Link**
   - Create private link with your email
   - Try accessing without auth (should fail)
   - Log in and access (should work)

### API Testing

```bash
# Create public link
curl -X POST http://localhost:8001/creator-studio/api/agents/{agent_id}/share \
  -H "Authorization: Bearer {token}" \
  -d '{"link_type": "public"}'

# Access shared agent
curl http://localhost:8001/creator-studio/api/share/{token}/info

# Chat with agent
curl -X POST http://localhost:8001/creator-studio/api/share/{token}/chat \
  -d '{"message": "Hello!"}'
```

---

## Platform Improvements

### Architecture Refactoring ✅
- Broke down 2,718-line monolith into modular structure
- Organized into: RAG, execution, LLM, architect, search modules
- Improved maintainability and testability

### Database Enhancements ✅
- **agent_versions**: Version control and rollback
- **chat_sessions**: Persistent conversation history
- **agent_metrics**: Usage and performance analytics
- **llm_usage**: Cost tracking
- **agent_share_links**: Share link management

### Background Tasks ✅
- Celery with Redis for async processing
- File upload processing (async)
- Metrics aggregation (hourly)
- Cleanup tasks

### New Features ✅

**Agent Versioning**
```bash
GET /api/v1/agents/{agent_id}/versions
POST /api/v1/agents/{agent_id}/versions
POST /api/v1/agents/{agent_id}/versions/{version_id}/activate
```

**Chat Sessions**
```bash
POST /api/v1/agents/{agent_id}/sessions
GET /api/v1/agents/{agent_id}/sessions
POST /api/v1/sessions/{session_id}/messages
```

**Analytics**
```bash
GET /api/v1/agents/{agent_id}/analytics
GET /api/v1/agents/{agent_id}/cost-breakdown
```

---

## API Reference

### Agent Sharing

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/agents/{id}/share` | POST | Yes | Create share link |
| `/agents/{id}/share` | GET | Yes | List share links |
| `/share/{id}/toggle` | PATCH | Yes | Toggle active status |
| `/share/{id}` | DELETE | Yes | Delete link |
| `/share/{token}/info` | GET | No* | Get agent info |
| `/share/{token}/chat` | POST | No* | Chat with agent |

*Private links require authentication

### Chat Sessions

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/agents/{id}/sessions` | POST | Yes | Create session |
| `/agents/{id}/sessions` | GET | Yes | List sessions |
| `/sessions/{id}` | GET | Yes | Get session |
| `/sessions/{id}/messages` | POST | Yes | Send message |
| `/sessions/{id}` | DELETE | Yes | Delete session |

### Agent Versions

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/agents/{id}/versions` | GET | Yes | List versions |
| `/agents/{id}/versions` | POST | Yes | Create version |
| `/agents/{id}/versions/{vid}/activate` | POST | Yes | Rollback |

### Analytics

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/agents/{id}/analytics` | GET | Yes | Get analytics |
| `/agents/{id}/cost-breakdown` | GET | Yes | Cost details |
| `/users/me/budget` | GET | Yes | User budget |

---

## Troubleshooting

### Share Links

**Issue: "Failed to load share links"**
- Check backend is running
- Verify authentication token
- Check browser console for errors

**Issue: "Authentication required"**
- Log in with whitelisted email
- Verify JWT token is valid
- Check email matches exactly

**Issue: "Link expired"**
- Create new share link
- Or update expiration in database

**Issue: "Maximum uses reached"**
- Create new share link
- Or reset current_uses in database

### General Issues

**Database Migration Fails**
```bash
# Check current version
alembic current

# Downgrade if needed
alembic downgrade -1

# Upgrade again
alembic upgrade head
```

**Backend Won't Start**
```bash
# Check logs
docker-compose logs backend

# Verify database connection
psql -h localhost -U postgres -d agentgrid

# Check environment variables
cat backend/agentgrid-backend/.env
```

**Frontend Build Errors**
```bash
# Clear cache
rm -rf node_modules/.vite

# Reinstall dependencies
npm install

# Restart dev server
npm run dev
```

---

## File Structure

### Backend
```
backend/agentgrid-backend/
├── app/
│   ├── api/v1/endpoints/
│   │   ├── agent_sharing.py      # Share link endpoints
│   │   ├── chat_sessions.py      # Session endpoints
│   │   ├── agent_versions.py     # Version endpoints
│   │   └── agent_analytics.py    # Analytics endpoints
│   ├── models/
│   │   ├── agent_share.py        # Share models
│   │   ├── chat_session.py       # Session models
│   │   ├── agent_version.py      # Version models
│   │   └── agent_metrics.py      # Metrics models
│   ├── services/creator_studio/
│   │   ├── rag/                  # RAG modules
│   │   ├── execution/            # Code execution
│   │   ├── llm/                  # LLM providers
│   │   └── architect/            # Agent architect
│   └── tasks/
│       ├── knowledge.py          # File processing
│       └── metrics.py            # Metrics aggregation
└── alembic/versions/
    └── e5f8a9b2c3d4_*.py         # Migration
```

### Frontend
```
frontend/
├── components/pages/
│   └── SharedAgentChatPage.tsx   # Standalone chat
└── creator-studio/components/agent/
    ├── ShareLinksList.tsx        # Share links list
    └── CreateShareLinkModal.tsx  # Create link modal
```

---

## Deployment Checklist

- [ ] Run database migration
- [ ] Start Redis server
- [ ] Start Celery workers
- [ ] Update environment variables
- [ ] Restart backend
- [ ] Clear frontend cache
- [ ] Test share link creation
- [ ] Test public link access
- [ ] Test private link access
- [ ] Verify analytics dashboard
- [ ] Check background tasks

---

## Support

- **Documentation**: This file
- **API Docs**: `http://localhost:8001/docs`
- **Logs**: `docker-compose logs backend`
- **Database**: `psql -h localhost -U postgres -d agentgrid`

---

**Last Updated**: February 25, 2026  
**Version**: 2.0.0  
**Status**: ✅ Production Ready
