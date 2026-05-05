from django.core.management.base import BaseCommand
from apps.notices.models import Notice
from datetime import date
import random


class Command(BaseCommand):
    help = 'Set all notice deadlines to random April 2026 dates'

    def handle(self, *args, **options):
        notices = Notice.objects.all()
        updated = 0
        for notice in notices:
            notice.deadline = date(2026, 4, random.randint(1, 30))
            notice.save(update_fields=['deadline'])
            updated += 1
        self.stdout.write(self.style.SUCCESS(
            f'Updated {updated} notices with random April 2026 deadlines'
        ))
        for n in Notice.objects.values('id', 'title', 'deadline')[:8]:
            self.stdout.write(f"  ID:{n['id']} | {str(n['title'])[:35]:<35} | {n['deadline']}")

