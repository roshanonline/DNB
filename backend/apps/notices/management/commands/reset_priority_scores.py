"""
Management Command: Reset Priority Scores to 0.0
==================================================
This command removes all static priority scores from the database
and enables real-time dynamic calculation based on:
- Student's academic year
- Student's notification preferences
- Notice deadline urgency
- Admin priority level
- Department match
- Category weight
- View engagement

Run: python manage.py reset_priority_scores
"""

from django.core.management.base import BaseCommand
from apps.notices.models import Notice


class Command(BaseCommand):
    help = 'Reset all notice priority_score values to 0.0 for real-time dynamic calculation'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be changed without making changes',
        )

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        
        # Get all notices
        all_notices = Notice.objects.all()
        notices_with_score = all_notices.exclude(priority_score=0.0)
        
        count = notices_with_score.count()
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n{'='*80}'
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                'RESET PRIORITY SCORES TO ENABLE REAL-TIME DYNAMIC CALCULATION'
            )
        )
        self.stdout.write(
            self.style.SUCCESS(
                f'{'='*80}\n'
            )
        )
        
        self.stdout.write(f'Notices with non-zero priority_score: {count}')
        
        if count == 0:
            self.stdout.write(
                self.style.WARNING(
                    '\n✓ All notices already have priority_score = 0.0'
                )
            )
            self.stdout.write(
                self.style.SUCCESS(
                    'Real-time dynamic scoring is already active!\n'
                )
            )
            return
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    '\n[DRY RUN] These notices would be updated:\n'
                )
            )
            for notice in notices_with_score[:10]:
                self.stdout.write(
                    f'  - {notice.id}: {notice.title} (current: {notice.priority_score})'
                )
            if count > 10:
                self.stdout.write(f'  ... and {count - 10} more\n')
            self.stdout.write(
                self.style.WARNING(
                    f'Run without --dry-run to apply changes\n'
                )
            )
            return
        
        # Reset all priority scores to 0.0
        notices_with_score.update(priority_score=0.0)
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n✓ Updated {count} notices\n'
            )
        )
        
        self.stdout.write('PRIORITY SCORE CALCULATION NOW:')
        self.stdout.write('─' * 80)
        self.stdout.write('')
        self.stdout.write('📊 REAL-TIME DYNAMIC (per student):')
        self.stdout.write('')
        self.stdout.write('  Priority Score = (0.50 × Year Importance)')
        self.stdout.write('                 + (0.30 × Student Preferences)')
        self.stdout.write('                 + (0.08 × Deadline Urgency)')
        self.stdout.write('                 + (0.05 × Admin Priority)')
        self.stdout.write('                 + (0.04 × Dept Match)')
        self.stdout.write('                 + (0.02 × Category Weight)')
        self.stdout.write('                 + (0.01 × Engagement Score)')
        self.stdout.write('')
        self.stdout.write('🎯 YEAR IMPORTANCE (50% weight):')
        self.stdout.write('  • 1.0 = Notice targets student\'s year (HIGHEST)')
        self.stdout.write('  • 0.5 = Notice for all years')
        self.stdout.write('  • 0.1 = Notice targets different year (LOW)')
        self.stdout.write('')
        self.stdout.write('❤️  STUDENT PREFERENCES (30% weight):')
        self.stdout.write('  • 1.0 = Student enabled this category')
        self.stdout.write('  • 0.7 = Neutral/no preference')
        self.stdout.write('  • 0.15 = Student disabled this category')
        self.stdout.write('')
        self.stdout.write('⏰ DEADLINE URGENCY (8% weight):')
        self.stdout.write('  • 1.0 = Today or tomorrow (CRITICAL)')
        self.stdout.write('  • 0.8 = Within 2 days')
        self.stdout.write('  • 0.6 = Within 5 days')
        self.stdout.write('  • 0.4 = Within 10 days')
        self.stdout.write('  • 0.2 = 11+ days or no deadline')
        self.stdout.write('')
        self.stdout.write('─' * 80)
        self.stdout.write('')
        self.stdout.write('✨ BEHAVIOR:')
        self.stdout.write('  ✓ Different students see different scores for same notice')
        self.stdout.write('  ✓ Scores change when student preferences change')
        self.stdout.write('  ✓ Cache invalidated on preference update')
        self.stdout.write('  ✓ Calculated on every student request (StudentNoticeSerializer)')
        self.stdout.write('')
        self.stdout.write('📍 WHERE USED:')
        self.stdout.write('  • Student Dashboard (/api/notices/dashboard/)')
        self.stdout.write('  • StudentNoticeSerializer (get_priority_score method)')
        self.stdout.write('  • rank_notices() function in ml_engine.py')
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('✓ PRIORITY SCORE RESET COMPLETE\n'))

