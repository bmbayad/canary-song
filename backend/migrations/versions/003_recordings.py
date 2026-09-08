"""Complete recordings schema

Revision ID: 003_recordings
Revises: 002_birds
Create Date: 2026-09-08 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '003_recordings'
down_revision = '002_birds'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'recordings',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('bird_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('bird_type_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('media_type', sa.String(10), server_default='MP4', nullable=False),
        sa.Column('storage_key', sa.String(255), nullable=False),
        sa.Column('original_filename', sa.String(255), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('duration', sa.Integer(), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('status', sa.Enum('Pending', 'In Progress', 'Completed', 'Unable to Evaluate', 'Expired', name='recordingstatus'), server_default='Pending', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('storage_key'),
    )
    op.create_index('idx_recording_bird_id', 'recordings', ['bird_id'], unique=False)
    op.create_index('idx_recording_bird_type_id', 'recordings', ['bird_type_id'], unique=False)


def downgrade():
    op.drop_index('idx_recording_bird_type_id', table_name='recordings')
    op.drop_index('idx_recording_bird_id', table_name='recordings')
    op.drop_table('recordings')
