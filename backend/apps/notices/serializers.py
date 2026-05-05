"""Notices Serializers"""
from rest_framework import serializers
from .models import Notice, EngagementLog, Bookmark, SavedNotice, SystemNotification, NoticeAttachment, UserNotification, StaffNotice
import os
from apps.accounts.serializers import UserSerializer


class NoticeAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.ReadOnlyField()
    file_size_display = serializers.ReadOnlyField()

    class Meta:
        model = NoticeAttachment
        fields = ['id', 'notice', 'file', 'file_name', 'file_type',
                  'file_size', 'file_size_display', 'file_url', 'uploaded_by', 'created_at']
        read_only_fields = ['uploaded_by', 'file_type', 'file_name', 'file_size', 'created_at']


class NoticeSerializer(serializers.ModelSerializer):
    days_remaining = serializers.ReadOnlyField()
    created_by_name = serializers.SerializerMethodField()
    is_bookmarked = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()
    ml_score = serializers.FloatField(source='priority_score', read_only=True)
    priority_level = serializers.CharField(source='priority', read_only=True)
    similarity_score = serializers.SerializerMethodField()  # DistilBERT semantic search score
    risk_indicator = serializers.SerializerMethodField()    # Cox Model risk level + color
    attachments = NoticeAttachmentSerializer(many=True, read_only=True)
    all_attachments = serializers.SerializerMethodField()

    class Meta:
        model = Notice
        fields = '__all__'

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return 'Admin'

    def get_is_bookmarked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Bookmark.objects.filter(user=request.user, notice=obj).exists()
        return False

    def get_is_saved(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return SavedNotice.objects.filter(user=request.user, notice=obj).exists()
        return False

    def get_similarity_score(self, obj):
        """Return DistilBERT semantic search similarity score if available."""
        return getattr(obj, 'similarity_score', None)

    def get_risk_indicator(self, obj):
        """
        Calculate risk indicator for this notice based on deadline.
        Returns: { 'level': 'LOW'|'MEDIUM'|'HIGH', 'color': '#HEX', 'days_remaining': int }
        
        Color coding:
          - LOW (>7 days):   Emerald/Green
          - MEDIUM (4-7):    Amber/Yellow
          - HIGH (≤3 days):  Red
        """
        try:
            from .ml.risk_engine import calculate_notice_risk
            return calculate_notice_risk(obj)
        except Exception as e:
            # Fallback to safe default
            return {
                'level': 'LOW',
                'color': '#10B981',
                'days_remaining': None,
            }

    def get_all_attachments(self, obj):
        """Merge NoticeAttachment rows + legacy CSV file fields into one list."""
        request = self.context.get('request')
        results = []

        # 1. Real NoticeAttachment objects (files uploaded via the UI)
        for att in obj.attachments.all():
            url = ''
            if att.file:
                try:
                    url = request.build_absolute_uri(att.file.url) if request else att.file.url
                except Exception:
                    url = ''
            results.append({
                'id': att.id,
                'file_name': att.file_name or att.file.name.split('/')[-1] if att.file else '',
                'file_type': att.file_type,
                'file_size_display': att.file_size_display,
                'url': url,
                'uploaded_at': att.created_at.isoformat() if att.created_at else None,
                'source': 'upload',
            })

        # 2. Legacy CharField file references from CSV import
        base = request.build_absolute_uri('/media/') if request else 'http://localhost:8000/media/'
        legacy_fields = [
            ('image_file', 'IMAGE'),
            ('video_file', 'VIDEO'),
            ('pdf_file',   'PDF'),
            ('audio_file', 'AUDIO'),
            ('excel_file', 'EXCEL'),
            ('ppt_file',   'PPT'),
            ('csv_file',   'CSV'),
        ]
        seen = set()
        for field, ftype in legacy_fields:
            val = (getattr(obj, field, '') or '').strip()
            if not val or val in seen:
                continue
            seen.add(val)
            fname = val.split('/')[-1]
            # Build absolute URL: if it already starts with http use as-is,
            # otherwise prefix with MEDIA_URL base
            url = val if val.startswith('http') else base + val
            results.append({
                'id': f'legacy_{field}_{obj.id}',
                'file_name': fname,
                'file_type': ftype,
                'file_size_display': '',
                'url': url,
                'uploaded_at': None,
                'source': 'csv',
            })

        return results


class EngagementLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = EngagementLog
        fields = '__all__'
        read_only_fields = ['user', 'created_at']


class BookmarkSerializer(serializers.ModelSerializer):
    notice = NoticeSerializer(read_only=True)
    notice_id = serializers.PrimaryKeyRelatedField(
        queryset=Notice.objects.all(), write_only=True, source='notice'
    )

    class Meta:
        model = Bookmark
        fields = ['id', 'notice', 'notice_id', 'created_at']
        read_only_fields = ['user', 'created_at']


class SavedNoticeSerializer(serializers.ModelSerializer):
    notice = NoticeSerializer(read_only=True)

    class Meta:
        model = SavedNotice
        fields = ['id', 'notice', 'created_at']


class SystemNotificationSerializer(serializers.ModelSerializer):
    notice = NoticeSerializer(read_only=True)

    class Meta:
        model = SystemNotification
        fields = '__all__'


class StaffNoticeSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = StaffNotice
        fields = '__all__'

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return 'Department'


class UserNotificationSerializer(serializers.ModelSerializer):
    notice_title = serializers.SerializerMethodField()
    notice_id = serializers.SerializerMethodField()

    class Meta:
        model = UserNotification
        fields = ['id', 'title', 'message', 'notification_type', 'is_read',
                  'created_at', 'notice_id', 'notice_title']
        read_only_fields = ['id', 'created_at']

    def get_notice_title(self, obj):
        return obj.notice.title if obj.notice else None

    def get_notice_id(self, obj):
        return obj.notice.id if obj.notice else None


class StudentNoticeSerializer(serializers.ModelSerializer):
    """Lean serializer for the student notices API.
    
    Dynamically calculates priority_score per student based on:
    - Student's academic year
    - Student's notification preferences
    - Notice deadline urgency
    - Admin priority level
    - Department match
    - Category weight
    - View engagement
    """
    days_remaining = serializers.ReadOnlyField()
    is_bookmarked = serializers.SerializerMethodField()
    priority_score = serializers.SerializerMethodField()
    risk_indicator = serializers.SerializerMethodField()  # Cox Model risk level + color

    class Meta:
        model = Notice
        fields = [
            'id', 'notice_id', 'title', 'category',
            'department_type', 'department', 'description',
            'status', 'created_at', 'deadline', 'view_count',
            'priority_score', 'thumbnail', 'target_year',
            'image_file', 'video_file', 'pdf_file',
            'audio_file', 'excel_file', 'ppt_file', 'csv_file',
            'days_remaining', 'is_bookmarked', 'risk_indicator',
        ]

    def get_is_bookmarked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            from .models import Bookmark
            return Bookmark.objects.filter(user=request.user, notice=obj).exists()
        return False
    
    def get_risk_indicator(self, obj):
        """Calculate risk indicator for this notice based on deadline."""
        try:
            from .ml.risk_engine import calculate_notice_risk
            return calculate_notice_risk(obj)
        except Exception as e:
            return {'level': 'LOW', 'color': '#10B981', 'days_remaining': None}
    
    def get_priority_score(self, obj):
        """Calculate priority_score dynamically for this student.
        
        If priority_score is already attached to obj (from rank_notices),
        use that. Otherwise compute it fresh.
        """
        # Check if already calculated and attached (from rank_notices)
        if hasattr(obj, 'priority_score') and obj.priority_score and obj.priority_score > 0:
            return round(float(obj.priority_score), 4)
        
        # Otherwise calculate for this student
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            from apps.accounts.models import NotificationPrefs
            from .ml.priority_engine import compute_priority_score
            
            user = request.user
            try:
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
                
                score = compute_priority_score(
                    obj,
                    student_dept=user.department or 'CSE',
                    student_year=user.year or '',
                    student_prefs=student_prefs,
                )
                return round(float(score), 4)
            except Exception:
                return 0.5  # Fallback to neutral score
        
        return 0.5

