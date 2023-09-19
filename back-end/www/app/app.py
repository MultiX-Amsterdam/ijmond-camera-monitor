from flask import Flask
from flask_cors import CORS
from models.model import db
from models.schema import ma
from util import set_logger


# Server parameters
app_log_path = "../log/app.log"

# Initialize the Web Server Gateway Interface
app = Flask(__name__)

# Load the settings in config.py
app.config.from_object("config.config.config")

# Special settings that depend on the environment
if app.config["DEBUG"] == True:
    # Setup CORS when in DEBUG mode (so that localhost works)
    print("Debug mode: CORS enabled!")
    cors = CORS(app, resources={r"/*": {"origins": "*"}})
else:
    # Setup the logger for the staging and production server
    set_logger(app_log_path, "ijmond_camera_monitor")

# Initialize app with database
db.init_app(app)

# Initialize app with schema
ma.init_app(app)
