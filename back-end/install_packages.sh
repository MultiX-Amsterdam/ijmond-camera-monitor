#!/bin/sh

# Flask server
pip install --upgrade flask==2.3.3
pip install --upgrade flask-sqlalchemy==3.1.1
pip install --upgrade flask-migrate==4.0.5
pip install --upgrade flask-marshmallow==0.15.0
pip install --upgrade marshmallow-sqlalchemy==0.29.0
pip install --upgrade flask-cors==4.0.0
pip install --upgrade marshmallow_enum==1.5.1

# Testing
pip install --upgrade flask-testing==0.8.1

# Database
pip install --upgrade psycopg2-binary==2.9.7

# JSON Web Token
pip install --upgrade pyjwt==2.8.0

# Google login API
pip install --upgrade google-api-python-client==2.101.0

# Math
pip install --upgrade numpy==1.26.0
