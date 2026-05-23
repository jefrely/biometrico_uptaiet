from django.urls import path
from .views import (MarcarAsistenciaView,DashboardView,HistorialEmpleadoView,RegistrarHuellaView,HuellasEmpleadoView,PermisoListView,
                    PermisoDetailView,FeriadoListView,)

urlpatterns = [
    path('marcar/',MarcarAsistenciaView.as_view(),name='marcar'),
    path('dashboard/',DashboardView.as_view(),name='dashboard'),
    path('historial/<int:empleado_id>/',HistorialEmpleadoView.as_view(), name='historial'),
    path('registrar-huella/',RegistrarHuellaView.as_view(), name='registrar-huella'),
    path('huellas/<int:empleado_id>/',HuellasEmpleadoView.as_view(),name='huellas-empleado'),
    path('permisos/',PermisoListView.as_view(), name='permisos'),
    path('permisos/<int:permiso_id>/', PermisoDetailView.as_view(),name='permiso-detail'),
    path('feriados/',FeriadoListView.as_view(),name='feriados'),
]