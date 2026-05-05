"""
Accounts App – Custom User Model & Profile Models
"""
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    ROLE_CHOICES = [
        ('STUDENT', 'Student'),
        ('DEPARTMENT', 'Department'),
        ('ADMIN', 'Admin'),
    ]
    DEPARTMENT_CHOICES = [
        ('CSE', 'Computer Science & Engineering'),
        ('ECE', 'Electronics & Communication Engineering'),
        ('EEE', 'Electrical & Electronics Engineering'),
        ('MECH', 'Mechanical Engineering'),
        ('CIVIL', 'Civil Engineering'),
        ('ALL', 'All Departments'),
    ]

    # Schema field: name (full display name)
    name = models.CharField(max_length=200, blank=True, default='')
    # Make email unique as per schema
    email = models.EmailField(unique=True, blank=True, default='')

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='STUDENT')
    department = models.CharField(max_length=10, choices=DEPARTMENT_CHOICES, default='CSE')
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    phone = models.CharField(max_length=15, blank=True, default='')
    roll_number = models.CharField(max_length=20, blank=True, default='')
    bio = models.TextField(blank=True, default='')
    initial_password = models.CharField(
        max_length=128, blank=True, default='',
        help_text='Temporary/initial plain-text password for dept credential view'
    )
    aadhaar_number = models.CharField(
        max_length=12, blank=True, default='',
        help_text='12-digit Aadhaar card number'
    )
    YEAR_CHOICES = [
        ('1', '1st Year'), ('2', '2nd Year'), ('3', '3rd Year'), ('4', 'Final Year'),
    ]
    year = models.CharField(max_length=1, choices=YEAR_CHOICES, blank=True, default='')
    date_of_birth = models.DateField(null=True, blank=True)
    is_approved = models.BooleanField(
        default=True,
        help_text='Set False for new student registrations until department approves'
    )
    registration_notification_sent = models.BooleanField(
        default=True,
        help_text='True once the dept registration-notification has been dispatched'
    )

    class Meta:
        db_table = 'users'

    def save(self, *args, **kwargs):
        # Auto-populate name from first_name + last_name if not set
        if not self.name and (self.first_name or self.last_name):
            self.name = f'{self.first_name} {self.last_name}'.strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.username} ({self.role})'


class NotificationPrefs(models.Model):
    """Student notification category preferences."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_prefs')
    exam = models.BooleanField(default=True)
    event = models.BooleanField(default=True)
    academic = models.BooleanField(default=True)
    holiday = models.BooleanField(default=True)
    placement = models.BooleanField(default=True)
    scholarship = models.BooleanField(default=True)
    internship = models.BooleanField(default=True)
    workshop = models.BooleanField(default=True)

    class Meta:
        db_table = 'notification_prefs'

    def __str__(self):
        return f'Prefs for {self.user.username}'


class RiskTable(models.Model):
    """Per-student deadline risk prediction scores."""
    RISK_LEVELS = [('LOW', 'Low'), ('MEDIUM', 'Medium'), ('HIGH', 'High')]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='risk_profile')
    risk_score = models.FloatField(default=0.0)
    risk_level = models.CharField(max_length=10, choices=RISK_LEVELS, default='LOW')
    missed_deadlines = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'risk_table'

    def __str__(self):
        return f'Risk({self.user.username}): {self.risk_level}'


class StudentLoginActivity(models.Model):
    LOGIN_STATUS_CHOICES = [
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    login_identifier = models.CharField(max_length=150, blank=True, default='')
    login_time = models.DateTimeField(default=timezone.now)
    logout_time = models.DateTimeField(null=True, blank=True)
    ip_address = models.CharField(max_length=45, blank=True, default='')
    device_type = models.CharField(max_length=50, blank=True, default='')
    browser = models.CharField(max_length=120, blank=True, default='')
    session_id = models.CharField(max_length=255, blank=True, default='')
    login_status = models.CharField(max_length=10, choices=LOGIN_STATUS_CHOICES, default='SUCCESS')
    failure_reason = models.CharField(max_length=120, blank=True, default='')
    location = models.CharField(max_length=120, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'student_login_activity'
        indexes = [
            models.Index(fields=['user', 'login_time'], name='student_log_user_id_9232f8_idx'),
            models.Index(fields=['login_time'], name='student_log_login_t_0fe0f5_idx'),
        ]

    def __str__(self):
        label = self.user.username if self.user else self.login_identifier or 'unknown'
        return f'StudentLogin({label})'


class DepartmentLoginActivity(models.Model):
    LOGIN_STATUS_CHOICES = [
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    login_identifier = models.CharField(max_length=150, blank=True, default='')
    login_time = models.DateTimeField(default=timezone.now)
    logout_time = models.DateTimeField(null=True, blank=True)
    ip_address = models.CharField(max_length=45, blank=True, default='')
    device_type = models.CharField(max_length=50, blank=True, default='')
    browser = models.CharField(max_length=120, blank=True, default='')
    session_id = models.CharField(max_length=255, blank=True, default='')
    login_status = models.CharField(max_length=10, choices=LOGIN_STATUS_CHOICES, default='SUCCESS')
    failure_reason = models.CharField(max_length=120, blank=True, default='')
    location = models.CharField(max_length=120, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'department_login_activity'
        indexes = [
            models.Index(fields=['user', 'login_time'], name='department__user_id_5903b7_idx'),
            models.Index(fields=['login_time'], name='department__login_t_182d8d_idx'),
        ]

    def __str__(self):
        label = self.user.username if self.user else self.login_identifier or 'unknown'
        return f'DepartmentLogin({label})'


class AdminLoginActivity(models.Model):
    LOGIN_STATUS_CHOICES = [
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    login_identifier = models.CharField(max_length=150, blank=True, default='')
    login_time = models.DateTimeField(default=timezone.now)
    logout_time = models.DateTimeField(null=True, blank=True)
    ip_address = models.CharField(max_length=45, blank=True, default='')
    device_type = models.CharField(max_length=50, blank=True, default='')
    browser = models.CharField(max_length=120, blank=True, default='')
    session_id = models.CharField(max_length=255, blank=True, default='')
    login_status = models.CharField(max_length=10, choices=LOGIN_STATUS_CHOICES, default='SUCCESS')
    failure_reason = models.CharField(max_length=120, blank=True, default='')
    location = models.CharField(max_length=120, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'admin_login_activity'
        indexes = [
            models.Index(fields=['user', 'login_time'], name='admin_login_user_id_6981ef_idx'),
            models.Index(fields=['login_time'], name='admin_login_login_t_a7b86d_idx'),
        ]

    def __str__(self):
        label = self.user.username if self.user else self.login_identifier or 'unknown'
        return f'AdminLogin({label})'
