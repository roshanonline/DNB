"""
Email Reminder Scheduler
Uses APScheduler to check pending reminders every 60 seconds
and send emails via Django's send_mail.
"""
import logging
import smtplib
from django.core.mail import EmailMultiAlternatives
from django.core.validators import validate_email as django_validate_email
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from django.conf import settings

logger = logging.getLogger(__name__)


def send_reminder_emails():
    """
    Main scheduler job: runs every 60 seconds.
    Fetches PENDING reminders whose datetime has passed → sends email → marks SENT.
    """
    try:
        from apps.reminders.models import Reminder
        now = timezone.now()

        pending = Reminder.objects.filter(
            reminder_datetime__lte=now,
            status='PENDING'
        ).select_related('user', 'notice')

        sent_count = 0
        for reminder in pending:
            try:
                _send_reminder_email(reminder)
                reminder.status = 'SENT'
                reminder.save(update_fields=['status'])
                sent_count += 1
                logger.info(f'Reminder sent to {reminder.email} for notice "{reminder.notice.title}"')
            except ValueError as e:
                # Invalid recipient should not be retried forever.
                reminder.status = 'CANCELLED'
                reminder.save(update_fields=['status'])
                logger.error(f'Cancelled reminder {reminder.id}: {e}')
            except smtplib.SMTPAuthenticationError as e:
                logger.error(
                    '[Reminder Scheduler] SMTP auth failed. '
                    'Check EMAIL_HOST_USER and Gmail App Password in backend/.env. '
                    f'Details: {e}'
                )
                break
            except Exception as e:
                logger.error(f'Failed to send reminder {reminder.id}: {e}')

        if sent_count > 0:
            logger.info(f'[Reminder Scheduler] Sent {sent_count} reminders.')

    except Exception as e:
        logger.error(f'[Reminder Scheduler] Error: {e}')


def _send_reminder_email(reminder):
    """Build and send a beautiful HTML reminder email with full notice details + link."""
    notice       = reminder.notice
    user         = reminder.user
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    notice_url   = f'{frontend_url}/notice/{notice.id}'

    name         = user.get_full_name() or user.username
    email_to     = (reminder.email or user.email or '').strip()
    if not email_to:
        raise ValueError('Missing recipient email address')
    try:
        django_validate_email(email_to)
    except DjangoValidationError:
        raise ValueError(f'Invalid recipient email: {email_to}')

    now_str      = timezone.now().strftime('%d %B %Y at %I:%M %p')
    deadline_str = notice.deadline.strftime('%d %B %Y at %I:%M %p') if notice.deadline else 'No deadline set'
    posted_str   = notice.created_at.strftime('%d %B %Y') if hasattr(notice, 'created_at') and notice.created_at else ''

    category_icon = {
        'Exam': '📝', 'Placement': '💼', 'Academic': '📚',
        'Event': '🎉', 'Holiday': '🏖️', 'Scholarship': '🎓',
        'Workshop': '🛠️', 'Internship': '🏢', 'General': '📢',
    }.get(notice.category, '📋')

    subject = f'⏰ Reminder: "{notice.title}" — Deadline {deadline_str}'

    # ── Plain text fallback ───────────────────────────────────────────
    body = f"""
SmartBoard 360 – Deadline Reminder

Hello {name},

This is your scheduled reminder for the following notice:

{category_icon} {notice.title}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Category    : {notice.category}
Department  : {notice.department}
Deadline    : {deadline_str}
Sent to     : {email_to}
Sent at     : {now_str}

Description:
{notice.description}

View Full Notice:
{notice_url}

{f"Your note: {reminder.message}" if reminder.message else ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Don't miss this important update!
— SmartBoard 360 Team
    """.strip()

    # ── HTML email ────────────────────────────────────────────────────
    description_html = notice.description.replace('\n', '<br>')

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
  body      {{ margin:0; padding:0; background:#f3f4f6; font-family:Arial,sans-serif; }}
  .wrap     {{ max-width:600px; margin:30px auto; background:#fff;
               border-radius:16px; overflow:hidden;
               box-shadow:0 4px 24px rgba(0,0,0,0.10); }}
  .hdr      {{ background:linear-gradient(135deg,#6366f1,#8b5cf6);
               padding:32px 32px 24px; text-align:center; }}
  .hdr h1   {{ margin:0 0 6px; color:#fff; font-size:22px; }}
  .hdr p    {{ margin:0; color:rgba(255,255,255,0.80); font-size:14px; }}
  .cat-pill {{ display:inline-block; background:rgba(255,255,255,0.20);
               color:#fff; border-radius:20px; padding:4px 14px;
               font-size:12px; margin-top:12px; }}
  .body     {{ padding:28px 32px; }}
  .greeting {{ font-size:17px; color:#1f2937; margin-bottom:20px; }}
  .card     {{ background:#f8fafc; border-left:4px solid #6366f1;
               border-radius:10px; padding:18px 20px; margin-bottom:18px; }}
  .row      {{ display:flex; align-items:flex-start;
               margin-bottom:12px; gap:12px; }}
  .row:last-child {{ margin-bottom:0; }}
  .ico      {{ font-size:18px; min-width:24px; }}
  .lbl      {{ font-size:11px; color:#6b7280; text-transform:uppercase;
               letter-spacing:0.5px; margin-bottom:2px; }}
  .val      {{ font-size:14px; color:#1f2937; font-weight:600; }}
  .dl-box   {{ background:#fef3c7; border:1px solid #f59e0b;
               border-radius:10px; padding:16px; text-align:center;
               margin-bottom:18px; }}
  .dl-box .label {{ font-size:11px; color:#92400e; text-transform:uppercase;
                    letter-spacing:0.5px; margin-bottom:4px; }}
  .dl-box .val   {{ font-size:20px; font-weight:800; color:#d97706; }}
  .desc-box {{ background:#f0fdf4; border:1px solid #bbf7d0;
               border-radius:10px; padding:18px; margin-bottom:20px; }}
  .desc-box h3 {{ color:#166534; margin:0 0 10px; font-size:12px;
                  text-transform:uppercase; letter-spacing:0.5px; }}
  .desc-box p  {{ color:#374151; line-height:1.75; margin:0; font-size:14px; }}
  .btn-wrap {{ text-align:center; margin-bottom:14px; }}
  .btn      {{ display:inline-block; background:linear-gradient(135deg,#6366f1,#8b5cf6);
               color:#fff !important; text-decoration:none;
               padding:14px 40px; border-radius:50px;
               font-size:15px; font-weight:700; }}
  .link-box {{ background:#f1f5f9; border-radius:8px; padding:10px 14px;
               text-align:center; word-break:break-all;
               font-size:12px; color:#6366f1; font-family:monospace; margin-bottom:16px; }}
  .sent-at  {{ text-align:center; font-size:11px; color:#9ca3af; margin-bottom:20px; }}
  .footer   {{ background:#f8fafc; border-top:1px solid #e5e7eb;
               padding:18px; text-align:center;
               font-size:12px; color:#9ca3af; }}
</style>
</head>
<body>
<div class="wrap">

  <!-- Header -->
  <div class="hdr">
    <h1>⏰ Deadline Reminder</h1>
    <p>SmartBoard 360 – Student Notice System</p>
    <div class="cat-pill">{category_icon} {notice.category}</div>
  </div>

  <!-- Body -->
  <div class="body">
    <p class="greeting">Hi <strong>{name}</strong>,</p>
    <p style="color:#4b5563;margin-bottom:18px;font-size:14px;">
      You have a scheduled reminder for the notice below.
      Here are the complete details:
    </p>

    <!-- Notice Info Card -->
    <div class="card">
      <div class="row">
        <span class="ico">📌</span>
        <div><div class="lbl">Notice Title</div>
             <div class="val">{notice.title}</div></div>
      </div>
      <div class="row">
        <span class="ico">🏢</span>
        <div><div class="lbl">Department</div>
             <div class="val">{notice.department}</div></div>
      </div>
      <div class="row">
        <span class="ico">📧</span>
        <div><div class="lbl">Reminder Sent To</div>
             <div class="val">{email_to}</div></div>
      </div>
      {'<div class="row"><span class="ico">📅</span><div><div class="lbl">Posted On</div><div class="val">' + posted_str + '</div></div></div>' if posted_str else ''}
      {'<div class="row"><span class="ico">📝</span><div><div class="lbl">Your Note</div><div class="val">' + reminder.message + '</div></div></div>' if reminder.message else ''}
    </div>

    <!-- Deadline Box -->
    <div class="dl-box">
      <div class="label">⚠️ Deadline</div>
      <div class="val">{deadline_str}</div>
    </div>

    <!-- Full Description -->
    <div class="desc-box">
      <h3>📄 Full Description</h3>
      <p>{description_html}</p>
    </div>

    <!-- CTA Button -->
    <div class="btn-wrap">
      <a href="{notice_url}" class="btn">🔗 View Full Notice</a>
    </div>
    <div class="link-box">{notice_url}</div>
    <p class="sent-at">This reminder was sent on {now_str}</p>
  </div>

  <!-- Footer -->
  <div class="footer">
    <p>© 2026 SmartBoard 360 · Automated Reminder System</p>
    <p>You're receiving this because you set a reminder for this notice.</p>
  </div>

</div>
</body>
</html>"""

    msg = EmailMultiAlternatives(
        subject    = subject,
        body       = body,
        from_email = f'SmartBoard 360 <{settings.DEFAULT_FROM_EMAIL or "noreply@smartboard360.com"}>',
        to         = [email_to],
    )
    msg.attach_alternative(html, 'text/html')
    msg.send()


def check_deadline_alerts():
    """
    Scheduled job: runs every hour.
    Proactively creates UserNotification(DEADLINE) for all students whose
    upcoming notices have deadlines ≤ 3 days away (document spec).

    Logic:
      If days_remaining ≤ 3
        → Trigger reminder notification for every matching student
        → Highlight notice in dashboard (is_deadline_urgent flag)
    """
    try:
        from datetime import date, timedelta
        from django.db.models import Q
        from django.contrib.auth import get_user_model
        from apps.notices.models import Notice, UserNotification

        User = get_user_model()
        today = date.today()

        urgent_notices = Notice.objects.filter(
            status='APPROVED',
            deadline__gte=today,
            deadline__lte=today + timedelta(days=3),
        )
        if not urgent_notices.exists():
            return

        students = User.objects.filter(role='STUDENT', is_active=True)
        created = 0

        for student in students:
            relevant = urgent_notices.filter(
                Q(department=student.department) |
                Q(department='ALL') |
                Q(department='INSTITUTION')
            )
            for notice in relevant:
                already = UserNotification.objects.filter(
                    user=student,
                    notice=notice,
                    notification_type='DEADLINE',
                    created_at__date=today,
                ).exists()
                if already:
                    continue

                days_left = (notice.deadline - today).days
                if days_left == 0:
                    urgency_text = "TODAY"
                elif days_left == 1:
                    urgency_text = "tomorrow"
                else:
                    urgency_text = f"in {days_left} days"

                UserNotification.objects.create(
                    user=student,
                    notice=notice,
                    title=f"⏰ Deadline Alert: {notice.title}",
                    message=(
                        f'The notice "{notice.title}" ({notice.category}) '
                        f'has a deadline {urgency_text} '
                        f'({notice.deadline.strftime("%d %b %Y")}). '
                        f'Don\'t miss this important deadline!'
                    ),
                    notification_type='DEADLINE',
                )
                created += 1

        if created > 0:
            logger.info(f'[Deadline Alerts] Created {created} deadline notifications.')

    except Exception as e:
        logger.error(f'[Deadline Alerts] Error: {e}')


def start_scheduler():
    """
    Start the APScheduler background scheduler.
    Called once from Django AppConfig.ready().
    """
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.interval import IntervalTrigger
        import atexit

        scheduler = BackgroundScheduler()
        scheduler.add_job(
            send_reminder_emails,
            trigger=IntervalTrigger(seconds=60),
            id='send_reminders',
            name='Send pending email reminders',
            replace_existing=True,
        )
        scheduler.add_job(
            check_deadline_alerts,
            trigger=IntervalTrigger(hours=1),
            id='deadline_alerts',
            name='Proactive deadline alert notifications (≤3 days)',
            replace_existing=True,
        )
        scheduler.start()
        atexit.register(lambda: scheduler.shutdown(wait=False))
        logger.info('[Reminder Scheduler] Started – checking every 60 seconds.')
    except Exception as e:
        logger.error(f'[Reminder Scheduler] Failed to start: {e}')

