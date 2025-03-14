# ijmond-camera-monitor

A lot of the code and documentation is borrowed from the [`video-labeling-tool`](https://github.com/CMU-CREATE-Lab/video-labeling-tool) repository.

### Table of Content
- [Coding standards](#coding-standards)
- [Install PostgreSQL (administrator only)](#install-postgresql)
- [Create databases (administrator only)](#create-database)
- [Setup the conda environment (administrator only)](#install-conda)
- [Setup back-end (administrator only)](#setup-back-end)
- [Setup development environment](#setup-dev-env)
- [Manipulate database](#manipulate-database)
- [Test cases](#test-cases)
- [Setup Google Identity API (administrator only)](#setup-google-identity)
- [Dump, import, and backup database](#dump-and-import-database)
- [Deploy back-end using uwsgi (administrator only)](#deploy-back-end-using-uwsgi)
- [Setup the apache server with https (administrator only)](#setup-apache)
- [Setup Google Analytics (administrator only)](#setup-google-analytics)

# <a name="coding-standards"></a>Coding standards
When contributing code to this repository, please follow the guidelines below:

### Language
- The primary language for this repository is set to English. Please use English when writing comments and docstrings in the code. Please also use English when writing git issues, pull requests, wiki pages, commit messages, and the README file.

### Git workflow
- Follow the [Git Feature Branch Workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/feature-branch-workflow). The master branch preserves the development history with no broken code. When working on a system feature, create a separate feature branch.
- Always create a pull request before merging the feature branch into the main branch. Doing so helps keep track of the project history and manage git issues.
- NEVER perform git rebasing on public branches, which means that you should not run "git rebase [FEATURE-BRANCH]" while you are on a public branch (e.g., the main branch). Doing so will badly confuse other developers since rebasing rewrites the git history, and other people's works may be based on the public branch. Check [this tutorial](https://www.atlassian.com/git/tutorials/merging-vs-rebasing#the-golden-rule-of-rebasing) for details.
- NEVER push credentials to the repository, for example, database passwords or private keys for signing digital signatures (e.g., the user tokens).
- Request a code review when you are not sure if the feature branch can be safely merged into the main branch.

### Python package installation
- Make sure you are in the correct conda environment before installing packages. Otherwise, the packages will be installed to the server's general python environment, which can be problematic.
- Make sure the packages are in the [install_packages.sh](back-end/install_packages.sh) script with version numbers, which makes it easy for others to install packages.
- Use the pip command first. Only use the conda command to install packages when the pip command does not work.

### Coding style
- Use the functional programming style (check [this Python document](https://docs.python.org/3/howto/functional.html) for the concept). It means that each function is self-contained and does NOT depend on a state that may change outside the function (e.g., global variables). Avoid using the object-oriented programming style unless necessary. In this way, we can accelerate the development progress while maintaining code reusability.
- Minimize the usage of global variables, unless necessary, such as system configuration variables. For each function, avoid modifying its input parameters. In this way, each function can be independent, which is good for debugging code and assigning coding tasks to a specific collaborator.
- Use a consistent coding style.
  - For Python, follow the [PEP 8 style guide](https://www.python.org/dev/peps/pep-0008/), for example, putting two blank lines between functions, using the lower_snake_case naming convention for variable and function names. Please use double quote (not single quote) for strings.
  - For JavaScript, follow the [Idiomatic JavaScript style guide](https://github.com/rwaldron/idiomatic.js), for example, using lowerCamelCase naming convention for variable and function names. Please use double quote (not single quote) for strings.
- Document functions and script files using docstrings.
  - For Python, follow the [numpydoc style guide](https://numpydoc.readthedocs.io/en/latest/format.html). Here is an [example](https://numpydoc.readthedocs.io/en/latest/example.html#example). More detailed numpydoc style can be found on [LSST's docstrings guide](https://developer.lsst.io/python/numpydoc.html).
  - For JavaScript, follow the [JSDoc style guide](https://jsdoc.app/index.html)
- For naming files, never use white spaces.
  - For Python script files (and shell script files), use the lower_snake_case naming convention. Avoid using uppercase.
  - For JavaScript files, use the lower_snake_case naming convention. Avoid using uppercases.
- Always comment the code, which helps others read the code and reduce our pain in the future when debugging or adding new features.
- Write testing cases to make sure that functions work as expected.

# <a name="install-postgresql"></a>Install PostgreSQL (administrator only)
> WARNING: this section is only for system administrators, not developers.

Install and start postgresql database (we will use version 15).
This assumes that Ubuntu 18.04 LTS or Ubuntu 20.04 LTS is installed.
Details for the Ubuntu installation can be found [here](https://www.postgresql.org/download/linux/ubuntu/).
```sh
# For Ubuntu

# Create the file repository configuration
sudo sh -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'

# Import the repository signing key
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# Update the package lists
sudo apt-get update

# Install PostgreSQL
sudo apt-get install -y postgresql-15

# Start the service
sudo systemctl start postgresql

# Check postgresql status
sudo systemctl status postgresql

# Check postgresql log
sudo tail -100 /var/log/postgresql/postgresql-15-main.log
```
For Mac OS, I recommend installing postgresql by using [Homebrew](https://brew.sh/).
Details for the Mac OS installation can be found [here](https://www.postgresql.org/download/macosx/).
```sh
# For Mac OS

# Install PostgreSQL 13
brew install postgresql@15

# Start the service
brew services start postgresql@15

# Check if postgresql is live
brew services list

# Add to path so that we can run the psql command
echo 'export PATH="$HOMEBREW_PREFIX/opt/postgresql@15/bin:$PATH"' >> ~/.zshrc
```

# <a name="create-database"></a>Create databases (administrator only)
> WARNING: this section is only for system administrators, not developers.

Now we need to create databases. First, enter the postgres shell.
```sh
# For Ubuntu
sudo -u postgres psql postgres

# For Mac OS
psql postgres
```
In the psql shell, create a project user, create a database for the user with a password, and check if the user and database exist.
Replace the `DATABASE_PASSWORD` with the project's database password.
> IMPORTANT: do not forget the semicolon and the end of the commands.
```sh
# Set the password encryption method
SET password_encryption = 'scram-sha-256';
# Give the project user with a password
CREATE USER ijmond_camera_monitor PASSWORD 'DATABASE_PASSWORD';

# Create databases for the project user
# For the staging server
CREATE DATABASE ijmond_camera_monitor_staging OWNER ijmond_camera_monitor;
# For the production server
CREATE DATABASE ijmond_camera_monitor_production OWNER ijmond_camera_monitor;
# For the test cases
CREATE DATABASE ijmond_camera_monitor_testing OWNER ijmond_camera_monitor;

# Check the list of user roles and see if the created user is in the list
SELECT rolname FROM pg_authid;

# Check the list of encrypted user passwords
SELECT rolpassword FROM pg_authid;

# Check if the user role exists
\du

# Check if the database exists
\l

# Exist the shell
\q
```
Edit the `pg_hba.conf` file to set the authentication methods to the ones that require encrypted passwords.
This step is used to increase the security of the database on the Ubuntu server.
You can skip this step if you are using Mac OS for development.
```sh
# For Ubuntu
sudo vim /etc/postgresql/15/main/pg_hba.conf
# Scroll to the end and relace all "peer" with "scram-sha-256", **except those for the local connections**
# Below are examples
local   all             postgres                                peer
local   all             all                                     peer
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256
local   replication     all                                     peer
host    replication     all             127.0.0.1/32            scram-sha-256
host    replication     all             ::1/128                 scram-sha-256

# For Mac OS
vim $HOMEBREW_PREFIX/var/postgresql@15/pg_hba.conf
# Scroll to the end and relace some "trust" with "scram-sha-256"
# Below are examples
local   all             all                                     trust
host    all             all             127.0.0.1/32            trust
host    all             all             ::1/128                 trust
local   replication     all                                     trust
host    replication     all             127.0.0.1/32            scram-sha-256
host    replication     all             ::1/128                 scram-sha-256
```
After editing the `pg_hba.conf` file, run the following to restart the database:
```sh
brew services restart postgresql@15
```
If you want to delete a user or a database, enter the postgres shell and use the following:
```sh
# Delete the staging server database
DROP DATABASE ijmond_camera_monitor_staging;

# Delete the project user
DROP USER ijmond_camera_monitor;
```
Also some useful commands in the psql shell.
```sh
# Connect to a database
\c ijmond_camera_monitor_staging

# Show tables in the connected database
\dt

# Show columns in the user table
\d user

# Select all data in the user table
SELECT * FROM "user";
```

# <a name="install-conda"></a>Setup the conda environment (administrator only)
> WARNING: this section is only for system administrators, not developers.

Install conda for all users.
This assumes that Ubuntu is installed.
A detailed documentation is [here](https://conda.io/projects/conda/en/latest/user-guide/install/index.html).
First visit [here](https://conda.io/miniconda.html) to obtain the downloading path.
The following script install conda for all users:
```sh
# For Ubuntu
cd ~
wget https://repo.anaconda.com/miniconda/Miniconda3-py311_23.5.2-0-Linux-x86_64.sh
sudo sh Miniconda3-py311_23.5.2-0-Linux-x86_64.sh -b -p /opt/miniconda3
echo '' | sudo tee -a /etc/bash.bashrc
echo '# For miniconda3' | sudo tee -a /etc/bash.bashrc
echo 'export PATH="/opt/miniconda3/bin:$PATH"' | sudo tee -a /etc/bash.bashrc
echo '. /opt/miniconda3/etc/profile.d/conda.sh' | sudo tee -a /etc/bash.bashrc
source /etc/bash.bashrc
```
For Mac OS, I recommend installing conda by using [Homebrew](https://brew.sh/).
```sh
# For Mac OS
brew install --cask miniconda
echo 'export PATH="/usr/local/Caskroom/miniconda/base/bin:$PATH"' >> ~/.zshrc
echo '. /usr/local/Caskroom/miniconda/base/etc/profile.d/conda.sh' >> ~/.zshrc
source ~/.bash_profile
```
Create conda environment and install packages.
It is important to install pip first inside the newly created conda environment.
```sh
conda create -n ijmond-camera-monitor
conda activate ijmond-camera-monitor
conda install python=3.10
conda install pip
which pip # make sure this is the pip inside the conda environment
sh ijmond-camera-monitor/back-end/install_packages.sh
```
If the environment already exists and you want to remove it before installing packages, use the following:
```sh
conda deactivate
conda env remove -n ijmond-camera-monitor
```

# <a name="setup-back-end"></a>Setup back-end (administrator only)
> WARNING: this section is only for system administrators, not developers.

Go to the directory that you want to put the project.
```sh
# For Mac OS, the example below go to the home directory
cd ~

# For Ubuntu, the example below go to the /var/www directory
cd /var/www
```
Clone this repository.
```sh
git clone https://github.com/MultiX-Amsterdam/ijmond-camera-monitor.git ijmond-camera-monitor
```
Set the permission of the folder (for Ubuntu server setup only, not Mac OS).
```sh
# Add a development group for the project
sudo addgroup ijmond-camera-monitor-dev

# Add yourself and collaborators to the group
sudo usermod -a -G ijmond-camera-monitor-dev $USER

# Check the groups of yourself
groups $USER

# Check the group list
cat /etc/group

# Set permissions
sudo chown -R root ijmond-camera-monitor/
sudo chmod -R 775 ijmond-camera-monitor/
sudo chgrp -R ijmond-camera-monitor-dev ijmond-camera-monitor/
```
Create three text files to store the database urls in the `back-end/secret/` directory for the staging, production, and testing environments.
For the url format, refer to [the flask-sqlalchemy documentation](http://flask-sqlalchemy.pocoo.org/2.3/config/#connection-uri-format).
Replace `DATABASE_PASSWORD` with your database password.
```sh
cd ijmond-camera-monitor/back-end/
mkdir secret
cd secret/
echo "postgresql://ijmond_camera_monitor:DATABASE_PASSWORD@localhost/ijmond_camera_monitor_staging" > db_url_staging
echo "postgresql://ijmond_camera_monitor:DATABASE_PASSWORD@localhost/ijmond_camera_monitor_production" > db_url_production
echo "postgresql://ijmond_camera_monitor:DATABASE_PASSWORD@localhost/ijmond_camera_monitor_testing" > db_url_testing
```
> IMPORTANT: never push the database urls to the repository.
Create a private key for the server to encode the JSON Web Tokens for user login:
```sh
cd ijmond-camera-monitor/back-end/www/
python gen_key.py ../secret/private_key confirm
```

# <a name="setup-dev-env"></a>Setup development environment
Run the following to upgrade the database to the latest migration.
```sh
cd ijmond-camera-monitor/back-end/www/

# Upgrade the database to the latest migration
sh db.sh upgrade
```
If this is the first time that you set up the database, run the following to initialize the database migration.
> IMPORTANT: do NOT perform this step if the database migration folder exists on the repository.
```sh
# Generate the migration directory
# IMPORTANT: do not perform this step if the database migration folder exists
sh db.sh init

# Generate the migration script
# IMPORTANT: do not perform this step if the database migration folder exists
sh db.sh migrate "initial migration"
```
Run server in the conda environment for development purpose.
```sh
sh development.sh
```
You can test the application using [http://localhost:8888/](http://localhost:8888/) or the following curl command.
```sh
curl http://localhost:8888/
```

# <a name="manipulate-database"></a>Manipulate database
We use [flask-migrate](https://flask-migrate.readthedocs.io/en/latest/) to manage database migrations.
The script [db.sh](back-end/www/db.sh) enhances the workflow by adding the `FLASK_APP` environment.
If you edit the database model and want to perform database migration, run the following:
```sh
cd ijmond-camera-monitor/back-end/www/

# Generate the migration script
sh db.sh migrate "YOUR_MIGRATION_COMMIT_MESSAGE"
```
Then, a new migration script will be generated under the `back-end/www/migrations/versions` folder.
Make sure that you open the file and check if the code make sense.
After that, run the following to upgrade the database to the latest migration:
```sh
# Upgrade the database to the latest migration
sh db.sh upgrade
```
If you want to downgrade the database to a previous state, run the following.
```sh
# Downgrade the database to the previous migration
sh db.sh downgrade
```

# <a name="test-cases"></a>Test cases
For the back-end, the test cases are stored in the `back-end/www/tests` folder and written using [Flask-Testing](https://pythonhosted.org/Flask-Testing/).
Remember to write test cases for the [model operations](back-end/www/models/model_operations).
Here is [an example of writing test cases](back-end/www/tests/user_tests.py).
Below shows how to run test cases:
```sh
cd ijmond-camera-monitor/back-end/www/tests
# Run all tests
python run_all_tests.py
# Run one test
python user_tests.py
```

# <a name="setup-google-identity"></a>Setup Google Identity API (administrator only)
We will use the [Google Identity API](https://developers.google.com/identity) to handle user login and authentication.
Then, [go to this page](https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid) to get the Google API client ID.
The page will help you create a project on the [Google Cloud Console](https://console.cloud.google.com/apis/dashboard).
When you are asked to select the application types, select "Web Browser" and enter your server domain name (or IP address).
For example, in this repository, we use "https://ijmondcam.multix.io" as the domain name for the front-end.
At the end, you will get the client ID and client secret.
The client ID looks like "XXXXXXXX.apps.googleusercontent.com".

If you forgot to copy them, you can find them later on [the Credentials page of the Google Cloud Console](https://console.cloud.google.com/apis/credentials).
Now, copy the client ID and create a text file with name `google_signin_client_id` in the `back-end/secure/` directory to store it.
Replace `GOOGLE_SIGNIN_API_CLIENT_ID` with the copied client ID.
```sh
cd ijmond-camera-monitor/back-end/secret/
echo "GOOGLE_SIGNIN_API_CLIENT_ID" > google_signin_client_id
```

Also, you need to go to the [GoogleAccountDialog.js](front-end/js/GoogleAccountDialog.js) file in the front-end to update the `CLIENT_ID` variable to your copied Google client ID.
```JavaScript
var CLIENT_ID = "XXXXXXXX.apps.googleusercontent.com";
```

If you later change the domain name, remember to go to the Credentials page and change the domain name (or IP address) to the "Authorized JavaScript origins" in your OAuth client.
This makes it possible for the front-end to call the Google Identity API to get Google user tokens when users sign in.

Also, we use a different domain name "http://api.ijmondcam.multix.io" for the back-end
So we will need to go to the Credentials page and add the domain name to the "Authorised redirect URIs" in the OAuth client.
This makes it possible for the back-end to call the Google Identity API to validate the Google user tokens.

# <a name="dump-and-import-database"></a>Dump, import, and backup database
This section assumes that you want to dump the production database to a file and import it to the staging database. First, SSH to the production server and dump the database to the `/tmp/` directory.
```sh
ssh USER_NAME_PRODUCTION@SERVER_ADDRESS_PRODUCTION

# For Ubuntu
cd /tmp/
sudo -u postgres pg_dump -d ijmond_camera_monitor_production > /tmp/ijmond_camera_monitor_production.out

# For Mac OS
pg_dump -d ijmond_camera_monitor_production > /tmp/ijmond_camera_monitor_production.out

exit
```
Get the dumped database file from the production server.
```sh
rsync -av "USER_NAME_PRODUCTION@SERVER_ADDRESS_PRODUCTION:/tmp/ijmond_camera_monitor_production.out" "/tmp/"

# For specifying a port number
rsync -av -e "ssh -p PORT_NUMBER" "USER_NAME_PRODUCTION@SERVER_ADDRESS_PRODUCTION:/tmp/ijmond_camera_monitor_production.out" "/tmp/"
```
Import the dumped production database file to the staging database. Notice that you need to stop the service first to prevent an error that the database is being accessed by other users.
```sh
# For Ubuntu, stop the service
# No need for doing this on Mac OS
sudo systemctl stop ijmond-camera-monitor-staging

# For Ubuntu
sudo -u postgres psql postgres
# For Mac OS
psql postgres

# Drop the old database and create a new one
> DROP DATABASE ijmond_camera_monitor_staging;
> CREATE DATABASE ijmond_camera_monitor_staging OWNER ijmond_camera_monitor;
> \q

# Upgrade the database to the newest migration
sh db.sh upgrade

# For Ubuntu
sudo -u postgres psql postgres
# For Mac OS
psql postgres

# Drop existing database schema to prevent conflicts
> \c ijmond_camera_monitor_staging
> DROP SCHEMA public CASCADE;
> CREATE SCHEMA public;
> GRANT ALL ON SCHEMA public TO postgres;
> GRANT ALL ON SCHEMA public TO public;
> \q

# For Ubuntu
sudo -u postgres psql -d ijmond_camera_monitor_staging < /tmp/ijmond_camera_monitor_production.out
# For Mac OS
psql -d ijmond_camera_monitor_staging < /tmp/ijmond_camera_monitor_production.out

# Upgrade the database to the newest migration
sh db.sh upgrade

# For Ubuntu, start the service
# No need for doing this on Mac OS
sudo systemctl start ijmond-camera-monitor-staging
```
We provide a script to backup the database:
```sh
# For the production database
sh ijmond-camera-monitor/back-end/www/backup_db.sh production

# For the development database
sh ijmond-camera-monitor/back-end/www/backup_db.sh staging
```
You can also use crontab to backup the database automatically:
```sh
sudo crontab -e

# Add the following line for the production database
0 0 * * * cd /var/www/ijmond-camera-monitor/back-end/data/db_backup; sh ../../www/backup_db.sh production

# Add the following line for the staging database
0 0 * * * cd /var/www/ijmond-camera-monitor/back-end/data/db_backup; sh ../../www/backup_db.sh staging
```

# <a name="deploy-back-end-using-uwsgi"></a>Deploy back-end using uwsgi (administrator only)
> WARNING: this section is only for system administrators, not developers.

Install [uwsgi](https://uwsgi-docs.readthedocs.io/en/latest/) using conda.
```sh
conda activate ijmond-camera-monitor
conda install -c conda-forge uwsgi=2.0.21
```
Create a folder for server logging.
```sh
mkdir ijmond-camera-monitor/back-end/log/
```
Run the uwsgi production server and check if it works.
```sh
cd ijmond-camera-monitor/back-end/www/
sh deploy_production.sh
```
Check if the uwsgi production server works.
```sh
curl localhost:8081
```
The production server log is stored in the `back-end/log/uwsgi_production.log` file.
Refer to the [uwsgi_production.ini](back-end/www/uwsgi_production.ini) file for details.
The documentation is on the [uwsgi website](https://uwsgi-docs.readthedocs.io/en/latest/Configuration.html).
A custom log is stored in the `back-end/log/app.log` file.
```sh
# Keep printing the log files when updated
tail -f ../log/uwsgi_production.log
tail -f ../log/app.log
```
Create a service on Ubuntu, so that the uwsgi server will start automatically after rebooting the system.
We put the back-end under `/var/www/ijmond-camera-monitor/back-end/www/`, but you may need to change the path.
Replace `USERNAME` with your user name on Ubuntu.
```sh
sudo vim /etc/systemd/system/ijmond-camera-monitor-production.service
# Add the following line to this file
[Unit]
Description=uWSGI instance to serve ijmond-camera-monitor
After=network.target

[Service]
User=USERNAME
Group=www-data
WorkingDirectory=/var/www/ijmond-camera-monitor/back-end/www
Environment="PATH=/home/USERNAME/.conda/envs/ijmond-camera-monitor/bin"
ExecStart=/home/USERNAME/.conda/envs/ijmond-camera-monitor/bin/uwsgi --ini uwsgi_production.ini

[Install]
WantedBy=multi-user.target
```
Register the uwsgi production server as a service on Ubuntu.
```sh
sudo systemctl enable ijmond-camera-monitor-production
sudo systemctl start ijmond-camera-monitor-production

# Check the status of the service
sudo systemctl status ijmond-camera-monitor-production

# Restart the service
sudo systemctl restart ijmond-camera-monitor-production

# Stop and disable the service
sudo systemctl stop ijmond-camera-monitor-production
sudo systemctl disable ijmond-camera-monitor-production
```
Check if the service work.
```sh
curl localhost:8081
```
The procedure of deploying the staging server is the same as deploying the production server (with differences in replacing the "production" text with "staging")
 When the back-end code repository on the staging or production server is updated, run the following to restart the deployed service.
```sh
# Restart the uwsgi service
sudo systemctl restart ijmond-camera-monitor-production

# If error happend, check the uwsgi log files
tail -100 ijmond-camera-monitor/back-end/log/uwsgi_production.log
```

# <a name="setup-apache"></a>Setup the apache server with https (administrator only)
> WARNING: this section is only for system administrators, not developers.

Now we need to install the apache server for deploying the front-end and back-end.
Run the following to install apache2 and enable mods.
```sh
sudo apt-get install apache2
sudo apt-get install apache2-dev

sudo a2enmod headers
sudo a2enmod rewrite
sudo a2enmod ssl
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod proxy_balancer
sudo a2enmod lbmethod_byrequests
```
Next, we need to get an SSL certificate to enable https (instead of using the http, which is not secure).
Go to "https://certbot.eff.org/" and follow the instructions to install Certbot on the Ubuntu server.
Then, run the Certbot to get the SSL certificate.
```sh
sudo certbot --apache certonly
```
If you have an existing certificate and want to expand it with new domains, use the following:
```sh
sudo certbot --apache certonly --cert-name EXISTING_CERT_NAME -d EXISTING_DOMAIN -d NEW_DOMAIN

# Below is an example
sudo certbot --apache certonly --cert-name ijmondcam.multix.io -d ijmondcam.multix.io -d api.ijmondcam.multix.io
```
You can find the `EXISTING_CERT_NAME` using the following:
```sh
sudo certbot certificates
```
Copy the directories that point to the SSL certificate and its key in the terminal provided by the certbot.
We will need to use the directories later when configuring apache.
For example:
```sh
/etc/letsencrypt/live/[...]/fullchain.pem
/etc/letsencrypt/live/[...]/privkey.pem
```
You can use either the IP address or a domain name to set up the server.
Domain names can be purchased from providers such as [Google Domains](https://domains.google/), [Namecheap](https://www.namecheap.com/), [GoDaddy](https://www.godaddy.com/), [TransIP](https://www.transip.eu/), etc.
Make sure you have the DNS record configured correctly that can point these domain names to the domain (or IP address) of your Ubuntu machine.
For example, in our case, we want to use "https://ijmondcam.multix.io/" as the front-end root.
This means that our sub-domain is "ijmondcam", so we create an "A" type record (not "CNAME") with name "ijmondcam" and value "XXX.YYY.ZZZ.QQQ", where the value part points to the IP address of our machine.
Then, we want to use "https://api.ijmondcam.multix.io/" as the back-end root.
This means that our sub-domain is "api.ijmondcam", so we create an "A" type record (not "CNAME") with name "api.ijmondcam" and value "XXX.YYY.ZZZ.QQQ", where the value part points to the IP address of our machine.
Notice that you need to get SSL certificates for all the sub-domains.
So in our case, we need to run certbot for both the "ijmondcam.multix.io" and "api.ijmondcam.multix.io" domains.

### For the front-end
For the front-end, create an apache virtual host under `/etc/apache2/sites-available/`.
Replace `FRONT_END_DOMAIN` with your domain name for the front-end.
For example, we use "ijmondcam.multix.io" as the front-end domain.
We put the front-end under `/var/www/ijmond-camera-monitor/front-end/`, but you may need to change the path.
Note the "https" before the FRONT_END_DOMAIN (not "http").
Remember to use your copied directories when getting the SSL certificate for `SSLCertificateFile` and `SSLCertificateKeyFile`.
```sh
sudo vim /etc/apache2/sites-available/FRONT_END_DOMAIN.conf
# Add the following lines to this file
<VirtualHost *:443>
  ServerName FRONT_END_DOMAIN
  DocumentRoot /var/www/ijmond-camera-monitor/front-end
  # Enable https ssl support
  SSLEngine On
  # The following line enables cors
  Header always set Access-Control-Allow-Origin "*"
  # The following line forces the browser to break the cache
  Header set Cache-Control "max-age=5, public, must-revalidate"
  <Directory "/var/www/ijmond-camera-monitor/front-end">
    Options FollowSymLinks
    AllowOverride None
    Require all granted
  </Directory>
  # APACHE_LOG_DIR is /var/log/apache2/
  ErrorLog ${APACHE_LOG_DIR}/FRONT_END_DOMAIN.error.log
  CustomLog ${APACHE_LOG_DIR}/FRONT_END_DOMAIN.access.log combined
  # Add ssl
  SSLCertificateFile /etc/letsencrypt/live/[...]/fullchain.pem
  SSLCertificateKeyFile /etc/letsencrypt/live/[...]/privkey.pem
  Include /etc/letsencrypt/options-ssl-apache.conf
</VirtualHost>

<VirtualHost *:80>
  ServerName FRONT_END_DOMAIN
  # Enable the url rewriting
  RewriteEngine on
  # Redirect http to https
  RewriteRule ^ https://%{SERVER_NAME}%{REQUEST_URI} [END,NE,R=permanent]
</VirtualHost>
```
Then, create a symlink of the virtual host under `/etc/apache2/sites-enabled/` and restart the apache server.
```sh
cd /etc/apache2/sites-enabled/
sudo ln -s ../sites-available/FRONT_END_DOMAIN.conf
sudo systemctl restart apache2
```

### For the back-end
For the back-end, create an apache virtual host under `/etc/apache2/sites-available/`.
The virtual host uses reverse proxy for the uwsgi server.
Replace `BACK_END_DOMAIN` and `FRONT_END_DOMAIN` with your domain name for the back-end and the front-end respectively.
For example, we use "api.ijmondcam.multix.io" as the back-end domain, and "ijmondcam.multix.io" as the front-end domain.
```sh
sudo vim /etc/apache2/sites-available/BACK_END_DOMAIN.conf
# Add the following lines to this file
<VirtualHost *:443>
  ServerName BACK_END_DOMAIN
  # Enable https ssl support
  SSLEngine On
  # The following line enables cors for the front-end
  Header always set Access-Control-Allow-Origin "https://FRONT_END_DOMAIN"
  Header set Access-Control-Allow-Methods "POST, GET, PUT, DELETE, PATCH, OPTIONS"
  Header set Access-Control-Allow-Headers "Content-Type"
  # The following line forces the browser to break the cache
  Header set Cache-Control "max-age=5, public, must-revalidate"
  # Reverse proxy to the uwsgi server
  ProxyPreserveHost On
  ProxyRequests Off
  ProxyVia Off
  ProxyPass / http://127.0.0.1:8081/
  ProxyPassReverse / http://127.0.0.1:8081/
  # APACHE_LOG_DIR is /var/log/apache2/
  ErrorLog ${APACHE_LOG_DIR}/BACK_END_DOMAIN.error.log
  CustomLog ${APACHE_LOG_DIR}/BACK_END_DOMAIN.access.log combined
  # Add ssl
  SSLCertificateFile /etc/letsencrypt/live/[...]/fullchain.pem
  SSLCertificateKeyFile /etc/letsencrypt/live/[...]/privkey.pem
  Include /etc/letsencrypt/options-ssl-apache.conf
</VirtualHost>

<VirtualHost *:80>
  ServerName BACK_END_DOMAIN
  # Enable the url rewriting
  RewriteEngine on
  # Redirect http to https
  RewriteRule ^ https://%{SERVER_NAME}%{REQUEST_URI} [END,NE,R=permanent]
</VirtualHost>
```
Then, create a symlink of the virtual host under "/etc/apache2/sites-enabled/" and restart the apache server.
```sh
cd /etc/apache2/sites-enabled/
sudo ln -s ../sites-available/BACK_END_DOMAIN.conf
sudo systemctl restart apache2
```

# <a name="setup-google-analytics"></a>Setup Google Analytics (administrator only)
> WARNING: this section is only for system administrators, not developers.
> IMPORTANT: do not use the measurement ID in the `getGoogleAnalyticsId()` function in the [GoogleAnalyticsTracker.js](front-end/js/GoogleAnalyticsTracker.js) file.

Go to [this Google Analytics support page](https://support.google.com/analytics/answer/9304153) and follow the instructions to set up a Google Analytics property and a data stream.
Remember to turn the "Enhanced measurement" off since we do not need the advanced features.
After that, [get the Measurement ID](https://support.google.com/analytics/answer/9539598) and paste it into the `getGoogleAnalyticsId()` function in the [GoogleAnalyticsTracker.js](front-end/js/GoogleAnalyticsTracker.js) file.
Then, the tracker script will load Google's global site tag (`gtag.js`), set custom dimensions, and send the initial page view to the Google Analytics property.
Note that it is better to have different data steams for development, staging, and production environments, where you can put different Measurement IDs in the `getGoogleAnalyticsId()` function in the tracker script.

# <a name="prepare-gold-standards"></a>Prepare gold standards for quality check (administrator only)
> WARNING: this section is only for system administrators, not developers.

The system uses gold standards (videos with known labels) to check the quality of each labeled batch.
If a user did not label the gold standards correctly, the corresponding batch would be discarded.
Initially, there are no gold standards, and the backend will not return videos for labeling.
To solve this issue, give yourself the admin permission by using:
```sh
python set_client_type.py USER_ID 0
```
where `USER_ID` can be found on the "Account" tab on the top right of the `label.html` page after logging in with Google.
The number 0 that follows the user_id is the admin permission.
For more information about the permission, please refer to the `client_type` variable in the `User` class in the [models.py](back-end/www/models/model.py) file.
The system will not run the quality check for users with the admin permission. In this way, you can start labeling first.

To assign gold standards videos, go to the `gallery.html` page when logging in with the account that has the admin permission.
On the gallery, you will find "P*" and "N*" buttons.
Clicking on these buttons shows the positive and negative videos that the admin labeled.
You can now use the dropdown below each video to change the label to Gold Pos (positive gold standards) or Gold Neg (negative gold standards).
Once there is a sufficient number of gold standards (more than 4), normal users will be able to label videos.
I recommend having at least 100 gold standards to start.

If you found that some videos are not suitable for labeling (e.g., due to incorrect image stitching), you can get the url of the video and use the following command to mark similar ones (with the same date and bounding box) as "bad" videos.
This process does not remove videos.
Instead it gives all bad videos a label state -2.
```sh
python mark_bad_videos.py [video_url]
```
