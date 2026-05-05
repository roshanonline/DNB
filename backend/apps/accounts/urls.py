"""Accounts URL Configuration"""
from django.urls import path
from .views import (
    RegisterView, ProfileView,
    NotificationPrefsView,
    AllUsersView, ToggleBlockView,
    DepartmentStudentsView, ResetStudentPasswordView, SendStudentAlertView,
    PendingStudentsView, ApproveStudentView,
    AddStudentByDeptView, DeleteStudentView,
    LoginHistoryView, AdminLoginActivityView, AdminLoginHistoryByRoleView, AdminLoginAnalyticsView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('notification-prefs/', NotificationPrefsView.as_view(), name='notification-prefs'),
    path('users/', AllUsersView.as_view(), name='all-users'),
    path('users/<int:user_id>/toggle-block/', ToggleBlockView.as_view(), name='toggle-block'),
    path('department/students/', DepartmentStudentsView.as_view(), name='dept-students'),
    path('department/students/add/', AddStudentByDeptView.as_view(), name='add-student-by-dept'),
    path('department/students/pending/', PendingStudentsView.as_view(), name='dept-students-pending'),
    path('department/students/<int:user_id>/approve/', ApproveStudentView.as_view(), name='approve-student'),
    path('department/students/<int:user_id>/delete/', DeleteStudentView.as_view(), name='delete-student'),
    path('department/students/<int:user_id>/reset-password/', ResetStudentPasswordView.as_view(), name='reset-student-password'),
    path('department/students/<int:user_id>/send-alert/', SendStudentAlertView.as_view(), name='send-student-alert'),
    path('login-history/', LoginHistoryView.as_view(), name='login-history'),
    path('admin/login-activity/', AdminLoginActivityView.as_view(), name='admin-login-activity'),
    path('admin/login-history/<str:role>/', AdminLoginHistoryByRoleView.as_view(), name='admin-login-history-by-role'),
    path('admin/login-analytics/', AdminLoginAnalyticsView.as_view(), name='admin-login-analytics'),
]
