from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('timetable', '0003_timeslot_room_staff'),
    ]

    operations = [
        migrations.AddField(
            model_name='timeslot',
            name='subject_name',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
