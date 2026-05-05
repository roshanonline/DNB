from django.urls import path
from .views import create_batch, configure_batch, generate_timetable, get_timetable, export_pdf

urlpatterns = [
    path('batch/create', create_batch, name='create-batch'),
    path('<int:batch_id>/configure', configure_batch, name='configure-batch'),
    path('<int:batch_id>/generate', generate_timetable, name='generate-timetable'),
    path('<int:batch_id>', get_timetable, name='get-timetable'),
    path('<int:batch_id>/pdf', export_pdf, name='export-pdf'),
]
