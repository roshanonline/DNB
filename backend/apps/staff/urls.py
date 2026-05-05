from django.urls import path

from .views import (
    health_check,
    list_activity,
    list_notices,
    login,
    logout,
    mark_notice_read,
    session_info,
    list_reminders,
    create_reminder,
    update_reminder,
    delete_reminder,
    seed_notices,
)

urlpatterns = [
    path('health', health_check, name='staff-health'),
    path('login', login, name='staff-login'),
    path('logout', logout, name='staff-logout'),
    path('session', session_info, name='staff-session'),
    path('notices', list_notices, name='staff-notices'),
    path('notices/seed', seed_notices, name='staff-notices-seed'),
    path('notices/<int:notice_id>/read', mark_notice_read, name='staff-notice-read'),
    path('login-activity', list_activity, name='staff-login-activity'),
    path('reminders', list_reminders, name='staff-reminders'),
    path('reminders/create', create_reminder, name='staff-create-reminder'),
    path('reminders/<int:reminder_id>', update_reminder, name='staff-update-reminder'),
    path('reminders/<int:reminder_id>/delete', delete_reminder, name='staff-delete-reminder'),
]
