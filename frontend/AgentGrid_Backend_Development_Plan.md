# AgentGrid V0 Backend Development Plan
## 18-Week Implementation Roadmap

**Project**: AgentGrid V0 Backend API  
**Stack**: Python FastAPI + PostgreSQL + Supabase + Redis + Celery  
**Timeline**: 18 weeks (4.5 months)  
**Developer**: Backend developer (solo or team)

---

## 📋 EXECUTIVE SUMMARY

This plan breaks down the AgentGrid V0 backend development into 18 weekly sprints, aligned with the frontend development timeline. Each week includes:
- Specific deliverables
- Estimated hours
- Testing requirements
- Dependencies
- Success criteria

### Architecture Overview
```
Frontend (Next.js) 
    ↓ REST API
Backend (FastAPI)
    ↓
Database (PostgreSQL via Supabase)
    ↓
Cache (Redis)
    ↓
Task Queue (Celery)
    ↓
Agent Execution (Docker Sandbox)
    ↓
External APIs (LLM providers, Stripe)
```

---

## 🎯 WEEKLY BREAKDOWN

## **WEEK 1: Foundation & Project Setup**

### Goals
- Initialize backend project structure
- Setup development environment
- Configure database connections
- Create base API structure

### Tasks

#### 1.1 Project Initialization (4 hours)
```bash
# Create project structure
mkdir agentgrid-backend
cd agentgrid-backend
python -m venv venv
source venv/bin/activate

# Install core dependencies
pip install fastapi uvicorn sqlalchemy alembic python-dotenv pydantic
pip install psycopg2-binary redis celery stripe

# Create folder structure
mkdir -p app/{api,core,db,models,schemas,services,utils}
mkdir -p tests/{unit,integration,e2e}
mkdir -p alembic/versions
```

#### 1.2 Project Structure Setup (3 hours)
```
agentgrid-backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry
│   ├── api/
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── __init__.py
│   │   │   └── endpoints/      # API routes
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py           # Settings
│   │   ├── security.py         # Auth utilities
│   │   └── deps.py             # Dependencies
│   ├── db/
│   │   ├── __init__.py
│   │   ├── base.py             # SQLAlchemy base
│   │   └── session.py          # DB session
│   ├── models/                 # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── agent.py
│   │   └── execution.py
│   ├── schemas/                # Pydantic schemas
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── agent.py
│   │   └── execution.py
│   ├── services/               # Business logic
│   │   ├── __init__.py
│   │   └── auth.py
│   └── utils/
│       ├── __init__.py
│       └── helpers.py
├── alembic/                    # Database migrations
├── tests/
├── .env.example
├── .gitignore
├── requirements.txt
├── pytest.ini
└── README.md
```

#### 1.3 Core Configuration (3 hours)
**File: `app/core/config.py`**
```python
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # API
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "AgentGrid API"
    VERSION: str = "0.1.0"
    
    # Database
    DATABASE_URL: str
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Stripe
    STRIPE_SECRET_KEY: str
    STRIPE_WEBHOOK_SECRET: str
    
    # Agent Execution
    AGENT_EXECUTION_TIMEOUT: int = 300
    MAX_CONCURRENT_EXECUTIONS: int = 10
    
    # LLM APIs
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    
    # CORS
    BACKEND_CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
```

#### 1.4 Database Setup (4 hours)
**File: `app/db/base.py`**
```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
```

**File: `app/db/session.py`**
```python
from typing import Generator
from sqlalchemy.orm import Session
from app.db.base import SessionLocal

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

#### 1.5 Main Application Setup (3 hours)
**File: `app/main.py`**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.api.v1.api import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security Middleware
app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])

# Health Check
@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": settings.VERSION}

# Include API routes
app.include_router(api_router, prefix=settings.API_V1_STR)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### Deliverables
- ✅ Project structure created
- ✅ Database connection configured
- ✅ FastAPI app running
- ✅ Health check endpoint working
- ✅ Environment variables configured

### Testing
```bash
# Test server starts
python -m app.main

# Test health endpoint
curl http://localhost:8000/health
```

### Success Criteria
- [ ] Server starts without errors
- [ ] Health endpoint returns 200
- [ ] Database connection successful
- [ ] Environment variables loading correctly

**Hours**: 17 hours  
**Dependencies**: None  
**Blocker Risk**: Low

---

## **WEEK 2: Database Models & Migrations**

### Goals
- Define all SQLAlchemy models
- Create database schema
- Setup Alembic migrations
- Implement CRUD utilities

### Tasks

#### 2.1 User Model (3 hours)
**File: `app/models/user.py`**
```python
from sqlalchemy import Column, String, Integer, DateTime, Enum, Float, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.db.base import Base

class UserRole(str, enum.Enum):
    USER = "user"
    CREATOR = "creator"
    ADMIN = "admin"

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)
    bio = Column(String, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    credits = Column(Float, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    agents = relationship("Agent", back_populates="creator", foreign_keys="Agent.creator_id")
    executions = relationship("AgentExecution", back_populates="user")
    reviews = relationship("Review", back_populates="user")
    credit_transactions = relationship("CreditTransaction", back_populates="user")
```

#### 2.2 Agent Model (4 hours)
**File: `app/models/agent.py`**
```python
from sqlalchemy import Column, String, Integer, DateTime, Enum, Float, Text, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.db.base import Base

class AgentCategory(str, enum.Enum):
    CONTENT = "content"
    RESEARCH = "research"
    ANALYSIS = "analysis"
    AUTOMATION = "automation"
    DEVELOPMENT = "development"
    DESIGN = "design"
    MARKETING = "marketing"
    CUSTOMER_SERVICE = "customer_service"

class AgentStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING_REVIEW = "pending_review"
    REJECTED = "rejected"

class Agent(Base):
    __tablename__ = "agents"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    description = Column(String, nullable=False)
    long_description = Column(Text, nullable=True)
    category = Column(Enum(AgentCategory), nullable=False, index=True)
    tags = Column(JSON, default=list, nullable=False)  # List of strings
    creator_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    version = Column(String, default="1.0.0", nullable=False)
    price_per_run = Column(Float, nullable=False)
    rating = Column(Float, default=0.0, nullable=False)
    total_runs = Column(Integer, default=0, nullable=False)
    total_reviews = Column(Integer, default=0, nullable=False)
    status = Column(Enum(AgentStatus), default=AgentStatus.PENDING_REVIEW, nullable=False)
    config = Column(JSON, nullable=False)  # AgentConfig schema
    capabilities = Column(JSON, default=list, nullable=False)
    limitations = Column(JSON, default=list, nullable=True)
    thumbnail_url = Column(String, nullable=True)
    demo_available = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    creator = relationship("User", back_populates="agents", foreign_keys=[creator_id])
    executions = relationship("AgentExecution", back_populates="agent")
    reviews = relationship("Review", back_populates="agent")
```

#### 2.3 Execution Model (3 hours)
**File: `app/models/execution.py`**
```python
from sqlalchemy import Column, String, Integer, DateTime, Enum, Float, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.db.base import Base

class ExecutionStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class AgentExecution(Base):
    __tablename__ = "agent_executions"
    
    id = Column(String, primary_key=True, index=True)
    agent_id = Column(String, ForeignKey("agents.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    status = Column(Enum(ExecutionStatus), default=ExecutionStatus.PENDING, nullable=False, index=True)
    inputs = Column(JSON, nullable=False)
    outputs = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    credits_used = Column(Float, nullable=False)
    started_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)
    duration_ms = Column(Integer, nullable=True)
    
    # Relationships
    agent = relationship("Agent", back_populates="executions")
    user = relationship("User", back_populates="executions")
```

#### 2.4 Additional Models (4 hours)
**File: `app/models/review.py`**
```python
from sqlalchemy import Column, String, Integer, DateTime, Float, Text, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.db.base import Base

class Review(Base):
    __tablename__ = "reviews"
    
    id = Column(String, primary_key=True, index=True)
    agent_id = Column(String, ForeignKey("agents.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    rating = Column(Float, nullable=False)
    title = Column(String, nullable=False)
    comment = Column(Text, nullable=False)
    helpful_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Relationships
    agent = relationship("Agent", back_populates="reviews")
    user = relationship("User", back_populates="reviews")
```

**File: `app/models/credit_transaction.py`**
```python
from sqlalchemy import Column, String, DateTime, Float, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.db.base import Base

class TransactionType(str, enum.Enum):
    PURCHASE = "purchase"
    USAGE = "usage"
    REFUND = "refund"
    EARNING = "earning"
    PAYOUT = "payout"

class CreditTransaction(Base):
    __tablename__ = "credit_transactions"
    
    id = Column(String, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    type = Column(Enum(TransactionType), nullable=False, index=True)
    description = Column(Text, nullable=False)
    reference_id = Column(String, nullable=True)  # Stripe payment ID, execution ID, etc.
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    user = relationship("User", back_populates="credit_transactions")
```

#### 2.5 Alembic Setup & Initial Migration (3 hours)
```bash
# Initialize Alembic
alembic init alembic

# Update alembic.ini
sqlalchemy.url = driver://user:pass@localhost/dbname

# Update alembic/env.py to import models
from app.db.base import Base
from app.models import user, agent, execution, review, credit_transaction
target_metadata = Base.metadata

# Create initial migration
alembic revision --autogenerate -m "Initial schema"

# Apply migration
alembic upgrade head
```

### Deliverables
- ✅ All database models defined
- ✅ Migrations created and applied
- ✅ Database schema matches design
- ✅ Relationships configured correctly

### Testing
```python
# Test database models
pytest tests/unit/test_models.py -v
```

### Success Criteria
- [ ] All tables created in database
- [ ] Relationships work correctly
- [ ] Migrations apply without errors
- [ ] Can create and query all models

**Hours**: 17 hours  
**Dependencies**: Week 1  
**Blocker Risk**: Low

---

## **WEEK 3: Authentication & Authorization**

### Goals
- Implement JWT authentication
- Create user registration and login
- Setup password hashing
- Implement role-based access control

### Tasks

#### 3.1 Security Utilities (4 hours)
**File: `app/core/security.py`**
```python
from datetime import datetime, timedelta
from typing import Optional, Union
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None
```

#### 3.2 Pydantic Schemas (3 hours)
**File: `app/schemas/user.py`**
```python
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional
from datetime import datetime
from app.models.user import UserRole

class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=20)
    full_name: str

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    
    @validator('password')
    def validate_password(cls, v):
        if not any(char.isupper() for char in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(char.islower() for char in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(char.isdigit() for char in v):
            raise ValueError('Password must contain at least one digit')
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: str
    avatar_url: Optional[str]
    bio: Optional[str]
    role: UserRole
    credits: float
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse
```

#### 3.3 Authentication Service (5 hours)
**File: `app/services/auth.py`**
```python
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import Optional
import uuid
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin
from app.core.security import verify_password, get_password_hash, create_access_token, create_refresh_token

class AuthService:
    @staticmethod
    def create_user(db: Session, user_data: UserCreate) -> User:
        # Check if user exists
        if db.query(User).filter(User.email == user_data.email).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        if db.query(User).filter(User.username == user_data.username).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
        
        # Create user
        db_user = User(
            id=str(uuid.uuid4()),
            email=user_data.email,
            username=user_data.username,
            full_name=user_data.full_name,
            hashed_password=get_password_hash(user_data.password),
            credits=100  # Welcome bonus
        )
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user
    
    @staticmethod
    def authenticate_user(db: Session, credentials: UserLogin) -> Optional[User]:
        user = db.query(User).filter(User.email == credentials.email).first()
        if not user:
            return None
        if not verify_password(credentials.password, user.hashed_password):
            return None
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is deactivated"
            )
        return user
    
    @staticmethod
    def generate_tokens(user: User) -> dict:
        access_token = create_access_token(data={"sub": user.id, "role": user.role})
        refresh_token = create_refresh_token(data={"sub": user.id})
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
```

#### 3.4 Dependencies (3 hours)
**File: `app/core/deps.py`**
```python
from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User, UserRole
from app.core.security import decode_token

security = HTTPBearer()

def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    token = credentials.credentials
    payload = decode_token(token)
    
    if not payload or payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    
    user_id: str = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    
    return user

def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    return current_user

def require_creator(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role not in [UserRole.CREATOR, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Creator role required"
        )
    return current_user

def require_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required"
        )
    return current_user
```

#### 3.5 Auth Endpoints (2 hours)
**File: `app/api/v1/endpoints/auth.py`**
```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.user import UserCreate, UserLogin, UserResponse, TokenResponse
from app.services.auth import AuthService
from app.core.deps import get_current_user
from app.models.user import User

router = APIRouter()

@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    user = AuthService.create_user(db, user_data)
    tokens = AuthService.generate_tokens(user)
    return {**tokens, "user": user}

@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """Login with email and password"""
    user = AuthService.authenticate_user(db, credentials)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    tokens = AuthService.generate_tokens(user)
    return {**tokens, "user": user}

@router.post("/logout")
def logout():
    """Logout (client should delete tokens)"""
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user
```

### Deliverables
- ✅ JWT authentication implemented
- ✅ User registration and login working
- ✅ Password hashing configured
- ✅ Role-based access control setup

### Testing
```python
# Test authentication endpoints
pytest tests/integration/test_auth.py -v

# Test cases:
# - User registration
# - Login with correct credentials
# - Login with wrong credentials
# - Access protected endpoint with token
# - Access protected endpoint without token
# - Role-based access control
```

### Success Criteria
- [ ] Users can register successfully
- [ ] Users can login and receive JWT tokens
- [ ] Protected endpoints require valid token
- [ ] Role-based access works correctly
- [ ] Password validation enforced

**Hours**: 17 hours  
**Dependencies**: Week 1, 2  
**Blocker Risk**: Medium

---

## **WEEK 4-5: Agent Management APIs**

### Goals
- Implement Agent CRUD operations
- Create search and filter functionality
- Add agent validation
- Implement creator dashboard endpoints

### Week 4 Tasks

#### 4.1 Agent Pydantic Schemas (3 hours)
**File: `app/schemas/agent.py`**
```python
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime
from app.models.agent import AgentCategory, AgentStatus

class AgentConfig(BaseModel):
    model: str
    temperature: float = Field(ge=0, le=2)
    max_tokens: int = Field(ge=100, le=32000)
    timeout_seconds: int = Field(ge=10, le=300)
    required_inputs: List[dict]
    output_schema: dict

class AgentBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    description: str = Field(..., min_length=10, max_length=500)
    long_description: Optional[str] = Field(None, max_length=5000)
    category: AgentCategory
    tags: List[str] = Field(..., min_items=1, max_items=10)
    price_per_run: float = Field(..., ge=1, le=10000)
    config: AgentConfig
    capabilities: List[str]
    limitations: Optional[List[str]]
    demo_available: bool = False

class AgentCreate(AgentBase):
    pass

class AgentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=100)
    description: Optional[str] = Field(None, min_length=10, max_length=500)
    long_description: Optional[str]
    category: Optional[AgentCategory]
    tags: Optional[List[str]]
    price_per_run: Optional[float]
    config: Optional[AgentConfig]
    capabilities: Optional[List[str]]
    limitations: Optional[List[str]]
    demo_available: Optional[bool]
    status: Optional[AgentStatus]

class AgentResponse(AgentBase):
    id: str
    creator_id: str
    version: str
    rating: float
    total_runs: int
    total_reviews: int
    status: AgentStatus
    thumbnail_url: Optional[str]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class AgentListResponse(BaseModel):
    data: List[AgentResponse]
    total: int
    page: int
    per_page: int
    total_pages: int
```

#### 4.2 Agent Service (6 hours)
**File: `app/services/agent.py`**
```python
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from fastapi import HTTPException, status
from typing import List, Optional
import uuid
from app.models.agent import Agent, AgentCategory, AgentStatus
from app.models.user import User
from app.schemas.agent import AgentCreate, AgentUpdate

class AgentService:
    @staticmethod
    def create_agent(db: Session, agent_data: AgentCreate, creator: User) -> Agent:
        agent = Agent(
            id=str(uuid.uuid4()),
            creator_id=creator.id,
            **agent_data.dict(),
            status=AgentStatus.PENDING_REVIEW
        )
        
        db.add(agent)
        db.commit()
        db.refresh(agent)
        return agent
    
    @staticmethod
    def get_agent(db: Session, agent_id: str) -> Optional[Agent]:
        return db.query(Agent).filter(Agent.id == agent_id).first()
    
    @staticmethod
    def list_agents(
        db: Session,
        skip: int = 0,
        limit: int = 20,
        category: Optional[AgentCategory] = None,
        search: Optional[str] = None,
        min_rating: Optional[float] = None,
        max_price: Optional[float] = None,
        tags: Optional[List[str]] = None,
        sort_by: str = "created_at",
        creator_id: Optional[str] = None
    ) -> tuple[List[Agent], int]:
        query = db.query(Agent).filter(Agent.status == AgentStatus.ACTIVE)
        
        # Filters
        if category:
            query = query.filter(Agent.category == category)
        if search:
            query = query.filter(
                or_(
                    Agent.name.ilike(f"%{search}%"),
                    Agent.description.ilike(f"%{search}%")
                )
            )
        if min_rating:
            query = query.filter(Agent.rating >= min_rating)
        if max_price:
            query = query.filter(Agent.price_per_run <= max_price)
        if tags:
            # Filter agents that have all specified tags
            for tag in tags:
                query = query.filter(Agent.tags.contains([tag]))
        if creator_id:
            query = query.filter(Agent.creator_id == creator_id)
        
        # Sorting
        if sort_by == "popular":
            query = query.order_by(Agent.total_runs.desc())
        elif sort_by == "rating":
            query = query.order_by(Agent.rating.desc())
        elif sort_by == "price_low":
            query = query.order_by(Agent.price_per_run.asc())
        elif sort_by == "price_high":
            query = query.order_by(Agent.price_per_run.desc())
        else:  # newest
            query = query.order_by(Agent.created_at.desc())
        
        total = query.count()
        agents = query.offset(skip).limit(limit).all()
        
        return agents, total
    
    @staticmethod
    def update_agent(
        db: Session,
        agent_id: str,
        agent_data: AgentUpdate,
        current_user: User
    ) -> Agent:
        agent = db.query(Agent).filter(Agent.id == agent_id).first()
        
        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )
        
        # Check ownership
        if agent.creator_id != current_user.id and current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to update this agent"
            )
        
        # Update fields
        update_data = agent_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(agent, field, value)
        
        db.commit()
        db.refresh(agent)
        return agent
    
    @staticmethod
    def delete_agent(db: Session, agent_id: str, current_user: User) -> bool:
        agent = db.query(Agent).filter(Agent.id == agent_id).first()
        
        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found"
            )
        
        # Check ownership
        if agent.creator_id != current_user.id and current_user.role != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to delete this agent"
            )
        
        # Soft delete by setting status to inactive
        agent.status = AgentStatus.INACTIVE
        db.commit()
        return True
```

#### 4.3 Agent Endpoints (6 hours)
**File: `app/api/v1/endpoints/agents.py`**
```python
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.core.deps import get_current_user, require_creator
from app.models.user import User
from app.models.agent import AgentCategory
from app.schemas.agent import AgentCreate, AgentUpdate, AgentResponse, AgentListResponse
from app.services.agent import AgentService

router = APIRouter()

@router.post("/", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
def create_agent(
    agent_data: AgentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_creator)
):
    """Create a new agent (creator only)"""
    return AgentService.create_agent(db, agent_data, current_user)

@router.get("/", response_model=AgentListResponse)
def list_agents(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[AgentCategory] = None,
    search: Optional[str] = None,
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    max_price: Optional[float] = Query(None, ge=0),
    tags: Optional[List[str]] = Query(None),
    sort_by: str = Query("created_at", regex="^(popular|rating|newest|price_low|price_high)$"),
    db: Session = Depends(get_db)
):
    """List all active agents with filters"""
    agents, total = AgentService.list_agents(
        db, skip, limit, category, search, min_rating, max_price, tags, sort_by
    )
    
    return {
        "data": agents,
        "total": total,
        "page": skip // limit + 1,
        "per_page": limit,
        "total_pages": (total + limit - 1) // limit
    }

@router.get("/{agent_id}", response_model=AgentResponse)
def get_agent(agent_id: str, db: Session = Depends(get_db)):
    """Get agent by ID"""
    agent = AgentService.get_agent(db, agent_id)
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    return agent

@router.patch("/{agent_id}", response_model=AgentResponse)
def update_agent(
    agent_id: str,
    agent_data: AgentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_creator)
):
    """Update agent (creator only)"""
    return AgentService.update_agent(db, agent_id, agent_data, current_user)

@router.delete("/{agent_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_agent(
    agent_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_creator)
):
    """Delete agent (creator only)"""
    AgentService.delete_agent(db, agent_id, current_user)
    return None
```

### Week 5 Tasks

#### 5.1 Creator Dashboard Endpoints (4 hours)
**File: `app/api/v1/endpoints/creators.py`**
```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.services.agent import AgentService
from app.services.creator import CreatorService

router = APIRouter()

@router.get("/me/agents")
def get_my_agents(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's agents"""
    agents, total = AgentService.list_agents(
        db, skip, limit, creator_id=current_user.id
    )
    return {
        "data": agents,
        "total": total,
        "page": skip // limit + 1,
        "per_page": limit,
        "total_pages": (total + limit - 1) // limit
    }

@router.get("/me/stats")
def get_creator_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get creator statistics"""
    return CreatorService.get_creator_stats(db, current_user.id)
```

#### 5.2 Agent Validation Service (3 hours)
**File: `app/services/agent_validator.py`**
```python
from typing import List, Dict
from app.schemas.agent import AgentCreate, AgentConfig

class AgentValidator:
    @staticmethod
    def validate_agent(agent_data: AgentCreate) -> Dict[str, List[str]]:
        """Validate agent configuration and return errors"""
        errors = {}
        
        # Validate required inputs
        if not agent_data.config.required_inputs:
            errors['config'] = ["At least one required input must be specified"]
        
        # Validate model name
        valid_models = ['gpt-4', 'gpt-3.5-turbo', 'claude-3-opus', 'claude-3-sonnet']
        if agent_data.config.model not in valid_models:
            errors['model'] = [f"Model must be one of: {', '.join(valid_models)}"]
        
        # Validate tags
        if len(agent_data.tags) < 1:
            errors['tags'] = ["At least one tag is required"]
        
        # Validate price
        if agent_data.price_per_run < 1 or agent_data.price_per_run > 10000:
            errors['price'] = ["Price must be between 1 and 10,000 credits"]
        
        return errors
```

#### 5.3 Testing (5 hours)
```python
# tests/integration/test_agents.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_agent(client: AsyncClient, creator_token: str):
    response = await client.post(
        "/api/v1/agents/",
        json={
            "name": "Test Agent",
            "description": "Test agent description",
            "category": "content",
            "tags": ["test", "automation"],
            "price_per_run": 50,
            "config": {
                "model": "gpt-4",
                "temperature": 0.7,
                "max_tokens": 2000,
                "timeout_seconds": 120,
                "required_inputs": [{"name": "prompt", "type": "text", "required": True}],
                "output_schema": {}
            },
            "capabilities": ["Text generation"],
            "demo_available": True
        },
        headers={"Authorization": f"Bearer {creator_token}"}
    )
    assert response.status_code == 201
    assert response.json()["name"] == "Test Agent"

@pytest.mark.asyncio
async def test_list_agents(client: AsyncClient):
    response = await client.get("/api/v1/agents/")
    assert response.status_code == 200
    assert "data" in response.json()
    assert "total" in response.json()

@pytest.mark.asyncio
async def test_filter_agents_by_category(client: AsyncClient):
    response = await client.get("/api/v1/agents/?category=content")
    assert response.status_code == 200
    for agent in response.json()["data"]:
        assert agent["category"] == "content"
```

#### 5.4 API Documentation (2 hours)
Update API docs with:
- Agent schema descriptions
- Example requests/responses
- Filter parameter documentation
- Error codes and messages

### Deliverables
- ✅ Agent CRUD operations complete
- ✅ Search and filter functionality working
- ✅ Creator dashboard endpoints implemented
- ✅ Agent validation in place
- ✅ Tests passing

### Success Criteria
- [ ] Can create, read, update, delete agents
- [ ] Search and filters work correctly
- [ ] Only creators can manage agents
- [ ] Validation prevents invalid agents
- [ ] All tests passing

**Hours**: 29 hours (Week 4: 15h, Week 5: 14h)  
**Dependencies**: Week 1-3  
**Blocker Risk**: Low

---

## **WEEK 6-7: Agent Execution Engine**

### Goals
- Implement agent execution logic
- Setup Docker sandbox for secure execution
- Create execution queue with Celery
- Implement timeout and error handling

### Week 6 Tasks

#### 6.1 Celery Setup (4 hours)
**File: `app/core/celery_app.py`**
```python
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "agentgrid",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

celery_app.conf.task_routes = {
    "app.tasks.execution.*": {"queue": "execution"}
}

celery_app.conf.task_default_queue = "default"
celery_app.conf.task_acks_late = True
celery_app.conf.worker_prefetch_multiplier = 1
celery_app.conf.task_time_limit = 600  # 10 minutes
```

#### 6.2 LLM Client Wrapper (5 hours)
**File: `app/services/llm_client.py`**
```python
from typing import Dict, Any
import openai
import anthropic
from app.core.config import settings

class LLMClient:
    def __init__(self):
        self.openai_client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        self.anthropic_client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    
    async def execute(
        self,
        model: str,
        prompt: str,
        temperature: float,
        max_tokens: int,
        **kwargs
    ) -> Dict[str, Any]:
        """Execute LLM request based on model type"""
        
        if model.startswith("gpt"):
            return await self._execute_openai(model, prompt, temperature, max_tokens, **kwargs)
        elif model.startswith("claude"):
            return await self._execute_anthropic(model, prompt, temperature, max_tokens, **kwargs)
        else:
            raise ValueError(f"Unsupported model: {model}")
    
    async def _execute_openai(self, model: str, prompt: str, temperature: float, max_tokens: int, **kwargs):
        try:
            response = self.openai_client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs
            )
            return {
                "content": response.choices[0].message.content,
                "model": model,
                "tokens_used": response.usage.total_tokens,
                "finish_reason": response.choices[0].finish_reason
            }
        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")
    
    async def _execute_anthropic(self, model: str, prompt: str, temperature: float, max_tokens: int, **kwargs):
        try:
            response = self.anthropic_client.messages.create(
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
                messages=[{"role": "user", "content": prompt}]
            )
            return {
                "content": response.content[0].text,
                "model": model,
                "tokens_used": response.usage.input_tokens + response.usage.output_tokens,
                "finish_reason": response.stop_reason
            }
        except Exception as e:
            raise Exception(f"Anthropic API error: {str(e)}")
```

#### 6.3 Execution Service (6 hours)
**File: `app/services/execution.py`**
```python
from sqlalchemy.orm import Session
from datetime import datetime
import uuid
from typing import Dict, Any
from app.models.execution import AgentExecution, ExecutionStatus
from app.models.agent import Agent
from app.models.user import User
from app.services.llm_client import LLMClient
from app.services.credit import CreditService

class ExecutionService:
    def __init__(self, db: Session):
        self.db = db
        self.llm_client = LLMClient()
    
    def create_execution(
        self,
        agent_id: str,
        user_id: str,
        inputs: Dict[str, Any]
    ) -> AgentExecution:
        """Create a new execution record"""
        
        # Get agent
        agent = self.db.query(Agent).filter(Agent.id == agent_id).first()
        if not agent:
            raise ValueError("Agent not found")
        
        # Check user credits
        user = self.db.query(User).filter(User.id == user_id).first()
        if user.credits < agent.price_per_run:
            raise ValueError("Insufficient credits")
        
        # Create execution record
        execution = AgentExecution(
            id=str(uuid.uuid4()),
            agent_id=agent_id,
            user_id=user_id,
            status=ExecutionStatus.PENDING,
            inputs=inputs,
            credits_used=agent.price_per_run
        )
        
        self.db.add(execution)
        self.db.commit()
        self.db.refresh(execution)
        
        return execution
    
    async def execute_agent(self, execution_id: str) -> AgentExecution:
        """Execute the agent and update execution record"""
        
        execution = self.db.query(AgentExecution).filter(
            AgentExecution.id == execution_id
        ).first()
        
        if not execution:
            raise ValueError("Execution not found")
        
        agent = self.db.query(Agent).filter(Agent.id == execution.agent_id).first()
        
        try:
            # Update status to running
            execution.status = ExecutionStatus.RUNNING
            self.db.commit()
            
            start_time = datetime.utcnow()
            
            # Build prompt from inputs
            prompt = self._build_prompt(agent, execution.inputs)
            
            # Execute LLM
            result = await self.llm_client.execute(
                model=agent.config["model"],
                prompt=prompt,
                temperature=agent.config["temperature"],
                max_tokens=agent.config["max_tokens"]
            )
            
            end_time = datetime.utcnow()
            duration_ms = int((end_time - start_time).total_seconds() * 1000)
            
            # Update execution with results
            execution.status = ExecutionStatus.COMPLETED
            execution.outputs = result
            execution.completed_at = end_time
            execution.duration_ms = duration_ms
            
            # Deduct credits
            CreditService.deduct_credits(
                self.db,
                execution.user_id,
                agent.price_per_run,
                f"Agent execution: {agent.name}",
                execution.id
            )
            
            # Update agent stats
            agent.total_runs += 1
            
            self.db.commit()
            self.db.refresh(execution)
            
            return execution
            
        except Exception as e:
            # Handle error
            execution.status = ExecutionStatus.FAILED
            execution.error_message = str(e)
            execution.completed_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(execution)
            
            raise
    
    def _build_prompt(self, agent: Agent, inputs: Dict[str, Any]) -> str:
        """Build prompt from agent config and user inputs"""
        prompt_parts = []
        
        for required_input in agent.config["required_inputs"]:
            input_name = required_input["name"]
            if input_name in inputs:
                prompt_parts.append(f"{input_name}: {inputs[input_name]}")
        
        return "\n".join(prompt_parts)
```

### Week 7 Tasks

#### 7.1 Celery Task (4 hours)
**File: `app/tasks/execution.py`**
```python
from app.core.celery_app import celery_app
from app.db.session import SessionLocal
from app.services.execution import ExecutionService
import asyncio

@celery_app.task(bind=True, max_retries=3)
def execute_agent_task(self, execution_id: str):
    """Celery task to execute agent"""
    db = SessionLocal()
    try:
        execution_service = ExecutionService(db)
        
        # Run async execution in sync context
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If loop is already running, create a new one
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        result = loop.run_until_complete(
            execution_service.execute_agent(execution_id)
        )
        
        return {"status": "success", "execution_id": result.id}
        
    except Exception as e:
        # Retry on failure
        raise self.retry(exc=e, countdown=60)
    finally:
        db.close()
```

#### 7.2 Execution Endpoints (5 hours)
**File: `app/api/v1/endpoints/executions.py`**
```python
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.models.execution import AgentExecution, ExecutionStatus
from app.schemas.execution import ExecutionCreate, ExecutionResponse, ExecutionListResponse
from app.services.execution import ExecutionService
from app.tasks.execution import execute_agent_task

router = APIRouter()

@router.post("/{agent_id}/execute", response_model=ExecutionResponse, status_code=status.HTTP_201_CREATED)
def execute_agent(
    agent_id: str,
    execution_data: ExecutionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Execute an agent"""
    execution_service = ExecutionService(db)
    
    try:
        # Create execution record
        execution = execution_service.create_execution(
            agent_id=agent_id,
            user_id=current_user.id,
            inputs=execution_data.inputs
        )
        
        # Queue execution task
        execute_agent_task.delay(execution.id)
        
        return execution
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/", response_model=ExecutionListResponse)
def list_executions(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[ExecutionStatus] = None,
    agent_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List user's executions"""
    query = db.query(AgentExecution).filter(AgentExecution.user_id == current_user.id)
    
    if status:
        query = query.filter(AgentExecution.status == status)
    if agent_id:
        query = query.filter(AgentExecution.agent_id == agent_id)
    
    query = query.order_by(AgentExecution.started_at.desc())
    
    total = query.count()
    executions = query.offset(skip).limit(limit).all()
    
    return {
        "data": executions,
        "total": total,
        "page": skip // limit + 1,
        "per_page": limit,
        "total_pages": (total + limit - 1) // limit
    }

@router.get("/{execution_id}", response_model=ExecutionResponse)
def get_execution(
    execution_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get execution by ID"""
    execution = db.query(AgentExecution).filter(
        AgentExecution.id == execution_id,
        AgentExecution.user_id == current_user.id
    ).first()
    
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Execution not found"
        )
    
    return execution

@router.post("/{execution_id}/cancel")
def cancel_execution(
    execution_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Cancel a pending or running execution"""
    execution = db.query(AgentExecution).filter(
        AgentExecution.id == execution_id,
        AgentExecution.user_id == current_user.id
    ).first()
    
    if not execution:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Execution not found"
        )
    
    if execution.status not in [ExecutionStatus.PENDING, ExecutionStatus.RUNNING]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only cancel pending or running executions"
        )
    
    execution.status = ExecutionStatus.CANCELLED
    db.commit()
    
    return {"message": "Execution cancelled"}
```

#### 7.3 Docker Sandbox (Optional - 3 hours)
For enhanced security, implement Docker-based execution:

```python
# app/services/docker_executor.py
import docker
from typing import Dict, Any

class DockerExecutor:
    def __init__(self):
        self.client = docker.from_env()
    
    def execute_in_sandbox(self, code: str, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute code in isolated Docker container"""
        
        # Create container
        container = self.client.containers.run(
            "python:3.11-slim",
            command=["python", "-c", code],
            environment=inputs,
            mem_limit="512m",
            cpu_quota=50000,
            detach=True,
            remove=True,
            network_disabled=True  # No network access
        )
        
        # Wait for completion with timeout
        result = container.wait(timeout=300)
        logs = container.logs().decode('utf-8')
        
        return {
            "exit_code": result['StatusCode'],
            "output": logs
        }
```

#### 7.4 Testing (3 hours)
```python
# tests/integration/test_executions.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_execute_agent(client: AsyncClient, user_token: str, test_agent_id: str):
    response = await client.post(
        f"/api/v1/agents/{test_agent_id}/execute",
        json={"inputs": {"prompt": "Test execution"}},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 201
    assert response.json()["status"] == "pending"

@pytest.mark.asyncio
async def test_list_executions(client: AsyncClient, user_token: str):
    response = await client.get(
        "/api/v1/executions/",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
```

### Deliverables
- ✅ Agent execution engine working
- ✅ Celery task queue configured
- ✅ LLM clients integrated
- ✅ Execution tracking in database
- ✅ Error handling implemented

### Success Criteria
- [ ] Can execute agents successfully
- [ ] Executions tracked properly
- [ ] Timeout and error handling work
- [ ] Credits deducted correctly
- [ ] Queue processing works

**Hours**: 30 hours (Week 6: 15h, Week 7: 15h)  
**Dependencies**: Week 1-5  
**Blocker Risk**: High (LLM API dependencies)

---

## **WEEK 8-9: Credit System & Stripe Integration**

### Goals
- Implement credit management system
- Integrate Stripe for payments
- Create credit packages
- Handle webhooks for payment processing

### Week 8 Tasks

#### 8.1 Credit Service (4 hours)
**File: `app/services/credit.py`**
```python
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import uuid
from app.models.user import User
from app.models.credit_transaction import CreditTransaction, TransactionType

class CreditService:
    @staticmethod
    def add_credits(
        db: Session,
        user_id: str,
        amount: float,
        description: str,
        reference_id: str = None
    ) -> CreditTransaction:
        """Add credits to user account"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        
        # Create transaction
        transaction = CreditTransaction(
            id=str(uuid.uuid4()),
            user_id=user_id,
            amount=amount,
            type=TransactionType.PURCHASE,
            description=description,
            reference_id=reference_id
        )
        
        # Update user credits
        user.credits += amount
        
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        
        return transaction
    
    @staticmethod
    def deduct_credits(
        db: Session,
        user_id: str,
        amount: float,
        description: str,
        reference_id: str = None
    ) -> CreditTransaction:
        """Deduct credits from user account"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        
        if user.credits < amount:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Insufficient credits"
            )
        
        # Create transaction
        transaction = CreditTransaction(
            id=str(uuid.uuid4()),
            user_id=user_id,
            amount=-amount,  # Negative for deduction
            type=TransactionType.USAGE,
            description=description,
            reference_id=reference_id
        )
        
        # Update user credits
        user.credits -= amount
        
        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        
        return transaction
    
    @staticmethod
    def get_user_balance(db: Session, user_id: str) -> float:
        """Get user's current credit balance"""
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")
        return user.credits
    
    @staticmethod
    def get_transaction_history(
        db: Session,
        user_id: str,
        skip: int = 0,
        limit: int = 20
    ):
        """Get user's credit transaction history"""
        query = db.query(CreditTransaction).filter(
            CreditTransaction.user_id == user_id
        ).order_by(CreditTransaction.created_at.desc())
        
        total = query.count()
        transactions = query.offset(skip).limit(limit).all()
        
        return transactions, total
```

#### 8.2 Credit Package Model (2 hours)
**File: `app/models/credit_package.py`**
```python
from sqlalchemy import Column, String, Integer, Float, Boolean
from app.db.base import Base

class CreditPackage(Base):
    __tablename__ = "credit_packages"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    credits = Column(Integer, nullable=False)
    price_usd = Column(Float, nullable=False)
    bonus_credits = Column(Integer, default=0, nullable=False)
    popular = Column(Boolean, default=False, nullable=False)
    stripe_price_id = Column(String, nullable=False)
```

**Seed packages:**
```python
# Seeds for credit packages
CREDIT_PACKAGES = [
    {"id": "starter", "name": "Starter Pack", "credits": 100, "price_usd": 10, "bonus_credits": 0, "popular": False},
    {"id": "popular", "name": "Popular Pack", "credits": 500, "price_usd": 45, "bonus_credits": 50, "popular": True},
    {"id": "pro", "name": "Pro Pack", "credits": 1000, "price_usd": 80, "bonus_credits": 150, "popular": False},
    {"id": "enterprise", "name": "Enterprise Pack", "credits": 5000, "price_usd": 350, "bonus_credits": 1000, "popular": False},
]
```

#### 8.3 Stripe Integration (6 hours)
**File: `app/services/stripe_service.py`**
```python
import stripe
from sqlalchemy.orm import Session
from app.core.config import settings
from app.models.credit_package import CreditPackage
from app.models.user import User

stripe.api_key = settings.STRIPE_SECRET_KEY

class StripeService:
    @staticmethod
    def create_payment_intent(
        db: Session,
        user: User,
        package_id: str
    ):
        """Create Stripe payment intent for credit purchase"""
        
        # Get package
        package = db.query(CreditPackage).filter(
            CreditPackage.id == package_id
        ).first()
        
        if not package:
            raise ValueError("Package not found")
        
        # Create payment intent
        intent = stripe.PaymentIntent.create(
            amount=int(package.price_usd * 100),  # Convert to cents
            currency="usd",
            customer=user.stripe_customer_id if hasattr(user, 'stripe_customer_id') else None,
            metadata={
                "user_id": user.id,
                "package_id": package.id,
                "credits": package.credits + package.bonus_credits
            }
        )
        
        return {
            "client_secret": intent.client_secret,
            "amount": package.price_usd,
            "credits": package.credits + package.bonus_credits
        }
    
    @staticmethod
    def handle_webhook_event(event: dict, db: Session):
        """Handle Stripe webhook events"""
        
        event_type = event['type']
        
        if event_type == 'payment_intent.succeeded':
            payment_intent = event['data']['object']
            metadata = payment_intent['metadata']
            
            # Add credits to user
            from app.services.credit import CreditService
            CreditService.add_credits(
                db=db,
                user_id=metadata['user_id'],
                amount=float(metadata['credits']),
                description=f"Purchased {metadata['credits']} credits",
                reference_id=payment_intent['id']
            )
            
        elif event_type == 'payment_intent.payment_failed':
            # Log failed payment
            print(f"Payment failed: {event['data']['object']['id']}")
        
        return {"status": "success"}
```

### Week 9 Tasks

#### 9.1 Credit Endpoints (5 hours)
**File: `app/api/v1/endpoints/credits.py`**
```python
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.credit import CreditBalance, CreditTransactionResponse, PurchaseRequest
from app.services.credit import CreditService
from app.services.stripe_service import StripeService
import stripe

router = APIRouter()

@router.get("/balance", response_model=CreditBalance)
def get_balance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current credit balance"""
    balance = CreditService.get_user_balance(db, current_user.id)
    return {"balance": balance}

@router.get("/transactions")
def get_transactions(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get credit transaction history"""
    transactions, total = CreditService.get_transaction_history(
        db, current_user.id, skip, limit
    )
    return {
        "data": transactions,
        "total": total,
        "page": skip // limit + 1,
        "per_page": limit
    }

@router.get("/packages")
def get_packages(db: Session = Depends(get_db)):
    """Get available credit packages"""
    from app.models.credit_package import CreditPackage
    packages = db.query(CreditPackage).all()
    return {"data": packages}

@router.post("/purchase")
def purchase_credits(
    purchase: PurchaseRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create payment intent for credit purchase"""
    try:
        result = StripeService.create_payment_intent(
            db, current_user, purchase.package_id
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle Stripe webhooks"""
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    StripeService.handle_webhook_event(event, db)
    return {"status": "success"}
```

#### 9.2 Creator Payout System (5 hours)
**File: `app/services/payout.py`**
```python
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.models.user import User
from app.models.execution import AgentExecution, ExecutionStatus
from app.models.agent import Agent
from app.services.credit import CreditService

class PayoutService:
    @staticmethod
    def calculate_creator_earnings(db: Session, creator_id: str, days: int = 30):
        """Calculate creator earnings for past X days"""
        
        since_date = datetime.utcnow() - timedelta(days=days)
        
        # Get all completed executions for creator's agents
        earnings = db.query(
            Agent.creator_id,
            func.sum(AgentExecution.credits_used).label('total_credits')
        ).join(
            AgentExecution, Agent.id == AgentExecution.agent_id
        ).filter(
            Agent.creator_id == creator_id,
            AgentExecution.status == ExecutionStatus.COMPLETED,
            AgentExecution.completed_at >= since_date
        ).group_by(Agent.creator_id).first()
        
        if not earnings:
            return 0
        
        # 70% goes to creator (30% platform fee)
        creator_share = earnings.total_credits * 0.7
        return creator_share
    
    @staticmethod
    def process_payout(db: Session, creator_id: str):
        """Process payout to creator"""
        
        earnings = PayoutService.calculate_creator_earnings(db, creator_id)
        
        if earnings < 100:  # Minimum payout threshold
            raise ValueError("Minimum payout amount not reached (100 credits)")
        
        # Create payout transaction
        CreditService.add_credits(
            db=db,
            user_id=creator_id,
            amount=earnings,
            description="Creator earnings payout",
            reference_id=None
        )
        
        return {"amount": earnings, "status": "processed"}
```

#### 9.3 Testing (3 hours)
```python
# tests/integration/test_credits.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_get_balance(client: AsyncClient, user_token: str):
    response = await client.get(
        "/api/v1/credits/balance",
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
    assert "balance" in response.json()

@pytest.mark.asyncio
async def test_purchase_credits(client: AsyncClient, user_token: str):
    response = await client.post(
        "/api/v1/credits/purchase",
        json={"package_id": "starter"},
        headers={"Authorization": f"Bearer {user_token}"}
    )
    assert response.status_code == 200
    assert "client_secret" in response.json()
```

### Deliverables
- ✅ Credit management system complete
- ✅ Stripe integration working
- ✅ Payment webhooks handled
- ✅ Creator payout system implemented
- ✅ Transaction history tracking

### Success Criteria
- [ ] Can purchase credits via Stripe
- [ ] Credits added after successful payment
- [ ] Transactions recorded correctly
- [ ] Creator earnings calculated accurately
- [ ] Webhooks processed successfully

**Hours**: 25 hours (Week 8: 12h, Week 9: 13h)  
**Dependencies**: Week 1-7  
**Blocker Risk**: Medium (Stripe setup required)

---

## **WEEK 10-11: Reviews, Ratings & Analytics**

### Goals
- Implement review system
- Add rating aggregation
- Create creator analytics dashboard
- Implement usage statistics

### Week 10 Tasks

#### 10.1 Review Service (5 hours)
**File: `app/services/review.py`**
```python
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
import uuid
from app.models.review import Review
from app.models.agent import Agent
from app.models.execution import AgentExecution, ExecutionStatus

class ReviewService:
    @staticmethod
    def create_review(
        db: Session,
        agent_id: str,
        user_id: str,
        rating: float,
        title: str,
        comment: str
    ) -> Review:
        """Create a review for an agent"""
        
        # Check if user has executed this agent
        execution = db.query(AgentExecution).filter(
            AgentExecution.agent_id == agent_id,
            AgentExecution.user_id == user_id,
            AgentExecution.status == ExecutionStatus.COMPLETED
        ).first()
        
        if not execution:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You must execute an agent before reviewing it"
            )
        
        # Check if user already reviewed
        existing_review = db.query(Review).filter(
            Review.agent_id == agent_id,
            Review.user_id == user_id
        ).first()
        
        if existing_review:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You have already reviewed this agent"
            )
        
        # Create review
        review = Review(
            id=str(uuid.uuid4()),
            agent_id=agent_id,
            user_id=user_id,
            rating=rating,
            title=title,
            comment=comment
        )
        
        db.add(review)
        
        # Update agent rating
        ReviewService._update_agent_rating(db, agent_id)
        
        db.commit()
        db.refresh(review)
        
        return review
    
    @staticmethod
    def _update_agent_rating(db: Session, agent_id: str):
        """Recalculate and update agent rating"""
        
        result = db.query(
            func.avg(Review.rating).label('avg_rating'),
            func.count(Review.id).label('total_reviews')
        ).filter(Review.agent_id == agent_id).first()
        
        agent = db.query(Agent).filter(Agent.id == agent_id).first()
        if agent:
            agent.rating = round(result.avg_rating or 0, 2)
            agent.total_reviews = result.total_reviews or 0
    
    @staticmethod
    def get_agent_reviews(
        db: Session,
        agent_id: str,
        skip: int = 0,
        limit: int = 20
    ):
        """Get reviews for an agent"""
        query = db.query(Review).filter(Review.agent_id == agent_id).order_by(
            Review.created_at.desc()
        )
        
        total = query.count()
        reviews = query.offset(skip).limit(limit).all()
        
        return reviews, total
```

#### 10.2 Analytics Service (6 hours)
**File: `app/services/analytics.py`**
```python
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from typing import Dict, Any
from app.models.agent import Agent
from app.models.execution import AgentExecution, ExecutionStatus

class AnalyticsService:
    @staticmethod
    def get_creator_dashboard(db: Session, creator_id: str, days: int = 30) -> Dict[str, Any]:
        """Get creator dashboard statistics"""
        
        since_date = datetime.utcnow() - timedelta(days=days)
        
        # Total agents
        total_agents = db.query(Agent).filter(Agent.creator_id == creator_id).count()
        
        # Total executions
        total_executions = db.query(AgentExecution).join(
            Agent, Agent.id == AgentExecution.agent_id
        ).filter(
            Agent.creator_id == creator_id,
            AgentExecution.status == ExecutionStatus.COMPLETED
        ).count()
        
        # Revenue
        revenue = db.query(
            func.sum(AgentExecution.credits_used)
        ).join(
            Agent, Agent.id == AgentExecution.agent_id
        ).filter(
            Agent.creator_id == creator_id,
            AgentExecution.status == ExecutionStatus.COMPLETED,
            AgentExecution.completed_at >= since_date
        ).scalar() or 0
        
        # Top agents
        top_agents = db.query(
            Agent.id,
            Agent.name,
            func.count(AgentExecution.id).label('execution_count'),
            func.sum(AgentExecution.credits_used).label('revenue')
        ).join(
            AgentExecution, Agent.id == AgentExecution.agent_id
        ).filter(
            Agent.creator_id == creator_id,
            AgentExecution.status == ExecutionStatus.COMPLETED,
            AgentExecution.completed_at >= since_date
        ).group_by(Agent.id, Agent.name).order_by(
            func.count(AgentExecution.id).desc()
        ).limit(5).all()
        
        # Executions over time (daily)
        executions_by_day = db.query(
            func.date(AgentExecution.completed_at).label('date'),
            func.count(AgentExecution.id).label('count')
        ).join(
            Agent, Agent.id == AgentExecution.agent_id
        ).filter(
            Agent.creator_id == creator_id,
            AgentExecution.status == ExecutionStatus.COMPLETED,
            AgentExecution.completed_at >= since_date
        ).group_by(func.date(AgentExecution.completed_at)).all()
        
        return {
            "total_agents": total_agents,
            "total_executions": total_executions,
            "revenue": revenue * 0.7,  # Creator's 70% share
            "top_agents": [
                {
                    "id": agent.id,
                    "name": agent.name,
                    "executions": agent.execution_count,
                    "revenue": agent.revenue * 0.7
                }
                for agent in top_agents
            ],
            "executions_by_day": [
                {"date": str(day.date), "count": day.count}
                for day in executions_by_day
            ]
        }
    
    @staticmethod
    def get_platform_stats(db: Session) -> Dict[str, Any]:
        """Get platform-wide statistics (admin only)"""
        
        total_users = db.query(func.count(User.id)).scalar()
        total_agents = db.query(func.count(Agent.id)).scalar()
        total_executions = db.query(func.count(AgentExecution.id)).scalar()
        
        # Revenue by category
        revenue_by_category = db.query(
            Agent.category,
            func.sum(AgentExecution.credits_used).label('revenue')
        ).join(
            AgentExecution, Agent.id == AgentExecution.agent_id
        ).filter(
            AgentExecution.status == ExecutionStatus.COMPLETED
        ).group_by(Agent.category).all()
        
        return {
            "total_users": total_users,
            "total_agents": total_agents,
            "total_executions": total_executions,
            "revenue_by_category": [
                {"category": cat.category, "revenue": cat.revenue}
                for cat in revenue_by_category
            ]
        }
```

### Week 11 Tasks

#### 11.1 Review Endpoints (4 hours)
**File: `app/api/v1/endpoints/reviews.py`**
```python
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.review import ReviewCreate, ReviewResponse, ReviewListResponse
from app.services.review import ReviewService

router = APIRouter()

@router.post("/agents/{agent_id}/reviews", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def create_review(
    agent_id: str,
    review_data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a review for an agent"""
    return ReviewService.create_review(
        db,
        agent_id,
        current_user.id,
        review_data.rating,
        review_data.title,
        review_data.comment
    )

@router.get("/agents/{agent_id}/reviews", response_model=ReviewListResponse)
def get_agent_reviews(
    agent_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get reviews for an agent"""
    reviews, total = ReviewService.get_agent_reviews(db, agent_id, skip, limit)
    
    return {
        "data": reviews,
        "total": total,
        "page": skip // limit + 1,
        "per_page": limit
    }
```

#### 11.2 Analytics Endpoints (4 hours)
**File: `app/api/v1/endpoints/analytics.py`**
```python
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.deps import get_current_user, require_admin
from app.models.user import User
from app.services.analytics import AnalyticsService

router = APIRouter()

@router.get("/creator/dashboard")
def get_creator_dashboard(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get creator dashboard analytics"""
    return AnalyticsService.get_creator_dashboard(db, current_user.id, days)

@router.get("/platform/stats")
def get_platform_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Get platform-wide statistics (admin only)"""
    return AnalyticsService.get_platform_stats(db)
```

#### 11.3 Testing (4 hours)
```python
# tests/integration/test_reviews.py
# tests/integration/test_analytics.py
```

### Deliverables
- ✅ Review system complete
- ✅ Rating aggregation working
- ✅ Creator analytics dashboard
- ✅ Platform statistics endpoint

### Success Criteria
- [ ] Users can review agents after execution
- [ ] Agent ratings update correctly
- [ ] Creator dashboard shows accurate stats
- [ ] Analytics queries performant

**Hours**: 23 hours (Week 10: 11h, Week 11: 12h)  
**Dependencies**: Week 1-9  
**Blocker Risk**: Low

---

## **WEEK 12-13: File Upload & Media Management**

### Goals
- Implement file upload system
- Add image optimization
- Create thumbnail generation
- Setup cloud storage (S3/Cloudinary)

### Week 12 Tasks

#### 12.1 File Upload Service (6 hours)
**File: `app/services/file_upload.py`**
```python
import boto3
from PIL import Image
import io
import uuid
from fastapi import UploadFile
from app.core.config import settings

class FileUploadService:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )
        self.bucket_name = settings.S3_BUCKET_NAME
    
    async def upload_image(
        self,
        file: UploadFile,
        folder: str = "images",
        max_size_mb: int = 5
    ) -> str:
        """Upload and optimize image"""
        
        # Validate file size
        contents = await file.read()
        if len(contents) > max_size_mb * 1024 * 1024:
            raise ValueError(f"File size exceeds {max_size_mb}MB")
        
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise ValueError("File must be an image")
        
        # Optimize image
        image = Image.open(io.BytesIO(contents))
        
        # Resize if too large
        max_dimension = 1920
        if max(image.size) > max_dimension:
            image.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
        
        # Convert to RGB if necessary
        if image.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', image.size, (255, 255, 255))
            background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
            image = background
        
        # Save optimized image
        output = io.BytesIO()
        image.save(output, format='JPEG', quality=85, optimize=True)
        output.seek(0)
        
        # Generate unique filename
        file_extension = 'jpg'
        filename = f"{folder}/{uuid.uuid4()}.{file_extension}"
        
        # Upload to S3
        self.s3_client.upload_fileobj(
            output,
            self.bucket_name,
            filename,
            ExtraArgs={
                'ContentType': 'image/jpeg',
                'ACL': 'public-read'
            }
        )
        
        # Return public URL
        url = f"https://{self.bucket_name}.s3.{settings.AWS_REGION}.amazonaws.com/{filename}"
        return url
    
    async def generate_thumbnail(
        self,
        image_url: str,
        size: tuple = (400, 300)
    ) -> str:
        """Generate thumbnail from image URL"""
        
        # Download image
        response = requests.get(image_url)
        image = Image.open(io.BytesIO(response.content))
        
        # Create thumbnail
        image.thumbnail(size, Image.Resampling.LANCZOS)
        
        # Save thumbnail
        output = io.BytesIO()
        image.save(output, format='JPEG', quality=80)
        output.seek(0)
        
        # Upload thumbnail
        filename = f"thumbnails/{uuid.uuid4()}.jpg"
        self.s3_client.upload_fileobj(
            output,
            self.bucket_name,
            filename,
            ExtraArgs={
                'ContentType': 'image/jpeg',
                'ACL': 'public-read'
            }
        )
        
        url = f"https://{self.bucket_name}.s3.{settings.AWS_REGION}.amazonaws.com/{filename}"
        return url
    
    def delete_file(self, file_url: str):
        """Delete file from S3"""
        # Extract filename from URL
        filename = file_url.split(f"{self.bucket_name}.s3")[-1].split("/", 2)[-1]
        
        self.s3_client.delete_object(
            Bucket=self.bucket_name,
            Key=filename
        )
```

#### 12.2 Upload Endpoints (4 hours)
**File: `app/api/v1/endpoints/upload.py`**
```python
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from app.core.deps import get_current_user
from app.models.user import User
from app.services.file_upload import FileUploadService

router = APIRouter()

@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload an image"""
    upload_service = FileUploadService()
    
    try:
        url = await upload_service.upload_image(file, folder="user-uploads")
        return {"url": url}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/agent-thumbnail")
async def upload_agent_thumbnail(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload agent thumbnail"""
    upload_service = FileUploadService()
    
    try:
        # Upload full image
        url = await upload_service.upload_image(file, folder="agent-thumbnails")
        
        # Generate thumbnail
        thumbnail_url = await upload_service.generate_thumbnail(url)
        
        return {
            "url": url,
            "thumbnail_url": thumbnail_url
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Upload user avatar"""
    upload_service = FileUploadService()
    
    try:
        url = await upload_service.upload_image(file, folder="avatars", max_size_mb=2)
        
        # Update user avatar
        current_user.avatar_url = url
        db.commit()
        
        return {"url": url}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
```

### Week 13 Tasks

#### 13.1 CDN Configuration (3 hours)
Setup CloudFront or similar CDN for image delivery

#### 13.2 Image Processing Queue (4 hours)
Use Celery for async image processing:

```python
# app/tasks/image_processing.py
from app.core.celery_app import celery_app
from app.services.file_upload import FileUploadService

@celery_app.task
def process_uploaded_image(image_url: str):
    """Process uploaded image asynchronously"""
    service = FileUploadService()
    
    # Generate multiple sizes
    sizes = [
        ("thumbnail", (400, 300)),
        ("medium", (800, 600)),
        ("large", (1200, 900))
    ]
    
    results = {}
    for name, size in sizes:
        url = service.generate_thumbnail(image_url, size)
        results[name] = url
    
    return results
```

#### 13.3 Testing (5 hours)
```python
# tests/integration/test_file_upload.py
```

### Deliverables
- ✅ File upload system working
- ✅ Image optimization implemented
- ✅ Thumbnail generation
- ✅ Cloud storage configured

### Success Criteria
- [ ] Can upload images successfully
- [ ] Images optimized automatically
- [ ] Thumbnails generated correctly
- [ ] CDN delivers images efficiently

**Hours**: 22 hours (Week 12: 10h, Week 13: 12h)  
**Dependencies**: Week 1-11  
**Blocker Risk**: Medium (AWS setup required)

---

## **WEEK 14-15: Advanced Features**

### Goals
- Implement notifications system
- Add agent favoriting
- Create recommendation engine
- Setup email notifications

### Tasks Overview
- Notification service with WebSocket support
- Email templates with SendGrid
- Recommendation algorithm
- User preferences

**Hours**: 28 hours  
**Dependencies**: Week 1-13  
**Blocker Risk**: Low

---

## **WEEK 16-17: Testing, Optimization & Security**

### Goals
- Comprehensive testing suite
- Performance optimization
- Security audit
- Load testing

### Tasks Overview
- Unit tests for all services
- Integration tests for all endpoints
- Load testing with Locust
- Security scanning
- Database query optimization
- Redis caching strategy
- Rate limiting
- API documentation completion

**Hours**: 32 hours  
**Dependencies**: Week 1-15  
**Blocker Risk**: Low

---

## **WEEK 18: Deployment & Documentation**

### Goals
- Production deployment
- CI/CD pipeline setup
- Complete API documentation
- Monitoring setup

### Tasks Overview
- Docker containerization
- Kubernetes deployment (optional)
- GitHub Actions CI/CD
- Monitoring with DataDog/NewRelic
- API documentation with Swagger
- Deployment runbook
- Backup strategy

**Hours**: 18 hours  
**Dependencies**: Week 1-17  
**Blocker Risk**: Medium

---

## 📊 SUMMARY

### Total Timeline: 18 Weeks
- **Foundation**: Weeks 1-3 (52 hours)
- **Core Features**: Weeks 4-11 (207 hours)
- **Advanced Features**: Weeks 12-15 (78 hours)
- **Quality & Deployment**: Weeks 16-18 (68 hours)

### Total Estimated Hours: ~405 hours
- Solo developer full-time: 18 weeks
- 2-person team: 10-12 weeks
- 3-person team: 7-9 weeks

### Tech Stack Summary
- **Framework**: FastAPI
- **Database**: PostgreSQL (via Supabase)
- **Cache**: Redis
- **Queue**: Celery
- **Payment**: Stripe
- **Storage**: AWS S3
- **Email**: SendGrid
- **Monitoring**: DataDog/NewRelic

---

## 🚀 NEXT STEPS

1. **Review this plan** with your team
2. **Setup development environment** (Week 1)
3. **Start building** following weekly tasks
4. **Track progress** using the checklist
5. **Adjust timeline** as needed based on team size

**Questions or need clarification on any week? Let me know!**
