#!/usr/bin/env python
import django, os, logging
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

# Enable logging to see debug messages
logging.basicConfig(level=logging.INFO)

from apps.notices.models import Notice
from apps.notices.ml.search_engine import semantic_search

approved_count = Notice.objects.filter(status='APPROVED').count()
print(f'Total approved notices: {approved_count}')

notices = list(Notice.objects.filter(status='APPROVED')[:10])
print(f'Testing with {len(notices)} notices...\n')

# Test with "fe" to see similarity scores
from apps.notices.ml.search_engine import _get_model, _notice_text
from sklearn.metrics.pairwise import cosine_similarity

model = _get_model()
print("Computing similarities for 'fe'...")
query_emb = model.encode(['fe'], show_progress_bar=False)
notice_texts = [_notice_text(n) for n in notices]
notice_embs = model.encode(notice_texts, show_progress_bar=False, batch_size=32)
sims = cosine_similarity(query_emb, notice_embs)[0]

print(f'\nTop similarities for "fe":')
for i, (notice, sim) in enumerate(sorted(zip(notices, sims), key=lambda x: x[1], reverse=True)[:5]):
    print(f'  {i+1}. {notice.title[:50]:50} → {sim:.4f}')
    
print(f'\nAverage similarity: {sims.mean():.4f}')
print(f'Max similarity: {sims.max():.4f}')
print(f'Count >= 0.25: {(sims >= 0.25).sum()}')
print(f'Count >= 0.15: {(sims >= 0.15).sum()}')
