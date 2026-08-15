from django.utils import timezone

from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from config.middleware import _client_ip, _domain_allowed_for_key, _source_host
from integrator.models import ApiKey


class ApiKeyAuthentication(BaseAuthentication):
    def authenticate(self, request):
        header = request.META.get('HTTP_AUTHORIZATION', '')
        if not header.startswith('Bearer '):
            return None
        token = header[7:].strip()
        api_key = ApiKey.objects.filter(key=token).select_related('account__user').first()
        if api_key is None:
            raise AuthenticationFailed('Invalid API key.')
        if not _domain_allowed_for_key(api_key, _source_host(request), _client_ip(request)):
            raise AuthenticationFailed('Authentication credentials were not provided.')
        api_key.last_used_at = timezone.now()
        api_key.save(update_fields=['last_used_at'])
        return (api_key.account.user, api_key)

    def authenticate_header(self, request):
        return 'Bearer'
