from pathlib import Path
from os.path import abspath
from os.path import join
from os.path import dirname
from os.path import isdir
from os.path import exists


# Change the variable below to False on the production server
is_staging = True

secret_dir = abspath(join(dirname( __file__ ), "..", "..", "secret"))
assert isdir(secret_dir), ("need to have the %s directory (check README)") % (secret_dir)


class Config(object):
    CSRF_ENABLED = True
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    key_path = Path(join(secret_dir, "private_key"))
    assert exists(key_path), ("need to have the %s file (check README)") % (key_path)
    JWT_PRIVATE_KEY = key_path.read_text().strip()


class StagingConfig(Config):
    db_url_path = Path(join(secret_dir, "db_url_staging"))
    assert exists(db_url_path), ("need to have the %s file (check README)") % (db_url_path)
    SQLALCHEMY_DATABASE_URI = db_url_path.read_text().strip()


class TestingConfig(Config):
    TESTING = True
    db_url_path = Path(join(secret_dir, "db_url_testing"))
    assert exists(db_url_path), ("need to have the %s file (check README)") % (db_url_path)
    SQLALCHEMY_DATABASE_URI = db_url_path.read_text().strip()


class ProductionConfig(Config):
    db_url_path = Path(join(secret_dir, "db_url_production"))
    assert exists(db_url_path), ("need to have the %s file (check README)") % (db_url_path)
    SQLALCHEMY_DATABASE_URI = db_url_path.read_text().strip()


if is_staging:
    config = StagingConfig()
else:
    config = ProductionConfig()
