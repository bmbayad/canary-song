"""Add missing columns to users table

Revision ID: 004_fix_users
Revises: 003_bird_tables
Create Date: 2026-09-08 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '004_fix_users'
down_revision = '003_bird_tables'
branch_labels = None
depends_on = None


def upgrade():
    # Add only the missing password_reset_required column
    op.add_column('users', sa.Column('password_reset_required', sa.Boolean(), server_default='false', nullable=False))


def downgrade():
    op.drop_column('users', 'password_reset_required')
