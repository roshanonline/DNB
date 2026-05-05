"""
Notices App – Core Models
Tables: notices, engagement_logs, bookmarks, system_notifications, saved_notices
"""
import os
from django.db import models
from django.conf import settings


class Notice(models.Model):
    CATEGORY_CHOICES = [
        ('Academic', 'Academic'),
        ('Exam', 'Exam'),
        ('Event', 'Event'),
        ('Placement', 'Placement'),
        ('Holiday', 'Holiday'),
        ('Scholarship', 'Scholarship'),
        ('Workshop', 'Workshop'),
        ('Internship', 'Internship'),
        ('General', 'General'),
    ]
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]
    PRIORITY_CHOICES = [
        ('LOW', 'Low'),
        ('MEDIUM', 'Medium'),
        ('HIGH', 'High'),
        ('URGENT', 'Urgent'),
    ]
    DEPARTMENT_CHOICES = [
        ('CSE', 'CSE'), ('ECE', 'ECE'), ('EEE', 'EEE'),
        ('MECH', 'MECH'), ('CIVIL', 'CIVIL'), ('ALL', 'All'),
        ('INSTITUTION', 'Institution'),
    ]
    DEPARTMENT_TYPE_CHOICES = [
        ('Your Department', 'Your Department'),
        ('Institution', 'Institution'),
        ('Other Department', 'Other Department'),
    ]
    TARGET_YEAR_CHOICES = [
        ('ALL', 'All Years'),
        ('1', '1st Year'),
        ('2', '2nd Year'),
        ('3', '3rd Year'),
        ('4', 'Final Year'),
    ]

    # CSV-sourced identifier
    notice_id = models.IntegerField(null=True, blank=True, db_index=True)
    department_type = models.CharField(
        max_length=30, choices=DEPARTMENT_TYPE_CHOICES,
        blank=True, default=''
    )

    title = models.CharField(max_length=255)
    description = models.TextField()
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='General')
    department = models.CharField(max_length=15, choices=DEPARTMENT_CHOICES, default='ALL')
    deadline = models.DateField(null=True, blank=True)
    target_year = models.CharField(
        max_length=5, choices=TARGET_YEAR_CHOICES, default='ALL',
        help_text='Academic year this notice targets (ALL = all years)'
    )
    thumbnail = models.CharField(max_length=255, blank=True, default='')
    banner_image = models.ImageField(upload_to='banners/', null=True, blank=True)

    # File attachment references (filename strings from CSV)
    image_file = models.CharField(max_length=255, blank=True, default='')
    video_file = models.CharField(max_length=255, blank=True, default='')
    pdf_file = models.CharField(max_length=255, blank=True, default='')
    audio_file = models.CharField(max_length=255, blank=True, default='')
    excel_file = models.CharField(max_length=255, blank=True, default='')
    ppt_file = models.CharField(max_length=255, blank=True, default='')
    csv_file = models.CharField(max_length=255, blank=True, default='')

    priority_score = models.FloatField(default=0.0)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='MEDIUM')
    is_featured = models.BooleanField(default=False)
    is_urgent = models.BooleanField(default=False)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    view_count = models.IntegerField(default=0)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_notices'
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='approved_notices'
    )
    created_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'notices'
        ordering = ['-priority_score', '-created_at']

    def __str__(self):
        return f'{self.title} ({self.department})'

    @property
    def days_remaining(self):
        if not self.deadline:
            return None
        from datetime import date
        delta = self.deadline - date.today()
        return delta.days


class StaffNotice(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    CATEGORY_CHOICES = Notice.CATEGORY_CHOICES
    DEPARTMENT_CHOICES = Notice.DEPARTMENT_CHOICES

    title = models.CharField(max_length=255)
    description = models.TextField()
    full_content = models.TextField(blank=True, default='')
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='General')
    department = models.CharField(max_length=15, choices=DEPARTMENT_CHOICES, default='ALL')
    is_urgent = models.BooleanField(default=False)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_staff_notices'
    )
    hod_status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    admin_status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    hod_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='hod_approved_staff_notices'
    )
    admin_approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='admin_approved_staff_notices'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'staff_notices'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} ({self.department})'


class EngagementLog(models.Model):
    """Tracks student interactions with notices."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='engagement_logs'
    )
    notice = models.ForeignKey(Notice, on_delete=models.CASCADE, related_name='engagements')
    viewed = models.BooleanField(default=False)
    downloaded = models.BooleanField(default=False)
    bookmarked = models.BooleanField(default=False)
    shared = models.BooleanField(default=False)
    view_time = models.FloatField(default=0.0)   # seconds spent on page
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'engagement_logs'

    def __str__(self):
        return f'{self.user.username} → {self.notice.title}'


class Bookmark(models.Model):
    """Saved / bookmarked notices per user."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='bookmarks'
    )
    notice = models.ForeignKey(Notice, on_delete=models.CASCADE, related_name='bookmarks')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'bookmarks'
        unique_together = ('user', 'notice')

    def __str__(self):
        return f'{self.user.username} bookmarked {self.notice.title}'


class SavedNotice(models.Model):
    """Saved notices (different from bookmarks – front-end uses both)."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='saved_notices'
    )
    notice = models.ForeignKey(Notice, on_delete=models.CASCADE, related_name='saves')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'saved_notices'
        unique_together = ('user', 'notice')


class SystemNotification(models.Model):
    """Broadcast notifications stored in DB."""
    notice = models.ForeignKey(Notice, on_delete=models.CASCADE, null=True, blank=True)
    message = models.TextField()
    target_role = models.CharField(max_length=20, default='ALL')
    target_department = models.CharField(max_length=10, default='ALL')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'system_notifications'
        ordering = ['-created_at']

    def __str__(self):
        return self.message[:60]


def attachment_upload_path(instance, filename):
    """Upload attachments to media/attachments/<notice_id>/filename"""
    return f'attachments/{instance.notice_id}/{filename}'


class NoticeAttachment(models.Model):
    """File attachments for notices: PDF, image, audio, video, CSV, Excel, PPT."""
    FILE_TYPE_CHOICES = [
        ('PDF',   'PDF Document'),
        ('IMAGE', 'Image'),
        ('AUDIO', 'Audio'),
        ('VIDEO', 'Video'),
        ('CSV',   'CSV Spreadsheet'),
        ('EXCEL', 'Excel Spreadsheet'),
        ('PPT',   'PowerPoint'),
        ('OTHER', 'Other'),
    ]

    notice = models.ForeignKey(
        Notice, on_delete=models.CASCADE, related_name='attachments'
    )
    file = models.FileField(upload_to=attachment_upload_path)
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=10, choices=FILE_TYPE_CHOICES, default='OTHER')
    file_size = models.PositiveIntegerField(default=0)  # bytes
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, related_name='uploaded_attachments'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notice_attachments'
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        # Auto-detect file_type from extension
        if self.file and not self.file_type or self.file_type == 'OTHER':
            ext = os.path.splitext(self.file.name)[1].lower()
            self.file_type = {
                '.pdf':  'PDF',
                '.jpg': 'IMAGE', '.jpeg': 'IMAGE', '.png': 'IMAGE',
                '.gif': 'IMAGE', '.webp': 'IMAGE', '.svg': 'IMAGE',
                '.mp3': 'AUDIO', '.wav': 'AUDIO', '.ogg': 'AUDIO', '.m4a': 'AUDIO',
                '.mp4': 'VIDEO', '.avi': 'VIDEO', '.mov': 'VIDEO', '.mkv': 'VIDEO',
                '.csv': 'CSV',
                '.xls': 'EXCEL', '.xlsx': 'EXCEL',
                '.ppt': 'PPT',   '.pptx': 'PPT',
            }.get(ext, 'OTHER')
        if self.file and not self.file_name:
            self.file_name = os.path.basename(self.file.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.file_name} → {self.notice.title[:40]}'

    @property
    def file_url(self):
        if self.file:
            return self.file.url
        return None

    @property
    def file_size_display(self):
        if self.file_size < 1024:
            return f'{self.file_size} B'
        elif self.file_size < 1024 * 1024:
            return f'{self.file_size / 1024:.1f} KB'
        return f'{self.file_size / (1024 * 1024):.1f} MB'


class UserNotification(models.Model):
    """Per-user inbox notifications generated from notices and broadcasts."""
    TYPE_CHOICES = [
        ('NEW_NOTICE',   'New Notice'),
        ('DEADLINE',     'Deadline Reminder'),
        ('BROADCAST',    'Broadcast'),
        ('APPROVED',     'Notice Approved'),
        ('REJECTED',     'Notice Rejected'),
        ('SYSTEM',       'System Message'),
        ('STUDENT_REG',  'New Student Registration'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='notifications'
    )
    notice = models.ForeignKey(
        Notice, on_delete=models.CASCADE,
        null=True, blank=True, related_name='user_notifications'
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=20, choices=TYPE_CHOICES, default='NEW_NOTICE'
    )
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_notifications'
        ordering = ['-created_at']

    def __str__(self):
        return f'[{self.notification_type}] {self.user.username}: {self.title[:40]}'
