"""Notices URL Configuration"""
from django.urls import path
from .views import (
    NoticeListCreateView, NoticeDetailView,
    EngageView, EngagementListView,
    BookmarkToggleView, BookmarkListView,
    SaveToggleView, SavedListView,
    StudentDashboardView, DepartmentStatsView,
    AdminStatsView, ApproveNoticeView,
    BroadcastView, SystemNotificationListView,
    UserNotificationListView, UserNotificationMarkReadView,
    NoticeAttachmentView,
    StudentNoticesView, StudentNoticeViewIncrement,
    StaffNoticeCreateView, StaffNoticePendingHodView,
    StaffNoticeApproveHodView, StaffNoticePendingAdminView,
    StaffNoticeApproveAdminView,
    # ── 4 ML algorithms ──────────────────────────────────────────────
    SmartSearchView,          # DistilBERT semantic search
    RecommendedNoticesView,   # Matrix Factorization (SVD)

    RetrainMLView,            # Admin: retrain LightGBM + SVD
)

urlpatterns = [
    # ── Notice CRUD ───────────────────────────────────────────────────
    path('', NoticeListCreateView.as_view(), name='notice-list'),
    path('<int:pk>/', NoticeDetailView.as_view(), name='notice-detail'),

    # ── Engagement ────────────────────────────────────────────────────
    path('<int:pk>/engage/', EngageView.as_view(), name='engage'),
    path('engagement/', EngagementListView.as_view(), name='engagement-list'),

    # ── Bookmark ─────────────────────────────────────────────────────
    path('<int:pk>/bookmark/', BookmarkToggleView.as_view(), name='bookmark-toggle'),
    path('bookmarks/', BookmarkListView.as_view(), name='bookmark-list'),

    # ── Save ─────────────────────────────────────────────────────────
    path('<int:pk>/save/', SaveToggleView.as_view(), name='save-toggle'),
    path('saved/', SavedListView.as_view(), name='saved-list'),

    # ── Attachments ───────────────────────────────────────────────────
    path('<int:pk>/attachments/', NoticeAttachmentView.as_view(), name='notice-attachments'),

    # ── Dashboard ─────────────────────────────────────────────────────
    path('dashboard/', StudentDashboardView.as_view(), name='student-dashboard'),
    path('department/stats/', DepartmentStatsView.as_view(), name='dept-stats'),

    # ── Student grouped API ───────────────────────────────────────────
    path('student/notices/', StudentNoticesView.as_view(), name='student-notices'),
    path('student/notices/<int:pk>/view/', StudentNoticeViewIncrement.as_view(), name='student-notice-view'),

    # ── Staff notices (dept → HOD → admin) ────────────────────────────
    path('staff-notices/', StaffNoticeCreateView.as_view(), name='staff-notice-create'),
    path('staff-notices/pending-hod/', StaffNoticePendingHodView.as_view(), name='staff-notice-pending-hod'),
    path('staff-notices/<int:pk>/approve-hod/', StaffNoticeApproveHodView.as_view(), name='staff-notice-approve-hod'),
    path('staff-notices/pending-admin/', StaffNoticePendingAdminView.as_view(), name='staff-notice-pending-admin'),
    path('staff-notices/<int:pk>/approve-admin/', StaffNoticeApproveAdminView.as_view(), name='staff-notice-approve-admin'),

    # ── Admin ─────────────────────────────────────────────────────────
    path('admin/stats/', AdminStatsView.as_view(), name='admin-stats'),
    path('admin/broadcast/', BroadcastView.as_view(), name='broadcast'),
    path('<int:pk>/approve/', ApproveNoticeView.as_view(), name='approve-notice'),

    # ── System Notifications ──────────────────────────────────────────
    path('system-notifications/', SystemNotificationListView.as_view(), name='system-notifications'),

    # ── User Inbox Notifications ──────────────────────────────────────
    path('my-notifications/', UserNotificationListView.as_view(), name='my-notifications'),
    path('my-notifications/mark-read/', UserNotificationMarkReadView.as_view(), name='notifications-mark-all-read'),
    path('my-notifications/<int:pk>/read/', UserNotificationMarkReadView.as_view(), name='notification-mark-read'),

    # ════════════════════════════════════════════════════════════════
    # 🤖  ML Algorithm Endpoints
    # ════════════════════════════════════════════════════════════════

    # 🔵 DistilBERT – Semantic Smart Search
    # GET /api/notices/search/?q=exam+postponed
    path('search/', SmartSearchView.as_view(), name='smart-search'),

    # 🟣 Matrix Factorization (SVD) – Personalised Recommendations
    # GET /api/notices/recommended/
    path('recommended/', RecommendedNoticesView.as_view(), name='recommended-notices'),


    # 🟢 LightGBM + SVD – Admin Retrain
    # POST /api/notices/admin/retrain/
    path('admin/retrain/', RetrainMLView.as_view(), name='retrain-ml'),
]
