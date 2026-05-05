"""Reminders Views"""
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.validators import validate_email as django_validate_email
from django.core.exceptions import ValidationError as DjangoValidationError
import logging

from .models import Reminder
from .serializers import ReminderSerializer

logger = logging.getLogger(__name__)


class ReminderListCreateView(generics.ListCreateAPIView):
    serializer_class = ReminderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Reminder.objects.filter(user=self.request.user).select_related('notice')

    def perform_create(self, serializer):
        # Auto-fill email from user profile if not provided
        email = (self.request.data.get('email', '') or self.request.user.email or '').strip()
        if email:
            try:
                django_validate_email(email)
            except DjangoValidationError:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({'email': 'Enter a valid email address.'})
        # Save with status=PENDING — APScheduler will send at the scheduled time
        serializer.save(user=self.request.user, email=email)
        logger.info(f'Reminder scheduled for {email}')


class ReminderDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ReminderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Reminder.objects.filter(user=self.request.user)
