import enum


class UserRole(str, enum.Enum):
    USER = "user"
    CREATOR = "creator"
    ADMIN = "admin"


class AgentStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending_review"


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
