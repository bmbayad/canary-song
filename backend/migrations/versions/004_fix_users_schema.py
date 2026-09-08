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
    # Add missing columns to users table
    op.add_column('users', sa.Column('first_name', sa.String(), nullable=True))
    op.add_column('users', sa.Column('last_name', sa.String(), nullable=True))
    op.add_column('users', sa.Column('display_name', sa.String(), nullable=True))
    op.add_column('users', sa.Column('password_reset_required', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('users', sa.Column('preferred_language', sa.String(), server_default='en', nullable=False))
    op.add_column('users', sa.Column('timezone', sa.String(), nullable=True))
    op.add_column('users', sa.Column('country_region', sa.String(), nullable=True))
    op.add_column('users', sa.Column('phone', sa.String(), nullable=True))
    op.add_column('users', sa.Column('notification_preferences', sa.String(), nullable=True))
    op.add_column('users', sa.Column('last_login_at', sa.DateTime(), nullable=True))


def downgrade():
    op.drop_column('users', 'last_login_at')
    op.drop_column('users', 'notification_preferences')
    op.drop_column('users', 'phone')
    op.drop_column('users', 'country_region')
    op.drop_column('users', 'timezone')
    op.drop_column('users', 'preferred_language')
    op.drop_column('users', 'password_reset_required')
    op.drop_column('users', 'display_name')
    op.drop_column('users', 'last_name')
    op.drop_column('users', 'first_name')
