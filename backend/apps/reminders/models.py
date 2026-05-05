"""
Reminders App – Database Model
Table: reminders
"""
from django.db import models
from django.conf import settings


class Reminder(models.Model):
    STATUS_CHOICES = [('PENDING', 'Pending'), ('SENT', 'Sent'), ('CANCELLED', 'Cancelled')]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='reminders'
    )
    notice = models.ForeignKey(
        'notices.Notice', on_delete=models.CASCADE, related_name='reminders'
    )
    reminder_datetime = models.DateTimeField()
    email = models.EmailField()              # email to send reminder to
    message = models.TextField(blank=True, default='')
    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'reminders'
        ordering = ['reminder_datetime']

    def __str__(self):
        return f'Reminder({self.user.username}, {self.notice.title[:30]}, {self.reminder_datetime})'
