from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import DispositivoBiometrico


class DispositivoListView(APIView):
    permission_classes=[IsAuthenticated]

    def get(self, request):
        dispositivos =DispositivoBiometrico.objects.all()
        data = [{
            'id':i.id,
            'nombre':i.nombre,
            'modelo':i.modelo,
            'numero_serie':i.numero_serie,
            'ubicacion':i.ubicacion,
            'activo':i.activo,
            'ultima_sincronizacion':timezone.localtime(i.ultima_sincronizacion).strftime('%d/%m/%Y %I:%M %p') if i.ultima_sincronizacion else None,
        } for i in dispositivos]
        return Response(data)

    def post(self, request):
        if request.user.rol !='admin':
            return Response({'error':'Sin permisos'}, status=403)

        nombre=request.data.get('nombre')
        modelo=request.data.get('modelo','ZK9500')
        serie=request.data.get('numero_serie')
        ubic=request.data.get('ubicacion','')

        if not nombre or not serie:
            return Response({'error': 'Nombre y número de serie son requeridos.'}, status=400)

        if DispositivoBiometrico.objects.filter(numero_serie=serie).exists():
            return Response({'error': 'Ya existe un dispositivo con ese número de serie.'}, status=400)

        i=DispositivoBiometrico.objects.create(
            nombre=nombre, modelo=modelo, numero_serie=serie, ubicacion=ubic
        )
        return Response({'ok': True, 'id': i.id}, status=201)


class DispositivoDetailView(APIView):
    permission_classes=[IsAuthenticated]

    def put(self,request,dispositivo_id):
        if request.user.rol !='admin':
            return Response({'error': 'Sin permisos'}, status=403)
        try:
            i = DispositivoBiometrico.objects.get(id=dispositivo_id)
        except DispositivoBiometrico.DoesNotExist:
            return Response({'error': 'No encontrado. Intente de nuevo'}, status=404)

        for campo in ['nombre','ubicacion','activo']:
            if campo in request.data:
                setattr(i, campo, request.data[campo])
        i.save()
        return Response({'ok':True})

    def delete(self,request,dispositivo_id):
        if request.user.rol != 'admin':
            return Response({'error': 'Sin permisos'}, status=403)
        try:
            DispositivoBiometrico.objects.get(id=dispositivo_id).delete()
            return Response({'ok': True})
        except DispositivoBiometrico.DoesNotExist:
            return Response({'error': 'No encontrado'}, status=404)


class EstadoEscanerView(APIView):
    """Verifica si el escáner ZK9500 está conectado en este momento."""
    permission_classes=[IsAuthenticated]

    def get(self,request):
        try:
            import ctypes
            dll = ctypes.WinDLL("libzkfp.dll")
            dll.ZKFPM_Terminate()
            ret = dll.ZKFPM_Init()
            if ret != 0:
                return Response({'conectado':False, 'msg': f'Error SDK: {ret}'})
            cantidad = dll.ZKFPM_GetDeviceCount()
            dll.ZKFPM_Terminate()
            return Response({
                'conectado':cantidad > 0,
                'cantidad':cantidad,
                'msg':f'{cantidad} dispositivo(s) detectado(s)' if cantidad > 0 else 'Ningún escáner detectado'
            })
        except Exception as e:
            return Response({'conectado': False, 'msg': str(e)})