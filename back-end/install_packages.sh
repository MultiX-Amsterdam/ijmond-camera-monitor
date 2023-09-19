#!/bin/sh

# Flask server
pip install --upgrade flask
pip install --upgrade flask-sqlalchemy
pip install --upgrade flask-migrate
pip install --upgrade flask-marshmallow
pip install --upgrade marshmallow-sqlalchemy
pip install --upgrade flask-cors
pip install --upgrade marshmallow_enum

# Testing
pip install --upgrade flask-testing

# Database
pip install --upgrade psycopg2-binary

# JSON Web Token
pip install --upgrade pyjwt
