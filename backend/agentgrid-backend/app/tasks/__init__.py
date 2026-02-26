"""
Background tasks using Celery
"""
from celery import Celery
from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    'agentgrid',
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        'app.tasks.knowledge',
        'app.tasks.metrics',
    ]
)

# Celery configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes
    task_soft_time_limit=240,  # 4 minutes
)

# Periodic tasks
celery_app.conf.beat_schedule = {
    'aggregate-daily-metrics': {
        'task': 'app.tasks.metrics.aggregate_daily_metrics',
        'schedule': 3600.0,  # Every hour
    },
}
