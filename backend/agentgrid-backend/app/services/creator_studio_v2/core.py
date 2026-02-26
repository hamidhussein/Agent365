"""
Core utilities for Creator Studio
"""
import re
from sqlalchemy.orm import Session
from app.models.creator_studio import CreatorStudioAppSetting


def get_app_setting(db: Session, key: str) -> str | None:
    """Retrieve a platform-wide setting from the database."""
    setting = db.query(CreatorStudioAppSetting).filter(
        CreatorStudioAppSetting.key == key
    ).first()
    return setting.value if setting else None


def set_app_setting(db: Session, key: str, value: str) -> None:
    """Set a platform-wide setting in the database."""
    setting = db.query(CreatorStudioAppSetting).filter(
        CreatorStudioAppSetting.key == key
    ).first()
    if setting:
        setting.value = value
    else:
        setting = CreatorStudioAppSetting(key=key, value=value)
        db.add(setting)
    db.commit()


def sanitize_user_input(message: str) -> str:
    """
    Strip known prompt-injection patterns from user messages.
    
    Security layer to prevent prompt injection attacks.
    """
    patterns = [
        r"ignore (?:all )?(?:previous|above) instructions",
        r"you are now",
        r"new instructions:",
        r"system prompt:",
        r"<<SYS>>",
        r"\[INST\]",
        r"###\s*(?:instruction|system)",
        r"forget (?:everything|your (?:rules|instructions))",
        r"act as (?:if you|a) (?:have no|different)",
    ]
    sanitized = message
    for pattern in patterns:
        sanitized = re.sub(pattern, "[FILTERED]", sanitized, flags=re.IGNORECASE)
    return sanitized
