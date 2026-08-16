import hashlib
import json
import logging
import re
import urllib.parse
import urllib.request

from django.conf import settings
from django.contrib.auth.models import User
from django.core.mail import send_mail
from django.db import ProgrammingError, transaction
from django.db.models import Q
from django.middleware.csrf import get_token
from django.utils import timezone
from rest_framework import generics, permissions, serializers, status, viewsets
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView

from config.middleware import _client_ip, _source_host
from integrator.events import Event, EventLogMixin
from integrator.models import (
    API_KEY_PERMISSIONS,
    Account,
    AccountCustomer,
    AccountType,
    Address,
    ApiDomain,
    ApiKey,
    Company,
    EmailSettings,
    EventLog,
    Profile,
)
from .services import (
    LOGIN_TTL,
    REGISTER_TTL,
    clear_code,
    code_expired,
    consume_code,
    is_code_active,
    issue_code,
    matches,
    resend_available_in,
    send_account_email,
)


def account_type_name(user) -> str:
    try:
        account = Account.objects.filter(user=user).select_related('account_type').first()
    except ProgrammingError:
        return ''
    return account.account_type.name if account else ''
from .serializers import (
    AccountSerializer,
    AccountTypeSerializer,
    AddressSerializer,
    ApiKeySerializer,
    ApiDomainSerializer,
    CompanySerializer,
    EmailSettingsSerializer,
    EventLogSerializer,
    UserCreateSerializer,
    UserSerializer,
    UserUpdateSerializer,
)

logger = logging.getLogger('django')

ADDRESS_FIELDS = ('country', 'state', 'city', 'street', 'building', 'unit', 'zip')


def _find_user(identifier: str):
    identifier = (identifier or '').strip()
    if not identifier:
        return None
    return User.objects.filter(
        Q(username__iexact=identifier) | Q(email__iexact=identifier)
    ).first()


def _profile_email(profile, user: User) -> str:
    if profile is None:
        return (user.email or '').strip()
    return (profile.email or user.email or '').strip()


def _find_profile_by_email(email: str):
    profile = Profile.objects.filter(email=email).first()
    if profile is not None:
        return profile
    user = User.objects.filter(email__iexact=email).first()
    if user is None:
        return None
    return Profile.objects.filter(user=user).first()


class ConfigView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({
            'csrf': get_token(request),
            'locale': settings.LANGUAGE_CODE,
            'time': timezone.now().isoformat(),
            'timezone': settings.TIME_ZONE,
        })


class AccountTypeListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = AccountTypeSerializer
    queryset = AccountType.objects.all()


def _log_auth_event(user, action, method, request, extra=None):
    if user is None:
        return
    account = Account.objects.filter(user=user).order_by('id').first()
    if account is None:
        return
    payload = {'method': method, 'ip': _client_ip(request), 'domain': _source_host(request)}
    if extra:
        payload.update(extra)
    Event(account, 'authorize', user.id, action, payload, actor=user, label=user.username).fire()


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = UserSerializer

    def post(self, request):
        user = _find_user(request.data.get('username'))
        if not user or not user.is_active:
            _log_auth_event(user, 'login-failed', 'simple', request)
            return Response({'detail': 'User not found', 'ip': _client_ip(request), 'domain': _source_host(request)}, status=400)
        token, _ = Token.objects.get_or_create(user=user)
        _log_auth_event(user, 'login', 'simple', request)
        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            },
            'ip': _client_ip(request),
            'domain': _source_host(request),
        })


class LoginCheckView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        user = _find_user(request.data.get('username'))
        if not user or not user.is_active:
            return Response({'detail': 'User not found'}, status=400)
        profile = Profile.objects.filter(user=user).first()
        return Response({
            'password_set': user.has_usable_password(),
            'email': _profile_email(profile, user),
        })


class LoginPasswordView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        from django.contrib.auth import authenticate

        user = _find_user(request.data.get('username'))
        password = request.data.get('password') or ''
        authenticated = user and authenticate(request, username=user.username, password=password)
        if not authenticated:
            _log_auth_event(user, 'login-failed', 'password', request)
            return Response({'detail': 'Invalid credentials', 'ip': _client_ip(request), 'domain': _source_host(request)}, status=400)
        token, _ = Token.objects.get_or_create(user=user)
        _log_auth_event(user, 'login', 'password', request)
        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            },
            'ip': _client_ip(request),
            'domain': _source_host(request),
        })


class LoginSendCodeView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        user = _find_user(request.data.get('username'))
        if not user or not user.is_active:
            return Response({'detail': 'User not found'}, status=400)
        profile, _ = Profile.objects.get_or_create(user=user)
        email = _profile_email(profile, user)
        if not email:
            return Response({'detail': 'No email on file for this user'}, status=400)
        if not profile.email:
            profile.email = user.email
            profile.save(update_fields=['email'])
        wait = resend_available_in(profile)
        if wait:
            return Response({'detail': f'Try again in {wait} seconds'}, status=429)
        code, expires_at = issue_code(profile)
        _log_auth_event(user, 'code-sent', 'code', request, {'email': email})
        return Response({'code': code, 'expires_at': expires_at.isoformat(), 'email': email, 'ip': _client_ip(request), 'domain': _source_host(request)})


class LoginCheckCodeView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        profile = _find_profile_by_email(email)
        if profile is None or not is_code_active(profile):
            return Response({'active': False})
        return Response({'active': True, 'expires_at': profile.code_expires_at.isoformat()})


class LoginConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        code = (request.data.get('code') or '').strip()
        profile = _find_profile_by_email(email)
        if profile is None or not matches(profile, code):
            _log_auth_event(profile.user if profile else None, 'login-failed', 'code', request)
            return Response({'detail': 'Invalid code'}, status=400)
        consume_code(profile, code)
        user = profile.user
        token, _ = Token.objects.get_or_create(user=user)
        _log_auth_event(user, 'login', 'code', request)
        return Response({
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            },
            'ip': _client_ip(request),
            'domain': _source_host(request),
        })


class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        local = (email.split('@')[0] or 'user')
        digest = hashlib.sha256(email.encode('utf-8')).hexdigest()[:8]
        data = request.data.copy()
        data['username'] = f'{local}{digest}'
        serializer = UserCreateSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        with transaction.atomic():
            user = serializer.save()
            profile = Profile.objects.create(
                user=user,
                firstname=request.data.get('firstname', ''),
                midname=request.data.get('midname', ''),
                lastname=request.data.get('lastname', ''),
                email=request.data.get('email', ''),
            )
            code, expires_at = issue_code(profile, ttl=REGISTER_TTL)
            is_business = (
                request.data.get('account_type') in ('Business', 'Company')
                or bool(request.data.get('company_name'))
            )
            if is_business:
                Company.objects.create(
                    owner=user,
                    name=request.data.get('company_name', ''),
                    ein=request.data.get('ein', ''),
                )
            account_type = AccountType.objects.filter(
                name='Business' if is_business else 'Employer'
            ).first()
            if account_type:
                try:
                    Account.objects.create(account_type=account_type, user=user)
                except ProgrammingError:
                    pass
        return Response({
            'code': code,
            'expires_at': expires_at.isoformat(),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
            },
        }, status=201)


class ConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        code = (request.data.get('code') or '').strip()
        email = (request.data.get('email') or '').strip().lower()
        password = request.data.get('password') or ''
        try:
            profile = Profile.objects.get(
                confirmation_code=code, email=email, confirmed_at__isnull=True
            )
        except Profile.DoesNotExist:
            return Response({'detail': 'Invalid code'}, status=400)
        if code_expired(profile):
            clear_code(profile)
            return Response({'detail': 'Code expired'}, status=400)
        user = profile.user
        if password:
            if len(password) < 6:
                return Response({'detail': 'Password must be at least 6 characters'}, status=400)
            user.set_password(password)
            user.save()
        profile.confirmation_code = ''
        profile.confirmed_at = timezone.now()
        profile.save(update_fields=['confirmation_code', 'confirmed_at', 'updated_at'])
        return Response({'detail': 'Email confirmed'})


class CheckRegistrationView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        profile = Profile.objects.filter(email=email, confirmed_at__isnull=True).first()
        if profile is None or not is_code_active(profile):
            return Response({'active': False})
        return Response({'active': True, 'expires_at': profile.code_expires_at.isoformat()})


class ResendCodeView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        profile = Profile.objects.filter(email=email, confirmed_at__isnull=True).first()
        if profile is None:
            return Response({'detail': 'No pending registration for this email'}, status=400)
        wait = resend_available_in(profile)
        if wait:
            return Response({'detail': f'Try again in {wait} seconds'}, status=429)
        code, expires_at = issue_code(profile)
        return Response({'code': code, 'expires_at': expires_at.isoformat()})

class CompleteRegistrationView(APIView):
    permission_classes = [permissions.AllowAny]

    def _password_ok(self, password):
        if len(password) < 8:
            return False
        if not re.search(r'[A-Z]', password) or not re.search(r'[a-z]', password):
            return False
        if not re.search(r'\d', password):
            return False
        if not re.search(r'[^A-Za-z0-9]', password):
            return False
        return True

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        password = request.data.get('password') or ''
        two_factor = bool(request.data.get('two_factor'))
        username = (request.data.get('username') or '').strip()
        try:
            profile = Profile.objects.get(email=email, confirmed_at__isnull=False)
        except Profile.DoesNotExist:
            return Response({'detail': 'Email not confirmed'}, status=400)
        user = profile.user
        if password and not self._password_ok(password):
            return Response(
                {'detail': 'Password must contain 8+ characters with upper/lower case, numbers and symbols'},
                status=400,
            )
        if username and len(username) < 3:
            return Response({'detail': 'Login must be at least 3 characters'}, status=400)
        if username:
            user.username = username
        if password:
            user.set_password(password)
        user.save()
        profile.two_factor = two_factor
        profile.save(update_fields=['two_factor', 'updated_at'])
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
        profile = Profile.objects.filter(user=user).first()
        first_name = user.first_name or (profile.firstname if profile else '') or ''
        last_name = user.last_name or (profile.lastname if profile else '') or ''
        return Response({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': first_name,
            'last_name': last_name,
            'account_type': account_type_name(user),
        })


class AccountDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, uuid=None):
        if uuid:
            account = Account.objects.filter(uuid=uuid).select_related(
                'account_type', 'user'
            ).first()
            if account is None:
                return Response({'detail': 'Account not found'}, status=404)
        else:
            account = Account.objects.filter(user=request.user).select_related(
                'account_type', 'user'
            ).first()
            if account is None:
                return Response({'detail': 'No account for this user'}, status=404)
        serializer = AccountSerializer(account)
        return Response(serializer.data)


class AuthStatusView(APIView):
    permission_classes = [permissions.AllowAny]

    ONLINE_WINDOW_SECONDS = 30
    def get(self, request):
        if not request.user.is_authenticated:
            return Response({'authenticated': False, 'user': None})
        profile, _ = Profile.objects.get_or_create(user=request.user)
        now = timezone.now()
        profile.last_seen = now
        profile.save(update_fields=['last_seen', 'updated_at'])
        online = profile.last_seen is not None and (
            now - profile.last_seen
        ).total_seconds() < self.ONLINE_WINDOW_SECONDS
        first_name = request.user.first_name or profile.firstname or ''
        last_name = request.user.last_name or profile.lastname or ''
        return Response({
            'authenticated': True,
            'user': {
                'id': request.user.id,
                'username': request.user.username,
                'email': request.user.email,
                'first_name': first_name,
                'last_name': last_name,
                'online': online,
                'account_type': account_type_name(request.user),
            },
        })


class UserListView(EventLogMixin, generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    event_entity = 'user'

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


class UserDetailView(EventLogMixin, generics.RetrieveUpdateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    queryset = User.objects.filter(is_superuser=False)
    event_entity = 'user'

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


class AddressListCreateView(EventLogMixin, generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AddressSerializer
    event_entity = 'address'

    def get_queryset(self):
        return Address.objects.filter(user_id=self.kwargs['user_id'])

    def perform_create(self, serializer):
        if serializer.validated_data.get('is_default'):
            Address.objects.filter(user_id=self.kwargs['user_id'], is_default=True).update(is_default=False)
        instance = serializer.save(user_id=self.kwargs['user_id'], owner=self.request.user)
        self._log('create', instance, serializer.data)


class AddressDetailView(EventLogMixin, generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AddressSerializer
    event_entity = 'address'

    def get_queryset(self):
        return Address.objects.filter(user_id=self.kwargs['user_id'])

    def perform_update(self, serializer):
        if serializer.validated_data.get('is_default'):
            Address.objects.filter(user_id=self.kwargs['user_id'], is_default=True).update(is_default=False)
        instance = serializer.save()
        self._log('update', instance, serializer.data)


class CustomerListView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer

    def _account(self):
        return Account.objects.filter(
            uuid=self.kwargs['account_id'], user=self.request.user
        ).first()

    def get_queryset(self):
        account = self._account()
        if account is None:
            return User.objects.none()
        qs = User.objects.filter(is_superuser=False, customer_of__account=account).distinct()
        search = self.request.query_params.get('search', '')
        if search:
            qs = qs.filter(
                Q(username__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
            )
        return qs.order_by('username')[:50]

    def perform_create(self, serializer):
        account = self._account()
        if account is None:
            raise serializers.ValidationError({'account_id': 'No account for this user.'})
        customer = serializer.save()
        AccountCustomer.objects.get_or_create(account=account, customer=customer)
        Event(
            account,
            'customer',
            customer.pk,
            'create',
            UserSerializer(customer).data,
            actor=self.request.user,
            label=customer.username,
        ).fire()


class CustomerUnbindView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        customer = (
            User.objects.filter(
                is_superuser=False,
                id=pk,
                customer_of__account__uuid=self.kwargs['account_id'],
                customer_of__account__user=request.user,
            )
            .distinct()
            .first()
        )
        if customer is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(UserSerializer(customer).data)

    def delete(self, request, pk):
        account = Account.objects.filter(
            uuid=self.kwargs['account_id'], user=request.user
        ).first()
        if account is None:
            return Response({'detail': 'No account for this user.'}, status=status.HTTP_404_NOT_FOUND)
        customer = User.objects.filter(id=pk, customer_of__account=account).first()
        AccountCustomer.objects.filter(account=account, customer_id=pk).delete()
        if customer is not None:
            Event(
                account,
                'customer',
                pk,
                'delete',
                UserSerializer(customer).data,
                actor=request.user,
                label=customer.username,
            ).fire()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserInviteView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        email = (request.data.get('email') or '').strip().lower()
        if not email or not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email):
            raise serializers.ValidationError({'email': 'A valid email is required.'})
        if User.objects.filter(username=email).exists():
            return Response(
                {'detail': 'A user with this email already exists.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        first_name = (request.data.get('first_name') or '').strip()
        last_name = (request.data.get('last_name') or '').strip()
        account = None
        account_id = (request.data.get('account_id') or '').strip()
        if account_id:
            account = Account.objects.filter(uuid=account_id).first()
            if account is None or account.user_id != request.user.id:
                raise serializers.ValidationError({'account_id': 'Invalid account.'})
        else:
            account = Account.objects.filter(user=request.user).order_by('id').first()
        user = User.objects.create_user(
            username=email, email=email, first_name=first_name, last_name=last_name
        )
        user.set_unusable_password()
        user.save()
        if account is not None:
            AccountCustomer.objects.get_or_create(account=account, customer=user)
        Event(
            account,
            'customer',
            user.pk,
            'create',
            {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            },
            actor=request.user,
            label=user.username,
        ).fire()
        try:
            send_account_email(
                account,
                'You have been invited to Wealfull CRM',
                (
                    f'Hello{(" " + first_name) if first_name else ""},\n\n'
                    'You have been invited to Wealfull CRM as an executor.\n\n'
                    f'Your username is: {email}\n'
                    f'Sign in at: {settings.FRONTEND_URL}\n\n'
                    'If you have any questions, reply to this email.'
                ),
                [email],
                fail_silently=True,
            )
        except Exception:
            pass
        return Response(
            {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            },
            status=status.HTTP_201_CREATED,
        )


class CompanyListView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CompanySerializer

    def _account(self):
        return Account.objects.filter(
            uuid=self.kwargs['account_id'], user=self.request.user
        ).first()

    def get_queryset(self):
        account = self._account()
        if account is None:
            return Company.objects.none()
        return Company.objects.filter(account=account, owner=self.request.user).order_by('name')

    def perform_create(self, serializer):
        account = self._account()
        if account is None:
            raise serializers.ValidationError({'account_id': 'Invalid account.'})
        company = serializer.save(owner=self.request.user, account=account)
        address_data = self.request.data.get('address')
        if isinstance(address_data, dict) and any(
            str(address_data.get(key, '') or '').strip() for key in ADDRESS_FIELDS
        ):
            address = Address.objects.create(
                owner=self.request.user,
                **{key: str(address_data.get(key, '') or '').strip() for key in ADDRESS_FIELDS},
            )
            company.address = address
            company.save(update_fields=['address'])
        Event(
            account,
            'company',
            company.pk,
            'create',
            CompanySerializer(company).data,
            actor=self.request.user,
            label=company.name,
        ).fire()


class CompanyDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = CompanySerializer

    def get_queryset(self):
        return Company.objects.filter(
            account__uuid=self.kwargs['account_id'],
            account__user=self.request.user,
            owner=self.request.user,
        )


class AccountApiKeyListView(generics.ListCreateAPIView):
    serializer_class = ApiKeySerializer
    permission_classes = [permissions.IsAuthenticated]

    def _account(self):
        return Account.objects.filter(
            uuid=self.kwargs['account_id'], user=self.request.user
        ).first()

    def get_queryset(self):
        account = self._account()
        if account is None:
            return ApiKey.objects.none()
        return ApiKey.objects.filter(account=account)

    def perform_create(self, serializer):
        account = self._account()
        if account is None:
            raise serializers.ValidationError({'account_id': 'Invalid account.'})
        domain = serializer.validated_data.get('domain')
        if domain is not None and domain.account_id != account.id:
            raise serializers.ValidationError({'domain_id': 'Invalid domain.'})
        permissions = serializer.validated_data.get('permissions')
        if not permissions:
            permissions = [p for p in API_KEY_PERMISSIONS if p.endswith('.read')]
        instance = serializer.save(account=account, permissions=permissions)
        Event(
            account,
            'api-key',
            instance.pk,
            'create',
            ApiKeySerializer(instance).data,
            actor=self.request.user,
            label=instance.name,
        ).fire()


class AccountApiKeyDetailView(EventLogMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ApiKeySerializer
    permission_classes = [permissions.IsAuthenticated]
    event_entity = 'api-key'

    def get_queryset(self):
        return ApiKey.objects.filter(
            account__uuid=self.kwargs['account_id'], account__user=self.request.user
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        domain = request.data.get('domain_id')
        if domain not in (None, ''):
            if not ApiDomain.objects.filter(id=domain, account_id=instance.account_id).exists():
                raise serializers.ValidationError({'domain_id': 'Invalid domain.'})
        return super().update(request, *args, **kwargs)


class AccountApiDomainListView(generics.ListCreateAPIView):
    serializer_class = ApiDomainSerializer
    permission_classes = [permissions.IsAuthenticated]

    def _account(self):
        return Account.objects.filter(
            uuid=self.kwargs['account_id'], user=self.request.user
        ).first()

    def get_queryset(self):
        account = self._account()
        if account is None:
            return ApiDomain.objects.none()
        return ApiDomain.objects.filter(account=account)

    def perform_create(self, serializer):
        account = self._account()
        if account is None:
            raise serializers.ValidationError({'account_id': 'Invalid account.'})
        instance = serializer.save(account=account)
        Event(
            account,
            'api-domain',
            instance.pk,
            'create',
            ApiDomainSerializer(instance).data,
            actor=self.request.user,
            label=instance.domain,
        ).fire()


class AccountApiDomainDetailView(EventLogMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ApiDomainSerializer
    permission_classes = [permissions.IsAuthenticated]
    event_entity = 'api-domain'

    def get_queryset(self):
        return ApiDomain.objects.filter(
            account__uuid=self.kwargs['account_id'], account__user=self.request.user
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        domain = (request.data.get('domain') or '').strip()
        if domain and ApiDomain.objects.filter(domain=domain).exclude(pk=instance.pk).exists():
            raise serializers.ValidationError({'domain': 'A domain with this name already exists.'})
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        linked = ApiKey.objects.filter(account=instance.account, domain=instance).count()
        if linked:
            return Response(
                {'detail': f'Cannot delete domain: {linked} API key(s) are linked to it.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)


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


class AccountEventListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = EventLogSerializer

    def get_queryset(self):
        account = Account.objects.filter(
            uuid=self.kwargs['account_id'], user=self.request.user
        ).first()
        if account is None:
            return EventLog.objects.none()
        qs = EventLog.objects.filter(account=account)
        kind = self.request.query_params.get('kind')
        if kind == 'api':
            qs = qs.filter(entity='api-call')
        elif kind == 'authorize':
            qs = qs.filter(entity='authorize')
        elif kind == 'mail':
            qs = qs.filter(entity='mail')
        else:
            qs = qs.exclude(entity__in=['api-call', 'authorize', 'mail'])
        entity = self.request.query_params.get('entity')
        if entity:
            qs = qs.filter(entity=entity)
        action = self.request.query_params.get('action')
        if action:
            qs = qs.filter(action=action)
        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
        actor = self.request.query_params.get('actor')
        if actor:
            qs = qs.filter(actor__username=actor)
        qs = qs.order_by('-created_at', '-id')
        before = self.request.query_params.get('before')
        if before:
            qs = qs.filter(id__lt=before)
        after = self.request.query_params.get('after')
        if after:
            qs = qs.filter(id__gt=after)
        try:
            limit = int(self.request.query_params.get('limit', 25))
        except (TypeError, ValueError):
            limit = 25
        limit = max(1, min(limit, 200))
        self._page_limit = limit
        return qs[: limit + 1]

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        response['X-Has-More'] = 'true' if len(response.data) > self._page_limit else 'false'
        if len(response.data) > self._page_limit:
            response.data = response.data[: self._page_limit]
        return response


def _account_for(request, account_id):
    return Account.objects.filter(uuid=account_id, user=request.user).first()


class AccountEmailSettingsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def _settings(self, request):
        account = _account_for(request, self.kwargs['account_id'])
        if account is None:
            return None, Response({'detail': 'Account not found'}, status=404)
        settings_obj, _ = EmailSettings.objects.get_or_create(
            account=account,
            defaults={
                'host': settings.EMAIL_HOST,
                'port': settings.EMAIL_PORT,
                'username': settings.EMAIL_HOST_USER,
                'password': settings.EMAIL_HOST_PASSWORD,
                'use_tls': settings.EMAIL_USE_TLS,
                'from_email': settings.DEFAULT_FROM_EMAIL,
            },
        )
        return settings_obj, None

    def get(self, request, account_id):
        settings_obj, error = self._settings(request)
        if error is not None:
            return error
        data = EmailSettingsSerializer(settings_obj).data
        data['password'] = '***' if settings_obj.password else ''
        return Response(data)

    def put(self, request, account_id):
        settings_obj, error = self._settings(request)
        if error is not None:
            return error
        data = dict(request.data)
        if not data.get('password'):
            data.pop('password', None)
        serializer = EmailSettingsSerializer(settings_obj, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(EmailSettingsSerializer(settings_obj).data)


class EmailTestSendView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, account_id):
        account = _account_for(request, account_id)
        if account is None:
            return Response({'detail': 'Account not found'}, status=404)
        recipient = (request.data.get('recipient') or '').strip()
        if not recipient:
            return Response({'detail': 'Recipient is required.'}, status=400)
        EmailSettings.objects.get_or_create(account=account)
        try:
            send_account_email(
                account,
                'Test email from Wealfull CRM',
                'This is a test email. Your email settings are working.',
                [recipient],
                fail_silently=False,
            )
        except Exception as exc:
            return Response({'detail': f'Failed to send: {exc}'}, status=400)
        return Response({'detail': 'Test email sent.'})