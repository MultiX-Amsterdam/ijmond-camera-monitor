"""Utility functions"""

from flask import jsonify
from flask import has_request_context
from flask import request
import jwt
import traceback
import os
import logging
import os


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
        return super().format(record)


class InvalidUsage(Exception):
    """Handle errors, such as a bad request."""
    def __init__(self, message, status_code=400, payload=None):
        Exception.__init__(self)
        self.message = message
        if status_code is not None:
            self.status_code = status_code
        self.payload = payload

    def to_dict(self):
        rv = dict(self.payload or ())
        rv["message"] = self.message
        return rv


def set_logger(app_log_path, logger_name):
    """
    Set up the logger for custom logging.

    Parameters
    ----------
    app_log_path : str
        The path to save the log files.
    logger_name : str
        A customized name of the logger.
    """
    dir_name = os.path.dirname(app_log_path)
    if dir_name != "" and not os.path.exists(dir_name):
        # Create directory if it does not exist
        os.makedirs(dir_name)
    handler = logging.handlers.RotatingFileHandler(app_log_path, mode="a", maxBytes=100000000, backupCount=200)
    formatter = RequestFormatter("[%(asctime)s] [%(ip)s] [%(url)s] [%(agent)s] [%(method)s] [%(data)s] %(levelname)s:\n\n\t%(message)s\n")
    handler.setFormatter(formatter)
    logger = logging.getLogger(logger_name)
    logger.setLevel(logging.INFO)
    for hdlr in logger.handlers[:]:
        # Remove old handlers
        logger.removeHandler(hdlr)
    logger.addHandler(handler)


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
    response = jsonify(error.to_dict())
    response.status_code = error.status_code
    return response


def encode_jwt(payload, private_key):
    """
    Encode JWT.

    Encrypt the message into a JSON Web Token (JWT) by using HMAC and SHA-256.
    (https://pyjwt.readthedocs.io/en/latest/)

    Parameters
    ----------
    payload : dict
        The payload (data) part of the JSON Web Token.
    private_key : str
        The private key to encode the JWT.

    Returns
    -------
    str
        Encoded JSON Web Token.
    """
    return jwt.encode(payload, private_key, algorithm="HS256")


def decode_jwt(token, private_key):
    """
    Decode JWT.

    Parameters
    ----------
    token : str
        JSON Web Token.
    private_key : str
        The private key to decode the JWT.

    Returns
    -------
    dict
        Decoded JSON Web Token.
    """
    return jwt.decode(token, private_key, algorithms=["HS256"])


def decode_user_token(request_json, private_key, check_if_admin=True):
    """
    Decode the user token.

    Parameters
    ----------
    request_json : dict
        The json returned by request.json using the Flask API.
    private_key : str
        The private key to decode the JWT.
    check_if_admin : bool
        Check if the user has the admin permission or not.

    Returns
    -------
    error : InvalidUsage or None
        None if passing the admin permission check.
        An error response if the check is failed.
    user_json : dict or None
        The decoded payload part of the user_token.
        None if there is an error.
    """
    # Check if there is content and user_token
    if request_json is None:
        e = InvalidUsage("Missing POST request content.", status_code=400)
        return (handle_invalid_usage(e), None)
    if "user_token" not in request_json:
        e = InvalidUsage("Missing field: user_token.", status_code=400)
        return (handle_invalid_usage(e), None)
    # Decode user token
    try:
        user_json = decode_jwt(request_json["user_token"], private_key)
    except jwt.InvalidSignatureError as ex:
        e = InvalidUsage(ex.args[0], status_code=401)
        return (handle_invalid_usage(e), None)
    except Exception as ex:
        e = InvalidUsage(ex.args[0], status_code=401)
        return (handle_invalid_usage(e), None)
    # Check if the user has the admin permission
    if check_if_admin:
        is_admin = True if user_json["client_type"] == 0 else False
        if not is_admin:
            e = InvalidUsage("Permission denied.", status_code=403)
            return (handle_invalid_usage(e), None)
    # Return None and the user data when passing the check
    return (None, user_json)


def try_wrap_response(func, status_code=400):
    """A decorator that wraps the try-except logic to handle errors."""
    def inner_function(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as ex:
            traceback.print_exc()
            if len(list(ex.args)) > 1:
                e = InvalidUsage(ex.args[0], status_code=status_code)
            else:
                e = InvalidUsage(traceback.format_exc(), status_code=status_code)
            return handle_invalid_usage(e)
    return inner_function
