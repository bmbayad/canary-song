"""Add recording table for Phase 3

Revision ID: 003
Revises: 002
Create Date: 2025-09-05
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '003'
down_revision = '002'
branch_labels = None
depends_on = None


def upgrade():
    # Create recording status enum
    recording_status = postgresql.ENUM('Pending', 'In Progress', 'Completed', 'Unable to Evaluate', 'Expired', name='recordingstatus')
    recording_status.create(op.get_bind())

    # Create recordings table
    op.create_table(
        'recordings',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('bird_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('bird_type_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('media_type', sa.String(length=10), nullable=False),
        sa.Column('storage_key', sa.String(length=255), nullable=False),
        sa.Column('original_filename', sa.String(length=255), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('duration', sa.Integer(), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('status', recording_status, nullable=False),
        sa.ForeignKeyConstraint(['bird_id'], ['birds.id'], ),
        sa.ForeignKeyConstraint(['bird_type_id'], ['bird_types.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('storage_key', name='uq_storage_key')
    )

    # Create indexes
    op.create_index('idx_recording_bird_id', 'recordings', ['bird_id'])
    op.create_index('idx_recording_bird_type_id', 'recordings', ['bird_type_id'])


def downgrade():
    # Drop indexes
    op.drop_index('idx_recording_bird_type_id', table_name='recordings')
    op.drop_index('idx_recording_bird_id', table_name='recordings')

    # Drop table
    op.drop_table('recordings')

    # Drop enum
    recording_status = postgresql.ENUM('Pending', 'In Progress', 'Completed', 'Unable to Evaluate', 'Expired', name='recordingstatus')
    recording_status.drop(op.get_bind())
