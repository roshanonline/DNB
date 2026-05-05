from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notices', '0005_alter_usernotification_notification_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='notice',
            name='target_year',
            field=models.CharField(
                choices=[
                    ('ALL', 'All Years'),
                    ('1', '1st Year'),
                    ('2', '2nd Year'),
                    ('3', '3rd Year'),
                    ('4', 'Final Year'),
                ],
                default='ALL',
                help_text='Academic year this notice targets (ALL = all years)',
                max_length=5,
            ),
        ),
        migrations.AlterField(
            model_name='notice',
            name='category',
            field=models.CharField(
                choices=[
                    ('Academic', 'Academic'),
                    ('Exam', 'Exam'),
                    ('Event', 'Event'),
                    ('Placement', 'Placement'),
                    ('Holiday', 'Holiday'),
                    ('Scholarship', 'Scholarship'),
                    ('Workshop', 'Workshop'),
                    ('Internship', 'Internship'),
                    ('General', 'General'),
                ],
                default='General',
                max_length=30,
            ),
        ),
    ]
