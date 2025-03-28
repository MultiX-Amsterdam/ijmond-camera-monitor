"""Schema for object serialization and deserialization."""

from flask_marshmallow import Marshmallow
from models.model import Video
from models.model import SegmentationMask
from models.model import SegmentationFeedback

# Use Marshmallow to simplify object–relational mapping
ma = Marshmallow()


class VideoSchema(ma.SQLAlchemyAutoSchema):
    """
    The schema for the Video table, used for jsonify (for normal users in label mode).
    """
    class Meta:
        model = Video # the class for the model
        load_instance = True
        fields = ("id", "file_name", "view_id", "camera_id", "url_part") # fields to expose
videos_schema = VideoSchema(many=True)


class VideoSchemaWithDetail(ma.SQLAlchemyAutoSchema):
    """
    The schema for the Video table with detail, used for jsonify (for normal users in gallery mode).
    """
    class Meta:
        model = Video # the class for the model
        load_instance = True
        fields = ("id", "start_time", "view_id", "camera_id", "file_name", "url_part")
videos_schema_with_detail = VideoSchemaWithDetail(many=True)


class VideoSchemaIsAdmin(ma.SQLAlchemyAutoSchema):
    """
    The schema for the Video table with detail, used for jsonify (for admin users).
    """
    class Meta:
        model = Video # the class for the model
        load_instance = True
        fields = ("id", "label_state", "label_state_admin", "start_time", "file_name", "url_part", "view_id", "camera_id")
videos_schema_is_admin = VideoSchemaIsAdmin(many=True)


class SegmentationFeedbackSchema(ma.SQLAlchemyAutoSchema):
    """
    The schema for the SegmentationFeedback table, used for jsonify.
    """
    class Meta:
        model = SegmentationFeedback # the class for the model
        load_instance = True
        fields = ("x_bbox", "y_bbox", "w_bbox", "h_bbox", "feedback_code", "time", "frame_number")


class SegmentationSchema(ma.SQLAlchemyAutoSchema):
    """
    The schema for the SegmentationMask table, used for jsonify (for normal users in label mode).
    """
    video = ma.Nested(VideoSchema)
    class Meta:
        model = SegmentationMask # the class for the model
        load_instance = True
        fields = ("id", "mask_file_name", "image_file_name", "frame_number", "file_path", "frame_timestamp",
                  "x_bbox", "y_bbox", "w_bbox", "h_bbox", "w_image", "h_image", "url_part",
                  "video")
segmentations_schema = SegmentationSchema(many=True)


class SegmentationSchemaWithDetail(ma.SQLAlchemyAutoSchema):
    """
    The schema for the SegmentationMask table with detail, used for jsonify (for normal users in gallery mode).
    """
    video = ma.Nested(VideoSchema)
    feedback_filtered = ma.Nested(SegmentationFeedbackSchema, many=True)
    class Meta:
        model = SegmentationMask # the class for the model
        load_instance = True
        include_relationships = True
        fields = ("id", "mask_file_name", "image_file_name", "frame_number", "file_path", "frame_timestamp",
                  "x_bbox", "y_bbox", "w_bbox", "h_bbox", "w_image", "h_image", "url_part",
                  "video", "feedback_filtered")
segmentations_schema_with_detail = SegmentationSchemaWithDetail(many=True)


class SegmentationSchemaIsAdmin(ma.SQLAlchemyAutoSchema):
    """
    The schema for the SegmentationMask table with detail, used for jsonify (for admin users in galley mode).
    """
    video = ma.Nested(VideoSchema)
    feedback_filtered = ma.Nested(SegmentationFeedbackSchema, many=True)
    class Meta:
        model = SegmentationMask # the class for the model
        load_instance = True
        include_relationships = True
        fields = ("id", "mask_file_name", "image_file_name", "frame_number", "file_path", "frame_timestamp",
                  "x_bbox", "y_bbox", "w_bbox", "h_bbox", "w_image", "h_image", "url_part",
                  "video", "feedback_filtered",
                  "label_state", "label_state_admin", "label_update_time")
segmentations_schema_is_admin = SegmentationSchemaIsAdmin(many=True)
