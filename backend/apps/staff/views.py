from __future__ import annotations

import json

from django.contrib.auth.hashers import check_password, make_password
from django.db.models import Q
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from apps.notices.models import StaffNotice

from .models import StaffLoginActivity, StaffUser, StaffReminder
from .serializers import StaffReminderSerializer
import random
from datetime import timedelta
from django.utils import timezone

DEFAULT_STAFF_ID = 'STAFF-CSE-2026-001'
DEFAULT_PASSWORD = 'kar@123'
SESSION_ROLE = 'STAFF'

SESSION_LOGIN_KEY = 'staff_logged_in'
SESSION_ID_KEY = 'staff_id'
SESSION_ROLE_KEY = 'staff_role'
SESSION_ACTIVITY_KEY = 'staff_activity_id'
SESSION_READ_IDS_KEY = 'staff_read_notice_ids'

NOTICE_SEED = [
    {
        'id': 1,
        'title': 'Mid-Sem Exam Schedule Released',
        'description': 'CSE mid-sem exam timetable is now available for all semesters.',
        'full_content': 'The complete exam schedule has been published by the examination cell. Please verify room numbers and reporting times before exam day.',
        'category': 'Academic',
        'department': 'CSE',
        'is_urgent': True,
        'attachments': [{'name': 'Exam-Schedule.pdf', 'url': '#'}],
        'date_time': '2026-04-27T09:00:00',
    },
    {
        'id': 2,
        'title': 'Faculty Meeting - Curriculum Review',
        'description': 'Staff meeting at 3:00 PM in Seminar Hall A.',
        'full_content': 'All department staff are requested to attend the curriculum review meeting. Agenda includes elective planning and accreditation updates.',
        'category': 'Circulars',
        'department': 'CSE',
        'is_urgent': False,
        'attachments': [],
        'date_time': '2026-04-28T15:00:00',
    },
    {
        'id': 3,
        'title': 'Leave Policy Update',
        'description': 'Revised leave policy effective from next month.',
        'full_content': 'The HR section has updated leave policy rules for academic staff. Please review all new clauses before filing leave requests.',
        'category': 'Leave',
        'department': 'ALL',
        'is_urgent': False,
        'attachments': [{'name': 'Leave-Policy.docx', 'url': '#'}],
        'date_time': '2026-04-26T11:30:00',
    },
    {
        'id': 4,
        'title': 'Hackathon Mentors Required',
        'description': 'Department needs mentors for weekend hackathon teams.',
        'full_content': 'Interested staff can register as mentors for the inter-department hackathon. Slots are limited and assigned on first come basis.',
        'category': 'Events',
        'department': 'CSE',
        'is_urgent': False,
        'attachments': [],
        'date_time': '2026-04-29T10:15:00',
    },
    {
        'id': 5,
        'title': 'Urgent Lab Network Maintenance',
        'description': 'Systems will be down from 6 PM to 9 PM today.',
        'full_content': 'Network maintenance will affect all CSE labs. Please save your work in advance and avoid scheduling practical sessions during downtime.',
        'category': 'Urgent',
        'department': 'CSE',
        'is_urgent': True,
        'attachments': [],
        'date_time': '2026-04-27T17:30:00',
    },
    {
        'id': 6,
        'title': 'Accreditation Document Submission',
        'description': 'Submit subject files by Friday evening.',
        'full_content': 'All course coordinators must upload accreditation evidence files before Friday 5 PM. Late submissions will not be accepted.',
        'category': 'Academic',
        'department': 'CSE',
        'is_urgent': True,
        'attachments': [{'name': 'Checklist.xlsx', 'url': '#'}],
        'date_time': '2026-04-30T12:45:00',
    },
]


def _ensure_default_staff_user() -> None:
    StaffUser.objects.get_or_create(
        staff_id=DEFAULT_STAFF_ID,
        defaults={'password': make_password(DEFAULT_PASSWORD)},
    )


def _is_logged_in(request) -> bool:
    return bool(request.session.get(SESSION_LOGIN_KEY) and request.session.get(SESSION_ID_KEY))


def _unauthorized():
    return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)


def _parse_payload(request):
    try:
        return json.loads(request.body.decode('utf-8') or '{}')
    except json.JSONDecodeError:
        return {}


def _get_client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


def _parse_user_agent(user_agent):
    ua = (user_agent or '').lower()
    device_type = 'mobile' if 'mobile' in ua else 'desktop'
    if 'edg' in ua or 'edge' in ua:
        browser = 'Edge'
    elif 'chrome' in ua and 'chromium' not in ua:
        browser = 'Chrome'
    elif 'firefox' in ua:
        browser = 'Firefox'
    elif 'safari' in ua and 'chrome' not in ua:
        browser = 'Safari'
    else:
        browser = 'Unknown'
    return device_type, browser


def _record_staff_login_activity(request, staff_id, status, failure_reason=''):
    device_type, browser = _parse_user_agent(request.META.get('HTTP_USER_AGENT', ''))
    return StaffLoginActivity.objects.create(
        staff_id=staff_id,
        login_time=timezone.now(),
        ip_address=_get_client_ip(request),
        device_type=device_type,
        browser=browser,
        session_id=request.session.session_key or '',
        login_status=status,
        failure_reason=failure_reason,
    )


@require_GET
def health_check(request):
    return JsonResponse({'ok': True, 'service': 'staff_portal'})


@csrf_exempt
@require_POST
def login(request):
    _ensure_default_staff_user()

    payload = _parse_payload(request)
    staff_id = str(payload.get('staff_id', '')).strip()
    password = str(payload.get('password', '')).strip()

    if not staff_id or not password:
        _record_staff_login_activity(request, staff_id or 'UNKNOWN', 'FAILED', 'missing_credentials')
        return JsonResponse({'success': False, 'message': 'Staff ID and password are required.'}, status=400)

    try:
        user = StaffUser.objects.get(staff_id=staff_id)
    except StaffUser.DoesNotExist:
        _record_staff_login_activity(request, staff_id, 'FAILED', 'invalid_credentials')
        return JsonResponse({'success': False, 'message': 'Invalid Staff ID or password.'}, status=401)

    if not check_password(password, user.password):
        _record_staff_login_activity(request, staff_id, 'FAILED', 'invalid_credentials')
        return JsonResponse({'success': False, 'message': 'Invalid Staff ID or password.'}, status=401)

    request.session[SESSION_LOGIN_KEY] = True
    request.session[SESSION_ID_KEY] = staff_id
    request.session[SESSION_ROLE_KEY] = SESSION_ROLE
    request.session.setdefault(SESSION_READ_IDS_KEY, [])
    request.session.save()

    activity = _record_staff_login_activity(request, staff_id, 'SUCCESS')
    request.session[SESSION_ACTIVITY_KEY] = activity.id

    return JsonResponse(
        {
            'success': True,
            'message': 'Login successful.',
            'staff': {'staff_id': staff_id, 'role': SESSION_ROLE, 'department': 'CSE'},
        }
    )


@csrf_exempt
@require_POST
def logout(request):
    if _is_logged_in(request):
        activity_id = request.session.get(SESSION_ACTIVITY_KEY)
        if activity_id:
            StaffLoginActivity.objects.filter(
                id=activity_id,
                logout_time__isnull=True,
            ).update(logout_time=timezone.now())

    request.session.flush()
    return JsonResponse({'success': True, 'message': 'Logged out successfully.'})


@require_GET
def session_info(request):
    if not _is_logged_in(request):
        return JsonResponse({'logged_in': False, 'staff': None})

    return JsonResponse(
        {
            'logged_in': True,
            'staff': {
                'staff_id': request.session.get(SESSION_ID_KEY),
                'role': request.session.get(SESSION_ROLE_KEY, SESSION_ROLE),
                'department': 'CSE',
            },
        }
    )


@require_GET
def list_notices(request):
    if not _is_logged_in(request):
        return _unauthorized()

    query = request.GET.get('q', '').strip().lower()
    category = request.GET.get('category', 'ALL').strip()
    department = request.GET.get('department', 'ALL').strip()
    date_filter = request.GET.get('date', '').strip()

    qs = StaffNotice.objects.filter(
        admin_status='APPROVED',
    ).filter(
        Q(hod_status='APPROVED') | Q(department='ALL')
    ).order_by('-created_at')

    if category != 'ALL':
        qs = qs.filter(category=category)
    if department != 'ALL':
        qs = qs.filter(department__in=[department, 'ALL'])
    if date_filter:
        qs = qs.filter(created_at__date=date_filter)

    if query:
        qs = qs.filter(
            Q(title__icontains=query) |
            Q(description__icontains=query) |
            Q(full_content__icontains=query)
        )

    filtered = [
        {
            'id': n.id,
            'title': n.title,
            'description': n.description,
            'full_content': n.full_content,
            'category': n.category,
            'department': n.department,
            'is_urgent': n.is_urgent,
            'attachments': [],
            'date_time': n.created_at.isoformat() if n.created_at else None,
        }
        for n in qs
    ]

    read_ids = set(request.session.get(SESSION_READ_IDS_KEY, []))
    for item in filtered:
        item['is_read'] = item['id'] in read_ids

    suggestions = []
    if query:
        suggestions = [
            n['title']
            for n in filtered
            if query in n['title'].lower() or query in n['description'].lower()
        ][:6]

    notifications = [n for n in filtered if n['is_urgent']][:5]

    return JsonResponse(
        {
            'success': True,
            'notices': sorted(filtered, key=lambda x: x['date_time'], reverse=True),
            'highlights': [n for n in filtered if n['is_urgent']][:3],
            'notifications': notifications,
            'suggestions': suggestions,
            'unread_count': len([n for n in filtered if not n['is_read']]),
        }
    )


@csrf_exempt
@require_POST
def mark_notice_read(request, notice_id: int):
    if not _is_logged_in(request):
        return _unauthorized()

    read_ids = set(request.session.get(SESSION_READ_IDS_KEY, []))
    read_ids.add(notice_id)
    request.session[SESSION_READ_IDS_KEY] = sorted(read_ids)
    request.session.modified = True

    return JsonResponse({'success': True, 'message': 'Notice marked as read.'})


@require_GET
def list_activity(request):
    if not _is_logged_in(request):
        return _unauthorized()

    staff_id = request.session.get(SESSION_ID_KEY)
    rows = StaffLoginActivity.objects.filter(staff_id=staff_id).order_by('-id')[:20]

    items = [
        {
            'id': row.id,
            'staff_id': row.staff_id,
            'login_time': row.login_time.isoformat() if row.login_time else None,
            'logout_time': row.logout_time.isoformat() if row.logout_time else None,
            'ip_address': row.ip_address,
            'device_type': row.device_type,
            'browser': row.browser,
            'session_id': row.session_id,
            'login_status': row.login_status,
            'failure_reason': row.failure_reason,
            'location': row.location,
        }
        for row in rows
    ]
    return JsonResponse({'success': True, 'items': items})


# ────────────────────────────────── REMINDER ENDPOINTS ──────────────────────────────────


@require_GET
@csrf_exempt
def list_reminders(request):
    """Get all reminders for logged-in staff"""
    if not _is_logged_in(request):
        return _unauthorized()
    
    staff_id = request.session.get(SESSION_ID_KEY)
    reminders = StaffReminder.objects.filter(staff_id=staff_id)
    serializer = StaffReminderSerializer(reminders, many=True)
    return JsonResponse({'success': True, 'reminders': serializer.data})


@csrf_exempt
@require_POST
def seed_notices(request):
    """Create sample StaffNotice rows (approved) with randomized dates and categories.
    POST JSON body: {"count": 10, "departments": ["CSE","ECE"]}
    Returns created notices.
    """
    if not _is_logged_in(request):
        return _unauthorized()

    try:
        payload = _parse_payload(request)
        count = int(payload.get('count', 8))
        departments = payload.get('departments', []) or ['CSE']
        count = max(1, min(200, count))

        cats = [c[0] for c in StaffNotice.CATEGORY_CHOICES]
        created = []
        now = timezone.now()

        for i in range(count):
            title = payload.get('title_template') or f"Sample Notice #{random.randint(1000,9999)}"
            category = random.choice(cats)
            dept = random.choice(departments)
            # random date within ±30 days
            offset_days = random.randint(-30, 30)
            created_at = now + timedelta(days=offset_days, hours=random.randint(0,23), minutes=random.randint(0,59))

            n = StaffNotice.objects.create(
                title=title if i == 0 or 'template' in payload else f"{title} {i+1}",
                description=(payload.get('description') or "This is a generated sample notice for testing."),
                full_content=(payload.get('full_content') or "Generated sample content."),
                category=category if category in cats else 'General',
                department=dept,
                is_urgent=bool(payload.get('urgent') and random.random() < 0.3),
                hod_status='APPROVED',
                admin_status='APPROVED',
                created_at=created_at,
            )

            created.append({
                'id': n.id,
                'title': n.title,
                'description': n.description,
                'category': n.category,
                'department': n.department,
                'is_urgent': n.is_urgent,
                'date_time': n.created_at.isoformat() if n.created_at else None,
            })

        return JsonResponse({'success': True, 'created': created, 'count': len(created)})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@csrf_exempt
@require_POST
def create_reminder(request):
    """Create a new reminder"""
    if not _is_logged_in(request):
        return _unauthorized()
    
    try:
        data = _parse_payload(request)
        staff_id = request.session.get(SESSION_ID_KEY)
        
        reminder = StaffReminder.objects.create(
            staff_id=staff_id,
            reminder_date=data.get('date'),
            reminder_time=data.get('time'),
            reminder_note=data.get('note'),
            status='unsent'
        )
        serializer = StaffReminderSerializer(reminder)
        return JsonResponse({'success': True, 'reminder': serializer.data}, status=201)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@csrf_exempt
@require_POST
def update_reminder(request, reminder_id):
    """Update reminder status"""
    if not _is_logged_in(request):
        return _unauthorized()
    
    try:
        reminder = StaffReminder.objects.get(id=reminder_id)
        data = _parse_payload(request)
        reminder.status = data.get('status', reminder.status)
        reminder.save()
        serializer = StaffReminderSerializer(reminder)
        return JsonResponse({'success': True, 'reminder': serializer.data})
    except StaffReminder.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Reminder not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=400)


@csrf_exempt
@require_POST
def delete_reminder(request, reminder_id):
    """Delete a reminder"""
    if not _is_logged_in(request):
        return _unauthorized()
    
    try:
        reminder = StaffReminder.objects.get(id=reminder_id)
        reminder.delete()
        return JsonResponse({'success': True, 'message': 'Reminder deleted'}, status=204)
    except StaffReminder.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Reminder not found'}, status=404)
