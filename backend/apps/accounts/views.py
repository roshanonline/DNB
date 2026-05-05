"""Accounts Views"""
from datetime import timedelta

from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone

from .models import (
    NotificationPrefs, RiskTable,
    StudentLoginActivity, DepartmentLoginActivity, AdminLoginActivity,
)
from .serializers import (
    RegisterSerializer, UserSerializer,
    CustomTokenObtainPairSerializer,
    NotificationPrefsSerializer, RiskTableSerializer,
    StudentListSerializer,
    StudentLoginActivitySerializer, DepartmentLoginActivitySerializer, AdminLoginActivitySerializer,
)
from apps.staff.models import StaffLoginActivity

User = get_user_model()


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


def _normalize_portal_role(value):
    role = str(value or '').upper()
    if role == 'STAFF':
        return 'DEPARTMENT'
    return role


def _get_login_model(role):
    if role == 'STUDENT':
        return StudentLoginActivity
    if role == 'DEPARTMENT':
        return DepartmentLoginActivity
    if role == 'ADMIN':
        return AdminLoginActivity
    return None


def _extract_session_id(access_token):
    if not access_token:
        return ''
    try:
        token = AccessToken(access_token)
        return str(token.get('jti', '') or '')
    except Exception:
        return ''


def _normalize_failure_reason(detail):
    msg = (detail or '').lower()
    if 'pending' in msg or 'approval' in msg:
        return 'not_approved'
    if 'blocked' in msg:
        return 'blocked'
    if 'invalid' in msg or 'no active account' in msg:
        return 'invalid_credentials'
    return (detail or 'login_failed')[:120]


def _record_login_activity(*, role, user, login_identifier, status, failure_reason, request, access_token):
    model = _get_login_model(role)
    if not model:
        return
    device_type, browser = _parse_user_agent(request.META.get('HTTP_USER_AGENT', ''))
    model.objects.create(
        user=user,
        login_identifier=login_identifier or '',
        login_time=timezone.now(),
        ip_address=_get_client_ip(request),
        device_type=device_type,
        browser=browser,
        session_id=_extract_session_id(access_token),
        login_status=status,
        failure_reason=failure_reason or '',
    )


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        requested_portal_role = _normalize_portal_role(request.data.get('portal_role'))

        if response.status_code != 200:
            failure_reason = _normalize_failure_reason(response.data.get('detail', 'login_failed'))
            _record_login_activity(
                role=requested_portal_role or 'STUDENT',
                user=None,
                login_identifier=str(request.data.get('username', '')).strip(),
                status='FAILED',
                failure_reason=failure_reason,
                request=request,
                access_token=None,
            )
            request.session.pop('role', None)
            return response

        user_data = response.data.get('user', {})
        user_role = str(user_data.get('role', '')).upper()

        try:
            user = User.objects.get(id=user_data.get('id'))
        except User.DoesNotExist:
            user = None

        session_role = user_role
        if user_role == 'DEPARTMENT' and requested_portal_role in ('DEPARTMENT', 'STAFF'):
            session_role = requested_portal_role

        request.session['role'] = session_role
        request.session.modified = True
        response.data['session_role'] = session_role

        _record_login_activity(
            role=user_role,
            user=user,
            login_identifier=user.username if user else str(request.data.get('username', '')).strip(),
            status='SUCCESS',
            failure_reason='',
            request=request,
            access_token=response.data.get('access'),
        )
        return response


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        # After saving, send a one-time notification to the department user
        if user.role == 'STUDENT' and not user.registration_notification_sent:
            self._notify_department(user)

    @staticmethod
    def _notify_department(student):
        from apps.notices.models import UserNotification
        dept_user = User.objects.filter(
            role='DEPARTMENT', department=student.department, is_active=True
        ).first()
        if dept_user:
            UserNotification.objects.create(
                user=dept_user,
                title='New Student Registration',
                message=(
                    f'Student "{student.get_full_name() or student.username}" '
                    f'(Register No: {student.roll_number or "N/A"}, '
                    f'Email: {student.email}) has registered and is awaiting approval.'
                ),
                notification_type='STUDENT_REG',
            )
        student.registration_notification_sent = True
        student.save(update_fields=['registration_notification_sent'])


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class NotificationPrefsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        prefs, _ = NotificationPrefs.objects.get_or_create(user=request.user)
        return Response(NotificationPrefsSerializer(prefs).data)

    def put(self, request):
        prefs, _ = NotificationPrefs.objects.get_or_create(user=request.user)
        serializer = NotificationPrefsSerializer(prefs, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            # Clear the student's dashboard cache so priorities are recalculated with new prefs
            cache.delete(f'dashboard_{request.user.id}')
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        return self.put(request)


class AllUsersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Admin only'}, status=403)
        role_filter = request.query_params.get('role')
        qs = User.objects.all().order_by('-date_joined')
        if role_filter:
            qs = qs.filter(role=role_filter.upper())
        return Response(UserSerializer(qs, many=True).data)

    def delete(self, request):
        user_id = request.data.get('user_id')
        if request.user.role != 'ADMIN':
            return Response({'error': 'Admin only'}, status=403)
        User.objects.filter(id=user_id).delete()
        return Response({'success': True})


class ToggleBlockView(APIView):
    """Block or unblock a student account (ADMIN or DEPARTMENT for their own students)."""
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        if request.user.role not in ('ADMIN', 'DEPARTMENT'):
            return Response({'error': 'Permission denied'}, status=403)
        try:
            target = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=404)
        if target.role != 'STUDENT':
            return Response({'error': 'Can only block student accounts'}, status=400)
        if request.user.role == 'DEPARTMENT' and target.department != request.user.department:
            return Response({'error': 'Cannot modify students from other departments'}, status=403)
        target.is_active = not target.is_active
        target.save(update_fields=['is_active'])
        return Response({'id': target.id, 'is_active': target.is_active})


class DepartmentStudentsView(APIView):
    """List all approved students in the requesting department (DEPARTMENT or ADMIN only)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in ('DEPARTMENT', 'ADMIN'):
            return Response({'error': 'Permission denied'}, status=403)
        dept = request.user.department
        qs = User.objects.filter(role='STUDENT', department=dept, is_approved=True).order_by('username')
        return Response(StudentListSerializer(qs, many=True).data)


class ResetStudentPasswordView(APIView):
    """Reset a student's password (DEPARTMENT for own dept, ADMIN for all)."""
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        if request.user.role not in ('DEPARTMENT', 'ADMIN'):
            return Response({'error': 'Permission denied'}, status=403)
        try:
            student = User.objects.get(id=user_id, role='STUDENT')
        except User.DoesNotExist:
            return Response({'error': 'Student not found'}, status=404)
        if request.user.role == 'DEPARTMENT' and student.department != request.user.department:
            return Response({'error': 'Cannot reset passwords for students in other departments'}, status=403)
        new_password = request.data.get('new_password', '').strip()
        if not new_password or len(new_password) < 4:
            return Response({'error': 'Password must be at least 4 characters'}, status=400)
        student.set_password(new_password)
        student.initial_password = new_password
        student.save(update_fields=['password', 'initial_password'])
        return Response({'success': True, 'new_password': new_password})


class SendStudentAlertView(APIView):
    """Send a direct UserNotification alert to a student."""
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        if request.user.role not in ('DEPARTMENT', 'ADMIN'):
            return Response({'error': 'Permission denied'}, status=403)
        try:
            student = User.objects.get(id=user_id, role='STUDENT')
        except User.DoesNotExist:
            return Response({'error': 'Student not found'}, status=404)
        if request.user.role == 'DEPARTMENT' and student.department != request.user.department:
            return Response({'error': 'Cannot alert students from other departments'}, status=403)
        title = request.data.get('title', 'Department Alert').strip() or 'Department Alert'
        message = request.data.get('message', '').strip()
        if not message:
            return Response({'error': 'Message is required'}, status=400)
        from apps.notices.models import UserNotification
        UserNotification.objects.create(
            user=student,
            title=title,
            message=message,
            notification_type='SYSTEM',
        )
        return Response({'success': True})


class PendingStudentsView(APIView):
    """List unapproved students waiting for department review."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in ('DEPARTMENT', 'ADMIN'):
            return Response({'error': 'Permission denied'}, status=403)
        dept = request.user.department
        qs = User.objects.filter(role='STUDENT', is_approved=False)
        if request.user.role == 'DEPARTMENT':
            qs = qs.filter(department=dept)
        qs = qs.order_by('-date_joined')
        return Response(StudentListSerializer(qs, many=True).data)


class AddStudentByDeptView(APIView):
    """Department directly adds a student (auto-approved, skips registration flow)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role not in ('DEPARTMENT', 'ADMIN'):
            return Response({'error': 'Permission denied'}, status=403)

        email = request.data.get('email', '').strip().lower()
        roll_number = request.data.get('roll_number', '').strip()
        first_name = request.data.get('first_name', '').strip()
        last_name = request.data.get('last_name', '').strip()
        phone = request.data.get('phone', '').strip()
        aadhaar_number = request.data.get('aadhaar_number', '').strip()
        year = request.data.get('year', '').strip()
        date_of_birth = request.data.get('date_of_birth') or None
        dept = request.user.department

        if not email:
            return Response({'error': 'Email is required.'}, status=400)
        if not roll_number:
            return Response({'error': 'Register number is required.'}, status=400)

        if aadhaar_number and (not aadhaar_number.isdigit() or len(aadhaar_number) != 12):
            return Response({'error': 'Aadhaar number must be exactly 12 digits.'}, status=400)

        if User.objects.filter(email=email).exists():
            return Response({'error': 'A user with this email already exists.'}, status=400)
        if User.objects.filter(roll_number=roll_number).exists():
            return Response({'error': 'A user with this register number already exists.'}, status=400)
        if User.objects.filter(username=roll_number).exists():
            return Response({'error': 'Username (register number) is already taken.'}, status=400)

        # Auto-generate a secure temporary password (student sets own password later)
        import secrets, string
        alphabet = string.ascii_letters + string.digits + '@#!'
        temp_password = ''.join(secrets.choice(alphabet) for _ in range(10))

        user = User.objects.create_user(
            username=roll_number,
            email=email,
            password=temp_password,
            first_name=first_name,
            last_name=last_name,
            role='STUDENT',
            department=dept,
            roll_number=roll_number,
            phone=phone,
            aadhaar_number=aadhaar_number,
            year=year,
            date_of_birth=date_of_birth,
        )
        user.is_approved = True
        user.is_active = True
        user.initial_password = temp_password
        user.registration_notification_sent = True
        user.save(update_fields=['is_approved', 'is_active', 'initial_password', 'registration_notification_sent'])

        return Response(StudentListSerializer(user).data, status=201)


class DeleteStudentView(APIView):
    """Delete a student account (DEPARTMENT for own dept, ADMIN for all)."""
    permission_classes = [IsAuthenticated]

    def delete(self, request, user_id):
        if request.user.role not in ('DEPARTMENT', 'ADMIN'):
            return Response({'error': 'Permission denied'}, status=403)
        try:
            student = User.objects.get(id=user_id, role='STUDENT')
        except User.DoesNotExist:
            return Response({'error': 'Student not found'}, status=404)
        if request.user.role == 'DEPARTMENT' and student.department != request.user.department:
            return Response({'error': 'Cannot delete students from other departments'}, status=403)
        student.delete()
        return Response({'success': True})


class ApproveStudentView(APIView):
    """Approve or reject a pending student registration."""
    permission_classes = [IsAuthenticated]

    def post(self, request, user_id):
        if request.user.role not in ('DEPARTMENT', 'ADMIN'):
            return Response({'error': 'Permission denied'}, status=403)
        try:
            student = User.objects.get(id=user_id, role='STUDENT')
        except User.DoesNotExist:
            return Response({'error': 'Student not found'}, status=404)
        if request.user.role == 'DEPARTMENT' and student.department != request.user.department:
            return Response({'error': 'Cannot approve students from other departments'}, status=403)

        action = request.data.get('action', 'approve')  # 'approve' | 'reject'
        if action == 'approve':
            student.is_approved = True
            student.is_active = True
            student.save(update_fields=['is_approved', 'is_active'])
            # Notify the student
            from apps.notices.models import UserNotification
            UserNotification.objects.create(
                user=student,
                title='Registration Approved',
                message=(
                    'Your registration has been approved by the department. '
                    'You can now log in to SmartBoard 360.'
                ),
                notification_type='SYSTEM',
            )
            return Response({'id': student.id, 'is_approved': True, 'is_active': True})
        elif action == 'reject':
            # Delete the account on rejection so they can re-register
            student_name = student.get_full_name() or student.username
            student.delete()
            return Response({'detail': f'Student "{student_name}" registration rejected and removed.'})
        return Response({'error': 'Invalid action. Use "approve" or "reject".'}, status=400)


class LoginHistoryView(APIView):
    """Return login history for the current authenticated user."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        limit = min(int(request.query_params.get('limit', 50)), 200)
        role = request.user.role
        if role == 'STUDENT':
            qs = StudentLoginActivity.objects.filter(user=request.user).order_by('-login_time')[:limit]
            return Response(StudentLoginActivitySerializer(qs, many=True).data)
        if role == 'DEPARTMENT':
            qs = DepartmentLoginActivity.objects.filter(user=request.user).order_by('-login_time')[:limit]
            return Response(DepartmentLoginActivitySerializer(qs, many=True).data)
        if role == 'ADMIN':
            qs = AdminLoginActivity.objects.filter(user=request.user).order_by('-login_time')[:limit]
            return Response(AdminLoginActivitySerializer(qs, many=True).data)
        return Response({'error': 'Unsupported role'}, status=400)


class AdminLoginActivityView(APIView):
    """Return login history across all roles (admin-only)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Admin only'}, status=403)

        limit = min(int(request.query_params.get('limit', 200)), 500)
        student_rows = StudentLoginActivity.objects.order_by('-login_time')[:limit]
        dept_rows = DepartmentLoginActivity.objects.order_by('-login_time')[:limit]
        admin_rows = AdminLoginActivity.objects.order_by('-login_time')[:limit]
        staff_rows = StaffLoginActivity.objects.order_by('-login_time')[:limit]

        items = []
        for row in student_rows:
            items.append({
                'id': row.id,
                'role': 'STUDENT',
                'username': row.user.username if row.user else '',
                'login_identifier': row.login_identifier,
                'login_time': row.login_time,
                'logout_time': row.logout_time,
                'ip_address': row.ip_address,
                'device_type': row.device_type,
                'browser': row.browser,
                'session_id': row.session_id,
                'login_status': row.login_status,
                'failure_reason': row.failure_reason,
                'location': row.location,
                'created_at': row.created_at,
            })
        for row in dept_rows:
            items.append({
                'id': row.id,
                'role': 'DEPARTMENT',
                'username': row.user.username if row.user else '',
                'login_identifier': row.login_identifier,
                'login_time': row.login_time,
                'logout_time': row.logout_time,
                'ip_address': row.ip_address,
                'device_type': row.device_type,
                'browser': row.browser,
                'session_id': row.session_id,
                'login_status': row.login_status,
                'failure_reason': row.failure_reason,
                'location': row.location,
                'created_at': row.created_at,
            })
        for row in admin_rows:
            items.append({
                'id': row.id,
                'role': 'ADMIN',
                'username': row.user.username if row.user else '',
                'login_identifier': row.login_identifier,
                'login_time': row.login_time,
                'logout_time': row.logout_time,
                'ip_address': row.ip_address,
                'device_type': row.device_type,
                'browser': row.browser,
                'session_id': row.session_id,
                'login_status': row.login_status,
                'failure_reason': row.failure_reason,
                'location': row.location,
                'created_at': row.created_at,
            })
        for row in staff_rows:
            items.append({
                'id': row.id,
                'role': 'STAFF',
                'username': row.staff_id,
                'login_identifier': row.staff_id,
                'login_time': row.login_time,
                'logout_time': row.logout_time,
                'ip_address': row.ip_address,
                'device_type': row.device_type,
                'browser': row.browser,
                'session_id': row.session_id,
                'login_status': row.login_status,
                'failure_reason': row.failure_reason,
                'location': row.location,
                'created_at': row.created_at,
            })

        items.sort(key=lambda x: x['login_time'] or timezone.now(), reverse=True)
        return Response(items[:limit])


class AdminLoginHistoryByRoleView(APIView):
    """Return login history for a specific role (admin-only)."""
    permission_classes = [IsAuthenticated]

    def get(self, request, role):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Admin only'}, status=403)
        limit = min(int(request.query_params.get('limit', 200)), 500)
        role = role.upper()
        if role == 'STUDENT':
            qs = StudentLoginActivity.objects.order_by('-login_time')[:limit]
            return Response(StudentLoginActivitySerializer(qs, many=True).data)
        if role == 'DEPARTMENT':
            qs = DepartmentLoginActivity.objects.order_by('-login_time')[:limit]
            return Response(DepartmentLoginActivitySerializer(qs, many=True).data)
        if role == 'ADMIN':
            qs = AdminLoginActivity.objects.order_by('-login_time')[:limit]
            return Response(AdminLoginActivitySerializer(qs, many=True).data)
        if role == 'STAFF':
            qs = StaffLoginActivity.objects.order_by('-login_time')[:limit]
            items = [
                {
                    'id': row.id,
                    'role': 'STAFF',
                    'username': row.staff_id,
                    'login_identifier': row.staff_id,
                    'login_time': row.login_time,
                    'logout_time': row.logout_time,
                    'ip_address': row.ip_address,
                    'device_type': row.device_type,
                    'browser': row.browser,
                    'session_id': row.session_id,
                    'login_status': row.login_status,
                    'failure_reason': row.failure_reason,
                    'location': row.location,
                    'created_at': row.created_at,
                }
                for row in qs
            ]
            return Response(items)
        return Response({'error': 'Unsupported role'}, status=400)


class AdminLoginAnalyticsView(APIView):
    """Return daily login stats and failed attempts for the last 30 days."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'ADMIN':
            return Response({'error': 'Admin only'}, status=403)

        since = timezone.now() - timedelta(days=30)
        buckets = {}

        def add_row(day, key, failed=False):
            if day not in buckets:
                buckets[day] = {'date': day, 'student': 0, 'department': 0, 'admin': 0, 'staff': 0, 'failed': 0}
            buckets[day][key] += 1
            if failed:
                buckets[day]['failed'] += 1

        for row in StudentLoginActivity.objects.filter(login_time__gte=since).only('login_time', 'login_status'):
            day = row.login_time.date().isoformat()
            add_row(day, 'student', row.login_status == 'FAILED')
        for row in DepartmentLoginActivity.objects.filter(login_time__gte=since).only('login_time', 'login_status'):
            day = row.login_time.date().isoformat()
            add_row(day, 'department', row.login_status == 'FAILED')
        for row in AdminLoginActivity.objects.filter(login_time__gte=since).only('login_time', 'login_status'):
            day = row.login_time.date().isoformat()
            add_row(day, 'admin', row.login_status == 'FAILED')
        for row in StaffLoginActivity.objects.filter(login_time__gte=since).only('login_time', 'login_status'):
            day = row.login_time.date().isoformat()
            add_row(day, 'staff', row.login_status == 'FAILED')

        daily = sorted(buckets.values(), key=lambda x: x['date'])
        return Response({'daily': daily})

