"""
Timetable Generation Algorithm with Room Allocation
"""
import random
from .models import TimeSlot, Subject, DayConfig, RoomAllocation


def generate_timetable_algorithm(batch):
    """
    Generate timetable with intelligent room allocation
    1. Allocate labs first (continuous slots)
    2. Insert breaks & lunch
    3. Fill remaining slots with theory subjects
    """
    entries = []
    subjects = list(Subject.objects.filter(batch=batch))
    day_configs = {dc.day: dc for dc in DayConfig.objects.filter(batch=batch)}
    # global fallback slots (if a specific day has no slots defined)
    global_time_slots = list(TimeSlot.objects.filter(batch=batch).order_by('slot_number'))
    room_allocations = list(RoomAllocation.objects.filter(batch=batch))

    def build_slot_info(slots):
        slot_map_local = {slot.slot_number: slot for slot in slots}
        normal_slot_nums = [slot.slot_number for slot in slots if slot.slot_type == 'NORMAL']
        return slot_map_local, normal_slot_nums

    classroom_rooms = [room.room_name for room in room_allocations if room.room_type == 'CLASSROOM']
    lab_rooms = [room.room_name for room in room_allocations if room.room_type == 'LAB']

    def resolve_room_name(subject):
        preferred_room = subject.room_id
        if preferred_room and not preferred_room.isdigit():
            if any(room.room_name == preferred_room for room in room_allocations):
                return preferred_room
        if subject.subject_type == 'LAB' and lab_rooms:
            return lab_rooms[0]
        if subject.subject_type == 'THEORY' and classroom_rooms:
            return classroom_rooms[0]
        if room_allocations:
            return room_allocations[0].room_name
        return preferred_room

    def resolve_subject_by_name(subject_name):
        if not subject_name:
            return None
        for subject in subjects:
            if subject.name == subject_name:
                return subject
        return None

    def build_consecutive_segments(slot_numbers):
        segments = []
        current_segment = []
        for slot_number in slot_numbers:
            if not current_segment or slot_number == current_segment[-1] + 1:
                current_segment.append(slot_number)
            else:
                segments.append(current_segment)
                current_segment = [slot_number]
        if current_segment:
            segments.append(current_segment)
        return segments
    
    # Separate theory and labs
    labs = [s for s in subjects if s.subject_type == 'LAB']
    theory_subjects = [s for s in subjects if s.subject_type == 'THEORY']
    
    # Build a reusable theory pool so subjects can cycle through available slots.
    subject_pool = theory_subjects[:]
    random.shuffle(subject_pool)
    
    # Process each day
    day_order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    
    for day_name in day_order:
        if day_name not in day_configs:
            continue
            
        day_config = day_configs[day_name]
        
        if not day_config.is_working_day:
            continue
        
        # Get slots for this day; fallback to global_time_slots if none defined
        time_slots = list(TimeSlot.objects.filter(batch=batch, day=day_name).order_by('slot_number'))
        if not time_slots:
            time_slots = global_time_slots[:]

        slot_map, normal_slot_numbers = build_slot_info(time_slots)

        configured_slots = [slot.slot_number for slot in time_slots]
        available_slots = [slot_number for slot_number in configured_slots if slot_number in normal_slot_numbers]
        available_slots.sort()
        
        # Step 1: Mark break and lunch slots
        def resolve_slot_room(slot, subject):
            if slot.room_name:
                return slot.room_name
            return resolve_room_name(subject)

        def resolve_slot_staff(slot, subject):
            if slot.staff_name:
                return slot.staff_name
            return subject.staff_name

        for slot in time_slots:
            if slot.slot_number not in configured_slots:
                continue
            if slot.slot_type in ['BREAK', 'LUNCH']:
                if slot.slot_number in available_slots:
                    available_slots.remove(slot.slot_number)
                entries.append({
                    'day': day_name,
                    'slot_start': slot.slot_number,
                    'slot_end': slot.slot_number,
                    'subject_name': None,
                    'staff_name': None,
                    'room_name': slot.room_name,
                    'entry_type': slot.slot_type,
                    'start_time': slot.start_time,
                    'end_time': slot.end_time,
                })
        
        # Step 2: Handle explicitly assigned subjects first
        for slot_number in available_slots[:]:
            slot = slot_map[slot_number]
            fixed_subject = resolve_subject_by_name(getattr(slot, 'subject_name', None))
            if fixed_subject:
                entries.append({
                    'day': day_name,
                    'slot_start': slot_number,
                    'slot_end': slot_number,
                    'subject_name': fixed_subject.name,
                    'staff_name': resolve_slot_staff(slot, fixed_subject),
                    'room_name': resolve_slot_room(slot, fixed_subject),
                    'entry_type': 'LAB' if fixed_subject.subject_type == 'LAB' else 'SUBJECT',
                    'start_time': slot.start_time,
                    'end_time': slot.end_time,
                })
                available_slots.remove(slot_number)
                if fixed_subject in labs:
                    labs.remove(fixed_subject)

        # Step 3: Allocate remaining labs (continuous slots)
        for lab in labs:
            if not available_slots:
                continue

            segments = build_consecutive_segments(available_slots)
            chosen_segment = None
            for segment in segments:
                if len(segment) >= 2:
                    chosen_segment = segment
                    break

            if not chosen_segment:
                continue

            slots_needed = min(2, len(chosen_segment))
            allocated_slots = chosen_segment[:slots_needed]
            start_slot = allocated_slots[0]
            end_slot = allocated_slots[-1]

            for slot_number in allocated_slots:
                if slot_number in available_slots:
                    available_slots.remove(slot_number)

            start_time = slot_map[start_slot].start_time
            end_time = slot_map[end_slot].end_time

            entries.append({
                'day': day_name,
                'slot_start': start_slot,
                'slot_end': end_slot,
                'subject_name': lab.name,
                'staff_name': resolve_slot_staff(slot_map[start_slot], lab),
                'room_name': resolve_slot_room(slot_map[start_slot], lab),
                'entry_type': 'LAB',
                'start_time': start_time,
                'end_time': end_time,
            })
        
        # Step 4: Fill remaining slots with theory subjects
        for slot_number in sorted(available_slots):
            slot = slot_map[slot_number]
            if not subject_pool and theory_subjects:
                subject_pool = theory_subjects[:]
                random.shuffle(subject_pool)

            subject = subject_pool.pop(0) if subject_pool else None
            if subject:

                entries.append({
                    'day': day_name,
                    'slot_start': slot_number,
                    'slot_end': slot_number,
                    'subject_name': subject.name,
                    'staff_name': resolve_slot_staff(slot_map[slot_number], subject),
                    'room_name': resolve_slot_room(slot_map[slot_number], subject),
                    'entry_type': 'SUBJECT',
                    'start_time': slot_map[slot_number].start_time,
                    'end_time': slot_map[slot_number].end_time,
                })
    
    return entries
