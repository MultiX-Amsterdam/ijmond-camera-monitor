"""Add Games table

Revision ID: a2ee19dc45be
Revises: 773afad23904
Create Date: 2024-05-09 13:12:06.809818

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a2ee19dc45be'
down_revision = '773afad23904'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('games',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('connection_id', sa.Integer(), nullable=True),
    sa.Column('action_type', sa.Integer(), nullable=False),
    sa.Column('time', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['connection_id'], ['connection.id'], name=op.f('fk_games_connection_id_connection')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_games'))
    )
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('games')
    # ### end Alembic commands ###
