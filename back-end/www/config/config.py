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

    # Set the URL root for getting the videos
    # For example, "https://smoke.createlab.org/videos/180/"
    VIDEO_URL_ROOT = "https://ijmondcam.multix.io/videos/"
    assert VIDEO_URL_ROOT != "", ("need to specify VIDEO_URL_ROOT in config.py")

    # Set the number of videos for each batch
    BATCH_SIZE = 16

    # Set the number of segmentation masks for each batch
    BATCH_SIZE_SEG = 8

    # Set the number of gold standard videos in the batch for citizens (not admin)
    # This variable is used for the videos
    GOLD_STANDARD_IN_BATCH = 4

    # Set the number of gold standard videos in the batch for citizens (not admin)
    # This variable is used for the segmentation masks
    GOLD_STANDARD_IN_BATCH_SEG = 0

    # Set the ratio of partially labeled videos in a batch labeling request
    # 0.8 means that we want 80% of the videos in the batch to be partially labeled
    # And we want 20% of the videos to be unlabeled
    PARTIAL_LABEL_RATIO = 1

    # The max page size allowed for getting videos
    MAX_PAGE_SIZE = 1000

    # Set the path for logs
    APP_LOG_PATH = "../log/app.log"

    # The cooldown duration (in seconds) before the JWT can be accepted (to prevent spam)
    VIDEO_JWT_NBF_DURATION = 5

    # Set the private key for the server to issue JWT
    key_path = Path(join(secret_dir, "private_key"))
    assert exists(key_path), ("need to have the %s file (check README)") % (key_path)
    JWT_PRIVATE_KEY = key_path.read_text().strip()

    # Set the client ID for the google signin API
    gid_path = Path(join(secret_dir, "google_signin_client_id"))
    assert exists(gid_path), ("need to have the %s file (check README)") % (gid_path)
    GOOGLE_SIGNIN_CLIENT_ID = gid_path.read_text().strip()

    # Set the file path to store the cached smoke events
    CACHE_SMOKE_FILE = "../cache/cached_smoke.json"
    CACHE_SMOKE_LAST_UPDATE_FILE = "../cache/cached_smoke_last_update" # epochtime in seconds
    CACHE_SMOKE_UPDATE_INTERVAL = 86400 # cache update interval in seconds


class StagingConfig(Config):
    # Set the database URL
    db_url_path = Path(join(secret_dir, "db_url_staging"))
    assert exists(db_url_path), ("need to have the %s file (check README)") % (db_url_path)
    SQLALCHEMY_DATABASE_URI = db_url_path.read_text().strip()


class TestingConfig(Config):
    TESTING = True

    # Set the database URL
    db_url_path = Path(join(secret_dir, "db_url_testing"))
    assert exists(db_url_path), ("need to have the %s file (check README)") % (db_url_path)
    SQLALCHEMY_DATABASE_URI = db_url_path.read_text().strip()


class ProductionConfig(Config):
    # Set the database URL
    db_url_path = Path(join(secret_dir, "db_url_production"))
    assert exists(db_url_path), ("need to have the %s file (check README)") % (db_url_path)
    SQLALCHEMY_DATABASE_URI = db_url_path.read_text().strip()


if is_staging:
    config = StagingConfig()
else:
    config = ProductionConfig()
