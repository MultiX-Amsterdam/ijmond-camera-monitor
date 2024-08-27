"""Schema for object serialization and deserialization."""

from flask_marshmallow import Marshmallow
from models.model import Video
from models.model import SegmentationMask

# Use Marshmallow to simplify object–relational mapping
ma = Marshmallow()


class VideoSchema(ma.SQLAlchemyAutoSchema):
    """
    The schema for the video table, used for jsonify (for normal users in label mode).
    """
    class Meta:
        model = Video # the class for the model
        load_instance = True
        fields = ("id", "file_name", "view_id", "camera_id", "url_part") # fields to expose
videos_schema = VideoSchema(many=True)


class VideoSchemaWithDetail(ma.SQLAlchemyAutoSchema):
    """
    The schema for the video table, used for jsonify (for normal users in gallery mode).
    """
    class Meta:
        model = Video # the class for the model
        load_instance = True
        fields = ("id", "start_time", "view_id", "camera_id", "file_name", "url_part")
videos_schema_with_detail = VideoSchemaWithDetail(many=True)


class VideoSchemaIsAdmin(ma.SQLAlchemyAutoSchema):
    """
    The schema for the video table, used for jsonify (for admin users).
    """
    class Meta:
        model = Video # the class for the model
        load_instance = True
        fields = ("id", "label_state", "label_state_admin", "start_time", "file_name", "url_part", "view_id", "camera_id")
videos_schema_is_admin = VideoSchemaIsAdmin(many=True)


class SegmentationSchema(ma.SQLAlchemyAutoSchema):
    """
    The schema for the video table, used for jsonify (for normal users in label mode).
    """
    class Meta:
        model = SegmentationMask # the class for the model
        load_instance = True
        fields = ("id", "mask_file_name", "image_file_name", "frame_number",
                  "x_bbox", "y_bbox", "w_bbox", "h_bbox", "w_image", "h_image", "url_part")
segmentations_schema = SegmentationSchema(many=True)


class SegmentationSchemaWithDetail(ma.SQLAlchemyAutoSchema):
    """
    The schema for the video table, used for jsonify (for normal users in gallery mode).
    """
    class Meta:
        model = SegmentationMask # the class for the model
        load_instance = True
        fields = ("id", "mask_file_name", "image_file_name", "frame_number", "video_id",
                  "x_bbox", "y_bbox", "w_bbox", "h_bbox", "w_image", "h_image", "url_part")
segmentations_schema_with_detail = SegmentationSchemaWithDetail(many=True)


class SegmentationSchemaIsAdmin(ma.SQLAlchemyAutoSchema):
    """
    The schema for the video table, used for jsonify (for admin users).
    """
    class Meta:
        model = SegmentationMask # the class for the model
        load_instance = True
        fields = ("id", "mask_file_name", "image_file_name", "frame_number", "video_id",
                  "label_state", "label_state_admin", "label_update_time",
                  "x_bbox", "y_bbox", "w_bbox", "h_bbox", "w_image", "h_image", "url_part")
segmentations_schema_is_admin = SegmentationSchemaIsAdmin(many=True)
