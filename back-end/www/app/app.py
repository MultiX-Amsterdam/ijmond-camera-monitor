import os
import logging
import logging.handlers
from flask import Flask
from flask import has_request_context
from flask import request
from flask import jsonify
from flask_cors import CORS
from flask.logging import default_handler
from models.model import db
from models.schema import ma
from util.util import InvalidUsage


class RequestFormatter(logging.Formatter):
    """The formatter for logging."""
    def format(self, record):
        if has_request_context():
            record.url = request.url
            record.method = request.method
            record.agent = request.user_agent.string
            record.data = request.get_data()
            if request.headers.getlist("X-Forwarded-For"):
                record.ip = request.headers.getlist("X-Forwarded-For")[0]
            else:
                record.ip = request.remote_addr
        else:
            record.url = None
            record.method = None
            record.agent = None
            record.data = None
            record.ip = None
        return super().format(record)


def get_logger_handler(app_log_path):
    """
    Set up the logger for custom logging.

    Parameters
    ----------
    app_log_path : str
        The path to save the log files.

    Return
    -------
    logging.handlers.RotatingFileHandler
    """
    dir_name = os.path.dirname(app_log_path)
    if dir_name != "" and not os.path.exists(dir_name):
        # Create directory if it does not exist
        os.makedirs(dir_name)
    handler = logging.handlers.RotatingFileHandler(app_log_path, mode="a", maxBytes=100000000, backupCount=200)
    formatter = RequestFormatter(
        "[%(asctime)s] [%(ip)s] [%(url)s] [%(agent)s] [%(method)s] [%(data)s] "
        "%(levelname)s:\n\n\t%(message)s\n"
    )
    handler.setFormatter(formatter)
    handler.setLevel(logging.INFO)
    return handler


def handle_invalid_usage(error):
    """
    Handle the error message of the InvalidUsage class.

    Parameters
    ----------
    error : InvalidUsage
        An InvalidUsage object.

    Returns
    -------
    dict
        A response that can be returned to the front-end client.
    """
    app.logger.error(error)
    response = jsonify(error.to_dict())
    response.status_code = error.status_code
    return response


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
    app.logger.removeHandler(default_handler)
    app.logger.addHandler(get_logger_handler(app.config["APP_LOG_PATH"]))

# Register error handler
app.register_error_handler(InvalidUsage, handle_invalid_usage)

# Initialize app with database
db.init_app(app)

# Initialize app with schema
ma.init_app(app)


@app.after_request
def after_request(response):
    """Log the HTTP response after each request."""
    app.logger.info(response)
    return response