from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import Usuario
from .serializers import UsuarioSerializer, CambiarPasswordSerializer

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

        refresh= RefreshToken.for_user(usuario)

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
        return Response(UsuarioSerializer(request.user).data)
    
    def put(self,request):
        serializer = UsuarioSerializer(
            request.user, data=request.data, partial=True
        )

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)