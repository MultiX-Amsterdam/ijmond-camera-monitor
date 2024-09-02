"""The controller for https://[PATH]/"""

from flask import Blueprint


bp = Blueprint("root", __name__)


@bp.route("/")
def hello_world():
    return "Hello, World!"
