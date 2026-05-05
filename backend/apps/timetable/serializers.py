from rest_framework import serializers
from .models import TimetableBatch, DayConfig, TimeSlot, Subject, RoomAllocation, TimetableEntry


class TimeSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimeSlot
        fields = ['id', 'day', 'slot_number', 'start_time', 'end_time', 'slot_type', 'subject_name', 'room_name', 'staff_name']


class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ['id', 'name', 'subject_type', 'staff_name', 'room_id']


class RoomAllocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomAllocation
        fields = ['id', 'room_name', 'room_type', 'capacity']


class DayConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = DayConfig
        fields = ['id', 'day', 'num_periods', 'num_labs', 'is_working_day']


class TimetableEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = TimetableEntry
        fields = ['id', 'day', 'slot_start', 'slot_end', 'subject_name', 'staff_name', 'room_name', 'entry_type', 'start_time', 'end_time']


class TimetableBatchSerializer(serializers.ModelSerializer):
    day_configs = DayConfigSerializer(many=True, read_only=True)
    time_slots = TimeSlotSerializer(many=True, read_only=True)
    subjects = SubjectSerializer(many=True, read_only=True)
    room_allocations = RoomAllocationSerializer(many=True, read_only=True)
    entries = TimetableEntrySerializer(many=True, read_only=True)
    
    class Meta:
        model = TimetableBatch
        fields = ['id', 'department', 'year', 'section', 'day_configs', 'time_slots', 'subjects', 'room_allocations', 'entries', 'created_at', 'is_active']
