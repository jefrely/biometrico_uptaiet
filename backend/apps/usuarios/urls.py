from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (LoginView, LogoutView, PerfilView, CustomTokenObtainPairView, UsuarioListView, UsuarioDetailView, PermisoModuloView,)


urlpatterns = [
    path ("login/", LoginView.as_view(), name="login"),
    path ("logout/", LogoutView.as_view(), name="logout"),
    path ("refresh/", TokenRefreshView.as_view (), name="token_refresh"),
    path ("perfil/", PerfilView.as_view(), name="perfil"),
    path('token/', CustomTokenObtainPairView.as_view(), name='token'),
     path('usuarios/', UsuarioListView.as_view(), name='usuarios'),
    path('usuarios/<int:usuario_id>/', UsuarioDetailView.as_view(), name='usuario-detail'),
    path('usuarios/<int:usuario_id>/permisos/', PermisoModuloView.as_view(), name='usuario-permisos'),
]