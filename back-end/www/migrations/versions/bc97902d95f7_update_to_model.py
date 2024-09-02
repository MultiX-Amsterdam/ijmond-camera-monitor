"""update to model

Revision ID: bc97902d95f7
Revises: 1d79d245c372
Create Date: 2024-08-26 14:41:06.418926

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'bc97902d95f7'
down_revision = '1d79d245c372'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('segmentation_mask',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('mask_file_name', sa.String(length=255), nullable=False),
    sa.Column('image_file_name', sa.String(length=255), nullable=False),
    sa.Column('x_bbox', sa.Integer(), nullable=False),
    sa.Column('y_bbox', sa.Integer(), nullable=False),
    sa.Column('w_bbox', sa.Integer(), nullable=False),
    sa.Column('h_bbox', sa.Integer(), nullable=False),
    sa.Column('w_image', sa.Integer(), nullable=False),
    sa.Column('h_image', sa.Integer(), nullable=False),
    sa.Column('priority', sa.Integer(), nullable=False),
    sa.Column('label_state', sa.Integer(), nullable=False),
    sa.Column('label_state_admin', sa.Integer(), nullable=False),
    sa.Column('label_update_time', sa.Integer(), nullable=True),
    sa.Column('frame_number', sa.Integer(), nullable=True),
    sa.Column('video_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['video_id'], ['video.id'], name=op.f('fk_segmentation_mask_video_id_video')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_segmentation_mask')),
    sa.UniqueConstraint('image_file_name', name=op.f('uq_segmentation_mask_image_file_name')),
    sa.UniqueConstraint('mask_file_name', name=op.f('uq_segmentation_mask_mask_file_name'))
    )
    op.create_table('segmentation_batch',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('request_time', sa.Integer(), nullable=False),
    sa.Column('return_time', sa.Integer(), nullable=True),
    sa.Column('connection_id', sa.Integer(), nullable=True),
    sa.Column('score', sa.Integer(), nullable=True),
    sa.Column('num_need_feedback', sa.Integer(), nullable=False),
    sa.Column('num_gold_standard', sa.Integer(), nullable=False),
    sa.Column('user_score', sa.Integer(), nullable=True),
    sa.Column('user_raw_score', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['connection_id'], ['connection.id'], name=op.f('fk_segmentation_batch_connection_id_connection')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_segmentation_batch'))
    )
    op.create_table('segmentation_feedback',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('segmentation_id', sa.Integer(), nullable=False),
    sa.Column('feedback_code', sa.Integer(), nullable=False),
    sa.Column('x_bbox', sa.Integer(), nullable=False),
    sa.Column('y_bbox', sa.Integer(), nullable=False),
    sa.Column('w_bbox', sa.Integer(), nullable=False),
    sa.Column('h_bbox', sa.Integer(), nullable=False),
    sa.Column('time', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('batch_id', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['batch_id'], ['batch.id'], name=op.f('fk_segmentation_feedback_batch_id_batch')),
    sa.ForeignKeyConstraint(['segmentation_id'], ['segmentation_mask.id'], name=op.f('fk_segmentation_feedback_segmentation_id_segmentation_mask')),
    sa.ForeignKeyConstraint(['user_id'], ['user.id'], name=op.f('fk_segmentation_feedback_user_id_user')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_segmentation_feedback'))
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('segmentation_feedback')
    op.drop_table('segmentation_batch')
    op.drop_table('segmentation_mask')
    # ### end Alembic commands ###
