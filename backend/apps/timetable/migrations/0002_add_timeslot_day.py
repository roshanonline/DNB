# Generated migration to add 'day' field to TimeSlot
from django.db import migrations, models


def add_day_field(apps, schema_editor):
    TimeSlot = apps.get_model('timetable', 'TimeSlot')
    # existing rows will keep default 'Monday'

class Migration(migrations.Migration):

    dependencies = [
        ('timetable', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='timeslot',
            name='day',
            field=models.CharField(default='Monday', max_length=20, choices=[('Monday', 'Monday'), ('Tuesday', 'Tuesday'), ('Wednesday', 'Wednesday'), ('Thursday', 'Thursday'), ('Friday', 'Friday'), ('Saturday', 'Saturday')]),
        ),
        migrations.AlterUniqueTogether(
            name='timeslot',
            unique_together={('batch', 'day', 'slot_number')},
        ),
    ]
