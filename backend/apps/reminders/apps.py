from django.apps import AppConfig


class RemindersConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.reminders'

    def ready(self):
        """Start the APScheduler when Django starts (not during migrations)."""
        import os
        # Only start in the main process (avoid double-start with reloader)
        if os.environ.get('RUN_MAIN', 'false') == 'true' or not os.environ.get('RUN_MAIN'):
            from .tasks import start_scheduler
            start_scheduler()
