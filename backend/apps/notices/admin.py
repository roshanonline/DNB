from django.contrib import admin
from .models import Notice, EngagementLog, Bookmark, SavedNotice, SystemNotification


@admin.register(Notice)
class NoticeAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'department', 'priority', 'status', 'view_count', 'created_at']
    list_filter = ['category', 'department', 'priority', 'status']
    search_fields = ['title', 'description']
    ordering = ['-created_at']
    readonly_fields = ['priority_score', 'view_count', 'created_at', 'updated_at']

    actions = ['approve_notices', 'reject_notices']

    def approve_notices(self, request, queryset):
        queryset.update(status='APPROVED', approved_by=request.user)
    approve_notices.short_description = 'Approve selected notices'

    def reject_notices(self, request, queryset):
        queryset.update(status='REJECTED')
    reject_notices.short_description = 'Reject selected notices'


@admin.register(EngagementLog)
class EngagementLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'notice', 'viewed', 'downloaded', 'bookmarked', 'view_time']


@admin.register(Bookmark)
class BookmarkAdmin(admin.ModelAdmin):
    list_display = ['user', 'notice', 'created_at']


@admin.register(SystemNotification)
class SystemNotificationAdmin(admin.ModelAdmin):
    list_display = ['message', 'target_department', 'created_at']
    ordering = ['-created_at']
