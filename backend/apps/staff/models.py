from django.db import models
from django.utils import timezone


class StaffUser(models.Model):
    staff_id = models.CharField(max_length=64, unique=True)
    password = models.CharField(max_length=255)

    class Meta:
        db_table = 'staff_users'

    def __str__(self):
        return self.staff_id


class StaffLoginActivity(models.Model):
    staff_id = models.CharField(max_length=64)
    login_time = models.DateTimeField()
    logout_time = models.DateTimeField(null=True, blank=True)
    ip_address = models.CharField(max_length=45, blank=True, default='')
    device_type = models.CharField(max_length=50, blank=True, default='')
    browser = models.CharField(max_length=120, blank=True, default='')
    session_id = models.CharField(max_length=255, blank=True, default='')
    login_status = models.CharField(max_length=10, default='SUCCESS')
    failure_reason = models.CharField(max_length=120, blank=True, default='')
    location = models.CharField(max_length=120, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'login_activity'
        ordering = ['-id']
        indexes = [
            models.Index(fields=['staff_id', 'login_time'], name='staff_login_staff_i_3df0f2_idx'),
            models.Index(fields=['login_time'], name='staff_login_login_t_303cd5_idx'),
        ]


class StaffReminder(models.Model):
    STATUS_CHOICES = [
        ('unsent', 'Unsent'),
        ('sent', 'Sent'),
        ('completed', 'Completed'),
    ]
    
    staff_id = models.CharField(max_length=64)
    reminder_date = models.CharField(max_length=10)  # YYYY-MM-DD format
    reminder_time = models.CharField(max_length=5)   # HH:MM format
    reminder_note = models.TextField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='unsent')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'staff_reminders'
        ordering = ['reminder_date', 'reminder_time']
    
    def __str__(self):
        return f'{self.staff_id} - {self.reminder_date} {self.reminder_time}'
