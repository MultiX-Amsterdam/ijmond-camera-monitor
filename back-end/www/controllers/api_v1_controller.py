"""The controller for https://[PATH]/api/v1/"""

import uuid
import jwt
import requests
import json
import os
import time
from flask import Blueprint
from flask import request
from flask import jsonify
from flask import make_response
from flask import Response
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
from models.model_operations.user_operations import get_user_by_id
from models.model_operations.user_operations import update_best_tutorial_action_by_user_id
from models.model_operations.connection_operations import create_connection
from models.model_operations.batch_operations import create_batch

from models.model_operations.video_operations import query_video_batch
from models.model_operations.video_operations import get_video_query
from models.model_operations.video_operations import get_all_videos
from models.model_operations.video_operations import get_pos_video_query_by_user_id
from models.model_operations.video_operations import get_statistics
from models.model_operations.label_operations import update_labels
from models.model_operations.view_operations import create_views_from_video_batch
from models.model_operations.tutorial_operations import create_tutorial

from models.model_operations.segmentationBatch_operations import create_segmentation_batch
from models.model_operations.segmentationMask_operations import query_segmentation_batch
from models.model_operations.segmentationMask_operations import get_segmentation_query
from models.model_operations.segmentationMask_operations import get_all_segmentations
from models.model_operations.segmentationMask_operations import get_pos_segmentation_query_by_user_id
from models.model_operations.segmentationMask_operations import segmentatio_mask_join_video_table
from models.model_operations.segmentationMask_operations import only_latest_researcher_feedback
from models.model_operations.segmentationMask_operations import filter_feedback_by_user_id
from models.model_operations.segmentationMask_operations import get_statistics_seg
from models.model_operations.segmentationView_operations import create_segmentation_views_from_segmentation_batch
from models.model_operations.segmentationFeedback_operations import update_segmentation_labels

from models.schema import videos_schema_is_admin
from models.schema import videos_schema_with_detail
from models.schema import videos_schema

from models.schema import segmentations_schema_is_admin
from models.schema import segmentations_schema_with_detail
from models.schema import segmentations_schema

import models.model as m


bp = Blueprint("api_v1_controller", __name__)


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


def create_user_token(user):
    """
    Create user tokens based on the User object.

    Parameters
    ----------
    user : User
        The User object.

    Returns
    -------
    user_token : str
        The JWT (JSON Web Token) of the corresponding user.
        This token is used for the front-end client.
    user_token_for_other_app : str
        This token is used for the deep-smoke-machine repository to download data.
        (https://github.com/CMU-CREATE-Lab/deep-smoke-machine)
    """
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


@bp.route("/refresh_user_token", methods=["POST"])
def refresh_user_token():
    """
    Refresh the user token by using the user id.

    Parameters
    ----------
    user_token : str
        The encoded JWT that stores user information.

    Returns
    -------
    str
        The updated JWT that stores user information.
    """
    request_json = request.get_json()
    if request_json is None:
        raise InvalidUsage("Missing json", status_code=400)
    if "user_token" not in request_json:
        raise InvalidUsage("Missing field: user_token", status_code=400)
    user_token = request_json["user_token"]
    try:
        user_jwt = decode_jwt(user_token, config.JWT_PRIVATE_KEY)
        user_id = user_jwt["user_id"]
        user = get_user_by_id(user_id)
        user_token, user_token_for_other_app = create_user_token(user)
        if user_token is None:
            raise InvalidUsage("Permission denied", status_code=403)
        else:
            return_json = {"user_token": user_token, "user_token_for_other_app": user_token_for_other_app}
            return jsonify(return_json)
    except Exception as ex:
        raise InvalidUsage(ex.args[0], status_code=400)


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
    return create_user_token(user)


def encode_user_token(**kwargs):
    """Encode a user JWT token (JSON Web Token)."""
    t = kwargs["iat"] if "iat" in kwargs else get_current_time()
    payload = {}
    payload["iat"] = t
    payload["jti"] = uuid.uuid4().hex
    # This is a hack that we have not deal with token expiration yet
    # TODO: We shound deal with token expiration
    #payload["exp"] = t + 3600 # the token will expire after one hour
    for k in kwargs:
        payload[k] = kwargs[k]
    payload["iat"] -= 5 # Prevent some delay in the system time
    return encode_jwt(payload, config.JWT_PRIVATE_KEY)


def batch_check_request(request_json):
    if request_json is None:
        raise InvalidUsage("Missing json", status_code=400)
    if "user_token" not in request_json:
        raise InvalidUsage("Missing field: user_token", status_code=400)
    # Decode user jwt
    try:
        user_jwt = decode_jwt(request_json["user_token"], config.JWT_PRIVATE_KEY)
    except jwt.InvalidSignatureError as ex:
        raise InvalidUsage(ex.args[0], status_code=401)
    except Exception as ex:
        raise InvalidUsage(ex.args[0], status_code=401)

    return user_jwt


@bp.route("/get_batch", methods=["POST"])
def get_batch():
    """For the client to get a batch of video clips."""
    request_json = request.get_json()
    user_jwt = batch_check_request(request_json)
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
        return jsonify_data(video_batch, sign=True, batch_id=batch.id, user_id=user_jwt["user_id"])


@bp.route("/get_segment_batch", methods=["POST"])
def get_segment_batch():
    """For the client to get a batch of segmentation masks."""
    request_json = request.get_json()
    user_jwt = batch_check_request(request_json)
    is_admin = True if user_jwt["client_type"] == 0 else False
    segmentation_batch = query_segmentation_batch(user_jwt["user_id"], use_admin_label_state=is_admin)
    if segmentation_batch is None or len(segmentation_batch) < config.BATCH_SIZE_SEG:
        return make_response("", 204)
    else:
        if is_admin:
            batch = create_segmentation_batch(
                num_gold_standard=0,
                num_unlabeled=config.BATCH_SIZE_SEG,
                connection_id=user_jwt["connection_id"]
            ) # no gold standard videos for admin
        else:
            batch = create_segmentation_batch(
                num_gold_standard=config.GOLD_STANDARD_IN_BATCH_SEG,
                num_unlabeled=config.BATCH_SIZE_SEG-config.GOLD_STANDARD_IN_BATCH_SEG,
                connection_id=user_jwt["connection_id"]
            )
        return jsonify_data(segmentation_batch, sign=True, batch_id=batch.id, user_id=user_jwt["user_id"], is_video=False)


def jsonify_data(data, sign=False, batch_id=None, total=None, is_admin=False, user_id=None, with_detail=False, is_video=True):
    """
    Convert video objects to json.

    Parameters
    ----------
    data : list of data objects (e.g., Video or Segmentation objects)
        A list of data objects.
    sign : bool
        Require digital signature or not.
    batch_id : int
        The batch ID (a part of the digital signature).
    total : int
        The total number of datapoints.
    is_admin : bool
        Is the system administrator or not.
        This affects the level of information to get from the data table.
        Check the VideoSchemaIsAdmin class for an example.
    user_id : int
        The user ID (a part of the digital signature).
    with_detail : bool
        For the normal front-end user, display details of the data or not.
        Check the VideoSchemaWithDetail class for an example.

    Returns
    -------
    flask.Response (with the application/json mimetype)
        A list of data objects in JSON.
    """
    if len(data) == 0: return make_response("", 204)
    if is_video:
        if is_admin:
            data_json = videos_schema_is_admin.dump(data)
        else:
            data_json = videos_schema_with_detail.dump(data) if with_detail else videos_schema.dump(data)
    else:
        if is_admin:
            data_json = segmentations_schema_is_admin.dump(data)
        else:
            data_json = segmentations_schema_with_detail.dump(data) if with_detail else segmentations_schema.dump(data)
    if sign:
        data_id_list = []
    for i in range(len(data_json)):
        data_json[i]["url_root"] = config.VIDEO_URL_ROOT
        if sign:
            data_id_list.append(data_json[i]["id"])
    return_json = {"data": data_json}
    if sign:
        # TODO: change video_token to something like content_token to make it more generaliable
        return_json["video_token"] = encode_video_jwt(video_id_list=data_id_list, batch_id=batch_id, user_id=user_id)
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
    payload["iat"] -= 5 # Prevent some delay in the system time
    return encode_jwt(payload, config.JWT_PRIVATE_KEY)


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
        video_jwt = decode_jwt(request_json["video_token"], config.JWT_PRIVATE_KEY)
        user_jwt = decode_jwt(request_json["user_token"], config.JWT_PRIVATE_KEY)
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

@bp.route("/send_segmentation_batch", methods=["POST"])
def send_segmentation_batch():
    """For the client to send segmentation bbox of a batch back to the server."""
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
        video_jwt = decode_jwt(request_json["video_token"], config.JWT_PRIVATE_KEY)
        user_jwt = decode_jwt(request_json["user_token"], config.JWT_PRIVATE_KEY)
    except jwt.InvalidSignatureError as ex:
        raise InvalidUsage(ex.args[0], status_code=401)
    except Exception as ex:
        raise InvalidUsage(ex.args[0], status_code=401)
    # Verify video id list and user_id
    labels = request_json["data"]
    original_v = video_jwt["video_id_list"]
    returned_v = [v["id"] for v in labels]
    if Counter(original_v) != Counter(returned_v) or video_jwt["user_id"] != user_jwt["user_id"]:
        raise InvalidUsage("Signature of the segmentation batch is not valid", status_code=401)
    # Update database
    try:
        score = update_segmentation_labels(labels, user_jwt["user_id"], user_jwt["connection_id"], video_jwt["batch_id"], user_jwt["client_type"])
        return_json = {"data": {"score": score}}
        return jsonify(return_json)
    except Exception as ex:
        raise InvalidUsage(ex.args[0], status_code=400)


@bp.route("/set_label_state", methods=["POST"])
def set_label_state():
    """
    Set video labels to positive, negative, or gold standard.
    Only admin (client type 0) can use this call.
    """
    request_json = request.get_json()
    if request_json is None:
        raise InvalidUsage("Missing json", status_code=400)
    if "data" not in request_json:
        raise InvalidUsage("Missing field: data", status_code=400)
    if "user_token" not in request_json:
        raise InvalidUsage("Missing field: user_token", status_code=400)
    # Decode user jwt
    try:
        user_jwt = decode_jwt(request_json["user_token"], config.JWT_PRIVATE_KEY)
    except jwt.InvalidSignatureError as ex:
        raise InvalidUsage(ex.args[0], status_code=401)
    except Exception as ex:
        raise InvalidUsage(ex.args[0], status_code=401)
    # Verify if the user is a researcher
    if user_jwt["client_type"] != 0:
        raise InvalidUsage("Permission denied", status_code=403)
    # Update database
    try:
        update_labels(request_json["data"], user_jwt["user_id"], None, None, user_jwt["client_type"])
        return make_response("", 204)
    except Exception as ex:
        raise InvalidUsage(ex.args[0], status_code=400)


@bp.route("/set_segmentation_label_state", methods=["POST"])
def set_segmentation_label_state():
    """
    Set segmentation labels.
    Only admin (client type 0) can use this call.
    """
    request_json = request.get_json()
    if request_json is None:
        raise InvalidUsage("Missing json", status_code=400)
    if "data" not in request_json:
        raise InvalidUsage("Missing field: data", status_code=400)
    if "user_token" not in request_json:
        raise InvalidUsage("Missing field: user_token", status_code=400)
    # Decode user jwt
    try:
        user_jwt = decode_jwt(request_json["user_token"], config.JWT_PRIVATE_KEY)
    except jwt.InvalidSignatureError as ex:
        raise InvalidUsage(ex.args[0], status_code=401)
    except Exception as ex:
        raise InvalidUsage(ex.args[0], status_code=401)
    # Verify if the user is a researcher
    if user_jwt["client_type"] != 0:
        raise InvalidUsage("Permission denied", status_code=403)
    # Update database
    try:
        update_segmentation_labels(request_json["data"], user_jwt["user_id"], None, None, user_jwt["client_type"])
        return make_response("", 204)
    except Exception as ex:
        raise InvalidUsage(ex.args[0], status_code=400)


@bp.route("/get_pos_labels", methods=["GET", "POST"])
def get_pos_labels():
    """
    Get videos with positive labels.
    The label state is aggregated from both researcher and citizens.
    """
    return get_video_labels("pos", allow_user_id=True)


@bp.route("/get_neg_labels", methods=["GET", "POST"])
def get_neg_labels():
    """
    Get videos with negative labels.
    The label state is aggregated from both researcher and citizens.
    """
    return get_video_labels("neg")


@bp.route("/get_pos_gold_labels", methods=["POST"])
def get_pos_gold_labels():
    """
    Get videos with positive gold standard labels.
    Only admin (client type 0) can use this call.
    Gold standard labels will only be set by researchers.
    """
    return get_video_labels(m.pos_gold_labels, only_admin=True, use_admin_label_state=True)


@bp.route("/get_neg_gold_labels", methods=["POST"])
def get_neg_gold_labels():
    """
    Get videos with negative gold standard labels.
    Only admin (client type 0) can use this call.
    Gold standard labels will only be set by researchers.
    """
    return get_video_labels(m.neg_gold_labels, only_admin=True, use_admin_label_state=True)


@bp.route("/get_pos_labels_by_researcher", methods=["POST"])
def get_pos_labels_by_researcher():
    """
    Get researcher-labeled positive videos, exclude gold standards.
    Only admin (client type 0) can use this call.
    """
    return get_video_labels(m.pos_labels, only_admin=True, use_admin_label_state=True)


@bp.route("/get_neg_labels_by_researcher", methods=["POST"])
def get_neg_labels_by_researcher():
    """
    Get researcher-labeled negative videos, exclude gold standards.
    Only admin (client type 0) can use this call.
    """
    return get_video_labels(m.neg_labels, only_admin=True, use_admin_label_state=True)


@bp.route("/get_pos_labels_by_citizen", methods=["POST"])
def get_pos_labels_by_citizen():
    """
    Get citizen-labeled positive videos, exclude gold standards.
    Only admin (client type 0) can use this call.
    """
    return get_video_labels(m.pos_labels, only_admin=True)


@bp.route("/get_neg_labels_by_citizen", methods=["POST"])
def get_neg_labels_by_citizen():
    """
    Get citizen-labeled negative videos, exclude gold standards.
    Only admin (client type 0) can use this call.
    """
    return get_video_labels(m.neg_labels, only_admin=True)


@bp.route("/get_maybe_pos_labels", methods=["GET", "POST"])
def get_maybe_pos_labels():
    """
    Get videos with insufficient citizen-provided positive labels.
    This type of label will only be set by citizens.
    """
    return get_video_labels(m.maybe_pos_labels)


@bp.route("/get_maybe_neg_labels", methods=["GET", "POST"])
def get_maybe_neg_labels():
    """
    Get videos with insufficient citizen-provided positive labels.
    This type of label will only be set by citizens.
    """
    return get_video_labels(m.maybe_neg_labels)


@bp.route("/get_discorded_labels", methods=["GET", "POST"])
def get_discorded_labels():
    """
    Get videos with citizen discorded labels.
    Partial labels will only be set by citizens.
    """
    return get_video_labels(m.discorded_labels)


@bp.route("/get_bad_labels", methods=["POST"])
def get_bad_labels():
    """
    Get videos that were discarded.
    Only admin (client type 0) can use this call.
    Bad labels will only be set by researchers.
    """
    return get_video_labels(m.bad_labels, only_admin=True, use_admin_label_state=True)


@bp.route("/get_all_labels", methods=["POST"])
def get_all_labels():
    """
    Get all videos data.
    Only admin (client type 0) can use this call.
    """
    return get_video_labels(None, only_admin=True)


def get_video_labels(labels, allow_user_id=False, only_admin=False, use_admin_label_state=False):
    """
    Return a list of videos with specific type of labels.

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
                user_jwt = decode_jwt(qs["user_token"][0], config.JWT_PRIVATE_KEY)
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
            return jsonify_data(get_all_videos(), is_admin=True)
        else:
            q = get_video_query(labels, page_number, page_size, use_admin_label_state=use_admin_label_state)
            if not is_researcher: # ignore researcher
                create_views_from_video_batch(q.items, user_jwt, query_type=0)
            return jsonify_data(q.items, total=q.total, is_admin=is_admin, with_detail=True)
    else:
        q = get_pos_video_query_by_user_id(user_id, page_number, page_size, is_researcher)
        if not is_researcher: # ignore researcher
            create_views_from_video_batch(q.items, user_jwt, query_type=1)
        # We need to set is_admin to True here because we want to show user agreements in the data
        return jsonify_data(q.items, total=q.total, is_admin=True)


@bp.route("/get_label_statistics", methods=["GET"])
def get_label_statistics():
    """Get statistics of the Video labels."""
    return jsonify(get_statistics())


@bp.route("/get_label_statistics_seg", methods=["GET"])
def get_label_statistics_seg():
    """Get statistics of the SegmentationMask labels."""
    return jsonify(get_statistics_seg())


@bp.route("/api/v1/add_tutorial_record", methods=["POST"])
def add_tutorial_record():
    """Add tutorial record to the database."""
    request_json = request.get_json()
    if request_json is None:
        raise InvalidUsage("Missing json", status_code=400)
    if "action_type" not in request_json:
        raise InvalidUsage("Missing field: action_type", status_code=400)
    if "query_type" not in request_json:
        raise InvalidUsage("Missing field: query_type", status_code=400)
    if "user_token" not in request_json:
        raise InvalidUsage("Missing field: user_token", status_code=400)
    # Decode user jwt
    try:
        user_jwt = decode_jwt(request_json["user_token"], config.JWT_PRIVATE_KEY)
    except jwt.InvalidSignatureError as ex:
        raise InvalidUsage(ex.args[0], status_code=401)
    except Exception as ex:
        raise InvalidUsage(ex.args[0], status_code=401)
    # Update database
    try:
        # Add tutorial record
        action_type = request_json["action_type"]
        query_type = request_json["query_type"]
        create_tutorial(user_jwt["connection_id"], action_type, query_type)
        # Update the best tutorial action for the user
        user = get_user_by_id(user_jwt["user_id"])
        if action_type > user.best_tutorial_action:
            update_best_tutorial_action_by_user_id(user_jwt["user_id"], action_type)
        return make_response("", 204)
    except Exception as ex:
        raise InvalidUsage(ex.args[0], status_code=400)


@bp.route("/get_pos_labels_seg", methods=["GET", "POST"])
def get_pos_labels_seg():
    """
    Get segmentation masks with positive labels.
    The label state is aggregated from both researcher and citizens.
    """
    return get_segmentation_masks("pos", allow_user_id=True)


@bp.route("/get_neg_labels_seg", methods=["GET", "POST"])
def get_neg_labels_seg():
    """
    Get segmentation masks with negative labels.
    The label state is aggregated from both researcher and citizens.
    """
    return get_segmentation_masks("neg")


@bp.route("/get_pos_gold_labels_seg", methods=["POST"])
def get_pos_gold_labels_seg():
    """
    Get segmentation masks with positive gold standard labels.
    Only admin (client type 0) can use this call.
    Gold standard labels will only be set by researchers.
    """
    return get_segmentation_masks(m.pos_gold_labels_seg, only_admin=True, use_admin_label_state=True)


@bp.route("/get_neg_gold_labels_seg", methods=["POST"])
def get_neg_gold_labels_seg():
    """
    Get segmentation masks with negative gold standard labels.
    Only admin (client type 0) can use this call.
    Gold standard labels will only be set by researchers.
    """
    return get_segmentation_masks(m.neg_gold_labels_seg, only_admin=True, use_admin_label_state=True)


@bp.route("/get_pos_labels_seg_by_researcher", methods=["POST"])
def get_pos_labels_seg_by_researcher():
    """
    Get researcher-labeled positive segmentation masks, exclude gold standards.
    Only admin (client type 0) can use this call.
    """
    return get_segmentation_masks(m.pos_labels_seg, only_admin=True, use_admin_label_state=True)


@bp.route("/get_neg_labels_seg_by_researcher", methods=["POST"])
def get_neg_labels_seg_by_researcher():
    """
    Get researcher-labeled negative segmentation masks, exclude gold standards.
    Only admin (client type 0) can use this call.
    """
    return get_segmentation_masks(m.neg_labels_seg, only_admin=True, use_admin_label_state=True)


@bp.route("/get_pos_labels_seg_by_citizen", methods=["POST"])
def get_pos_labels_seg_by_citizen():
    """
    Get citizen-labeled positive segmentation masks, exclude gold standards.
    Only admin (client type 0) can use this call.
    """
    return get_segmentation_masks(m.pos_labels_seg, only_admin=True)


@bp.route("/get_neg_labels_seg_by_citizen", methods=["POST"])
def get_neg_labels_seg_by_citizen():
    """
    Get citizen-labeled negative segmentation masks, exclude gold standards.
    Only admin (client type 0) can use this call.
    """
    return get_segmentation_masks(m.neg_labels_seg, only_admin=True)


@bp.route("/get_maybe_pos_labels_seg", methods=["GET", "POST"])
def get_maybe_pos_labels_seg():
    """
    Get segmentation masks with insufficient citizen-provided positive labels.
    This type of label will only be set by citizens.
    """
    return get_segmentation_masks(m.maybe_pos_labels_seg)


@bp.route("/get_maybe_neg_labels_seg", methods=["GET", "POST"])
def get_maybe_neg_labels_seg():
    """
    Get segmentation masks with insufficient citizen-provided negative labels.
    This type of label will only be set by citizens.
    """
    return get_segmentation_masks(m.maybe_neg_labels_seg)


@bp.route("/get_discorded_labels_seg", methods=["GET", "POST"])
def get_discorded_labels_seg():
    """
    Get segmentation masks with citizen discorded labels.
    Partial labels will only be set by citizens.
    """
    return get_segmentation_masks(m.discorded_labels_seg)


@bp.route("/get_bad_labels_seg", methods=["POST"])
def get_bad_labels_seg():
    """
    Get segmentation masks that were discarded.
    Only admin (client type 0) can use this call.
    Bad labels will only be set by researchers.
    """
    return get_segmentation_masks(m.bad_labels_seg, only_admin=True, use_admin_label_state=True)


@bp.route("/get_all_labels_seg", methods=["POST"])
def get_all_labels_seg():
    """
    Get all segmentation masks data.
    Only admin (client type 0) can use this call.
    """
    return get_segmentation_masks(None, only_admin=True)


def get_segmentation_masks(labels, allow_user_id=False, only_admin=False, use_admin_label_state=False):
    """
    Return a list of segmentation masks with specific type of labels.

    Parameters
    ----------
    labels : list of raw label states, or str
        Input for the get_segmentation_query function.
        See the docstring of the get_segmentation_query function.
    allow_user_id : bool
        Request segmentation masks by user id or not.
    only_admin : bool
        Only for admin users or not.
    use_admin_label_state : bool
        Input for the get_segmentation_query function.
        See the docstring of the get_segmentation_query function.

    Returns
    -------
    flask.Response (with the application/json mimetype)
        A list of SegmentationMask objects in JSON.
    """
    user_id = request.args.get("user_id", None, type=int) if allow_user_id else None
    page_number = request.args.get("pageNumber", 1, type=int)
    page_size = request.args.get("pageSize", 16, type=int)
    user_jwt = None
    data = request.get_data()
    if data is not None:
        qs = parse_qs(data.decode("utf8"))
        if "user_token" in qs:
            # Decode user jwt
            try:
                user_jwt = decode_jwt(qs["user_token"][0], config.JWT_PRIVATE_KEY)
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
            return jsonify_data(get_all_segmentations(), is_admin=True, is_video=False)
        else:
            q = get_segmentation_query(labels, page_number, page_size, use_admin_label_state=use_admin_label_state)
            filtered_q = only_latest_researcher_feedback(q.items)
            if not is_researcher: # ignore researcher
                create_segmentation_views_from_segmentation_batch(filtered_q, user_jwt, query_type=0)
            return jsonify_data(filtered_q, total=q.total, is_admin=is_admin, with_detail=True, is_video=False)
    else:
        q = get_pos_segmentation_query_by_user_id(user_id, page_number, page_size, is_researcher)
        filtered_q = filter_feedback_by_user_id(q.items, user_id)
        if not is_researcher: # ignore researcher
            create_segmentation_views_from_segmentation_batch(filtered_q, user_jwt, query_type=1)
        # We need to set is_admin to True here because we want to show user agreements in the data
        return jsonify_data(filtered_q, total=q.total, is_admin=True, is_video=False)


def ensure_cache_directory(file_path):
    """Ensure that the directory for the cache file exists."""
    os.makedirs(os.path.dirname(file_path), exist_ok=True)


def load_cache(file_path):
    """Loads cached data from file if available."""
    ensure_cache_directory(file_path)
    if os.path.exists(file_path):
        with open(file_path, "r") as file:
            cached_data = json.load(file)
            return cached_data
    return None


def save_to_cache(data, file_path):
    """Saves the response data to cache file."""
    ensure_cache_directory(file_path)
    with open(file_path, "w") as file:
        json.dump(data, file)


def get_last_update_time(file_path):
    """Reads the last update time from the file."""
    if os.path.exists(file_path):
        with open(file_path, "r") as file:
            return float(file.read().strip())
    return 0


def update_last_update_time(file_path):
    """Writes the current time to the last update file."""
    with open(file_path, "w") as file:
        file.write(str(time.time()))


@bp.route("/cached_smoke", methods=["GET"])
def cached_smoke():
    current_time = time.time()
    last_update_time = get_last_update_time(config.CACHE_SMOKE_LAST_UPDATE_FILE)

    # Check if the cache needs to be updated
    if (current_time - last_update_time) >= config.CACHE_SMOKE_UPDATE_INTERVAL:
        # URL of the external API
        api_url = "https://spotdegifwolk.nl/api/clouds"
        # Try fetching data from the external API
        try:
            response = requests.get(api_url)
            response.raise_for_status()  # Raise an exception for HTTP errors
            data = response.json()
            # Save the response data to cache file
            save_to_cache(data, config.CACHE_SMOKE_FILE)
            # Update the last update time
            update_last_update_time(config.CACHE_SMOKE_LAST_UPDATE_FILE)
        except requests.RequestException as e:
            # If there is an error, load from cache
            data = load_cache(config.CACHE_SMOKE_FILE)
            if not data:
                # If no cached data is available, return an error response
                return jsonify({"error": "External API is down and no cache available"}), 503
            return jsonify(data), 200
    else:
        # Load cached data if cache is still valid
        data = load_cache(config.CACHE_SMOKE_FILE)
        if not data:
            # If no cached data is available, return an error response
            return jsonify({"error": "Cache is invalid and no fresh data available"}), 503
        return jsonify(data), 200

    return jsonify(data), 200
