"""Complete scoring and evaluation schema

Revision ID: 004_evaluations
Revises: 003_recordings
Create Date: 2026-09-08 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '004_evaluations'
down_revision = '003_recordings'
branch_labels = None
depends_on = None


def upgrade():
    # Scoring configurations table
    op.create_table(
        'scoring_configurations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('bird_type_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('version', sa.Integer(), server_default='1', nullable=False),
        sa.Column('active', sa.String(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_scoring_config_bird_type', 'scoring_configurations', ['bird_type_id'], unique=False)

    # Scoring categories table
    op.create_table(
        'scoring_categories',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('scoring_configuration_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('minimum_points', sa.Integer(), nullable=False),
        sa.Column('maximum_points', sa.Integer(), nullable=False),
        sa.Column('display_order', sa.Integer(), server_default='0', nullable=False),
        sa.Column('active', sa.String(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_scoring_category_config', 'scoring_categories', ['scoring_configuration_id'], unique=False)

    # Evaluations table
    op.create_table(
        'evaluations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('recording_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('judge_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('scoring_configuration_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('status', sa.Enum('In Progress', 'Submitted', 'Unable to Evaluate', name='evaluationstatus'), server_default='In Progress', nullable=False),
        sa.Column('total_score', sa.Float(), nullable=True),
        sa.Column('comments', sa.Text(), nullable=True),
        sa.Column('unable_to_evaluate_reason', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=False),
        sa.Column('submitted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('recording_id', 'judge_id', name='uq_recording_judge'),
    )
    op.create_index('idx_evaluation_recording', 'evaluations', ['recording_id'], unique=False)
    op.create_index('idx_evaluation_judge', 'evaluations', ['judge_id'], unique=False)
    op.create_index('idx_evaluation_status', 'evaluations', ['status'], unique=False)

    # Evaluation scores table
    op.create_table(
        'evaluation_scores',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('evaluation_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('category_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('category_name_snapshot', sa.String(), nullable=False),
        sa.Column('minimum_points_snapshot', sa.Integer(), nullable=False),
        sa.Column('maximum_points_snapshot', sa.Integer(), nullable=False),
        sa.Column('score', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_evaluation_score_evaluation', 'evaluation_scores', ['evaluation_id'], unique=False)


def downgrade():
    op.drop_index('idx_evaluation_score_evaluation', table_name='evaluation_scores')
    op.drop_table('evaluation_scores')
    op.drop_index('idx_evaluation_status', table_name='evaluations')
    op.drop_index('idx_evaluation_judge', table_name='evaluations')
    op.drop_index('idx_evaluation_recording', table_name='evaluations')
    op.drop_table('evaluations')
    op.drop_index('idx_scoring_category_config', table_name='scoring_categories')
    op.drop_table('scoring_categories')
    op.drop_index('idx_scoring_config_bird_type', table_name='scoring_configurations')
    op.drop_table('scoring_configurations')
