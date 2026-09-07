"""Add evaluation tables for Phase 4

Revision ID: 004
Revises: 003
Create Date: 2026-09-06
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers
revision = '004'
down_revision = '003'
branch_labels = None
depends_on = None


def upgrade():
    # Create evaluation status enum
    evaluation_status = postgresql.ENUM('In Progress', 'Submitted', 'Unable to Evaluate', name='evaluationstatus')
    evaluation_status.create(op.get_bind())

    # Create scoring_configurations table
    op.create_table(
        'scoring_configurations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('bird_type_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('version', sa.Integer(), nullable=False),
        sa.Column('active', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['bird_type_id'], ['bird_types.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_scoring_config_bird_type', 'scoring_configurations', ['bird_type_id'])

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
        sa.Column('active', sa.String(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['scoring_configuration_id'], ['scoring_configurations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_scoring_category_config', 'scoring_categories', ['scoring_configuration_id'])

    # Create evaluations table
    op.create_table(
        'evaluations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('recording_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('judge_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('scoring_configuration_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('status', evaluation_status, nullable=False),
        sa.Column('total_score', sa.Float(), nullable=True),
        sa.Column('comments', sa.Text(), nullable=True),
        sa.Column('unable_to_evaluate_reason', sa.Text(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=False),
        sa.Column('submitted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['judge_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['recording_id'], ['recordings.id'], ),
        sa.ForeignKeyConstraint(['scoring_configuration_id'], ['scoring_configurations.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('recording_id', 'judge_id', name='uq_recording_judge')
    )
    op.create_index('idx_evaluation_recording', 'evaluations', ['recording_id'])
    op.create_index('idx_evaluation_judge', 'evaluations', ['judge_id'])
    op.create_index('idx_evaluation_status', 'evaluations', ['status'])

    # Create evaluation_scores table
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
        sa.ForeignKeyConstraint(['evaluation_id'], ['evaluations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_evaluation_score_evaluation', 'evaluation_scores', ['evaluation_id'])


def downgrade():
    # Drop indexes
    op.drop_index('idx_evaluation_score_evaluation', table_name='evaluation_scores')
    op.drop_index('idx_evaluation_status', table_name='evaluations')
    op.drop_index('idx_evaluation_judge', table_name='evaluations')
    op.drop_index('idx_evaluation_recording', table_name='evaluations')
    op.drop_index('idx_scoring_category_config', table_name='scoring_categories')
    op.drop_index('idx_scoring_config_bird_type', table_name='scoring_configurations')

    # Drop tables
    op.drop_table('evaluation_scores')
    op.drop_table('evaluations')
    op.drop_table('scoring_categories')
    op.drop_table('scoring_configurations')

    # Drop enum
    evaluation_status = postgresql.ENUM('In Progress', 'Submitted', 'Unable to Evaluate', name='evaluationstatus')
    evaluation_status.drop(op.get_bind())
