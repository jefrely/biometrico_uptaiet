from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.views.static import serve

urlpatterns = [
    path('admin/', admin.site.urls),
    path("api/auth/", include("apps.usuarios.urls")),
    path("api/personal/", include("apps.personal.urls")),
    path("api/asistencia/", include("apps.asistencia.urls")),
    path("api/reportes/", include("apps.reportes.urls")),
    path('api/biometrico/', include('apps.biometrico.urls')),
    path('assets/<path:path>', serve, {
        'document_root': str(settings.BASE_DIR.parent / 'frontend' / 'dist' / 'assets'),
    }),
    path('favicon.svg', serve, {
        'document_root': str(settings.BASE_DIR.parent / 'frontend' / 'dist'),
        'path': 'favicon.svg',
    }),
    path('logo.png', serve, {
        'document_root': str(settings.BASE_DIR.parent / 'frontend' / 'dist'),
        'path': 'logo.png',
    }),
    path('icons.svg', serve, {
        'document_root': str(settings.BASE_DIR.parent / 'frontend' / 'dist'),
        'path': 'icons.svg',
    }),
    path('manifest.json', serve, {
        'document_root': str(settings.BASE_DIR.parent / 'frontend' / 'dist'),
        'path': 'manifest.json',
    }),
    path('robots.txt', serve, {
        'document_root': str(settings.BASE_DIR.parent / 'frontend' / 'dist'),
        'path': 'robots.txt',
    }),
    path('', TemplateView.as_view(template_name='index.html')),
    re_path(r'^(?!api/|admin/|media/|static/).*$', TemplateView.as_view(template_name='index.html')),

] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)