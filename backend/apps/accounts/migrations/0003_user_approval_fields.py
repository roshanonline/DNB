from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_user_initial_password'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='is_approved',
            field=models.BooleanField(
                default=True,
                help_text='Set False for new student registrations until department approves',
            ),
        ),
        migrations.AddField(
            model_name='user',
            name='registration_notification_sent',
            field=models.BooleanField(
                default=True,
                help_text='True once the dept registration-notification has been dispatched',
            ),
        ),
    ]
