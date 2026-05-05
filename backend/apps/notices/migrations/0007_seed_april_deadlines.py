from django.db import migrations
from datetime import date
import random


# Fixed seed so the same random dates are reproduced on every run
_RNG = random.Random(2026_04_01)


def set_april_deadlines(apps, schema_editor):
    Notice = apps.get_model('notices', 'Notice')
    notices = Notice.objects.all()
    for notice in notices:
        notice.deadline = date(2026, 4, _RNG.randint(1, 30))
        notice.save(update_fields=['deadline'])
    print(f'\n  Set April 2026 deadlines for {notices.count()} notices.')


def reverse_noop(apps, schema_editor):
    # Reversing this is a no-op — we don't restore old deadline values
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('notices', '0006_notice_internship_targetyear'),
    ]

    operations = [
        migrations.RunPython(set_april_deadlines, reverse_noop),
    ]
