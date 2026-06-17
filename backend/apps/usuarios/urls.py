from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (LoginView, LogoutView, PerfilView, CustomTokenObtainPairView, UsuarioListView, UsuarioDetailView, PermisoModuloView, ConfiguracionView,
                    CambiarPasswordView, ConfigurarPreguntasView, RecuperarPasswordStep1View, RecuperarPasswordStep2View, RecuperarPasswordStep3View,
                    AdminResetPasswordView,ConfigurarPinView, AdminDesbloquearPinView,
                    )


urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('logout/',LogoutView.as_view(), name='logout'),
    path('refresh/', TokenRefreshView.as_view(),name='token_refresh'),
    path('perfil/', PerfilView.as_view(), name='perfil'),
    path('token/', CustomTokenObtainPairView.as_view(), name='token'),
    path('usuarios/', UsuarioListView.as_view(),name='usuarios'),
    path('usuarios/<int:usuario_id>/', UsuarioDetailView.as_view(), name='usuario-detail'),
    path('usuarios/<int:usuario_id>/permisos/', PermisoModuloView.as_view(),name='usuario-permisos'),
    path('usuarios/<int:usuario_id>/reset-password/', AdminResetPasswordView.as_view(), name='admin-reset'),
    path('configuracion/', ConfiguracionView.as_view(), name='configuracion'),
    path('cambiar-password/', CambiarPasswordView.as_view(), name='cambiar-password'),
    path('preguntas-seguridad/', ConfigurarPreguntasView.as_view(),name='preguntas-seguridad'),
    path('recuperar/paso1/', RecuperarPasswordStep1View.as_view(),name='recuperar-1'),
    path('recuperar/paso2/',RecuperarPasswordStep2View.as_view(),name='recuperar-2'),
    path('recuperar/paso3/',RecuperarPasswordStep3View.as_view(),name='recuperar-3'),
    path('pin/', ConfigurarPinView.as_view(), name='configurar-pin'),
    path('usuarios/<int:usuario_id>/desbloquear-pin/', AdminDesbloquearPinView.as_view(), name='desbloquear-pin'),
    path('pin/',ConfigurarPinView.as_view(), name='pin'),
    path('usuarios/<int:usuario_id>/desbloquear-pin/', AdminDesbloquearPinView.as_view(), name='desbloquear-pin'),
]