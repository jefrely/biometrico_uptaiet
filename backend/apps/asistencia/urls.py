from django.urls import path
from .views import (
    MarcarAsistenciaView,
    RegistrarHuellaView,
    DashboardView, 
    HistorialEmpleadoView,
    HuellasEmpleadosView
)

urlpatterns = [
    path("marcar/", MarcarAsistenciaView.as_view(), name="marcar"),
    path("registrar-huella/", RegistrarHuellaView.as_view(), name="registrar-huella"),
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("historial/<int:empleado_id>/", HistorialEmpleadoView.as_view(), name="historial"),
    path("huellas/<int:empleado_id>/", HuellasEmpleadosView.as_view(), name="huellas-empleado"),
]