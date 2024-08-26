"""Functions to operate the segmetation batch table."""

from models.model import db
from models.model import SegmentationBatch
from app.app import app


def create_segmentation_batch(num_gold_standard, num_unlabeled, connection_id):
    """Create a segmentation batch."""
    batch = SegmentationBatch(
        num_gold_standard=num_gold_standard,
        num_unlabeled=num_unlabeled,
        connection_id=connection_id
    )
    app.logger.info("Create segmentation batch: %r" % batch)
    db.session.add(batch)
    db.session.commit()
    return batch


def remove_batch(batch_id):
    """Remove a segmentation batch."""
    batch = SegmentationBatch.query.filter_by(id=batch_id).first()
    app.logger.info("Remove segmentation batch: %r" % batch)
    if batch is None:
        raise Exception("No segmentation batch found in the database to delete.")
    db.session.delete(batch)
    db.session.commit()