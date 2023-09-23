"""The controller for https://[PATH]/api/v1/"""

import time
import uuid
import jwt
from flask import Blueprint
from flask import request
from flask import jsonify
from flask import make_response
from collections import Counter
from google.oauth2 import id_token
from google.auth.transport import requests as g_requests
from urllib.parse import parse_qs
from util.util import InvalidUsage
from util.util import encode_jwt
from util.util import decode_jwt
from util.util import get_current_time
from config.config import config
from models.model_operations.user_operations import get_user_by_client_id
from models.model_operations.user_operations import create_user
from models.model_operations.connection_operations import create_connection
from models.model_operations.batch_operations import create_batch
from models.model_operations.video_operations import query_video_batch
from models.model_operations.video_operations import get_video_query
from models.model_operations.video_operations import get_all_videos
from models.model_operations.label_operations import update_labels
from models.schema import videos_schema_is_admin
from models.schema import videos_schema_with_detail
from models.schema import videos_schema


bp = Blueprint("api_v1_controller", __name__)

# Label set variables
pos_labels = [0b10111, 0b1111, 0b10011]
neg_labels = [0b10000, 0b1100, 0b10100]
pos_gold_labels = [0b101111]
neg_gold_labels = [0b100000]
maybe_pos_labels = [0b101]
maybe_neg_labels = [0b100]
discorded_labels = [0b11]
bad_labels = [-2]


@bp.route("/login", methods=["POST"])
def login():
    """
    The function for the front-end client to log in.

    Use the following command to test:
    $ curl -d '{"client_id":"id"}' -H "Content-Type: application/json" -X POST http://0.0.0.0:5000/api/v1/login/

    Parameters
    ----------
    google_id_token : str
        The ID token that is returned by the Google Identity API.
        (https://developers.google.com/identity)
    client_id : str
        The client ID string provided by the front-end client.

    Returns
    -------
    user_token : str
        The encoded JWT that stores user information.
    """
    client_id = None
    request_json = request.get_json()
    # Get client id
    if request_json is not None:
        if "google_id_token" in request_json:
            google_id_token = request_json["google_id_token"]
            id_info = {}
            try:
                id_info = id_token.verify_oauth2_token(
                    google_id_token,
                    g_requests.Request(),
                    config.GOOGLE_SIGNIN_CLIENT_ID
                )
            except Exception as ex:
                raise InvalidUsage(ex.args[0], status_code=418)
            if id_info["iss"] not in ["accounts.google.com", "https://accounts.google.com"]:
                raise InvalidUsage("Wrong token issuer", status_code=401)
            client_id = "google.%s" % id_info["sub"]
        else:
            if "client_id" in request_json:
                client_id = request_json["client_id"]
    # Get user id by client id, and issued an user jwt
    if client_id is not None:
        user_token, user_token_for_other_app = get_user_token_by_client_id(client_id)
        if user_token is None:
            raise InvalidUsage("Permission denied", status_code=403)
        else:
            return_json = {"user_token": user_token, "user_token_for_other_app": user_token_for_other_app}
            return jsonify(return_json)
    else:
        raise InvalidUsage("Missing field: google_id_token or client_id", status_code=400)


def get_user_token_by_client_id(client_id):
    """
    Get the encoded user token by using client id.

    Parameters
    ----------
    client_id : str
        The ID provided by the front-end client.

    Returns
    -------
    user_token : str
        The JWT (JSON Web Token) of the corresponding user.
        This token is used for the front-end client.
    user_token_for_other_app : str
        This token is used for the deep-smoke-machine repository to download data.
        (https://github.com/CMU-CREATE-Lab/deep-smoke-machine)
    """
    user = get_user_by_client_id(client_id)
    if user is None:
        user = create_user(client_id) # create a new user if not found
    user_id = user.id
    client_type = user.client_type
    user_score = user.score
    user_raw_score = user.raw_score
    connection = create_connection(user_id, client_type)
    ct = connection.time
    cid = connection.id
    if client_type == -1:
        return (None, None) # a banned user does not get the token
    else:
        # Field user_score and user_raw_score is for the client to display the user score when loggin in.
        # Field connection_id is for updating the batch information when the client sends labels back.
        user_token = encode_user_token(
            user_id=user_id,
            client_type=client_type,
            connection_id=cid,
            iat=ct,
            user_score=user_score,
            user_raw_score=user_raw_score
        )
        # This is the token for other app to access video labels from API calls.
        user_token_for_other_app = encode_user_token(
            user_id=user_id,
            client_type=client_type,
            connection_id=-1,
            iat=ct
        )
        return (user_token, user_token_for_other_app)


def encode_user_token(**kwargs):
    """Encode a user JWT token (JSON Web Token)."""
    t = kwargs["iat"] if "iat" in kwargs else get_current_time()
    payload = {}
    payload["iat"] = t
    payload["jti"] = uuid.uuid4().hex
    payload["iss"] = "[CHANGE_THIS_TO_YOUR_ROOT_URL]"
    payload["exp"] = t + 3600 # the token will expire after one hour
    for k in kwargs:
        payload[k] = kwargs[k]
    return encode_jwt(payload, config.JWT_PRIVATE_KEY)


@bp.route("/get_batch", methods=["POST"])
def get_batch():
    """For the client to get a batch of video clips."""
    request_json = request.get_json()
    if request_json is None:
        raise InvalidUsage("Missing json", status_code=400)
    if "user_token" not in request_json:
        raise InvalidUsage("Missing field: user_token", status_code=400)
    # Decode user jwt
    try:
        user_jwt = decode_jwt(request_json["user_token"])
    except jwt.InvalidSignatureError as ex:
        raise InvalidUsage(ex.args[0], status_code=401)
    except Exception as ex:
        raise InvalidUsage(ex.args[0], status_code=401)
    # Query videos (active learning or random sampling)
    is_admin = True if user_jwt["client_type"] == 0 else False
    video_batch = query_video_batch(user_jwt["user_id"], use_admin_label_state=is_admin)
    if video_batch is None or len(video_batch) < config.BATCH_SIZE:
        return make_response("", 204)
    else:
        if is_admin:
            batch = create_batch(
                num_gold_standard=0,
                num_unlabeled=config.BATCH_SIZE,
                connection_id=user_jwt["connection_id"]
            ) # no gold standard videos for admin
        else:
            batch = create_batch(
                num_gold_standard=config.GOLD_STANDARD_IN_BATCH,
                num_unlabeled=config.BATCH_SIZE-config.GOLD_STANDARD_IN_BATCH,
                connection_id=user_jwt["connection_id"]
            )
        return jsonify_videos(video_batch, sign=True, batch_id=batch.id, user_id=user_jwt["user_id"])


def jsonify_videos(videos, sign=False, batch_id=None, total=None, is_admin=False, user_id=None, with_detail=False):
    """
    Convert video objects to json.

    Parameters
    ----------
    videos : list of Video
        A list of video objects.
    sign : bool
        Require digital signature or not.
    batch_id : int
        The video batch ID (a part of the digital signature).
    total : int
        The total number of videos.
    is_admin : bool
        Is the system administrator or not.
        This affects the level of information to get from the Video table.
        Check the VideoSchemaIsAdmin class.
    user_id : int
        The user ID (a part of the digital signature).
    with_detail : bool
        For the normal front-end user, display details of the videos or not.
        Check the VideoSchemaWithDetail class.

    Returns
    -------
    flask.Response (with the application/json mimetype)
        A list of video objects in JSON.
    """
    if len(videos) == 0: return make_response("", 204)
    if is_admin:
        videos_json = videos_schema_is_admin.dump(videos)
    else:
        if with_detail:
            videos_json = videos_schema_with_detail.dump(videos)
        else:
            videos_json = videos_schema.dump(videos)
    if sign:
        video_id_list = []
    for i in range(len(videos_json)):
        videos_json[i]["url_root"] = config.VIDEO_URL_ROOT
        fn = videos_json[i]["file_name"]
        fns = fn.split("-")
        videos_json[i]["url_part"] = "%s-%s-%s/%s-%s/%s.mp4" % (fns[2], fns[3], fns[4], fns[0], fns[1], fn)
        if sign:
            video_id_list.append(videos_json[i]["id"])
    return_json = {"data": videos_json}
    if sign:
        return_json["video_token"] = encode_video_jwt(video_id_list=video_id_list, batch_id=batch_id, user_id=user_id)
    if total is not None:
        return_json["total"] = total
    return jsonify(return_json)


def encode_video_jwt(**kwargs):
    """Encode video batch JWT."""
    t = kwargs["iat"] if "iat" in kwargs else get_current_time()
    payload = {}
    payload["iat"] = t
    payload["nbf"] = t + config.VIDEO_JWT_NBF_DURATION
    payload["jti"] = uuid.uuid4().hex
    for k in kwargs:
        payload[k] = kwargs[k]
    return encode_jwt(payload=payload)


@bp.route("/send_batch", methods=["POST"])
def send_batch():
    """For the client to send labels of a batch back to the server."""
    request_json = request.get_json()
    if request_json is None:
        raise InvalidUsage("Missing json", status_code=400)
    if "data" not in request_json:
        raise InvalidUsage("Missing field: data", status_code=400)
    if "user_token" not in request_json:
        raise InvalidUsage("Missing field: user_token", status_code=400)
    if "video_token" not in request_json:
        raise InvalidUsage("Missing field: video_token", status_code=400)
    # Decode user and video jwt
    try:
        video_jwt = decode_jwt(request_json["video_token"])
        user_jwt = decode_jwt(request_json["user_token"])
    except jwt.InvalidSignatureError as ex:
        raise InvalidUsage(ex.args[0], status_code=401)
    except Exception as ex:
        raise InvalidUsage(ex.args[0], status_code=401)
    # Verify video id list and user_id
    labels = request_json["data"]
    original_v = video_jwt["video_id_list"]
    returned_v = [v["video_id"] for v in labels]
    if Counter(original_v) != Counter(returned_v) or video_jwt["user_id"] != user_jwt["user_id"]:
        raise InvalidUsage("Signature of the video batch is not valid", status_code=401)
    # Update database
    try:
        score = update_labels(labels, user_jwt["user_id"], user_jwt["connection_id"], video_jwt["batch_id"], user_jwt["client_type"])
        return_json = {"data": {"score": score}}
        return jsonify(return_json)
    except Exception as ex:
        raise InvalidUsage(ex.args[0], status_code=400)


@bp.route("/api/v1/set_label_state", methods=["POST"])
def set_label_state():
    """
    Set video labels to positive, negative, or gold standard.
    Only admin (client type 0) can use this call.
    """
    if request.json is None:
        raise InvalidUsage("Missing json", status_code=400)
    if "data" not in request.json:
        raise InvalidUsage("Missing field: data", status_code=400)
    if "user_token" not in request.json:
        raise InvalidUsage("Missing field: user_token", status_code=400)
    # Decode user jwt
    try:
        user_jwt = decode_jwt(request.json["user_token"])
    except jwt.InvalidSignatureError as ex:
        raise InvalidUsage(ex.args[0], status_code=401)
    except Exception as ex:
        raise InvalidUsage(ex.args[0], status_code=401)
    # Verify if the user is a researcher
    if user_jwt["client_type"] != 0:
        raise InvalidUsage("Permission denied", status_code=403)
    # Update database
    try:
        update_labels(request.json["data"], user_jwt["user_id"], None, None, user_jwt["client_type"])
        return make_response("", 204)
    except Exception as ex:
        raise InvalidUsage(ex.args[0], status_code=400)


@bp.route("/api/v1/get_pos_labels", methods=["GET", "POST"])
def get_pos_labels():
    """
    Get videos with positive labels.
    The label state is aggregated from both researcher and citizens.
    """
    return get_video_labels("pos", allow_user_id=True)


@bp.route("/api/v1/get_neg_labels", methods=["GET", "POST"])
def get_neg_labels():
    """
    Get videos with negative labels.
    The label state is aggregated from both researcher and citizens.
    """
    return get_video_labels("neg")


@bp.route("/api/v1/get_pos_gold_labels", methods=["POST"])
def get_pos_gold_labels():
    """
    Get videos with positive gold standard labels.
    Only admin (client type 0) can use this call.
    Gold standard labels will only be set by researchers.
    """
    return get_video_labels(pos_gold_labels, only_admin=True, use_admin_label_state=True)


@bp.route("/api/v1/get_neg_gold_labels", methods=["POST"])
def get_neg_gold_labels():
    """
    Get videos with negative gold standard labels.
    Only admin (client type 0) can use this call.
    Gold standard labels will only be set by researchers.
    """
    return get_video_labels(neg_gold_labels, only_admin=True, use_admin_label_state=True)


@bp.route("/api/v1/get_pos_labels_by_researcher", methods=["POST"])
def get_pos_labels_by_researcher():
    """
    Get researcher-labeled positive videos, exclude gold standards.
    Only admin (client type 0) can use this call.
    """
    return get_video_labels(pos_labels, only_admin=True, use_admin_label_state=True)


@bp.route("/api/v1/get_neg_labels_by_researcher", methods=["POST"])
def get_neg_labels_by_researcher():
    """
    Get researcher-labeled negative videos, exclude gold standards.
    Only admin (client type 0) can use this call.
    """
    return get_video_labels(neg_labels, only_admin=True, use_admin_label_state=True)


@bp.route("/api/v1/get_pos_labels_by_citizen", methods=["POST"])
def get_pos_labels_by_citizen():
    """
    Get citizen-labeled positive videos, exclude gold standards.
    Only admin (client type 0) can use this call.
    """
    return get_video_labels(pos_labels, only_admin=True)


@bp.route("/api/v1/get_neg_labels_by_citizen", methods=["POST"])
def get_neg_labels_by_citizen():
    """
    Get citizen-labeled negative videos, exclude gold standards.
    Only admin (client type 0) can use this call.
    """
    return get_video_labels(neg_labels, only_admin=True)


@bp.route("/api/v1/get_maybe_pos_labels", methods=["GET", "POST"])
def get_maybe_pos_labels():
    """
    Get videos with insufficient citizen-provided positive labels.
    This type of label will only be set by citizens.
    """
    return get_video_labels(maybe_pos_labels)


@bp.route("/api/v1/get_maybe_neg_labels", methods=["GET", "POST"])
def get_maybe_neg_labels():
    """
    Get videos with insufficient citizen-provided positive labels.
    This type of label will only be set by citizens.
    """
    return get_video_labels(maybe_neg_labels)


@bp.route("/api/v1/get_discorded_labels", methods=["GET", "POST"])
def get_discorded_labels():
    """
    Get videos with citizen discorded labels.
    Partial labels will only be set by citizens.
    """
    return get_video_labels(discorded_labels)


@bp.route("/api/v1/get_bad_labels", methods=["POST"])
def get_bad_labels():
    """
    Get videos that were discarded.
    Only admin (client type 0) can use this call.
    Bad labels will only be set by researchers.
    """
    return get_video_labels(bad_labels, only_admin=True, use_admin_label_state=True)


@bp.route("/api/v1/get_all_labels", methods=["POST"])
def get_all_labels():
    """
    Get all data.
    Only admin (client type 0) can use this call.
    """
    return get_video_labels(None, only_admin=True)


def get_video_labels(labels, allow_user_id=False, only_admin=False, use_admin_label_state=False):
    """
    Return a list of videos with specific type of labels

    Parameters
    ----------
    labels : list of raw label states, or str
        Input for the get_video_query function.
        See the docstring of the get_video_query function.
    allow_user_id : bool
        Request videos by user id or not.
    only_admin : bool
        Only for admin users or not.
    use_admin_label_state : bool
        Input for the get_video_query function.
        See the docstring of the get_video_query function.

    Returns
    -------
    flask.Response (with the application/json mimetype)
        A list of video objects in JSON.
    """
    user_id = request.args.get("user_id") if allow_user_id else None
    page_number = request.args.get("pageNumber", 1, type=int)
    page_size = request.args.get("pageSize", 16, type=int)
    user_jwt = None
    data = request.get_data()
    if data is not None:
        qs = parse_qs(data.decode("utf8"))
        if "user_token" in qs:
            # Decode user jwt
            try:
                user_jwt = decode_jwt(qs["user_token"][0])
            except jwt.InvalidSignatureError as ex:
                raise InvalidUsage(ex.args[0], status_code=401)
            except Exception as ex:
                raise InvalidUsage(ex.args[0], status_code=401)
        if "pageNumber" in qs:
            page_number = int(qs["pageNumber"][0])
        if "pageSize" in qs:
            page_size = int(qs["pageSize"][0])
    if only_admin:
        # Verify if user_token is returned
        if user_jwt is None:
            raise InvalidUsage("Missing fields: user_token", status_code=400)
        # Verify if the user is researcher or expert (they are considered admins in this case)
        if user_jwt["client_type"] != 0 and user_jwt["client_type"] != 1:
            raise InvalidUsage("Permission denied", status_code=403)
    is_admin = True if user_jwt is not None and (user_jwt["client_type"] == 0 or user_jwt["client_type"] == 1) else False
    is_researcher = True if user_jwt is not None and user_jwt["client_type"] == 0 else False
    if user_id is None:
        if labels is None and is_admin:
            return jsonify_videos(get_all_videos(), is_admin=True)
        else:
            q = get_video_query(labels, page_number, page_size, use_admin_label_state=use_admin_label_state)
            if not is_researcher: # ignore researcher
                add_video_views(q.items, user_jwt, query_type=0)
            return jsonify_videos(q.items, total=q.total, is_admin=is_admin, with_detail=True)
    else:
        q = get_pos_video_query_by_user_id(user_id, page_number, page_size, is_researcher)
        if not is_researcher: # ignore researcher
            add_video_views(q.items, user_jwt, query_type=1)
        # We need to set is_admin to True here because we want to show user agreements in the data
        return jsonify_videos(q.items, total=q.total, is_admin=True)
