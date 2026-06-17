from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path("api/auth/", include("apps.usuarios.urls")),
    path("api/personal/", include("apps.personal.urls")),
    path("api/biometrico/", include("apps.personal.urls")),
    path("api/asistencia/", include("apps.asistencia.urls")),
    path("api/reportes/", include("apps.reportes.urls")),
    path('api/biometrico/', include('apps.biometrico.urls')),

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)