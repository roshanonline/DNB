#!/usr/bin/env python
import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.notices.models import Notice
from apps.notices.ml.search_engine import semantic_search

# Check how many approved notices exist
approved_count = Notice.objects.filter(status='APPROVED').count()
print(f'Total approved notices: {approved_count}')

if approved_count > 0:
    first_notice = Notice.objects.filter(status='APPROVED').first()
    print(f'Sample notice: {first_notice.title}')
    
    # Also test semantic search
    notices = Notice.objects.filter(status='APPROVED')[:10]
    print(f'\nTesting semantic search with {len(notices)} notices...')
    
    test_queries = ['exam', 'event', 'fe']
    for query in test_queries:
        results = semantic_search(query, notices, threshold=0.25)
        print(f'  Query "{query}": {len(results)} matches')
        for r in results[:2]:
            print(f'    - {r.title} (score: {r.similarity_score})')
else:
    print('No approved notices found!')
