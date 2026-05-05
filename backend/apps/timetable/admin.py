from django.contrib import admin
from .models import TimetableBatch, DayConfig, TimeSlot, Subject, RoomAllocation, TimetableEntry


@admin.register(TimetableBatch)
class TimetableBatchAdmin(admin.ModelAdmin):
    list_display = ('department', 'year', 'section', 'created_at', 'is_active')
    list_filter = ('department', 'year', 'is_active')
    ordering = ('-created_at',)


@admin.register(DayConfig)
class DayConfigAdmin(admin.ModelAdmin):
    list_display = ('batch', 'day', 'num_periods', 'num_labs', 'is_working_day')
    list_filter = ('batch', 'day', 'is_working_day')


@admin.register(TimeSlot)
class TimeSlotAdmin(admin.ModelAdmin):
    list_display = ('batch', 'slot_number', 'start_time', 'end_time', 'slot_type')
    list_filter = ('batch', 'slot_type')
    ordering = ('batch', 'slot_number')


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('batch', 'name', 'subject_type', 'staff_name', 'room_id')
    list_filter = ('batch', 'subject_type')


@admin.register(RoomAllocation)
class RoomAllocationAdmin(admin.ModelAdmin):
    list_display = ('batch', 'room_name', 'room_type', 'capacity')
    list_filter = ('batch', 'room_type')


@admin.register(TimetableEntry)
class TimetableEntryAdmin(admin.ModelAdmin):
    list_display = ('batch', 'day', 'slot_start', 'slot_end', 'subject_name', 'entry_type', 'room_name')
    list_filter = ('batch', 'day', 'entry_type')
    ordering = ('batch', 'day', 'slot_start')
