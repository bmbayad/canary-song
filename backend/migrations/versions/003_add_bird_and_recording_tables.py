"""Add bird, recording, and evaluation tables

Revision ID: 003_bird_tables
Revises: 002_system_configuration
Create Date: 2026-09-08 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '003_bird_tables'
down_revision = '002_system_configuration'
branch_labels = None
depends_on = None


def upgrade():
    # Create bird_types table
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

    # Create birds table
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

    # Create recordings table
    op.create_table(
        'recordings',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('bird_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('storage_key', sa.String(), nullable=False),
        sa.Column('original_filename', sa.String(), nullable=False),
        sa.Column('uploaded_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('bird_type_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_recording_bird_id', 'recordings', ['bird_id'], unique=False)

    # Create scoring_configurations table
    op.create_table(
        'scoring_configurations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('bird_type_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('version', sa.Integer(), server_default='1', nullable=False),
        sa.Column('active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_scoring_config_bird_type_id', 'scoring_configurations', ['bird_type_id'], unique=False)

    # Create scoring_categories table
    op.create_table(
        'scoring_categories',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('scoring_configuration_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('minimum_points', sa.Integer(), nullable=False),
        sa.Column('maximum_points', sa.Integer(), nullable=False),
        sa.Column('display_order', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_scoring_category_config_id', 'scoring_categories', ['scoring_configuration_id'], unique=False)

    # Create evaluations table
    op.create_table(
        'evaluations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('recording_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('judge_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('scoring_configuration_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('total_score', sa.Float(), nullable=True),
        sa.Column('comments', sa.String(), nullable=True),
        sa.Column('unable_to_evaluate_reason', sa.String(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=False),
        sa.Column('submitted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_evaluation_recording_id', 'evaluations', ['recording_id'], unique=False)
    op.create_index('idx_evaluation_judge_id', 'evaluations', ['judge_id'], unique=False)

    # Create evaluation_scores table
    op.create_table(
        'evaluation_scores',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('evaluation_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('category_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('score', sa.Integer(), nullable=False),
        sa.Column('category_name_snapshot', sa.String(), nullable=False),
        sa.Column('minimum_points_snapshot', sa.Integer(), nullable=False),
        sa.Column('maximum_points_snapshot', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_evaluation_score_evaluation_id', 'evaluation_scores', ['evaluation_id'], unique=False)


def downgrade():
    op.drop_index('idx_evaluation_score_evaluation_id', table_name='evaluation_scores')
    op.drop_table('evaluation_scores')
    op.drop_index('idx_evaluation_judge_id', table_name='evaluations')
    op.drop_index('idx_evaluation_recording_id', table_name='evaluations')
    op.drop_table('evaluations')
    op.drop_index('idx_scoring_category_config_id', table_name='scoring_categories')
    op.drop_table('scoring_categories')
    op.drop_index('idx_scoring_config_bird_type_id', table_name='scoring_configurations')
    op.drop_table('scoring_configurations')
    op.drop_index('idx_recording_bird_id', table_name='recordings')
    op.drop_table('recordings')
    op.drop_index('idx_bird_type_id', table_name='birds')
    op.drop_index('idx_bird_owner_id', table_name='birds')
    op.drop_table('birds')
    op.drop_index('idx_bird_type_name', table_name='bird_types')
    op.drop_table('bird_types')
