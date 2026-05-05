"""
Timetable App – Models for Timetable Generation with Room Allocation
"""
from django.db import models
from django.conf import settings


class TimetableBatch(models.Model):
    """Main batch for a class section"""
    YEAR_CHOICES = [('1', '1st Year'), ('2', '2nd Year'), ('3', '3rd Year'), ('4', 'Final Year')]
    DEPARTMENT_CHOICES = [('CSE', 'CSE'), ('ECE', 'ECE'), ('EEE', 'EEE'), ('MECH', 'MECH'), ('CIVIL', 'CIVIL')]
    
    department = models.CharField(max_length=20, choices=DEPARTMENT_CHOICES)
    year = models.CharField(max_length=5, choices=YEAR_CHOICES)
    section = models.CharField(max_length=10)  # A, B, C, etc.
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'timetable_batches'
        unique_together = ('department', 'year', 'section')
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.department} – Year {self.year} Section {self.section}"


class DayConfig(models.Model):
    """Day-wise configuration for periods and labs"""
    DAYS = [('Monday', 'Monday'), ('Tuesday', 'Tuesday'), ('Wednesday', 'Wednesday'),
            ('Thursday', 'Thursday'), ('Friday', 'Friday'), ('Saturday', 'Saturday')]
    
    batch = models.ForeignKey(TimetableBatch, on_delete=models.CASCADE, related_name='day_configs')
    day = models.CharField(max_length=20, choices=DAYS)
    num_periods = models.IntegerField(default=6)  # Theory periods per day
    num_labs = models.IntegerField(default=0)  # Lab sessions per day
    is_working_day = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'day_configs'
        unique_together = ('batch', 'day')
        ordering = ['day']
    
    def __str__(self):
        return f"{self.day} – {self.num_periods} periods, {self.num_labs} labs"


class TimeSlot(models.Model):
    """Time slots for the day"""
    batch = models.ForeignKey(TimetableBatch, on_delete=models.CASCADE, related_name='time_slots')
    day = models.CharField(max_length=20, choices=DayConfig.DAYS)
    slot_number = models.IntegerField()  # 1, 2, 3...
    start_time = models.TimeField()
    end_time = models.TimeField()
    slot_type = models.CharField(max_length=20, choices=[('NORMAL', 'Normal'), ('BREAK', 'Break'), ('LUNCH', 'Lunch')], default='NORMAL')
    subject_name = models.CharField(max_length=255, null=True, blank=True)
    room_name = models.CharField(max_length=50, null=True, blank=True)
    staff_name = models.CharField(max_length=255, null=True, blank=True)
    
    class Meta:
        db_table = 'time_slots'
        ordering = ['day', 'slot_number']
        unique_together = ('batch', 'day', 'slot_number')
    
    def __str__(self):
        return f"Slot {self.slot_number}: {self.start_time} – {self.end_time} ({self.slot_type})"


class Subject(models.Model):
    """Subject details for timetable"""
    SUBJECT_TYPE = [('THEORY', 'Theory'), ('LAB', 'Laboratory')]
    
    batch = models.ForeignKey(TimetableBatch, on_delete=models.CASCADE, related_name='subjects')
    name = models.CharField(max_length=255)
    subject_type = models.CharField(max_length=20, choices=SUBJECT_TYPE)
    staff_name = models.CharField(max_length=255)
    room_id = models.CharField(max_length=50)  # C203, Lab 1, etc.
    
    class Meta:
        db_table = 'subjects'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.subject_type})"


class RoomAllocation(models.Model):
    """Room/classroom reference"""
    ROOM_TYPE = [('CLASSROOM', 'Classroom'), ('LAB', 'Laboratory')]
    
    batch = models.ForeignKey(TimetableBatch, on_delete=models.CASCADE, related_name='room_allocations')
    room_name = models.CharField(max_length=50)  # C203, Lab 1
    room_type = models.CharField(max_length=20, choices=ROOM_TYPE)
    capacity = models.IntegerField(null=True, blank=True)
    
    class Meta:
        db_table = 'room_allocations'
        unique_together = ('batch', 'room_name')
    
    def __str__(self):
        return f"{self.room_name} ({self.room_type})"


class TimetableEntry(models.Model):
    """Generated timetable entry"""
    ENTRY_TYPE = [('SUBJECT', 'Subject'), ('BREAK', 'Break'), ('LUNCH', 'Lunch'), ('LAB', 'Laboratory')]
    
    batch = models.ForeignKey(TimetableBatch, on_delete=models.CASCADE, related_name='entries')
    day = models.CharField(max_length=20)  # Monday, Tuesday, etc.
    slot_start = models.IntegerField()  # Starting slot number
    slot_end = models.IntegerField()  # Ending slot number (for labs spanning multiple slots)
    subject_name = models.CharField(max_length=255, null=True, blank=True)
    staff_name = models.CharField(max_length=255, null=True, blank=True)
    room_name = models.CharField(max_length=50, null=True, blank=True)
    entry_type = models.CharField(max_length=20, choices=ENTRY_TYPE)
    start_time = models.TimeField()
    end_time = models.TimeField()
    
    class Meta:
        db_table = 'timetable_entries'
        ordering = ['day', 'slot_start']
    
    def __str__(self):
        return f"{self.day} {self.slot_start}-{self.slot_end}: {self.subject_name or self.entry_type}"
