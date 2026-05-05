"""SmartBoard360 URL Configuration"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView, TokenRefreshView,
)
from apps.accounts.views import CustomTokenObtainPairView

urlpatterns = [
    path('admin/', admin.site.urls),

    # JWT Auth
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # App APIs
    path('api/accounts/', include('apps.accounts.urls')),
    path('api/notices/', include('apps.notices.urls')),
    path('api/reminders/', include('apps.reminders.urls')),
    path('api/staff/', include('apps.staff.urls')),
    path('api/timetable/', include('apps.timetable.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

