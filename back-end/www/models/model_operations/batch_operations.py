"""Functions to operate the batch table."""

from models.model import db
from models.model import Batch
from app.app import app


def create_batch(num_gold_standard, num_unlabeled, connection_id):
    """Create a batch."""
    batch = Batch(
        num_gold_standard=num_gold_standard,
        num_unlabeled=num_unlabeled,
        connection_id=connection_id
    )
    db.session.add(batch)
    db.session.commit()
    app.logger.info("Create batch: %r" % batch)
    return batch


def remove_batch(batch_id):
    """Remove a batch."""
    batch = Batch.query.filter_by(id=batch_id).first()
    app.logger.info("Remove batch: %r" % batch)
    if batch is None:
        raise Exception("No batch found in the database to delete.")
    db.session.delete(batch)
    db.session.commit()
