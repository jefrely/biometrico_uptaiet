from django.urls import path
from .views import (
    ReporteDiarioPDFView, ReporteSemanalPDFView, ReporteMensualPDFView, ReporteDiarioExcelView, ReporteSemanalExcelView, ReporteMensualExcelView
)

urlpatterns = [
    path('pdf/diario/',   ReporteDiarioPDFView.as_view(),   name='pdf-diario'),
    path('pdf/semanal/',  ReporteSemanalPDFView.as_view(),  name='pdf-semanal'),
    path('pdf/mensual/',  ReporteMensualPDFView.as_view(),  name='pdf-mensual'),
    path('excel/diario/', ReporteDiarioExcelView.as_view(), name='excel-diario'),
    path('excel/semanal/',ReporteSemanalExcelView.as_view(),name='excel-semanal'),
    path('excel/mensual/',ReporteMensualExcelView.as_view(),name='excel-mensual'),
]