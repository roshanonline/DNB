from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, NotificationPrefs, RiskTable


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'role', 'department', 'is_active']
    list_filter = ['role', 'department', 'is_active']
    fieldsets = UserAdmin.fieldsets + (
        ('SmartBoard 360', {'fields': ('role', 'department', 'phone', 'roll_number', 'bio', 'avatar')}),
    )


@admin.register(NotificationPrefs)
class NotificationPrefsAdmin(admin.ModelAdmin):
    list_display = ['user', 'exam', 'event', 'academic', 'holiday', 'placement']


@admin.register(RiskTable)
class RiskTableAdmin(admin.ModelAdmin):
    list_display = ['user', 'risk_score', 'risk_level', 'missed_deadlines', 'updated_at']
    list_filter = ['risk_level']
