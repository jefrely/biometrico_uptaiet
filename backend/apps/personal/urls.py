from django.urls import path
from .views import (
    DepartamentoListView, DepartamentoDetailView, EmpleadoListView, EmpleadoDetailView, HorarioListView, HorarioEmpleadoView
)

urlpatterns = [
    path ("departamentos/", DepartamentoListView.as_view (), name="departamentos"),
    path ("departamentos/<int:pk>/", DepartamentoDetailView.as_view(), name="departamento-detail"),
    path ("empleados/", EmpleadoListView.as_view(), name="empleados"),
    path ("empleados/<int:pk>/", EmpleadoDetailView.as_view(), name="empleado-details"),
    path ("horarios/", HorarioListView.as_view(), name="horarios"),
    path ("horarios/<int:empleado_id>/", HorarioEmpleadoView.as_view(), name="horario-empleado"),
]