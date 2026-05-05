"""Reminders Serializers"""
import pytz
from django.utils import timezone
from django.core.validators import validate_email as django_validate_email
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from .models import Reminder
from apps.notices.serializers import NoticeSerializer

IST = pytz.timezone('Asia/Kolkata')


class ReminderSerializer(serializers.ModelSerializer):
    notice = NoticeSerializer(read_only=True)
    notice_id = serializers.IntegerField(write_only=True, source='notice')

    class Meta:
        model = Reminder
        fields = [
            'id', 'notice', 'notice_id',
            'reminder_datetime', 'email', 'message',
            'status', 'created_at',
        ]
        read_only_fields = ['user', 'status', 'created_at']
        extra_kwargs = {'email': {'required': False, 'allow_blank': True}}

    def validate_email(self, value):
        # If no email provided, it will be auto-filled from the authenticated user's email.
        if value is None:
            return ''
        cleaned = value.strip()
        if cleaned == '':
            return ''
        try:
            django_validate_email(cleaned)
        except DjangoValidationError:
            raise serializers.ValidationError('Enter a valid email address.')
        return cleaned

    def validate_reminder_datetime(self, value):
        """Make sure naive datetimes are treated as IST (Asia/Kolkata)."""
        if timezone.is_naive(value):
            value = IST.localize(value)
        return value

    def create(self, validated_data):
        notice_id = validated_data.pop('notice')
        from apps.notices.models import Notice
        notice = Notice.objects.get(pk=notice_id)
        return Reminder.objects.create(notice=notice, **validated_data)

