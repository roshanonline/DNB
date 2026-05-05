from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='StaffUser',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('staff_id', models.CharField(max_length=64, unique=True)),
                ('password', models.CharField(max_length=255)),
            ],
            options={
                'db_table': 'staff_users',
            },
        ),
        migrations.CreateModel(
            name='StaffLoginActivity',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('staff_id', models.CharField(max_length=64)),
                ('login_time', models.DateTimeField()),
                ('logout_time', models.DateTimeField(blank=True, null=True)),
            ],
            options={
                'db_table': 'login_activity',
                'ordering': ['-id'],
            },
        ),
    ]
