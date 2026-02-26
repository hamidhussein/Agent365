"""creator studio standalone cleanup

Revision ID: c4d7e2f1a9b8
Revises: b3f1d2a4c6e7
Create Date: 2026-02-24

Notes:
- This migration preserves auth users and Creator Studio agents.
- Marketplace/manual/review/credits/action data is deleted during upgrade.
- Downgrade restores schema compatibility only; deleted data is not recovered.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "c4d7e2f1a9b8"
down_revision: Union[str, Sequence[str], None] = "b3f1d2a4c6e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _inspector() -> sa.Inspector:
    return sa.inspect(op.get_bind())


def _table_exists(table_name: str) -> bool:
    return table_name in _inspector().get_table_names()


def _column_exists(table_name: str, column_name: str) -> bool:
    if not _table_exists(table_name):
        return False
    return column_name in {col["name"] for col in _inspector().get_columns(table_name)}


def _drop_table_if_exists(table_name: str) -> None:
    if _table_exists(table_name):
        op.drop_table(table_name)


def _drop_columns_if_exist(table_name: str, columns: list[str]) -> None:
    existing = [c for c in columns if _column_exists(table_name, c)]
    if not existing:
        return
    with op.batch_alter_table(table_name) as batch:
        for column in existing:
            batch.drop_column(column)


def _userrole_labels() -> list[str]:
    bind = op.get_bind()
    rows = bind.execute(
        sa.text(
            """
            SELECT e.enumlabel
            FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            WHERE t.typname = 'userrole'
            ORDER BY e.enumsortorder
            """
        )
    ).fetchall()
    return [row[0] for row in rows]


def _rebuild_userrole_enum_without_user() -> None:
    if not _table_exists("users") or not _column_exists("users", "role"):
        return
    labels = _userrole_labels()
    if "user" in labels:
        op.execute("UPDATE users SET role = 'creator' WHERE role = 'user'")
        op.execute("ALTER TABLE users ALTER COLUMN role DROP DEFAULT")
        op.execute("ALTER TYPE userrole RENAME TO userrole_old")
        op.execute("CREATE TYPE userrole AS ENUM ('creator', 'admin')")
        op.execute(
            "ALTER TABLE users ALTER COLUMN role TYPE userrole USING lower(role::text)::userrole"
        )
        op.execute("DROP TYPE userrole_old")
    op.execute("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'creator'")


def _rebuild_userrole_enum_with_user() -> None:
    if not _table_exists("users") or not _column_exists("users", "role"):
        return
    labels = _userrole_labels()
    if "user" not in labels:
        op.execute("ALTER TABLE users ALTER COLUMN role DROP DEFAULT")
        op.execute("ALTER TYPE userrole RENAME TO userrole_new")
        op.execute("CREATE TYPE userrole AS ENUM ('user', 'creator', 'admin')")
        op.execute(
            "ALTER TABLE users ALTER COLUMN role TYPE userrole USING lower(role::text)::userrole"
        )
        op.execute("DROP TYPE userrole_new")
    op.execute("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user'")


def upgrade() -> None:
    # Preserve users + creator studio data, delete marketplace/manual agents and related rows.
    if _table_exists("agents") and _column_exists("agents", "source"):
        if _table_exists("user_favorites"):
            op.execute(
                """
                DELETE FROM user_favorites uf
                USING agents a
                WHERE uf.agent_id = a.id AND a.source <> 'creator_studio'
                """
            )
        if _table_exists("reviews"):
            op.execute(
                """
                DELETE FROM reviews r
                USING agents a
                WHERE r.agent_id = a.id AND a.source <> 'creator_studio'
                """
            )
        if _table_exists("agent_executions"):
            op.execute(
                """
                DELETE FROM agent_executions e
                USING agents a
                WHERE e.agent_id = a.id AND a.source <> 'creator_studio'
                """
            )
        if _table_exists("agent_actions"):
            op.execute(
                """
                DELETE FROM agent_actions aa
                USING agents a
                WHERE aa.agent_id = a.id AND a.source <> 'creator_studio'
                """
            )
        op.execute("DELETE FROM agents WHERE source <> 'creator_studio'")
    if _table_exists("credit_transactions"):
        op.execute("DELETE FROM credit_transactions")

    _rebuild_userrole_enum_without_user()

    _drop_table_if_exists("user_favorites")
    _drop_table_if_exists("credit_transactions")
    _drop_table_if_exists("reviews")
    _drop_table_if_exists("creator_studio_guest_credits")
    _drop_table_if_exists("agent_actions")

    _drop_columns_if_exist(
        "agent_executions",
        [
            "refined_outputs",
            "review_status",
            "review_request_note",
            "review_response_note",
            "priority",
            "assigned_to",
            "sla_deadline",
            "internal_notes",
            "quality_score",
        ],
    )

    _drop_columns_if_exist(
        "agents",
        ["is_public", "source", "price_per_run", "allow_reviews", "review_cost"],
    )

    _drop_columns_if_exist("users", ["credits"])


def downgrade() -> None:
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("credits", sa.Integer(), nullable=False, server_default="0"))

    with op.batch_alter_table("agents") as batch:
        batch.add_column(sa.Column("review_cost", sa.Integer(), nullable=False, server_default="5"))
        batch.add_column(sa.Column("allow_reviews", sa.Boolean(), nullable=False, server_default=sa.text("false")))
        batch.add_column(sa.Column("price_per_run", sa.Float(), nullable=False, server_default="1"))
        batch.add_column(sa.Column("source", sa.String(length=32), nullable=False, server_default="manual"))
        batch.add_column(sa.Column("is_public", sa.Boolean(), nullable=False, server_default=sa.text("false")))

    with op.batch_alter_table("agent_executions") as batch:
        batch.add_column(sa.Column("quality_score", sa.Integer(), nullable=True))
        batch.add_column(sa.Column("internal_notes", sa.Text(), nullable=True))
        batch.add_column(sa.Column("sla_deadline", sa.DateTime(), nullable=True))
        batch.add_column(sa.Column("assigned_to", sa.Uuid(), sa.ForeignKey("users.id"), nullable=True))
        batch.add_column(sa.Column("priority", sa.Text(), nullable=False, server_default="normal"))
        batch.add_column(sa.Column("review_response_note", sa.Text(), nullable=True))
        batch.add_column(sa.Column("review_request_note", sa.Text(), nullable=True))
        batch.add_column(
            sa.Column(
                "review_status",
                postgresql.ENUM(
                    "none",
                    "pending",
                    "in_progress",
                    "waiting_info",
                    "completed",
                    "rejected",
                    "cancelled",
                    name="reviewstatus",
                    create_type=False,
                ),
                nullable=False,
                server_default="none",
            )
        )
        batch.add_column(sa.Column("refined_outputs", sa.JSON(), nullable=True))

    op.create_table(
        "user_favorites",
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("agent_id", sa.Uuid(), sa.ForeignKey("agents.id", ondelete="CASCADE"), primary_key=True),
    )

    op.create_table(
        "credit_transactions",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("amount", sa.Integer(), nullable=False),
        sa.Column(
            "transaction_type",
            postgresql.ENUM(
                "purchase", "usage", "refund", "earning", name="transactiontype", create_type=False
            ),
            nullable=False,
        ),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column("reference_id", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )

    op.create_table(
        "reviews",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("rating", sa.Float(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("comment", sa.Text(), nullable=False),
        sa.Column("helpful_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("agent_id", sa.Uuid(), sa.ForeignKey("agents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )

    op.create_table(
        "creator_studio_guest_credits",
        sa.Column("id", sa.String(length=128), primary_key=True, nullable=False),
        sa.Column("credits", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )

    op.create_table(
        "agent_actions",
        sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
        sa.Column("agent_id", sa.Uuid(), sa.ForeignKey("agents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("openapi_spec", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("url", sa.String(length=512), nullable=False),
        sa.Column("method", sa.String(length=16), nullable=False, server_default="POST"),
        sa.Column("headers", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
    )

    _rebuild_userrole_enum_with_user()
