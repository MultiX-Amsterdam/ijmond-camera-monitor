from celery import Celery
import configparser

def make_celery():
    config = configparser.ConfigParser()
    config_path = '../secret/celery_credentials.ini'
    config.read(config_path)

    broker_user = config.get('broker', 'user')
    broker_pass = config.get('broker', 'password')
    broker_host = config.get('broker', 'host')
    broker_port = config.get('broker', 'port')
    broker_vhost = config.get('broker', 'vhost')
    broker_url = f'amqp://{broker_user}:{broker_pass}@{broker_host}:{broker_port}/{broker_vhost}'
    celery = Celery(
        'celery_worker',
        broker=broker_url,
    )

    # Custom settings can be configured here as needed
    celery.conf.update(
        task_serializer='json',
        accept_content=['json'],
        result_serializer='json',
        timezone='Europe/Amsterdam',
    )

    return celery

celery = make_celery()
celery.autodiscover_tasks(['cron'], force=True)
