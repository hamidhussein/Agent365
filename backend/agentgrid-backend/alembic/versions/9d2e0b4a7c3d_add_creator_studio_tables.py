"""Add Creator Studio tables and agent source flags

Revision ID: 9d2e0b4a7c3d
Revises: 66362fcb35c6
Create Date: 2026-01-07 19:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9d2e0b4a7c3d'
down_revision: Union[str, Sequence[str], None] = '66362fcb35c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'agents',
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default=sa.text('false'))
    )
    op.add_column(
        'agents',
        sa.Column('source', sa.String(length=32), nullable=False, server_default='manual')
    )

    op.create_table(
        'creator_studio_app_settings',
        sa.Column('key', sa.String(length=128), nullable=False),
        sa.Column('value', sa.String(length=2048), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('key')
    )

    op.create_table(
        'creator_studio_guest_credits',
        sa.Column('id', sa.String(length=128), nullable=False),
        sa.Column('credits', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'creator_studio_llm_configs',
        sa.Column('id', sa.String(length=64), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('provider', sa.String(length=64), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False),
        sa.Column('api_key', sa.String(length=512), nullable=False),
        sa.Column('usage', sa.Integer(), nullable=False),
        sa.Column('limit_amount', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'creator_studio_knowledge_files',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('agent_id', sa.Uuid(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('size_bytes', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['agent_id'], ['agents.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table(
        'creator_studio_knowledge_chunks',
        sa.Column('id', sa.Uuid(), nullable=False),
        sa.Column('file_id', sa.Uuid(), nullable=False),
        sa.Column('agent_id', sa.Uuid(), nullable=False),
        sa.Column('chunk_index', sa.Integer(), nullable=False),
        sa.Column('text', sa.Text(), nullable=False),
        sa.Column('embedding', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['agent_id'], ['agents.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['file_id'], ['creator_studio_knowledge_files.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('creator_studio_knowledge_chunks')
    op.drop_table('creator_studio_knowledge_files')
    op.drop_table('creator_studio_llm_configs')
    op.drop_table('creator_studio_guest_credits')
    op.drop_table('creator_studio_app_settings')

    op.drop_column('agents', 'source')
    op.drop_column('agents', 'is_public')
