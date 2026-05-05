from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('timetable', '0002_add_timeslot_day'),
    ]

    operations = [
        migrations.AddField(
            model_name='timeslot',
            name='room_name',
            field=models.CharField(blank=True, max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='timeslot',
            name='staff_name',
            field=models.CharField(blank=True, max_length=255, null=True),
        ),
    ]
