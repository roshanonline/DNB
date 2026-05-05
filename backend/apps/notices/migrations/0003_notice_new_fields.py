# Migration: add notice_id, department_type and all file attachment fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notices', '0002_usernotification_noticeattachment'),
    ]

    operations = [
        # notice_id – CSV source identifier
        migrations.AddField(
            model_name='notice',
            name='notice_id',
            field=models.IntegerField(blank=True, db_index=True, null=True),
        ),
        # department_type: "Your Department" | "Institution" | "Other Department"
        migrations.AddField(
            model_name='notice',
            name='department_type',
            field=models.CharField(blank=True, default='', max_length=30),
        ),
        # Attachment filename columns
        migrations.AddField(
            model_name='notice',
            name='image_file',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='notice',
            name='video_file',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='notice',
            name='audio_file',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='notice',
            name='excel_file',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='notice',
            name='ppt_file',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='notice',
            name='csv_file',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        # Allow department to be longer (INSTITUTION)
        migrations.AlterField(
            model_name='notice',
            name='department',
            field=models.CharField(default='ALL', max_length=15),
        ),
        # Make created_at nullable so CSV-imported values can be set explicitly
        migrations.AlterField(
            model_name='notice',
            name='created_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
