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

    def post (self, request):
        username = request.data.get ("username"," ").strip()
        password = request.data.get ("password"," ")

        if not username or not password:
            return Response(
                {"ERROR": "Usuario y Contraseña Obligatorios"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        usuario = authenticate(request, username=username, password=password)

        if not usuario:
            return Response(
                {"ERROR": {"Credenciales incorrectas."}},
                status=status.HTTP_401_UNAUTHORIZED
            )
        if not usuario.activo_sistema:
            return Response(
                {"ERROR": {"Su cuenta ha sido desactivada. Contacte al administrador"}},
                status=status.HTTP_403_FORBIDDEN
            )
        

        #guarda IP del ultimo acceso
        usuario.ultimo_acceso_ip= request.META.get("REMOTE_ADDR")
        usuario.save (update_fields=["ultimo_acceso_ip"])

        refresh = CustomTokenObtainPairSerializer.get_token(usuario)

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "usuario": UsuarioSerializer(usuario).data
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