"""Added Seasons, Removed XScores Tables, Merged AchievementDay and AchievementScore

Revision ID: f7d8a8ba8a21
Revises: fa312883b301
Create Date: 2024-04-10 20:09:26.794992

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f7d8a8ba8a21'
down_revision = 'fa312883b301'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('season',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('start_date', sa.Integer(), nullable=False),
    sa.Column('end_date', sa.Integer(), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_season'))
    )
    op.create_table('achievement_records',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('achievement_id', sa.Integer(), nullable=False),
    sa.Column('date', sa.Date(), nullable=False),
    sa.ForeignKeyConstraint(['achievement_id'], ['achievement.id'], name=op.f('fk_achievement_records_achievement_id_achievement')),
    sa.ForeignKeyConstraint(['user_id'], ['user.id'], name=op.f('fk_achievement_records_user_id_user')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_achievement_records'))
    )
    op.create_table('season_score',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('season_id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('raw_score', sa.Integer(), nullable=True),
    sa.Column('score', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['season_id'], ['season.id'], name=op.f('fk_season_score_season_id_season')),
    sa.ForeignKeyConstraint(['user_id'], ['user.id'], name=op.f('fk_season_score_user_id_user')),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_season_score'))
    )
    op.drop_table('achievement_day')
    op.drop_table('daily_score')
    op.drop_table('weekly_score')
    op.drop_table('monthly_score')
    op.drop_table('achievement_user')
    op.drop_table('yearly_score')
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('yearly_score',
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('raw_score', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('score', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('year', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['user.id'], name='fk_yearly_score_user_id_user'),
    sa.PrimaryKeyConstraint('id', name='pk_yearly_score')
    )
    op.create_table('achievement_user',
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('achievement_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('times_received', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['achievement_id'], ['achievement.id'], name='fk_achievement_user_achievement_id_achievement'),
    sa.ForeignKeyConstraint(['user_id'], ['user.id'], name='fk_achievement_user_user_id_user'),
    sa.PrimaryKeyConstraint('id', name='pk_achievement_user')
    )
    op.create_table('monthly_score',
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('raw_score', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('score', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('month', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('year', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['user.id'], name='fk_monthly_score_user_id_user'),
    sa.PrimaryKeyConstraint('id', name='pk_monthly_score')
    )
    op.create_table('weekly_score',
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('raw_score', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('score', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('week', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('year', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['user.id'], name='fk_weekly_score_user_id_user'),
    sa.PrimaryKeyConstraint('id', name='pk_weekly_score')
    )
    op.create_table('daily_score',
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('raw_score', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('score', sa.INTEGER(), autoincrement=False, nullable=True),
    sa.Column('date', sa.DATE(), autoincrement=False, nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['user.id'], name='fk_daily_score_user_id_user'),
    sa.PrimaryKeyConstraint('id', name='pk_daily_score')
    )
    op.create_table('achievement_day',
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('user_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('achievement_id', sa.INTEGER(), autoincrement=False, nullable=False),
    sa.Column('date', sa.DATE(), autoincrement=False, nullable=False),
    sa.ForeignKeyConstraint(['achievement_id'], ['achievement.id'], name='fk_achievement_day_achievement_id_achievement'),
    sa.ForeignKeyConstraint(['user_id'], ['user.id'], name='fk_achievement_day_user_id_user'),
    sa.PrimaryKeyConstraint('id', name='pk_achievement_day')
    )
    op.drop_table('season_score')
    op.drop_table('achievement_records')
    op.drop_table('season')
    # ### end Alembic commands ###
