from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0005_user_year_dob'),
    ]

    operations = [
        migrations.AddField(
            model_name='notificationprefs',
            name='scholarship',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='notificationprefs',
            name='internship',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='notificationprefs',
            name='workshop',
            field=models.BooleanField(default=True),
        ),
    ]
