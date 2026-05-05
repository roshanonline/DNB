from django.contrib import admin
from .models import Reminder


@admin.register(Reminder)
class ReminderAdmin(admin.ModelAdmin):
    list_display = ['user', 'notice', 'reminder_datetime', 'email', 'status', 'created_at']
    list_filter = ['status']
    search_fields = ['user__username', 'email', 'notice__title']
    ordering = ['reminder_datetime']
    readonly_fields = ['created_at']

    actions = ['mark_pending', 'mark_sent']

    def mark_pending(self, request, queryset):
        queryset.update(status='PENDING')
    mark_pending.short_description = 'Reset to PENDING'

    def mark_sent(self, request, queryset):
        queryset.update(status='SENT')
    mark_sent.short_description = 'Mark as SENT'
