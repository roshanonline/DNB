from django.contrib.auth.hashers import make_password
from django.db import migrations


def create_default_staff(apps, schema_editor):
    StaffUser = apps.get_model('staff', 'StaffUser')
    StaffUser.objects.get_or_create(
        staff_id='STAFF-CSE-2026-001',
        defaults={'password': make_password('kar@123')},
    )


def noop(apps, schema_editor):
    return


class Migration(migrations.Migration):

    dependencies = [
        ('staff', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(create_default_staff, noop),
    ]
