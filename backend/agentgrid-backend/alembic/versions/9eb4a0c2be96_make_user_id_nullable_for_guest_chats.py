"""make_user_id_nullable_for_guest_chats

Revision ID: 9eb4a0c2be96
Revises: e938e5d440c1
Create Date: 2026-01-11 02:17:56.354357

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from app.db.enum_types import LowercaseEnum
from app.models.enums import ReviewStatus


# revision identifiers, used by Alembic.
revision: str = '9eb4a0c2be96'
down_revision: Union[str, Sequence[str], None] = 'e938e5d440c1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Use batch mode for SQLite compatibility
    with op.batch_alter_table('agent_executions', schema=None) as batch_op:
        batch_op.alter_column('user_id',
                   existing_type=sa.CHAR(length=32),
                   nullable=True)
        batch_op.alter_column('review_status',
                   existing_type=sa.VARCHAR(length=11),
                   type_=LowercaseEnum(ReviewStatus, name='reviewstatus'),
                   existing_nullable=False,
                   existing_server_default=sa.text("'none'"))


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('agent_executions', schema=None) as batch_op:
        batch_op.alter_column('review_status',
                   existing_type=LowercaseEnum(ReviewStatus, name='reviewstatus'),
                   type_=sa.VARCHAR(length=11),
                   existing_nullable=False,
                   existing_server_default=sa.text("'none'"))
        batch_op.alter_column('user_id',
                   existing_type=sa.CHAR(length=32),
                   nullable=False)
