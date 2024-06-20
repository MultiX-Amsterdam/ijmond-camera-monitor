"""Added the Tasks table to log tasks

Revision ID: 773afad23904
Revises: 7be7ae7807a6
Create Date: 2024-04-19 20:47:15.951033

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '773afad23904'
down_revision = '7be7ae7807a6'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('tasks',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('task_id', sa.String(length=255), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_tasks'))
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('tasks')
    # ### end Alembic commands ###
