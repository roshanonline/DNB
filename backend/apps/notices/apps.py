from django.apps import AppConfig


class NoticesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.notices'

    def ready(self):
        """Activate SQLite WAL mode on every new connection.

        (The old DistilBERT model pre-warm was removed – the search engine
        is now pure-Python and needs no warmup.)
        """
        from django.db.backends.signals import connection_created

        def _sqlite_wal(sender, connection, **kwargs):
            if connection.vendor == 'sqlite':
                cur = connection.cursor()
                cur.execute('PRAGMA journal_mode=WAL;')
                cur.execute('PRAGMA synchronous=NORMAL;')
                cur.execute('PRAGMA cache_size=10000;')

        connection_created.connect(_sqlite_wal)
