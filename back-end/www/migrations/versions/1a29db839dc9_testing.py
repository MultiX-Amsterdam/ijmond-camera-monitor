"""testing

Revision ID: 1a29db839dc9
Revises: a86460cc66b3
Create Date: 2024-08-27 12:35:29.299628

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1a29db839dc9'
down_revision = 'a86460cc66b3'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('segmentation_mask', schema=None) as batch_op:
        batch_op.drop_constraint('uq_segmentation_mask_image_file_name', type_='unique')
        batch_op.drop_constraint('uq_segmentation_mask_mask_file_name', type_='unique')

    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    with op.batch_alter_table('segmentation_mask', schema=None) as batch_op:
        batch_op.create_unique_constraint('uq_segmentation_mask_mask_file_name', ['mask_file_name'])
        batch_op.create_unique_constraint('uq_segmentation_mask_image_file_name', ['image_file_name'])

    # ### end Alembic commands ###