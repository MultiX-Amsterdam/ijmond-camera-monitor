from flask_migrate import Migrate
from app.app import app
from models.model import db
from controllers import root
from controllers import api_v1_controller


# Register all routes to the blueprint
app.register_blueprint(root.bp)
app.register_blueprint(api_v1_controller.bp, url_prefix="/api/v1/")

# Set database migration
migrate = Migrate(app, db)
