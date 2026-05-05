from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('timetable', '0005_merge_20260502_0915'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='subject',
            name='periods_per_week',
        ),
        migrations.RemoveField(
            model_name='subject',
            name='is_continuous',
        ),
    ]