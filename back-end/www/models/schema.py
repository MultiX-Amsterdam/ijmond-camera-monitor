"""Schema for object serialization and deserialization."""

from flask_marshmallow import Marshmallow
from models.model import Video


# Use Marshmallow to simplify object–relational mapping
ma = Marshmallow()


class VideoSchema(ma.ModelSchema):
    """
    The schema for the video table, used for jsonify (for normal users in label mode).
    """
    class Meta:
        model = Video # the class for the model
        fields = ("id", "file_name") # fields to expose
videos_schema = VideoSchema(many=True)


class VideoSchemaWithDetail(ma.ModelSchema):
    """
    The schema for the video table, used for jsonify (for normal users in gallery mode).
    """
    class Meta:
        model = Video # the class for the model
        fields = ("id", "start_time", "view_id", "camera_id", "file_name")
videos_schema_with_detail = VideoSchemaWithDetail(many=True)


class VideoSchemaIsAdmin(ma.ModelSchema):
    """
    The schema for the video table, used for jsonify (for admin users).
    """
    class Meta:
        model = Video # the class for the model
        fields = ("id", "label_state", "label_state_admin", "start_time", "file_name", "view_id", "camera_id")
videos_schema_is_admin = VideoSchemaIsAdmin(many=True)
