"""
Notices Views – Full REST API
Endpoints:
  GET/POST   /api/notices/
  GET/PUT/PATCH/DELETE /api/notices/{id}/
  POST       /api/notices/{id}/engage/
  POST/DELETE /api/notices/{id}/bookmark/
  POST/DELETE /api/notices/{id}/save/
  GET        /api/notices/dashboard/
  GET        /api/notices/department/stats/
  GET        /api/notices/admin/stats/
  POST       /api/notices/admin/broadcast/
  GET        /api/notices/saved/
  GET        /api/notices/bookmarks/
  GET        /api/notices/engagement/
  GET        /api/notices/system-notifications/
"""
from datetime import date, timedelta
import os
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q, Sum
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from django.core.cache import cache
from django.db.models import Count
from .models import Notice, EngagementLog, Bookmark, SavedNotice, SystemNotification, NoticeAttachment, UserNotification, StaffNotice
from .serializers import (
    NoticeSerializer, EngagementLogSerializer,
    BookmarkSerializer, SavedNoticeSerializer,
    SystemNotificationSerializer, NoticeAttachmentSerializer,
    UserNotificationSerializer, StudentNoticeSerializer, StaffNoticeSerializer,
)
# ── Algorithm imports ──────────────────────────────────────────────────
# 1. LightGBM – Notice priority ranking
from .ml.priority_engine import compute_priority_score, rank_notices
# 2. DistilBERT – Semantic search
from .ml.search_engine import semantic_search, suggest_category
# 3. Cox Model – Deadline risk prediction
from .ml.risk_engine import calculate_risk_score
# 4. SVD / Matrix Factorization – Personalised recommendations
from .ml.recommender import get_recommendations, train_recommender


# ──────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────

def _broadcast(data: dict):
    """Send a WebSocket broadcast to the 'notices' group."""
    try:
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            'notices',
            {'type': 'notice_message', 'data': data}
        )
    except Exception:
        pass  # gracefully ignore if channels not running


def _trigger_deadline_alerts(user, approved_qs):
    """
    Deadline Alert Integration (document spec):
    If days_remaining ≤ 3 → Increase priority score → Trigger reminder notification
    → Highlight notice in dashboard.

    Creates a UserNotification(DEADLINE) for each notice with deadline ≤ 3 days
    that the student hasn't been notified about today.
    """
    today = date.today()
    urgent_notices = approved_qs.filter(
        deadline__gte=today,
        deadline__lte=today + timedelta(days=3),
    ).filter(
        Q(department=user.department) | Q(department='ALL') | Q(department='INSTITUTION')
    )

    for notice in urgent_notices:
        # Skip if we already sent a deadline alert for this notice today
        already_sent = UserNotification.objects.filter(
            user=user,
            notice=notice,
            notification_type='DEADLINE',
            created_at__date=today,
        ).exists()
        if already_sent:
            continue

        days_left = (notice.deadline - today).days
        if days_left == 0:
            urgency_text = "TODAY"
        elif days_left == 1:
            urgency_text = "tomorrow"
        else:
            urgency_text = f"in {days_left} days"

        UserNotification.objects.create(
            user=user,
            notice=notice,
            title=f"⏰ Deadline Alert: {notice.title}",
            message=(
                f'The notice "{notice.title}" ({notice.category}) '
                f'has a deadline {urgency_text} '
                f'({notice.deadline.strftime("%d %b %Y")}). '
                f'Make sure you don\'t miss this important deadline!'
            ),
            notification_type='DEADLINE',
        )


def _notify_staff_notice_submitted(staff_notice, created_by):
    """Notify the creator and admins that a staff notice is waiting for approval."""
    from django.contrib.auth import get_user_model

    User = get_user_model()
    message = f'Staff notice "{staff_notice.title}" has been created and is waiting for admin approval.'

    UserNotification.objects.create(
        user=created_by,
        notice=None,
        title='Staff Notice Submitted',
        message=message,
        notification_type='SYSTEM',
    )

    SystemNotification.objects.create(
        notice=None,
        message=message,
        target_role='ADMIN',
        target_department='ALL',
    )

    admins = User.objects.filter(role='ADMIN', is_active=True)
    bulk = [
        UserNotification(
            user=admin,
            notice=None,
            title='Staff Notice Awaiting Approval',
            message=message,
            notification_type='SYSTEM',
        )
        for admin in admins
    ]
    if bulk:
        UserNotification.objects.bulk_create(bulk, ignore_conflicts=True)


def _notify_staff_notice_approved(staff_notice, approved_by):
    """Notify the creator that their staff notice was approved by admin."""
    if not staff_notice.created_by:
        return
    
    message = f'Staff notice "{staff_notice.title}" has been approved by admin!'
    
    UserNotification.objects.create(
        user=staff_notice.created_by,
        notice=None,
        title='Staff Notice Approved',
        message=message,
        notification_type='SYSTEM',
    )


# ──────────────────────────────────────────────────────────────────────
# Notice CRUD
# ──────────────────────────────────────────────────────────────────────

class NoticeListCreateView(generics.ListCreateAPIView):
    serializer_class = NoticeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Students can only list approved notices.
        # Departments can see approved notices plus their own department's pending/rejected notices.
        # Admin can see all notices.
        if user.role == 'ADMIN':
            qs = Notice.objects.all()
        elif user.role == 'DEPARTMENT':
            qs = Notice.objects.filter(
                Q(status='APPROVED') |
                Q(department=user.department)
            )
        else:
            qs = Notice.objects.filter(status='APPROVED')

        # Filter by department for students/departments
        dept = self.request.query_params.get('department')
        category = self.request.query_params.get('category')
        priority = self.request.query_params.get('priority')
        search = self.request.query_params.get('search')

        if dept:
            qs = qs.filter(Q(department=dept) | Q(department='ALL'))
        if category:
            qs = qs.filter(category__iexact=category)
        if priority:
            qs = qs.filter(priority=priority.upper())
        if search:
            qs = qs.filter(Q(title__icontains=search) | Q(description__icontains=search))

        return qs.order_by('-priority_score', '-is_featured', '-created_at')

    def perform_create(self, serializer):
        from django.utils import timezone
        user = self.request.user
        # Only admin notices are auto-approved.
        # Department-created notices must be approved by admin first.
        s = 'APPROVED' if user.role == 'ADMIN' else 'PENDING'
        notice = serializer.save(
            created_by=user,
            department=self.request.data.get('department', user.department),
            status=s,
            created_at=timezone.now(),
            approved_by=user if s == 'APPROVED' else None,
        )
        # Priority score will be calculated dynamically per student, not stored
        # Set to 0.0 to indicate it needs calculation
        notice.priority_score = 0.0
        notice.save()

        if s == 'APPROVED':
            _broadcast({
                'type': 'new_notice',
                'id': notice.id,
                'title': notice.title,
                'priority': notice.priority,
                'department': notice.department,
                'message': f'New notice: {notice.title}',
            })
            SystemNotification.objects.create(
                notice=notice,
                message=f'New notice posted: {notice.title}',
                target_department=notice.department,
            )
            # Create per-user inbox notifications for matching students
            from django.contrib.auth import get_user_model
            User = get_user_model()
            students = User.objects.filter(
                role='STUDENT'
            ).filter(
                Q(department=notice.department) | Q(department='ALL')
            ) if notice.department != 'ALL' else User.objects.filter(role='STUDENT')
            bulk = [
                UserNotification(
                    user=u,
                    notice=notice,
                    title=f'New {notice.category} Notice',
                    message=f'{notice.title} — Deadline: {notice.deadline or "N/A"}',
                    notification_type='NEW_NOTICE',
                )
                for u in students
            ]
            UserNotification.objects.bulk_create(bulk, ignore_conflicts=True)


class NoticeDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Notice.objects.all()
    serializer_class = NoticeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return Notice.objects.all()
        if user.role == 'DEPARTMENT':
            # Department can open approved notices and their own department notices (any status).
            return Notice.objects.filter(
                Q(status='APPROVED') |
                Q(department=user.department)
            )
        # Student should never access pending/rejected notice details.
        return Notice.objects.filter(status='APPROVED')

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Increment view count
        instance.view_count += 1
        instance.save(update_fields=['view_count'])

        # Keep engagement in sync with real views so profile charts update immediately.
        if getattr(request.user, 'role', None) == 'STUDENT':
            existing_log = EngagementLog.objects.filter(
                user=request.user,
                notice=instance
            ).order_by('-created_at').first()
            if existing_log:
                if not existing_log.viewed:
                    existing_log.viewed = True
                    existing_log.save(update_fields=['viewed'])
            else:
                EngagementLog.objects.create(
                    user=request.user,
                    notice=instance,
                    viewed=True,
                )

        _broadcast({
            'type': 'notice_updated',
            'id': instance.id,
            'title': instance.title,
            'view_count': instance.view_count,
            'engagement_updated': True,
            'user_id': request.user.id,
        })
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def perform_update(self, serializer):
        notice = serializer.save()
        # Priority score will be calculated dynamically per student, not stored
        # Set to 0.0 to indicate it needs recalculation
        notice.priority_score = 0.0
        notice.save(update_fields=['priority_score'])
        _broadcast({
            'type': 'notice_updated',
            'id': notice.id,
            'title': notice.title,
            'priority': notice.priority,
        })

    def perform_destroy(self, instance):
        title = instance.title
        instance.delete()
        _broadcast({'type': 'notice_deleted', 'title': title})


# ──────────────────────────────────────────────────────────────────────
# Engagement
# ──────────────────────────────────────────────────────────────────────

class EngageView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            notice = Notice.objects.get(pk=pk)
        except Notice.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

        log, _ = EngagementLog.objects.get_or_create(
            user=request.user, notice=notice
        )
        log.viewed = request.data.get('viewed', log.viewed)
        log.downloaded = request.data.get('downloaded', log.downloaded)
        log.bookmarked = request.data.get('bookmarked', log.bookmarked)
        log.shared = request.data.get('shared', log.shared)
        log.view_time = max(log.view_time, float(request.data.get('view_time', 0)))
        log.save()
        _broadcast({
            'type': 'notice_updated',
            'id': notice.id,
            'title': notice.title,
            'engagement_updated': True,
            'user_id': request.user.id,
        })
        return Response({'status': 'ok'})


class EngagementListView(generics.ListAPIView):
    serializer_class = EngagementLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return EngagementLog.objects.filter(user=self.request.user).select_related('notice')


# ──────────────────────────────────────────────────────────────────────
# Bookmark
# ──────────────────────────────────────────────────────────────────────

class BookmarkToggleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        notice = Notice.objects.get(pk=pk)
        bm, created = Bookmark.objects.get_or_create(user=request.user, notice=notice)
        if not created:
            bm.delete()
            return Response({'bookmarked': False})
        EngagementLog.objects.filter(user=request.user, notice=notice).update(bookmarked=True)
        return Response({'bookmarked': True})

    def delete(self, request, pk):
        Bookmark.objects.filter(user=request.user, notice_id=pk).delete()
        return Response({'bookmarked': False})


class BookmarkListView(generics.ListAPIView):
    serializer_class = BookmarkSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Bookmark.objects.filter(user=self.request.user).select_related('notice')


# ──────────────────────────────────────────────────────────────────────
# Save
# ──────────────────────────────────────────────────────────────────────

class SaveToggleView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        notice = Notice.objects.get(pk=pk)
        sn, created = SavedNotice.objects.get_or_create(user=request.user, notice=notice)
        if not created:
            sn.delete()
            return Response({'saved': False})
        return Response({'saved': True})

    def delete(self, request, pk):
        SavedNotice.objects.filter(user=request.user, notice_id=pk).delete()
        return Response({'saved': False})


class SavedListView(generics.ListAPIView):
    serializer_class = SavedNoticeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return SavedNotice.objects.filter(user=self.request.user).select_related('notice')


# ──────────────────────────────────────────────────────────────────────
# Student Dashboard
# ──────────────────────────────────────────────────────────────────────

class StudentDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        today = date.today()

        # ── Per-user cache key (30-second TTL set in settings.CACHES) ──────
        cache_key = f'dashboard_{user.id}'
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        approved = Notice.objects.filter(status='APPROVED')

        dept_notices = approved.filter(
            Q(department=user.department) | Q(department='ALL')
        ).order_by('-priority_score', '-created_at')

        own_dept = approved.filter(department=user.department).order_by('-priority_score', '-created_at')
        other_dept = approved.exclude(department=user.department).exclude(department='ALL').order_by('-priority_score', '-created_at')
        global_notices = approved.filter(department='ALL').order_by('-priority_score', '-created_at')

        # Featured = is_featured or highest priority score
        featured = list(approved.filter(is_featured=True).order_by('-priority_score')[:3])
        if not featured:
            featured = list(approved.order_by('-priority_score')[:3])

        # Upcoming deadlines (next 7 days)
        upcoming = approved.filter(
            deadline__gte=today,
            deadline__lte=today + timedelta(days=7),
        ).order_by('deadline')[:5]

        # By category – single queryset, split in Python (avoids 7 round-trips)
        categories = ['Exam', 'Academic', 'Placement', 'Event', 'Holiday', 'Scholarship', 'Workshop', 'Internship']
        cat_notices_qs = list(dept_notices.filter(category__in=categories))
        from collections import defaultdict
        cat_map = defaultdict(list)
        for n in cat_notices_qs:
            cat_map[n.category].append(n)
        by_category = {}
        for cat in categories:
            by_category[cat] = StudentNoticeSerializer(
                cat_map[cat][:8],
                many=True,
                context={'request': request}
            ).data

        # ── LightGBM: re-rank all dept notices live ─────────────────
        # Load student preferences for year_importance + student_preference_score features
        from apps.accounts.models import NotificationPrefs
        prefs_obj, _ = NotificationPrefs.objects.get_or_create(user=user)
        student_prefs = {
            'exam':        prefs_obj.exam,
            'event':       prefs_obj.event,
            'academic':    prefs_obj.academic,
            'holiday':     prefs_obj.holiday,
            'placement':   prefs_obj.placement,
            'scholarship': prefs_obj.scholarship,
            'internship':  prefs_obj.internship,
            'workshop':    prefs_obj.workshop,
        }
        all_dept_list = list(dept_notices[:60])
        lgbm_ranked   = rank_notices(
            all_dept_list,
            student_dept=user.department or 'CSE',
            student_year=user.year or '',
            student_prefs=student_prefs,
        )

        # ── Deadline Alert Integration (≤3 days) ──────────────────────
        # Creates UserNotification(DEADLINE) for urgent notices not yet alerted today
        try:
            _trigger_deadline_alerts(user, approved)
        except Exception:
            pass

        # ── SVD: personalised recommendations ────────────────────────
        recommended = get_recommendations(user, lgbm_ranked, top_k=10)

        # ── Cox Model: deadline risk prediction ──────────────────────
        risk_data = calculate_risk_score(user, approved)

        ctx = {'request': request}
        payload = {
            'user': {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'department': user.department,
                'role': user.role,
                'year': user.year or '',
                'notification_prefs': student_prefs,
            },
            'featured_notices': StudentNoticeSerializer(featured, many=True, context=ctx).data,
            'department_notices': StudentNoticeSerializer(own_dept[:20], many=True, context=ctx).data,
            'other_notices': StudentNoticeSerializer(other_dept[:10], many=True, context=ctx).data,
            'global_notices': StudentNoticeSerializer(global_notices[:10], many=True, context=ctx).data,
            'by_category': by_category,
            'upcoming_deadlines': StudentNoticeSerializer(upcoming, many=True, context=ctx).data,
            # LightGBM-ranked full feed
            'all_notices': StudentNoticeSerializer(lgbm_ranked, many=True, context=ctx).data,
            # SVD personalised recommendations
            'recommended_for_you': StudentNoticeSerializer(recommended, many=True, context=ctx).data,
            # Cox Model risk data
            'deadline_risk': risk_data,
        }
        # Cache for 30 s (TTL from settings.CACHES['default']['TIMEOUT'])
        cache.set(cache_key, payload)
        return Response(payload)


# ──────────────────────────────────────────────────────────────────────
# Department Dashboard Stats
# ──────────────────────────────────────────────────────────────────────

class DepartmentStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.contrib.auth import get_user_model
        from django.db.models import Q, Count
        user = request.user
        dept = user.department
        User = get_user_model()

        dept_only    = Notice.objects.filter(department=dept)
        dept_approved = dept_only.filter(status='APPROVED').order_by('-created_at')
        # All notices created by this user (any status) for the "Your Notices" tab
        own_all       = Notice.objects.filter(created_by=user).order_by('-created_at')
        all_approved  = Notice.objects.filter(status='APPROVED').order_by('-created_at')
        ctx = {'request': request}

        # ── Real stats ─────────────────────────────────────────────────
        total_views = dept_only.aggregate(tv=Sum('view_count'))['tv'] or 0

        # Category breakdown – real counts from dept notices
        by_cat = {}
        for n in dept_only:
            by_cat[n.category] = by_cat.get(n.category, 0) + 1

        # Top notices by view count (dept or all approved)
        top_notices = dept_approved.order_by('-view_count')[:5]

        # Students who have engaged with AT LEAST ONE dept notice
        dept_notice_ids = list(dept_only.values_list('id', flat=True))
        active_student_ids = set(
            EngagementLog.objects.filter(notice_id__in=dept_notice_ids)
            .values_list('user_id', flat=True).distinct()
        )
        total_students = User.objects.filter(role='STUDENT', department=dept).count()
        # High risk = dept students with ZERO engagement (viewed=True) on dept notices
        engaged_ids = set(
            EngagementLog.objects.filter(notice_id__in=dept_notice_ids, viewed=True)
            .values_list('user_id', flat=True).distinct()
        )
        high_risk_students = max(0, total_students - len(engaged_ids))
        active_students    = len(engaged_ids)

        # ── Daily views – last 7 days from EngagementLog ──────────────
        today = date.today()
        daily_views = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            cnt = EngagementLog.objects.filter(
                notice_id__in=dept_notice_ids,
                viewed=True,
                created_at__date=day
            ).count()
            daily_views.append({'date': str(day), 'label': day.strftime('%d %b'), 'count': cnt})

        # ── Priority distribution – dept notices ───────────────────────
        priority_dist = {
            'LOW':    dept_only.filter(priority='LOW').count(),
            'MEDIUM': dept_only.filter(priority='MEDIUM').count(),
            'HIGH':   dept_only.filter(priority='HIGH').count(),
            'URGENT': dept_only.filter(priority='URGENT').count(),
        }

        # ── Engagement breakdown – total interactions on dept notices ──
        eng_qs = EngagementLog.objects.filter(notice_id__in=dept_notice_ids)
        engagement_breakdown = {
            'viewed':     eng_qs.filter(viewed=True).count(),
            'downloaded': eng_qs.filter(downloaded=True).count(),
            'bookmarked': eng_qs.filter(bookmarked=True).count(),
            'shared':     eng_qs.filter(shared=True).count(),
        }

        # ── Status trend – daily new notices last 7 days ───────────────
        daily_new_notices = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            cnt = dept_only.filter(created_at__date=day).count()
            daily_new_notices.append({'date': str(day), 'label': day.strftime('%d %b'), 'count': cnt})

        return Response({
            # ── Counts ───────────────────────────────────────────────
            'total':           dept_only.count(),
            'approved':        dept_approved.count(),
            'pending':         dept_only.filter(status='PENDING').count(),
            'rejected':        dept_only.filter(status='REJECTED').count(),
            'total_views':     total_views,
            'total_students':  total_students,
            'active_students': active_students,
            'high_risk_students': high_risk_students,
            # ── Notice sets ──────────────────────────────────────────
            'own_notices': NoticeSerializer(own_all, many=True, context=ctx).data,
            'all_approved_notices': NoticeSerializer(all_approved, many=True, context=ctx).data,
            'recent_notices': NoticeSerializer(
                all_approved.exclude(department=dept).exclude(department='INSTITUTION').exclude(department='ALL').order_by('-created_at')[:20],
                many=True, context=ctx
            ).data,
            'top_notices': NoticeSerializer(top_notices, many=True, context=ctx).data,
            # ── Charts (all from live DB) ─────────────────────────────
            'by_category':        by_cat,
            'daily_views':        daily_views,
            'priority_dist':      priority_dist,
            'engagement_breakdown': engagement_breakdown,
            'daily_new_notices':  daily_new_notices,
        })


# ──────────────────────────────────────────────────────────────────────
# Staff Notice (Department → HOD → Admin → Staff)
# ──────────────────────────────────────────────────────────────────────

class StaffNoticeCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role not in ('DEPARTMENT', 'ADMIN'):
            return Response({'error': 'Department or admin only'}, status=403)

        dept = request.data.get('department', request.user.department)
        if dept not in dict(Notice.DEPARTMENT_CHOICES):
            return Response({'error': 'Invalid department'}, status=400)

        if request.user.role == 'DEPARTMENT' and dept not in (request.user.department, 'ALL'):
            return Response({'error': 'Department mismatch'}, status=400)

        if dept == 'ALL':
            hod_status = 'APPROVED'
            admin_status = 'PENDING'
        else:
            hod_status = 'PENDING'
            admin_status = 'PENDING'

        notice = StaffNotice.objects.create(
            title=request.data.get('title', '').strip(),
            description=request.data.get('description', '').strip(),
            full_content=request.data.get('full_content', '').strip(),
            category=request.data.get('category', 'General'),
            department=dept,
            is_urgent=bool(request.data.get('is_urgent', False)),
            created_by=request.user,
            hod_status=hod_status,
            admin_status=admin_status,
        )
        _notify_staff_notice_submitted(notice, request.user)
        return Response(StaffNoticeSerializer(notice, context={'request': request}).data, status=201)


class StaffNoticePendingHodView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'DEPARTMENT':
            return Response({'error': 'Department only'}, status=403)

        qs = StaffNotice.objects.filter(
            hod_status='PENDING',
            department=request.user.department,
        ).order_by('-created_at')
        return Response(StaffNoticeSerializer(qs, many=True, context={'request': request}).data)


class StaffNoticeApproveHodView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != 'DEPARTMENT':
            return Response({'error': 'Department only'}, status=403)
        try:
            notice = StaffNotice.objects.get(pk=pk)
        except StaffNotice.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

        if notice.created_by and notice.created_by.department != request.user.department:
            return Response({'error': 'Department mismatch'}, status=403)

        action = request.data.get('action', 'approve')
        if action == 'approve':
            notice.hod_status = 'APPROVED'
            notice.hod_approved_by = request.user
        elif action == 'reject':
            notice.hod_status = 'REJECTED'
            notice.hod_approved_by = request.user
        else:
            return Response({'error': 'Invalid action'}, status=400)

        notice.save(update_fields=['hod_status', 'hod_approved_by', 'updated_at'])
        return Response(StaffNoticeSerializer(notice, context={'request': request}).data)


class StaffNoticePendingAdminView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Admin only'}, status=403)

        qs = StaffNotice.objects.filter(
            admin_status='PENDING',
        ).order_by('-created_at')
        return Response(StaffNoticeSerializer(qs, many=True, context={'request': request}).data)


class StaffNoticeApproveAdminView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Admin only'}, status=403)
        try:
            notice = StaffNotice.objects.get(pk=pk)
        except StaffNotice.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

        action = request.data.get('action', 'approve')
        if action == 'approve':
            # Admin can approve even if HOD hasn't approved - admin overrides
            if notice.hod_status == 'PENDING' and notice.department != 'ALL':
                notice.hod_status = 'APPROVED'
                notice.hod_approved_by = request.user
            
            notice.admin_status = 'APPROVED'
            notice.admin_approved_by = request.user
            notice.approved_at = timezone.now()
        elif action == 'reject':
            notice.admin_status = 'REJECTED'
            notice.admin_approved_by = request.user
        else:
            return Response({'error': 'Invalid action'}, status=400)

        notice.save(update_fields=['admin_status', 'admin_approved_by', 'approved_at', 'updated_at', 'hod_status', 'hod_approved_by'])
        
        # Notify creator if approved
        if action == 'approve':
            _notify_staff_notice_approved(notice, request.user)
        
        return Response(StaffNoticeSerializer(notice, context={'request': request}).data)


# ──────────────────────────────────────────────────────────────────────
# Admin Dashboard Stats
# ──────────────────────────────────────────────────────────────────────

class AdminStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Admin only'}, status=403)
        from django.contrib.auth import get_user_model
        from django.db.models import Count
        User = get_user_model()

        all_notices  = Notice.objects.all()
        approved_qs  = all_notices.filter(status='APPROVED')
        pending_qs   = all_notices.filter(status='PENDING')
        rejected_qs  = all_notices.filter(status='REJECTED')
        total_views  = all_notices.aggregate(tv=Sum('view_count'))['tv'] or 0

        # ── By department (APPROVED only) ──────────────────────────────
        DEPTS = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL', 'ALL', 'INSTITUTION']
        by_department = {d: approved_qs.filter(department=d).count() for d in DEPTS}

        # ── By category ────────────────────────────────────────────────
        CATS = ['Academic', 'Exam', 'Event', 'Placement', 'Holiday', 'Scholarship', 'Workshop', 'General']
        by_category = {c: all_notices.filter(category=c).count() for c in CATS}

        # ── Priority breakdown ─────────────────────────────────────────
        priority_dist = {
            'LOW':    all_notices.filter(priority='LOW').count(),
            'MEDIUM': all_notices.filter(priority='MEDIUM').count(),
            'HIGH':   all_notices.filter(priority='HIGH').count(),
            'URGENT': all_notices.filter(priority='URGENT').count(),
        }

        # ── Daily notices created – last 7 days ───────────────────────
        today = date.today()
        daily_notices = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            cnt = all_notices.filter(created_at__date=day).count()
            daily_notices.append({'date': str(day), 'label': day.strftime('%d %b'), 'count': cnt})

        # ── Engagement breakdown (all notices) ─────────────────────────
        all_notice_ids = list(all_notices.values_list('id', flat=True))
        eng_qs = EngagementLog.objects.filter(notice_id__in=all_notice_ids)
        engagement_breakdown = {
            'viewed':     eng_qs.filter(viewed=True).count(),
            'downloaded': eng_qs.filter(downloaded=True).count(),
            'bookmarked': eng_qs.filter(bookmarked=True).count(),
            'shared':     eng_qs.filter(shared=True).count(),
        }

        # ── Top 5 notices by views ─────────────────────────────────────
        top_notices = approved_qs.order_by('-view_count')[:5]

        # ── Users breakdown ────────────────────────────────────────────
        user_breakdown = {
            'students':    User.objects.filter(role='STUDENT').count(),
            'departments': User.objects.filter(role='DEPARTMENT').count(),
            'admins':      User.objects.filter(role='ADMIN').count(),
        }

        ctx = {'request': request}
        return Response({
            # Core counts
            'total_notices':     all_notices.count(),
            'approved_count':    approved_qs.count(),
            'pending_approvals': pending_qs.count(),
            'rejected_count':    rejected_qs.count(),
            'total_users':       User.objects.count(),
            'total_views':       total_views,
            # Breakdowns
            'by_department':        by_department,
            'by_category':          by_category,
            'priority_dist':        priority_dist,
            'daily_notices':        daily_notices,
            'engagement_breakdown': engagement_breakdown,
            'user_breakdown':       user_breakdown,
            # Notice lists
            'all_notices':          NoticeSerializer(all_notices.order_by('-created_at'), many=True, context=ctx).data,
            'pending_notices':      NoticeSerializer(pending_qs.order_by('-created_at'), many=True, context=ctx).data,
            'top_notices':          NoticeSerializer(top_notices, many=True, context=ctx).data,
        })


# ──────────────────────────────────────────────────────────────────────
# Admin – Approve / Reject
# ──────────────────────────────────────────────────────────────────────

class ApproveNoticeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Admin only'}, status=403)
        try:
            notice = Notice.objects.get(pk=pk)
        except Notice.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

        action = request.data.get('action', 'approve')
        if action == 'approve':
            notice.status = 'APPROVED'
            notice.approved_by = request.user
            notice.save()
            _broadcast({'type': 'new_notice', 'id': notice.id, 'title': notice.title, 'priority': notice.priority})
            SystemNotification.objects.create(
                notice=notice,
                message=f'Notice approved: {notice.title}',
                target_department=notice.department,
            )
            # Notify matching students
            from django.contrib.auth import get_user_model
            User = get_user_model()
            students = User.objects.filter(role='STUDENT').filter(
                Q(department=notice.department) | Q(department='ALL')
            ) if notice.department != 'ALL' else User.objects.filter(role='STUDENT')
            bulk = [
                UserNotification(
                    user=u,
                    notice=notice,
                    title=f'New {notice.category} Notice',
                    message=f'{notice.title} — Deadline: {notice.deadline or "N/A"}',
                    notification_type='NEW_NOTICE',
                )
                for u in students
            ]
            UserNotification.objects.bulk_create(bulk, ignore_conflicts=True)
        elif action == 'reject':
            notice.status = 'REJECTED'
            notice.save()

        return Response(NoticeSerializer(notice, context={'request': request}).data)


# ──────────────────────────────────────────────────────────────────────
# Admin – Emergency Broadcast
# ──────────────────────────────────────────────────────────────────────

class BroadcastView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Admin only'}, status=403)
        msg = request.data.get('message', '')
        title = request.data.get('title', '🚨 Emergency Alert')
        dept = request.data.get('department', 'ALL')

        # Create an actual Notice so it appears in the notices list
        notice = Notice.objects.create(
            title=title,
            description=msg,
            category='General',
            department='ALL',
            priority='URGENT',
            is_urgent=True,
            is_featured=True,
            status='APPROVED',
            created_by=request.user,
        )
        notice.priority_score = compute_priority_score(notice)
        notice.save(update_fields=['priority_score'])

        SystemNotification.objects.create(
            notice=notice,
            message=f'{title}: {msg}',
            target_department=dept,
            target_role='ALL',
        )
        _broadcast({'type': 'emergency', 'title': title, 'message': msg})
        ctx = {'request': request}
        return Response({'success': True, 'notice': NoticeSerializer(notice, context=ctx).data})


# ──────────────────────────────────────────────────────────────────────
# System Notifications
# ──────────────────────────────────────────────────────────────────────

class SystemNotificationListView(generics.ListCreateAPIView):
    serializer_class = SystemNotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return SystemNotification.objects.all().order_by('-created_at')[:50]
        return SystemNotification.objects.filter(
            Q(target_department=user.department) | Q(target_department='ALL')
        ).order_by('-created_at')[:20]

    def perform_create(self, serializer):
        serializer.save()


# ──────────────────────────────────────────────────────────────────────
# User Notifications (per-user inbox)
# ──────────────────────────────────────────────────────────────────────

class UserNotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifs = UserNotification.objects.filter(
            user=request.user
        ).order_by('-created_at')[:50]
        return Response(UserNotificationSerializer(notifs, many=True).data)


class UserNotificationMarkReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        if pk:
            # Mark single notification as read
            UserNotification.objects.filter(
                pk=pk, user=request.user
            ).update(is_read=True)
        else:
            # Mark all as read
            UserNotification.objects.filter(
                user=request.user, is_read=False
            ).update(is_read=True)
        unread = UserNotification.objects.filter(
            user=request.user, is_read=False
        ).count()
        return Response({'success': True, 'unread_count': unread})


# ──────────────────────────────────────────────────────────────────────
# Notice Attachments (upload / list / delete)
# ──────────────────────────────────────────────────────────────────────

class NoticeAttachmentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        attachments = NoticeAttachment.objects.filter(notice_id=pk)
        return Response(NoticeAttachmentSerializer(attachments, many=True).data)

    def post(self, request, pk):
        try:
            notice = Notice.objects.get(pk=pk)
        except Notice.DoesNotExist:
            return Response({'error': 'Notice not found'}, status=404)

        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No file provided'}, status=400)

        # Detect file type from extension
        ext = os.path.splitext(file.name)[1].lower()
        type_map = {
            '.pdf':  'PDF',
            '.jpg': 'IMAGE', '.jpeg': 'IMAGE', '.png': 'IMAGE',
            '.gif': 'IMAGE', '.webp': 'IMAGE', '.svg': 'IMAGE',
            '.mp3': 'AUDIO', '.wav': 'AUDIO', '.ogg': 'AUDIO', '.m4a': 'AUDIO',
            '.mp4': 'VIDEO', '.avi': 'VIDEO', '.mov': 'VIDEO', '.mkv': 'VIDEO',
            '.csv': 'CSV',
            '.xls': 'EXCEL', '.xlsx': 'EXCEL',
            '.ppt': 'PPT', '.pptx': 'PPT',
        }
        file_type = type_map.get(ext, 'OTHER')

        attachment = NoticeAttachment.objects.create(
            notice=notice,
            file=file,
            file_name=file.name,
            file_type=file_type,
            file_size=file.size,
            uploaded_by=request.user,
        )
        return Response(
            NoticeAttachmentSerializer(attachment).data,
            status=status.HTTP_201_CREATED
        )

    def delete(self, request, pk):
        # pk here is attachment id when called from attachment-detail url
        try:
            att = NoticeAttachment.objects.get(pk=pk)
            if att.uploaded_by != request.user and request.user.role not in ('ADMIN', 'DEPARTMENT'):
                return Response({'error': 'Permission denied'}, status=403)
            att.file.delete(save=False)
            att.delete()
            return Response({'success': True})
        except NoticeAttachment.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)


# ──────────────────────────────────────────────────────────────────────
# Student Notices API  –  GET /api/student/notices/
# Returns APPROVED notices grouped by department_type
# Sorted by priority_score DESC within each group
# ──────────────────────────────────────────────────────────────────────

class StudentNoticesView(APIView):
    """
    Returns all APPROVED notices for the logged-in student, grouped as:
      - your_department  (notices where department == student's dept)
      - institution      (notices where department == 'INSTITUTION')
      - other_departments (all other departments)

    Each group is sorted by priority_score DESC.
    Supports ?category=<cat> and ?search=<query> filters.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        student_dept = user.department  # e.g. "CSE"

        approved = Notice.objects.filter(status='APPROVED')

        # Optional filters
        category = request.query_params.get('category')
        search = request.query_params.get('search', '').strip()

        if category and category != 'all':
            approved = approved.filter(category__iexact=category)
        if search:
            from django.db.models import Q as _Q
            approved = approved.filter(
                _Q(title__icontains=search) | _Q(description__icontains=search)
            )

        approved = approved.order_by('-priority_score', '-created_at')

        # Group notices — 'ALL' means visible everywhere (institution + every dept)
        your_dept = [n for n in approved if n.department == student_dept or n.department == 'ALL']
        institution = [n for n in approved if n.department == 'INSTITUTION' or n.department == 'ALL']
        other = [
            n for n in approved
            if n.department != student_dept and n.department != 'INSTITUTION' and n.department != 'ALL'
        ]

        ctx = {'request': request}
        return Response({
            'student': {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'department': user.department,
                'role': user.role,
            },
            'your_department': StudentNoticeSerializer(your_dept, many=True, context=ctx).data,
            'institution': StudentNoticeSerializer(institution, many=True, context=ctx).data,
            'other_departments': StudentNoticeSerializer(other, many=True, context=ctx).data,
            'totals': {
                'your_department': len(your_dept),
                'institution': len(institution),
                'other_departments': len(other),
                'total': len(your_dept) + len(institution) + len(other),
            },
        })


class StudentNoticeViewIncrement(APIView):
    """POST /api/student/notices/{id}/view/  – increments view_count."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            notice = Notice.objects.get(pk=pk, status='APPROVED')
        except Notice.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)

        if getattr(request.user, 'role', None) == 'STUDENT':
            existing_log = EngagementLog.objects.filter(
                user=request.user,
                notice=notice
            ).order_by('-created_at').first()
            if existing_log:
                if not existing_log.viewed:
                    existing_log.viewed = True
                    existing_log.save(update_fields=['viewed'])
            else:
                EngagementLog.objects.create(
                    user=request.user,
                    notice=notice,
                    viewed=True,
                )

        notice.view_count = notice.view_count + 1
        notice.save(update_fields=['view_count'])
        _broadcast({
            'type': 'notice_updated',
            'id': notice.id,
            'title': notice.title,
            'view_count': notice.view_count,
            'engagement_updated': True,
            'user_id': request.user.id,
        })
        return Response({'view_count': notice.view_count})


# ══════════════════════════════════════════════════════════════════════
# 🔵  DistilBERT – Semantic Smart Search
# GET /api/notices/search/?q=<query>
# ══════════════════════════════════════════════════════════════════════

class SmartSearchView(APIView):
    """
    Semantic search using DistilBERT embeddings + cosine similarity.

    Unlike plain SQL LIKE search, this understands meaning:
      query "exam postponed" matches "examination rescheduled"

    Query params:
      q        : required – search string
      top_k    : optional – max results (default 10)
      category : optional – filter by category before semantic ranking

    Returns [{...notice fields, similarity_score}, ...]
    """
    permission_classes = [AllowAny]

    def get(self, request):
        query = request.GET.get('q', '').strip()
        if not query:
            return Response({'error': 'q parameter required'}, status=400)

        top_k    = int(request.GET.get('top_k', 10))
        category = request.GET.get('category', '')

        notices = Notice.objects.filter(status='APPROVED')
        if category:
            notices = notices.filter(category__iexact=category)

        # DistilBERT semantic search
        results = semantic_search(query, list(notices), top_k=top_k)

        # Also auto-suggest category from the query itself
        suggested_cat, confidence = suggest_category(query)

        serializer = NoticeSerializer(results, many=True, context={'request': request})
        return Response({
            'query':              query,
            'results':            serializer.data,
            'count':              len(results),
            'suggested_category': suggested_cat,
            'category_confidence': confidence,
        })


# ══════════════════════════════════════════════════════════════════════
# 🟣  Matrix Factorization (SVD) – Personalised Recommendations
# GET /api/notices/recommended/
# ══════════════════════════════════════════════════════════════════════

class RecommendedNoticesView(APIView):
    """
    Returns personalized notice recommendations for the logged-in student
    using SVD Matrix Factorization.

    How it works:
      1. Aggregates student's views, bookmarks, saves → implicit ratings
      2. SVD predicts rating for every unread notice
      3. Returns top-k sorted by predicted rating
      4. Falls back to dept + category heuristic if model not trained yet

    Returns [{...notice fields, recommendation_score}, ...]
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        top_k   = int(request.GET.get('top_k', 10))
        notices = list(Notice.objects.filter(status='APPROVED'))

        recommended = get_recommendations(request.user, notices, top_k=top_k)

        serializer = NoticeSerializer(
            recommended, many=True, context={'request': request}
        )
        return Response({
            'recommended': serializer.data,
            'count':       len(recommended),
        })


# ══════════════════════════════════════════════════════════════════════
# 🟡  Cox Model – Deadline Risk API
# GET /api/notices/risk/
# ══════════════════════════════════════════════════════════════════════

# ══════════════════════════════════════════════════════════════════════
# 🟢  LightGBM – Admin Retrain Endpoint
# POST /api/notices/admin/retrain/
# ══════════════════════════════════════════════════════════════════════

class RetrainMLView(APIView):
    """
    Admin-only endpoint to retrain:
      - LightGBM ranking model  (ml_engine.retrain_model)
      - SVD recommendation model (recommender.train_recommender)

    Should be called periodically (e.g., weekly) as engagement data grows.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Admin only'}, status=403)

        results = {}

        # Retrain SVD (no external data needed – uses live DB)
        svd_model = train_recommender()
        results['svd'] = 'retrained' if svd_model else 'skipped (not enough data)'

        # Retrain LightGBM using live engagement data
        try:
            import pandas as pd
            from .ml.priority_engine import retrain_model, FEATURE_COLS
            from .ml.priority_engine import _build_features

            notices = list(Notice.objects.filter(status='APPROVED'))
            rows   = [_build_features(n, 'CSE') for n in notices]
            labels = [1 if n.view_count >= 5 else 0 for n in notices]

            if len(set(labels)) == 2:   # need both classes
                df = pd.DataFrame(rows, columns=FEATURE_COLS)
                retrain_model(df, labels)
                results['lightgbm'] = f'retrained on {len(labels)} notices'
            else:
                results['lightgbm'] = 'skipped (need both 0 and 1 labels)'
        except Exception as e:
            results['lightgbm'] = f'error: {e}'

        return Response({'status': 'done', 'results': results})


