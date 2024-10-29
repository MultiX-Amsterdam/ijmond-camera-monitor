"""Functions to operate the connection table."""

from models.model import db
from models.model import Connection
from app.app import app


def create_connection(user_id, client_type):
    """Create a connection."""
    connection = Connection(user_id=user_id, client_type=client_type)
    db.session.add(connection)
    db.session.commit()
    app.logger.info("Create connection: %r" % connection)
    return connection


def remove_connection(connection_id):
    """Remove a connection."""
    connection = Connection.query.filter_by(id=connection_id).first()
    app.logger.info("Remove connection: %r" % connection)
    if connection is None:
        raise Exception("No connection found in the database to delete.")
    db.session.delete(connection)
    db.session.commit()
