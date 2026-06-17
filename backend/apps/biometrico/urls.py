from django.urls import path
from .views import DispositivoListView, DispositivoDetailView, EstadoEscanerView

urlpatterns = [
    path('dispositivos/', DispositivoListView.as_view(), name='dispositivos'),
    path('dispositivos/<int:dispositivo_id>/', DispositivoDetailView.as_view(), name='dispositivo-detail'),
    path('escaner/estado/', EstadoEscanerView.as_view(), name='escaner-estado'),
]