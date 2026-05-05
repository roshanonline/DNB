from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        ('notices', '0007_seed_april_deadlines'),
    ]

    operations = [
        migrations.CreateModel(
            name='StaffNotice',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('description', models.TextField()),
                ('full_content', models.TextField(blank=True, default='')),
                ('category', models.CharField(choices=[('Academic', 'Academic'), ('Exam', 'Exam'), ('Event', 'Event'), ('Placement', 'Placement'), ('Holiday', 'Holiday'), ('Scholarship', 'Scholarship'), ('Workshop', 'Workshop'), ('Internship', 'Internship'), ('General', 'General')], default='General', max_length=30)),
                ('department', models.CharField(choices=[('CSE', 'CSE'), ('ECE', 'ECE'), ('EEE', 'EEE'), ('MECH', 'MECH'), ('CIVIL', 'CIVIL'), ('ALL', 'All'), ('INSTITUTION', 'Institution')], default='ALL', max_length=15)),
                ('is_urgent', models.BooleanField(default=False)),
                ('hod_status', models.CharField(choices=[('PENDING', 'Pending'), ('APPROVED', 'Approved'), ('REJECTED', 'Rejected')], default='PENDING', max_length=10)),
                ('admin_status', models.CharField(choices=[('PENDING', 'Pending'), ('APPROVED', 'Approved'), ('REJECTED', 'Rejected')], default='PENDING', max_length=10)),
                ('approved_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('admin_approved_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='admin_approved_staff_notices', to=settings.AUTH_USER_MODEL)),
                ('created_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_staff_notices', to=settings.AUTH_USER_MODEL)),
                ('hod_approved_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='hod_approved_staff_notices', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'db_table': 'staff_notices',
                'ordering': ['-created_at'],
            },
        ),
    ]
