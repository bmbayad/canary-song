"""Complete bird types and birds schema

Revision ID: 002_birds
Revises: 001_initial
Create Date: 2026-09-08 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '002_birds'
down_revision = '001_initial'
branch_labels = None
depends_on = None


def upgrade():
    # Bird types table
    op.create_table(
        'bird_types',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('active', sa.String(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )
    op.create_index('idx_bird_type_name', 'bird_types', ['name'], unique=False)

    # Birds table
    op.create_table(
        'birds',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('owner_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('leg_band_number', sa.String(), nullable=False),
        sa.Column('bird_type_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('sex', sa.String(), nullable=True),
        sa.Column('notes', sa.String(), nullable=True),
        sa.Column('status', sa.Enum('Active', 'Archived', name='birdstatus'), server_default='Active', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('owner_id', 'leg_band_number', name='uq_owner_leg_band'),
    )
    op.create_index('idx_bird_owner_id', 'birds', ['owner_id'], unique=False)
    op.create_index('idx_bird_type_id', 'birds', ['bird_type_id'], unique=False)


def downgrade():
    op.drop_index('idx_bird_type_id', table_name='birds')
    op.drop_index('idx_bird_owner_id', table_name='birds')
    op.drop_table('birds')
    op.drop_index('idx_bird_type_name', table_name='bird_types')
    op.drop_table('bird_types')
