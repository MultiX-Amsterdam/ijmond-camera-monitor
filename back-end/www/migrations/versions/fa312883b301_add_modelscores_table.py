"""Add ModelScores table

Revision ID: fa312883b301
Revises: acb2cc9a1ad2
Create Date: 2024-04-09 18:47:56.796288

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'fa312883b301'
down_revision = 'acb2cc9a1ad2'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('model_scores',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('f1', sa.Float(), nullable=False),
    sa.Column('mcc', sa.Float(), nullable=False),
    sa.Column('accuracy', sa.Float(), nullable=False),
    sa.Column('precision', sa.Float(), nullable=False),
    sa.Column('recall', sa.Float(), nullable=False),
    sa.Column('specificity', sa.Float(), nullable=False),
    sa.Column('date', sa.Date(), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_model_scores'))
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('model_scores')
    # ### end Alembic commands ###
