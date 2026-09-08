"""System configuration schema

Revision ID: 005_system_config
Revises: 004_evaluations
Create Date: 2026-09-08 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '005_system_config'
down_revision = '004_evaluations'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'system_configuration',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('key', sa.String(100), nullable=False),
        sa.Column('value', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('key'),
    )
    op.create_index('idx_system_config_key', 'system_configuration', ['key'], unique=False)


def downgrade():
    op.drop_index('idx_system_config_key', table_name='system_configuration')
    op.drop_table('system_configuration')
