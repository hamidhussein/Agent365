import enum


class UserRole(str, enum.Enum):
    USER = "user"
    CREATOR = "creator"
    ADMIN = "admin"


class AgentCategory(str, enum.Enum):
    RESEARCH = "research"
    AUTOMATION = "automation"
    SUPPORT = "support"
    ANALYSIS = "analysis"
    CREATIVE = "creative"
    WRITING = "writing"
    BUSINESS = "business"
    DEVELOPMENT = "development"
    DATA = "data"
    PRODUCTIVITY = "productivity"


class AgentStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING_REVIEW = "pending_review"


class ExecutionStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class TransactionType(str, enum.Enum):
    PURCHASE = "purchase"
    USAGE = "usage"
    REFUND = "refund"
    EARNING = "earning"


class ReviewStatus(str, enum.Enum):
    NONE = "none"
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REJECTED = "rejected"
