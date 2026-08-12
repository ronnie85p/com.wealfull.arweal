import json
import logging
import urllib.parse
import urllib.request

from django.conf import settings
from django.contrib.auth.models import User
from django.db.models import Q
from django.middleware.csrf import get_token
from rest_framework import generics, permissions, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Address, ApiKey
from .serializers import (
    AddressSerializer,
    ApiKeySerializer,
    UserCreateSerializer,
    UserSerializer,
    UserUpdateSerializer,
)

logger = logging.getLogger('django')


class CsrfTokenView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({'token': get_token(request)})


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = UserSerializer

    def post(self, request):
        from django.contrib.auth import authenticate

        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(request, username=username, password=password)
        if not user:
            return Response({'detail': 'Invalid credentials'}, status=400)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            },
        })


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
        })


class UserListView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = User.objects.filter(is_superuser=False)
        search = self.request.query_params.get('search', '')
        if search:
            qs = qs.filter(
                Q(username__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
            )
        return qs.order_by('username')[:20]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer


class UserRecentView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UserSerializer

    def get_queryset(self):
        from django.db.models import Max

        from payments.models import Order
        if not Order.objects.exists():
            return User.objects.filter(is_superuser=False).order_by('-date_joined')[:10]
        return (
            User.objects.filter(is_superuser=False)
            .annotate(last_order=Max('orders__created_at'))
            .filter(last_order__isnull=False)
            .order_by('-last_order')[:5]
        )


class UserDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    queryset = User.objects.filter(is_superuser=False)

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UserUpdateSerializer
        return UserSerializer


class UserOrdersView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = None

    def get_serializer_class(self):
        from payments.serializers import OrderSerializer
        return OrderSerializer

    def get_queryset(self):
        from payments.models import Order
        return Order.objects.filter(user_id=self.kwargs['user_id']).order_by('-created_at')


class AddressListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AddressSerializer

    def get_queryset(self):
        return Address.objects.filter(user_id=self.kwargs['user_id'])

    def perform_create(self, serializer):
        if serializer.validated_data.get('is_default'):
            Address.objects.filter(user_id=self.kwargs['user_id'], is_default=True).update(is_default=False)
        serializer.save(user_id=self.kwargs['user_id'], owner=self.request.user)


class AddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AddressSerializer

    def get_queryset(self):
        return Address.objects.filter(user_id=self.kwargs['user_id'])

    def perform_update(self, serializer):
        if serializer.validated_data.get('is_default'):
            Address.objects.filter(user_id=self.kwargs['user_id'], is_default=True).update(is_default=False)
        serializer.save()


class ApiKeyViewSet(viewsets.ModelViewSet):
    serializer_class = ApiKeySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ApiKey.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, owner=self.request.user)


def _has_api_key(req: urllib.request.Request) -> bool:
    return any(k.lower() == 'x-goog-api-key' for k in req.headers)


def _places_api_key():
    return getattr(settings, 'GOOGLE_PLACES_API_KEY', '')


class PlacesAutocompleteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({'results': []})
        key = _places_api_key()
        if not key:
            return Response({'error': 'Google Places API key is not configured'}, status=503)
        body = json.dumps({'input': query}).encode('utf-8')
        req = urllib.request.Request(
            'https://places.googleapis.com/v1/places:autocomplete',
            data=body,
            headers={'Content-Type': 'application/json', 'X-Goog-Api-Key': key},
            method='POST',
        )
        logger.info(
            'Outgoing Google Places autocomplete request: %s (API key set: %s, query=%r)',
            req.full_url,
            _has_api_key(req),
            query,
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                payload = json.loads(resp.read().decode('utf-8'))
        except Exception as exc:
            return Response({'error': str(exc)}, status=502)
        results = []
        for p in payload.get('predictions', []):
            pp = p.get('placePrediction', {})
            sf = pp.get('structuredFormat', {})
            results.append({
                'place_id': pp.get('place', ''),
                'main_text': sf.get('mainText', {}).get('text', ''),
                'secondary_text': sf.get('secondaryText', {}).get('text', ''),
                'description': pp.get('text', {}).get('text', ''),
            })
        return Response({'results': results})


class PlacesDetailsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        place_id = request.query_params.get('place_id', '').strip()
        if not place_id:
            return Response({'error': 'place_id is required'}, status=400)
        key = _places_api_key()
        if not key:
            return Response({'error': 'Google Places API key is not configured'}, status=503)
        url = 'https://places.googleapis.com/v1/places/{}'.format(urllib.parse.quote(place_id))
        req = urllib.request.Request(
            url,
            headers={
                'X-Goog-Api-Key': key,
                'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.addressComponents',
            },
            method='GET',
        )
        logger.info(
            'Outgoing Google Places details request: %s (API key set: %s, place_id=%r)',
            req.full_url,
            _has_api_key(req),
            place_id,
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                payload = json.loads(resp.read().decode('utf-8'))
        except Exception as exc:
            return Response({'error': str(exc)}, status=502)
        place = payload.get('places', [{}])[0] if payload.get('places') else {}
        components = place.get('addressComponents', [])

        def by_type(types):
            return next(
                (c.get('longText', '') for c in components if any(t in c.get('types', []) for t in types)),
                '',
            )

        street_number = next(
            (c.get('shortText', '') for c in components if 'street_number' in c.get('types', [])),
            '',
        )
        route = by_type(['route'])
        street = f'{street_number} {route}'.strip()
        city = by_type(['locality', 'sublocality_level_1', 'administrative_area_level_2'])
        state = next(
            (c.get('shortText', '') for c in components if 'administrative_area_level_1' in c.get('types', [])),
            by_type(['administrative_area_level_1']),
        )
        postal_code = by_type(['postal_code'])
        return Response({
            'formatted_address': place.get('formattedAddress', ''),
            'street': street,
            'city': city,
            'state': state,
            'postal_code': postal_code,
        })