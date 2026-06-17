from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import Usuario
from .serializers import UsuarioSerializer, CambiarPasswordSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import CustomTokenObtainPairSerializer

class LoginView (APIView):
    """""
    Recibe usuario y contraseña, devuelve tokens JWT. No requiere autenticación previa
    """""
    permission_classes =[AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        password = request.data.get('password', '')
        pin = request.data.get('pin', '')

        if not username or not password:
            return Response({'error': 'Usuario y contraseña son requeridos.'}, status=400)

        usuario = authenticate(request, username=username, password=password)

        if not usuario:
            return Response({'error': 'Credenciales incorrectas.'}, status=401)

        if not usuario.activo_sistema or not usuario.is_active:
            return Response({'error': 'Su cuenta está desactivada. Contacte al administrador.'}, status=403)

        # Verificar si tiene 2FA activo
        from .models import PinSeguridad
        try:
            pin_obj = PinSeguridad.objects.get(usuario=usuario, activo=True)

            # Si tiene 2FA pero no envió el PIN todavía
            if not pin:
                return Response({
                    'requiere_pin': True,
                    'msg':          'Ingrese su PIN de seguridad para continuar.'
                }, status=200)

            # Si está bloqueado
            if pin_obj.bloqueado:
                return Response({
                    'error': 'Su PIN está bloqueado por demasiados intentos fallidos. '
                            'Contacte al administrador.'
                }, status=403)

            # Verificar PIN
            if not pin_obj.verificar(pin):
                pin_obj.registrar_intento_fallido()
                intentos_restantes = 3 - pin_obj.intentos
                if pin_obj.bloqueado:
                    return Response({'error': 'PIN bloqueado por demasiados intentos.'}, status=403)
                return Response({
                    'error': f'PIN incorrecto. Intentos restantes: {intentos_restantes}'
                }, status=401)

            # PIN correcto — resetear intentos
            pin_obj.intentos = 0
            pin_obj.save()

        except PinSeguridad.DoesNotExist:
            pass  # No tiene 2FA configurado, continúa normalmente

        # Guardar IP
        usuario.ultimo_acceso_ip = request.META.get('REMOTE_ADDR')
        usuario.save(update_fields=['ultimo_acceso_ip'])

        refresh = CustomTokenObtainPairSerializer.get_token(usuario)

        return Response({
            'access':  str(refresh.access_token),
            'refresh': str(refresh),
            'usuario': UsuarioSerializer(usuario).data
        })
    

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token= request.data.get ("refresh")
            token= RefreshToken(refresh_token)
            token.blacklist()
            return Response({"mensaje": "Sesión cerrada correctamente."})
        except Exception:
            return Response ({"ERROR": "Token inválido."}, status=400)
        

class PerfilView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import PermisoModulo
        modulos = list(PermisoModulo.objects.filter(
            usuario=request.user, activo=True
        ).values_list('modulo', flat=True))

        return Response({
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email,
            'first_name': request.user.first_name,
            'last_name': request.user.last_name,
            'rol': request.user.rol,
            'telefono': request.user.telefono,
            'activo_sistema': request.user.activo_sistema,
            'modulos': modulos,
        })
    
    def put(self,request):
        serializer = UsuarioSerializer(
            request.user, data=request.data, partial=True
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
    
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class UsuarioListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.rol !='admin':
            return Response({'error': 'Sin permisos.'}, status=403)
        from .models import PermisoModulo
        usuarios = Usuario.objects.all().order_by('username')
        data = []
        for u in usuarios:
            modulos=list(PermisoModulo.objects.filter(
                usuario=u, activo=True
            ).values_list('modulo', flat=True))
            data.append({
                'id':u.id,
                'username':u.username,
                'email':u.email,
                'first_name': u.first_name,
                'last_name': u.last_name,
                'rol':u.rol,
                'activo_sistema':u.activo_sistema,
                'is_active':u.is_active,
                'modulos':modulos,
            })
        return Response(data)

    def post(self, request):
        if request.user.rol != 'admin':
            return Response({'error': 'Sin permisos.'}, status=403)

        username = request.data.get('username')
        password = request.data.get('password')
        email = request.data.get('email', '')
        rol = request.data.get('rol', 'operador')

        if not username or not password:
            return Response({'error': 'El Usuario y contraseña son requeridos.'}, status=400)

        if Usuario.objects.filter(username=username).exists():
            return Response({'error': 'Nombre de Usuario existente. Intente de nuevo'}, status=400)

        usuario = Usuario.objects.create_user(
            username=username, password=password,
            email=email, rol=rol,
            first_name=request.data.get('first_name', ''),
            last_name=request.data.get('last_name', ''),
        )
        return Response({'ok': True, 'id': usuario.id, 'msg': 'Usuario creado.'}, status=201)


class UsuarioDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def put(self, request, usuario_id):
        if request.user.rol != 'admin':
            return Response({'error': 'Sin permisos.'}, status=403)
        try:
            usuario = Usuario.objects.get(id=usuario_id)
        except Usuario.DoesNotExist:
            return Response({'error': 'No encontrado.'}, status=404)

        for campo in ['email', 'rol', 'first_name', 'last_name']:
            if campo in request.data:
                setattr(usuario, campo, request.data[campo])

        if 'activo' in request.data:
            usuario.is_active = request.data['activo']
            usuario.activo_sistema = request.data['activo']

        if 'password' in request.data and request.data['password']:
            usuario.set_password(request.data['password'])

        usuario.save()
        return Response({'ok': True, 'msg': 'Usuario actualizado.'})

    def delete(self, request, usuario_id):
        if request.user.rol != 'admin':
            return Response({'error': 'Sin permisos.'}, status=403)
        if int(usuario_id) == request.user.id:
            return Response({'error': 'No puedes eliminar tu propio usuario.'}, status=400)
        try:
            u = Usuario.objects.get(id=usuario_id)
            u.is_active = False
            u.activo_sistema = False
            u.save()
            return Response({'ok': True, 'msg': 'Usuario desactivado.'})
        except Usuario.DoesNotExist:
            return Response({'error': 'No encontrado.'}, status=404)


class PermisoModuloView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, usuario_id):
        if request.user.rol != 'admin':
            return Response({'error': 'Sin permisos.'}, status=403)
        from .models import PermisoModulo
        try:
            usuario = Usuario.objects.get(id=usuario_id)
        except Usuario.DoesNotExist:
            return Response({'error': 'No encontrado.'}, status=404)

        modulos_nuevos = request.data.get('modulos', [])

        # Eliminar permisos anteriores y crear los nuevos
        PermisoModulo.objects.filter(usuario=usuario).delete()
        for modulo in modulos_nuevos:
            PermisoModulo.objects.create(usuario=usuario, modulo=modulo)

        return Response({'ok': True, 'msg': 'Permisos actualizados.'})
    

class ConfiguracionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import ConfiguracionSistema
        c = ConfiguracionSistema.obtener()
        return Response({
            'hora_almuerzo_inicio': str(c.hora_almuerzo_inicio)[:5],
            'hora_almuerzo_fin': str(c.hora_almuerzo_fin)[:5],
            'tolerancia_almuerzo_min': c.tolerancia_almuerzo_min,
            'horas_jornada_completa': float(c.horas_jornada_completa),
            'notificar_retrasos': c.notificar_retrasos,
            'notificar_ausencias': c.notificar_ausencias,
            'nombre_institucion': c.nombre_institucion,
            'sede': c.sede,
        })

    def put(self, request):
        if request.user.rol != 'admin':
            return Response({'error': 'Sin permisos.'}, status=403)

        from .models import ConfiguracionSistema
        c = ConfiguracionSistema.obtener()

        campos = [
            'hora_almuerzo_inicio','hora_almuerzo_fin','tolerancia_almuerzo_min', 'horas_jornada_completa',
            'notificar_retrasos', 'notificar_ausencias','nombre_institucion', 'sede',
        ]
        
        for campo in campos:
            if campo in request.data:
                setattr(c, campo, request.data[campo])

        c.updated_by = request.user
        c.save()
        return Response({'ok': True, 'msg': 'Configuración guardada correctamente.'})
    



class CambiarPasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        password_actual = request.data.get('password_actual')
        password_nuevo  = request.data.get('password_nuevo')

        if not password_actual or not password_nuevo:
            return Response({'error': 'Ambos campos son requeridos.'}, status=400)

        if not request.user.check_password(password_actual):
            return Response({'error': 'La contraseña actual es incorrecta.'}, status=400)

        if len(password_nuevo) < 8:
            return Response({'error': 'La contraseña debe tener al menos 8 caracteres.'}, status=400)

        if password_actual == password_nuevo:
            return Response({'error': 'La nueva contraseña debe ser diferente a la actual.'}, status=400)

        request.user.set_password(password_nuevo)
        request.user.save()
        return Response({'ok': True, 'msg': 'Contraseña cambiada correctamente.'})
    


class ConfigurarPreguntasView(APIView):
    """
    El usuario configura sus preguntas de seguridad.
    Debe hacerlo al menos una vez para poder recuperar su contraseña.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import PreguntaSeguridad
        tiene = PreguntaSeguridad.objects.filter(usuario=request.user).exists()
        return Response({
            'configuradas': tiene,
            'preguntas_disponibles': PreguntaSeguridad.PREGUNTAS
        })

    def post(self, request):
        from .models import PreguntaSeguridad
        from django.contrib.auth.hashers import make_password

        p1  = request.data.get('pregunta_1')
        r1  = request.data.get('respuesta_1', '').lower().strip()
        p2  = request.data.get('pregunta_2')
        r2  = request.data.get('respuesta_2', '').lower().strip()

        if not all([p1, r1, p2, r2]):
            return Response({'error': 'Complete todas las preguntas y respuestas.'}, status=400)
        if p1 == p2:
            return Response({'error': 'Las dos preguntas deben ser diferentes.'}, status=400)
        if len(r1) < 2 or len(r2) < 2:
            return Response({'error': 'Las respuestas deben tener al menos 2 caracteres.'}, status=400)

        PreguntaSeguridad.objects.update_or_create(
            usuario=request.user,
            defaults={
                'pregunta_1': p1,
                'respuesta_1_hash': make_password(r1),
                'pregunta_2': p2,
                'respuesta_2_hash': make_password(r2),
            }
        )
        return Response({'ok': True, 'msg': 'Preguntas de seguridad configuradas correctamente.'})


class RecuperarPasswordStep1View(APIView):
    """
    Paso 1 — El usuario ingresa su nombre de usuario.
    El sistema le devuelve sus preguntas de seguridad.
    """
    permission_classes = []  # Sin autenticación

    def post(self, request):
        from .models import PreguntaSeguridad
        username = request.data.get('username', '').strip()

        if not username:
            return Response({'error': 'Ingrese su nombre de usuario.'}, status=400)

        try:
            usuario = Usuario.objects.get(username=username, is_active=True)
        except Usuario.DoesNotExist:
            return Response({'error': 'Usuario no encontrado.'}, status=404)

        try:
            preguntas = PreguntaSeguridad.objects.get(usuario=usuario)
        except PreguntaSeguridad.DoesNotExist:
            return Response({
                'error': 'Este usuario no tiene preguntas de seguridad configuradas. '
                         'Contacte al administrador para restablecer su contraseña.'
            }, status=400)

        PREGUNTAS_DICT = dict(PreguntaSeguridad.PREGUNTAS)
        return Response({
            'ok':        True,
            'username':  username,
            'pregunta_1': PREGUNTAS_DICT.get(preguntas.pregunta_1),
            'pregunta_2': PREGUNTAS_DICT.get(preguntas.pregunta_2),
        })


class RecuperarPasswordStep2View(APIView):
    """
    Paso 2 — El usuario responde las dos preguntas.
    Si son correctas, recibe un token temporal para cambiar su contraseña.
    """
    permission_classes = []

    def post(self, request):
        from .models import PreguntaSeguridad, TokenRecuperacion
        from django.utils import timezone
        import secrets

        username  = request.data.get('username', '').strip()
        respuesta_1 = request.data.get('respuesta_1', '').lower().strip()
        respuesta_2 = request.data.get('respuesta_2', '').lower().strip()

        if not all([username, respuesta_1, respuesta_2]):
            return Response({'error': 'Complete todos los campos.'}, status=400)

        try:
            usuario = Usuario.objects.get(username=username, is_active=True)
            preguntas = PreguntaSeguridad.objects.get(usuario=usuario)
        except (Usuario.DoesNotExist, PreguntaSeguridad.DoesNotExist):
            return Response({'error': 'Datos incorrectos.'}, status=400)

        # Verificar ambas respuestas
        if not preguntas.verificar_respuesta_1(respuesta_1):
            return Response({'error': 'La respuesta a la primera pregunta es incorrecta.'}, status=400)
        if not preguntas.verificar_respuesta_2(respuesta_2):
            return Response({'error': 'La respuesta a la segunda pregunta es incorrecta.'}, status=400)

        # Generar token temporal (válido 15 minutos)
        token = secrets.token_urlsafe(32)
        TokenRecuperacion.objects.create(
            usuario = usuario,
            token = token,
            expira_en = timezone.now() + timezone.timedelta(minutes=15)
        )

        return Response({
            'ok': True,
            'token': token,
            'msg': 'Respuestas correctas. Tiene 15 minutos para cambiar su contraseña.'
        })


class RecuperarPasswordStep3View(APIView):
    """
    Paso 3 — El usuario cambia su contraseña usando el token temporal.
    """
    permission_classes = []

    def post(self, request):
        from .models import TokenRecuperacion

        token = request.data.get('token')
        password_nuevo = request.data.get('password_nuevo')
        confirmar = request.data.get('confirmar')

        if not all([token, password_nuevo, confirmar]):
            return Response({'error': 'Complete todos los campos.'}, status=400)

        if password_nuevo != confirmar:
            return Response({'error': 'Las contraseñas no coinciden.'}, status=400)

        if len(password_nuevo) < 8:
            return Response({'error': 'La contraseña debe tener al menos 8 caracteres.'}, status=400)

        try:
            tok = TokenRecuperacion.objects.get(token=token)
        except TokenRecuperacion.DoesNotExist:
            return Response({'error': 'Token inválido.'}, status=400)

        if not tok.es_valido:
            return Response({'error': 'El token ha expirado o ya fue usado. Inicie el proceso de nuevo.'}, status=400)

        tok.usuario.set_password(password_nuevo)
        tok.usuario.save()
        tok.usado = True
        tok.save()

        return Response({'ok': True, 'msg': 'Contraseña cambiada correctamente. Ya puede iniciar sesión.'})


class AdminResetPasswordView(APIView):
    """
    El administrador puede resetear la contraseña de cualquier usuario
    generando una contraseña temporal.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, usuario_id):
        if request.user.rol != 'admin':
            return Response({'error': 'Sin permisos.'}, status=403)

        import secrets
        try:
            usuario = Usuario.objects.get(id=usuario_id)
        except Usuario.DoesNotExist:
            return Response({'error': 'Usuario no encontrado.'}, status=404)

        # Generar contraseña temporal de 10 caracteres
        password_temp = secrets.token_urlsafe(8)
        usuario.set_password(password_temp)
        usuario.save()

        return Response({
            'ok':            True,
            'password_temp': password_temp,
            'msg':           f'Contraseña temporal generada para {usuario.username}. '
                             f'El usuario debe cambiarla al iniciar sesión.'
        })
    
class ConfigurarPinView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from .models import PinSeguridad
        tiene = PinSeguridad.objects.filter(usuario=request.user, activo=True).exists()
        return Response({'tiene_pin': tiene})

    def post(self, request):
        from .models import PinSeguridad
        from django.contrib.auth.hashers import make_password

        pin     = str(request.data.get('pin', ''))
        confirm = str(request.data.get('confirmar', ''))

        if not pin or len(pin) != 6 or not pin.isdigit():
            return Response({'error': 'El PIN debe ser exactamente 6 dígitos numéricos.'}, status=400)

        if pin != confirm:
            return Response({'error': 'Los PINs no coinciden.'}, status=400)

        PinSeguridad.objects.update_or_create(
            usuario=request.user,
            defaults={
                'pin_hash':  make_password(pin),
                'activo':    True,
                'intentos':  0,
                'bloqueado': False,
            }
        )
        return Response({'ok': True, 'msg': 'PIN de seguridad configurado correctamente.'})

    def delete(self, request):
        from .models import PinSeguridad
        PinSeguridad.objects.filter(usuario=request.user).update(activo=False)
        return Response({'ok': True, 'msg': 'PIN desactivado.'})


class AdminDesbloquearPinView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, usuario_id):
        if request.user.rol != 'admin':
            return Response({'error': 'Sin permisos.'}, status=403)
        from .models import PinSeguridad
        try:
            pin = PinSeguridad.objects.get(usuario_id=usuario_id)
            pin.desbloquear()
            return Response({'ok': True, 'msg': 'PIN desbloqueado.'})
        except PinSeguridad.DoesNotExist:
            return Response({'error': 'Este usuario no tiene PIN configurado.'}, status=404)