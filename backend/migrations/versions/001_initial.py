"""Initial migration: create users and google_identities tables

Revision ID: 001_initial
Revises:
Create Date: 2025-09-05 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '001_initial'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('password_hash', sa.String(), nullable=True),
        sa.Column('first_name', sa.String(), nullable=True),
        sa.Column('last_name', sa.String(), nullable=True),
        sa.Column('display_name', sa.String(), nullable=True),
        sa.Column('role', sa.Enum('Participant', 'Judge', 'Admin', name='userrole'), nullable=False),
        sa.Column('status', sa.Enum('Active', 'Inactive', 'Suspended', name='userstatus'), nullable=False),
        sa.Column('password_reset_required', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('preferred_language', sa.String(), server_default='en', nullable=False),
        sa.Column('timezone', sa.String(), nullable=True),
        sa.Column('country_region', sa.String(), nullable=True),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('notification_preferences', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.Column('last_login_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
    )
    op.create_index('idx_user_email', 'users', ['email'], unique=False)

    op.create_table(
        'google_identities',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('google_id', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('google_id'),
    )
    op.create_index('idx_google_identity_user_id', 'google_identities', ['user_id'], unique=False)
    op.create_index('idx_google_identity_google_id', 'google_identities', ['google_id'], unique=False)


def downgrade():
    op.drop_index('idx_google_identity_google_id', table_name='google_identities')
    op.drop_index('idx_google_identity_user_id', table_name='google_identities')
    op.drop_table('google_identities')
    op.drop_index('idx_user_email', table_name='users')
    op.drop_table('users')
