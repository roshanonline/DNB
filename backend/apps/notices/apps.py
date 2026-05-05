from django.apps import AppConfig
import os


class NoticesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.notices'

    def ready(self):
        """Pre-warm the DistilBERT model and activate SQLite WAL mode."""
        # Enable Write-Ahead Logging on every new SQLite connection.
        # WAL allows concurrent reads + one writer without blocking.
        from django.db.backends.signals import connection_created

        def _sqlite_wal(sender, connection, **kwargs):
            if connection.vendor == 'sqlite':
                connection.cursor().execute('PRAGMA journal_mode=WAL;')
                connection.cursor().execute('PRAGMA synchronous=NORMAL;')
                connection.cursor().execute('PRAGMA cache_size=10000;')

        connection_created.connect(_sqlite_wal)

        if os.environ.get('RUN_MAIN') != 'true':
            return
        self._warmup_ml_models()

    @staticmethod
    def _warmup_ml_models():
        import threading

        def _load():
            try:
                from apps.notices.ml.search_engine import _get_model
                _get_model()          # loads paraphrase-MiniLM-L3-v2 into memory
            except Exception:
                pass  # never crash the server on warmup failure

        t = threading.Thread(target=_load, daemon=True, name='ml-warmup')
        t.start()

