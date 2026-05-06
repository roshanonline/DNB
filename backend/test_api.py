#!/usr/bin/env python
import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from apps.notices.views import SmartSearchView
import json

factory = APIRequestFactory()

# Test 1: Query "fe" (short query - should use keyword fallback)
print("Test 1: Query 'fe' (short query)")
print("=" * 60)
request = factory.get('/api/notices/search/', {'q': 'fe', 'top_k': '5'})
view = SmartSearchView.as_view()
response = view(request)
data = response.data
print(f"Search method: {data['search_method']}")
print(f"Total results: {data['count']}")
if data['results']:
    print(f"Top result: {data['results'][0]['title']}")
    print(f"  (contains 'fe': {'fe' in data['results'][0]['title'].lower()})")
print()

# Test 2: Query "exam" (longer query - should use semantic)
print("Test 2: Query 'exam' (longer query)")
print("=" * 60)
request = factory.get('/api/notices/search/', {'q': 'exam', 'top_k': '5'})
view = SmartSearchView.as_view()
response = view(request)
data = response.data
print(f"Search method: {data['search_method']}")
print(f"Total results: {data['count']}")
if data['results']:
    print(f"Top result: {data['results'][0]['title']}")
    print(f"Similarity score: {data['results'][0].get('similarity_score', 'N/A')}")
