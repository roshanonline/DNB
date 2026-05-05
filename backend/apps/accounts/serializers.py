"""Accounts Serializers"""
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import (
    User, NotificationPrefs, RiskTable,
    StudentLoginActivity, DepartmentLoginActivity, AdminLoginActivity,
)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'name', 'email', 'first_name', 'last_name',
            'role', 'department', 'roll_number', 'phone', 'bio', 'avatar',
            'year', 'date_of_birth', 'aadhaar_number',
            'is_active', 'date_joined',
        ]
        read_only_fields = ['id', 'role']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password2',
            'first_name', 'last_name', 'role', 'department', 'roll_number',
        ]

    def validate_email(self, value):
        if value and User.objects.filter(email=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def validate_roll_number(self, value):
        if value and User.objects.filter(roll_number=value).exists():
            raise serializers.ValidationError('A user with this register number already exists.')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password2'):
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        raw_password = validated_data['password']
        role = validated_data.get('role', 'STUDENT')
        # Auto-fill roll_number from username for students if not explicitly provided
        if role == 'STUDENT' and not validated_data.get('roll_number'):
            validated_data['roll_number'] = validated_data.get('username', '')
        user = User.objects.create_user(**validated_data)
        user.initial_password = raw_password
        # New students start unapproved and inactive until the department approves them
        if role == 'STUDENT':
            user.is_approved = False
            user.is_active = False
            user.registration_notification_sent = False
        user.save(update_fields=['initial_password', 'is_approved', 'is_active', 'registration_notification_sent'])
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adds user data to the token response and enforces student approval gate."""

    def validate(self, attrs):
        # Pre-check: surface meaningful errors before attempting authentication
        username_val = attrs.get(self.username_field, '')
        try:
            candidate = User.objects.get(**{self.username_field: username_val})
            if candidate.role == 'STUDENT' and not candidate.is_approved:
                raise serializers.ValidationError(
                    'Your registration is pending department approval. '
                    'Please wait until the department reviews your account.'
                )
            if candidate.role == 'STUDENT' and candidate.is_approved and not candidate.is_active:
                raise serializers.ValidationError(
                    'Your account has been blocked by the department. '
                    'Please contact your department administrator.'
                )
        except User.DoesNotExist:
            pass  # super().validate() will reject bad credentials

        data = super().validate(attrs)
        user = self.user
        data['user'] = {
            'id': user.id,
            'username': user.username,
            'name': user.name or f'{user.first_name} {user.last_name}'.strip() or user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role,
            'department': user.department,
            'roll_number': user.roll_number,
            'phone': user.phone,
            'year': user.year,
            'date_of_birth': str(user.date_of_birth) if user.date_of_birth else None,
            'date_joined': user.date_joined.isoformat() if user.date_joined else None,
            'avatar': user.avatar.url if user.avatar else None,
            'is_approved': user.is_approved,
        }
        return data

class StudentListSerializer(serializers.ModelSerializer):
    """Serializer for the department student-list view."""
    class Meta:
        model = User
        fields = [
            'id', 'username', 'name', 'first_name', 'last_name', 'email',
            'roll_number', 'phone', 'aadhaar_number', 'year', 'date_of_birth',
            'department', 'is_active', 'is_approved', 'date_joined', 'initial_password',
        ]
        read_only_fields = fields


class NotificationPrefsSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPrefs
        fields = ['exam', 'event', 'academic', 'holiday', 'placement', 'scholarship', 'internship', 'workshop']


class RiskTableSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    department = serializers.CharField(source='user.department', read_only=True)
    low_engagement_days = serializers.SerializerMethodField()

    class Meta:
        model = RiskTable
        fields = ['id', 'username', 'department', 'risk_score', 'risk_level', 'missed_deadlines', 'low_engagement_days', 'updated_at']

    def get_low_engagement_days(self, obj):
        # Estimate based on risk score: higher risk → more low-engagement days
        return int(obj.risk_score * 30)


class StudentLoginActivitySerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    role = serializers.CharField(default='STUDENT', read_only=True)

    class Meta:
        model = StudentLoginActivity
        fields = [
            'id', 'role', 'username', 'login_identifier', 'login_time', 'logout_time',
            'ip_address', 'device_type', 'browser', 'session_id', 'login_status',
            'failure_reason', 'location', 'created_at',
        ]


class DepartmentLoginActivitySerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    role = serializers.CharField(default='DEPARTMENT', read_only=True)

    class Meta:
        model = DepartmentLoginActivity
        fields = [
            'id', 'role', 'username', 'login_identifier', 'login_time', 'logout_time',
            'ip_address', 'device_type', 'browser', 'session_id', 'login_status',
            'failure_reason', 'location', 'created_at',
        ]


class AdminLoginActivitySerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    role = serializers.CharField(default='ADMIN', read_only=True)

    class Meta:
        model = AdminLoginActivity
        fields = [
            'id', 'role', 'username', 'login_identifier', 'login_time', 'logout_time',
            'ip_address', 'device_type', 'browser', 'session_id', 'login_status',
            'failure_reason', 'location', 'created_at',
        ]
