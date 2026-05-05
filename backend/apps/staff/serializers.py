from rest_framework import serializers
from .models import StaffReminder


class StaffReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffReminder
        fields = ['id', 'reminder_date', 'reminder_time', 'reminder_note', 'status', 'created_at']
