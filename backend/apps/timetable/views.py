from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.http import HttpResponse
from .models import TimetableBatch, DayConfig, TimeSlot, Subject, RoomAllocation, TimetableEntry
from .serializers import TimetableBatchSerializer
from .algorithm import generate_timetable_algorithm
from fpdf import FPDF
from datetime import datetime, time as _time


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_batch(request):
    """Create a new timetable batch"""
    try:
        data = request.data
        department = data.get('department', 'CSE')
        year = data.get('year', '3')
        section = data.get('section', 'A')
        
        # Validate inputs
        valid_depts = ['CSE', 'ECE', 'EEE', 'MECH', 'CIVIL']
        valid_years = ['1', '2', '3', '4']
        
        if department not in valid_depts:
            return Response({'error': f'Invalid department. Choose from: {", ".join(valid_depts)}'}, status=status.HTTP_400_BAD_REQUEST)
        if year not in valid_years:
            return Response({'error': f'Invalid year. Choose from: {", ".join(valid_years)}'}, status=status.HTTP_400_BAD_REQUEST)
        if not section or len(section) == 0:
            return Response({'error': 'Section is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        batch, created = TimetableBatch.objects.get_or_create(
            department=department,
            year=year,
            section=section,
            defaults={'created_by': request.user, 'is_active': True}
        )
        return Response({'id': batch.id, 'created': created}, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def configure_batch(request, batch_id):
    """Save day config, time slots, subjects, and rooms"""
    try:
        batch = TimetableBatch.objects.get(id=batch_id)
        
        # Save day configurations
        DayConfig.objects.filter(batch=batch).delete()
        for day_config in request.data.get('day_configs', []):
            DayConfig.objects.create(
                batch=batch, day=day_config['day'],
                num_periods=day_config.get('num_periods', 6),
                num_labs=day_config.get('num_labs', 0),
                is_working_day=day_config.get('is_working_day', True)
            )
        
        # Save time slots and manual room/staff assignments
        TimeSlot.objects.filter(batch=batch).delete()

        time_slots_payload = request.data.get('time_slots', [])
        if time_slots_payload and isinstance(time_slots_payload[0], dict) and 'slots' in time_slots_payload[0]:
            day_slot_groups = time_slots_payload
        else:
            # Legacy flat payload support
            day_slot_groups = [{
                'day': day_config['day'],
                'slots': day_config.get('slots', [])
            } for day_config in request.data.get('day_configs', [])]

        def _parse_time(val):
            if val is None:
                return None
            if isinstance(val, _time):
                return val
            if isinstance(val, str):
                val = val.strip()
                # Try common formats: '09:00 AM', '09:00', '09:00:00'
                for fmt in ("%I:%M %p", "%H:%M", "%H:%M:%S"):
                    try:
                        return datetime.strptime(val, fmt).time()
                    except Exception:
                        continue
            # last resort: let Django try to coerce or raise
            return val

        for day_group in day_slot_groups:
            day_name = day_group.get('day')
            # Track used slot numbers per day to avoid UNIQUE constraint failures
            used_numbers = set()
            for idx, slot in enumerate(day_group.get('slots', []), start=1):
                raw_slot_number = slot.get('slot_number')
                # Try to parse provided slot number
                parsed = None
                if raw_slot_number is not None and raw_slot_number != '':
                    try:
                        parsed = int(raw_slot_number)
                    except Exception:
                        parsed = None

                # Choose slot_number: prefer parsed when valid and unused, otherwise pick next available
                if parsed is not None and parsed not in used_numbers and parsed > 0:
                    slot_number = parsed
                else:
                    # next available integer (start from 1)
                    candidate = 1
                    if used_numbers:
                        candidate = max(used_numbers) + 1
                    while candidate in used_numbers:
                        candidate += 1
                    slot_number = candidate

                used_numbers.add(slot_number)

                start_t = _parse_time(slot.get('start_time'))
                end_t = _parse_time(slot.get('end_time'))

                TimeSlot.objects.create(
                    batch=batch,
                    day=day_name,
                    slot_number=slot_number,
                    start_time=start_t,
                    end_time=end_t,
                    slot_type=slot.get('slot_type', 'NORMAL'),
                    subject_name=slot.get('subject_name') or None,
                    room_name=slot.get('room_name') or None,
                    staff_name=slot.get('staff_name') or None,
                )
        
        # Save subjects
        Subject.objects.filter(batch=batch).delete()
        for subject in request.data.get('subjects', []):
            Subject.objects.create(
                batch=batch,
                name=subject['name'],
                subject_type=subject['subject_type'],
                staff_name=subject['staff_name'],
                room_id=subject['room_id'],
            )
        
        # Save room allocations
        RoomAllocation.objects.filter(batch=batch).delete()
        for room in request.data.get('rooms', []):
            RoomAllocation.objects.create(
                batch=batch,
                room_name=room['room_name'],
                room_type=room['room_type'],
                capacity=room.get('capacity')
            )
        
        return Response({'success': True})
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_timetable(request, batch_id):
    """Generate timetable using algorithm"""
    try:
        batch = TimetableBatch.objects.get(id=batch_id)
        
        # Clear previous entries
        TimetableEntry.objects.filter(batch=batch).delete()
        
        # Run timetable generation algorithm
        entries = generate_timetable_algorithm(batch)
        
        # Save entries
        for entry in entries:
            TimetableEntry.objects.create(
                batch=batch,
                day=entry['day'],
                slot_start=entry['slot_start'],
                slot_end=entry['slot_end'],
                subject_name=entry.get('subject_name'),
                staff_name=entry.get('staff_name'),
                room_name=entry.get('room_name'),
                entry_type=entry['entry_type'],
                start_time=entry['start_time'],
                end_time=entry['end_time']
            )
        
        serializer = TimetableBatchSerializer(batch)
        return Response(serializer.data)
    except TimetableBatch.DoesNotExist:
        return Response({'error': 'Batch not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_timetable(request, batch_id):
    """Fetch generated timetable"""
    try:
        batch = TimetableBatch.objects.get(id=batch_id)
        serializer = TimetableBatchSerializer(batch)
        return Response(serializer.data)
    except TimetableBatch.DoesNotExist:
        return Response({'error': 'Batch not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_pdf(request, batch_id):
    """Export timetable as PDF"""
    try:
        batch = TimetableBatch.objects.get(id=batch_id)
        entries = TimetableEntry.objects.filter(batch=batch).order_by('day', 'slot_start')
        
        if not entries.exists():
            return Response({'error': 'No timetable generated'}, status=status.HTTP_404_NOT_FOUND)

        def safe_text(value):
            text = '-' if value is None else str(value)
            return text.replace('–', '-').encode('latin-1', 'replace').decode('latin-1')
        
        # Create PDF
        pdf = FPDF()
        pdf.add_page()
        
        pdf.set_font("Arial", "B", 10)
        pdf.cell(0, 8, safe_text(f"{batch.department} Timetable"), ln=True, align="C")
        
        pdf.set_font("Arial", "", 9)
        pdf.cell(0, 6, safe_text(f"Year: {batch.year} | Section: {batch.section}"), ln=True, align="C")
        pdf.cell(0, 6, safe_text(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}"), ln=True, align="C")
        pdf.ln(2)
        
        pdf.set_font("Arial", "", 7)
        pdf.cell(0, 4, safe_text("LUNCH BREAK: 1-1 PM | SHORT BREAK: 2-2:15 PM | * Timetable is subject to change"), ln=True)
        pdf.ln(1)
        
        # Build table with proper structure
        day_configs = {dc.day: dc for dc in batch.day_configs.all()}
        working_days = [d for d in ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] 
                       if d in day_configs and day_configs[d].is_working_day]
        
        # Get all time slots in order
        all_slots = list(TimeSlot.objects.filter(batch=batch).order_by('slot_number'))
        seen_slots = {}
        unique_slots = []
        for slot in all_slots:
            if slot.slot_number not in seen_slots:
                seen_slots[slot.slot_number] = True
                unique_slots.append(slot)
        
        # Build entries map
        entries_by_slot = {}
        for entry in entries:
            entries_by_slot[f"{entry.day}_{entry.slot_start}"] = entry
        
        # Header row and data rows with fixed column widths and aligned multi-cell rendering
        pdf.set_font("Arial", "B", 8)
        page_width = pdf.w - pdf.l_margin - pdf.r_margin
        day_col_w = 30
        num_slots = len(unique_slots)
        if num_slots <= 0:
            pdf.cell(0, 6, safe_text('No time slots defined'), ln=True)
        else:
            col_w = (page_width - day_col_w) / num_slots

            # header
            pdf.set_fill_color(20, 47, 94)
            pdf.set_text_color(255, 255, 255)
            pdf.cell(day_col_w, 10, "Day", border=1, align="C", fill=True)
            for slot in unique_slots:
                time_str = f"{safe_text(str(slot.start_time)[:5])}-{safe_text(str(slot.end_time)[:5])}"
                pdf.cell(col_w, 10, time_str, border=1, align="C", fill=True)
            pdf.ln()

            # body
            pdf.set_text_color(0, 0, 0)
            pdf.set_font("Arial", "", 7)
            line_h = 4

            for day in working_days:
                # prepare texts and spans for the row
                cells = []
                skip_until = -1
                for slot in unique_slots:
                    if slot.slot_number <= skip_until:
                        continue
                    entry = entries_by_slot.get(f"{day}_{slot.slot_number}")
                    if entry and entry.slot_start == slot.slot_number:
                        span = max(1, entry.slot_end - entry.slot_start + 1)
                        if span > 1:
                            skip_until = entry.slot_end
                        if entry.entry_type in ['BREAK', 'LUNCH']:
                            text = entry.entry_type or ''
                        else:
                            text = f"{entry.subject_name or ''}\n({entry.staff_name or ''})\n{entry.room_name or ''}"
                        cells.append((text, span, entry.entry_type or 'SUBJECT'))
                    else:
                        # empty or non-starting slot
                        cells.append(("", 1, slot.slot_type))

                # compute row height (max lines)
                max_lines = 1
                for text, span, etype in cells:
                    lines = text.count('\n') + 1 if text else 1
                    if lines > max_lines:
                        max_lines = lines
                row_h = max(line_h * max_lines + 2, 8)

                # draw day cell
                x = pdf.l_margin
                y = pdf.get_y()
                pdf.rect(x, y, day_col_w, row_h, 'D')
                pdf.set_xy(x, y + (row_h - line_h)/2)
                pdf.multi_cell(day_col_w, line_h, day[:3], border=0, align='C')

                # draw each cell
                x = pdf.l_margin + day_col_w
                for text, span, etype in cells:
                    w = col_w * span
                    # choose background for breaks/lunch/lab
                    style = 'D'
                    if (etype or '').upper() == 'LUNCH':
                        pdf.set_fill_color(220, 255, 220)
                        style = 'DF'
                    elif (etype or '').upper() == 'BREAK':
                        pdf.set_fill_color(255, 250, 200)
                        style = 'DF'
                    elif (etype or '').upper() == 'LAB':
                        pdf.set_fill_color(230, 245, 255)
                        style = 'DF'

                    # Draw the cell rectangle
                    pdf.rect(x, y, w, row_h, style)
                    
                    # render text
                    if text:
                        text_safe = safe_text(text)
                        lines = text_safe.count('\n') + 1
                        text_h = lines * line_h
                        pdf.set_xy(x, y + (row_h - text_h)/2)
                        pdf.multi_cell(w, line_h, text_safe, border=0, align='C')
                    
                    x += w

                # move to next row baseline
                pdf.set_xy(pdf.l_margin, y + row_h)
        
        pdf.ln(5)
        pdf.set_font("Arial", "", 8)
        pdf.cell(0, 5, safe_text("Legend: Break / Lunch / Lab = Special sessions"), ln=True)
        pdf.cell(0, 5, safe_text("Generated by SmartBoard 360 - Timetable Module"), ln=True)
        
        # Return PDF
        pdf_output = bytes(pdf.output(dest='S'))
        response = HttpResponse(pdf_output, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="timetable_{batch.id}.pdf"'
        return response
    except TimetableBatch.DoesNotExist:
        return Response({'error': 'Batch not found'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
