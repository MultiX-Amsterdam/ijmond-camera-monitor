**INSTRUCTIONS**

For the questionnaire we use Qualtrics. It is the optimal tool as it allows us to pass parameters from our app to the questionnaire we designed via the tool. While the feature is already implemented if you want to pass the user_id parameter, you can use the instructions from this link https://www.qualtrics.com/support/survey-platform/survey-module/survey-flow/standard-elements/passing-information-through-query-strings/ , to understand how to support extra parameters.

**HOW TO INSTALL**

Insert Achievements in the DB manually: 1st enter the Tutorial Finisher, then the Pro, then the Quiz Finisher, and then the Pro. You can use whichever name you wish, but the order is important due to the use of their ID in the SQL scripts. The Season Champion Achievements are added automatically.

We have schedulers for tasks using Celery. The steps to have the setup ready are:

1) Install Celery and supervisor (already done if you used the install_packages.sh) Otherwise pip install celery
pip install supervisor

2) Install rabbitmq by following the instructions on the official rabbitmq page here https://www.rabbitmq.com/docs/download; it will be our broker for Celery

3) Setup the rabbitmq with Celery: 
```
sudo rabbitmqctl add_user myuser mypassword
sudo rabbitmqctl add_vhost myvhost
sudo rabbitmqctl set_user_tags myuser mytag
sudo rabbitmqctl set_permissions -p myvhost myuser ".*" ".*" ".*"
```

4) Add this: 
```
loopback_users.guest = false
listeners.tcp.default = 5672
consumer_timeout = 31622400000
```
in /etc/rabbitmq/rabbitmq.conf . The conf does not exist; we add it first.

5) Start rabbitmq-server: ``sudo systemctl start rabbitmq-server`` (``sudo systemctl status rabbitmq-server`` to make sure it's starting)

6) In the secret folder, create celery_credentials.ini and add 
```
[broker]
user = usersetatrabbit
password = passwordsetatrabbit
host = localhost
port = 5672
vhost = myvhostsetatrabbit
```

Then do: ``chmod 644 secret/celery_credentials.ini``

7) Create a directory named celery in /var/log/

Then do: ``sudo chown pcusername:pcusername /var/log/celery`` and replace the pcusername with the system's username

8) At /etc/supervisor/conf.d, add celery.conf with this: 
```
[program:celery_worker]
command=path-of-celery -A celery_config.celery worker --loglevel=info --concurrency=4
directory=absolute-project-directory
user=system-username
numprocs=1
stdout_logfile=/var/log/celery/celery_worker.log
stderr_logfile=/var/log/celery/celery_worker_err.log
autostart=true
autorestart=true
startsecs=10
stopwaitsecs=600
priority=998
```
Do ``which celery`` to know your path-of-celery
Replace the command, directory, and user with the appropriate fields

9) Do:
```
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl restart celery_worker (or start if not started yet)
sudo supervisorctl status celery_worker (to check if all is ok)
```

10) Extra if you want to review the worker and the tasks, you do:
```
pip install flower
Navigate to backend/www
celery -A celery_config.celery flower
And then it will be available at http://localhost:5555/
```

11) i) To schedule a new season:
Navigate to backend/www
Do ``python -m cron.tasks "start-date" "end-date"`` (example usage: ``python -m cron.tasks "2024-05-15 18:20" "2024-05-15 18:21"``)

11) ii) To change the start or the end date of the season:
Do ``python -m cron.tasks --fix "start-date" "end-date"`` (``python -m cron.tasks --fix "2024-05-15 18:20" "2024-05-15 18:20"``)
