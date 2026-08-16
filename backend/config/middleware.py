from urllib.parse import urlparse

import ipaddress
import logging
import socket
from concurrent.futures import ThreadPoolExecutor, TimeoutError

from django.conf import settings
from django.http import HttpResponseForbidden, JsonResponse
from django.middleware.csrf import (
    InvalidTokenFormat,
    _check_token_format,
    _unmask_cipher_token,
    CSRF_TOKEN_LENGTH,
)
from django.utils.crypto import constant_time_compare
from django.utils import timezone

from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed

from integrator.models import ApiDomain, ApiKey

logger = logging.getLogger('django')

UNSAFE_METHODS = ('POST', 'PUT', 'PATCH', 'DELETE')

API_PREFIXES = ('/api/',)


class CsrfHeaderMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method in UNSAFE_METHODS:
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            if auth_header.startswith('Bearer '):
                return self.get_response(request)
            source_host = _source_host(request)
            if not source_host or source_host not in _allowed_hosts():
                return self.get_response(request)
            if not self._header_matches(request):
                return HttpResponseForbidden('CSRF token invalid')
        return self.get_response(request)

    def _header_matches(self, request):
        header = request.headers.get('X-CSRFToken', '')
        if not header:
            return False
        try:
            _check_token_format(header)
        except InvalidTokenFormat:
            return False
        cookie_token = request.COOKIES.get(settings.CSRF_COOKIE_NAME, '')
        if not cookie_token:
            return False
        try:
            if len(cookie_token) == CSRF_TOKEN_LENGTH:
                secret = _unmask_cipher_token(cookie_token)
            else:
                secret = cookie_token
            if len(header) == CSRF_TOKEN_LENGTH:
                header = _unmask_cipher_token(header)
            return constant_time_compare(header, secret)
        except ValueError:
            return False


class AccountAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path
        if path == '/api/v1/account' or path.startswith('/api/v1/account/'):
            try:
                auth = TokenAuthentication().authenticate(request)
            except AuthenticationFailed:
                denied_key = _resolve_api_key(request)
                _log_api_call_denied(request, denied_key, 401)
                return JsonResponse(
                    {'detail': 'Invalid token.'},
                    status=401,
                )
            user, _ = auth if auth else (None, None)
            if user is None or not user.is_authenticated:
                from config.authentication import ApiKeyAuthentication

                try:
                    auth = ApiKeyAuthentication().authenticate(request)
                except AuthenticationFailed:
                    denied_key = _resolve_api_key(request)
                    _log_api_call_denied(request, denied_key, 401)
                    return JsonResponse(
                        {'detail': 'Invalid token.'},
                        status=401,
                    )
                user, _ = auth if auth else (None, None)
            if user is None or not user.is_authenticated:
                denied_key = _resolve_api_key(request)
                _log_api_call_denied(request, denied_key, 401)
                return JsonResponse(
                    {
                        'detail': 'Authentication credentials were not provided.',
                        'source': _source_addr(request),
                        'ip': _client_ip(request),
                    },
                    status=401,
                )
            request.user = user
        return self.get_response(request)


def _hostname(value: str) -> str:
    if not value:
        return ''
    if '://' not in value:
        value = '//' + value
    return (urlparse(value).hostname or '').lower().rstrip('.')


def _allowed_hosts() -> set:
    hosts = set()
    for origin in settings.CORS_ALLOWED_ORIGINS:
        host = _hostname(origin)
        if host:
            hosts.add(host)
    for host in getattr(settings, 'ALLOWED_HOSTS', []):
        hosts.add(host.lower().lstrip('*.').rstrip('.'))
    if settings.DEBUG:
        hosts.update({'localhost', '127.0.0.1'})
    return hosts


def _source_host(request) -> str:
    return _hostname(request.META.get('HTTP_ORIGIN') or request.META.get('HTTP_REFERER') or '')


def _host_matches(host: str, domain: str) -> bool:
    if not host or not domain:
        return False
    domain = domain.lower().rstrip('.').lstrip('*.')
    return host == domain or host.endswith('.' + domain)


def _client_ip(request) -> str:
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if forwarded:
        return forwarded.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


def _is_ip(value: str) -> bool:
    try:
        ipaddress.ip_address(value)
        return True
    except ValueError:
        return False


_dns_executor = ThreadPoolExecutor(max_workers=4)


def _host_to_ip(host: str) -> str:
    if not host or _is_ip(host):
        return host
    future = _dns_executor.submit(socket.gethostbyname, host)
    try:
        return future.result(timeout=2)
    except (TimeoutError, OSError):
        return ''


def _source_matches(source_host: str, allowed: str) -> bool:
    if not source_host or not allowed:
        return False
    source_is_ip = _is_ip(source_host)
    allowed_is_ip = _is_ip(allowed)
    if source_is_ip or allowed_is_ip:
        source_ip = _host_to_ip(source_host)
        allowed_ip = _host_to_ip(allowed)
        return bool(source_ip and allowed_ip and source_ip == allowed_ip)
    return _host_matches(source_host, allowed)


def _domain_allowed_for_key(api_key, source_host: str, client_ip: str) -> bool:
    source = source_host or client_ip
    if not source:
        return False
    if api_key.domain_id and _source_matches(source, api_key.domain.domain):
        return True
    domains = ApiDomain.objects.filter(account_id=api_key.account_id)
    for d in domains:
        if _source_matches(source, d.domain):
            return True
    return False


def _request_domain(request) -> str:
    source = _source_host(request)
    if source:
        return source
    host = request.META.get('HTTP_HOST', '')
    return _hostname(host) if host else ''


def _checked_ip(source_host: str, client_ip: str) -> str:
    source = source_host or client_ip
    if not source:
        return ''
    if not _is_ip(source):
        return _host_to_ip(source) or source
    return source


def _source_addr(request) -> str:
    return _source_host(request) or _client_ip(request)


def _resolve_api_key(request):
    auth_header = request.META.get('HTTP_AUTHORIZATION', '')
    if not auth_header.startswith('Bearer '):
        return None
    token = auth_header[7:].strip()
    return ApiKey.objects.filter(key=token).select_related('account__user').first()


def _log_api_call_denied(request, api_key, status: int):
    if api_key is None or not request.path.startswith(API_PREFIXES):
        return
    try:
        from integrator.events import log_event

        log_event(
            api_key.account,
            'api-call',
            api_key.pk,
            'call',
            {
                'method': request.method,
                'path': request.path,
                'status': status,
                'source': _source_addr(request),
                'ip': _client_ip(request),
            },
            actor=api_key.account.user,
            label=api_key.name,
        )
    except Exception:
        logger.exception('Failed to log API call event')


class ApiOriginAuthMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        path = request.path
        if not path.startswith(API_PREFIXES):
            return self.get_response(request)

        source_host = _source_host(request)
        if not source_host:
            api_key = _resolve_api_key(request)
            if api_key is not None and not _domain_allowed_for_key(api_key, _request_domain(request), _client_ip(request)):
                _log_api_call_denied(request, api_key, 403)
                return JsonResponse(
                    {
                        'detail': 'Authentication credentials were not provided.',
                        'source': _source_addr(request),
                        'ip': _checked_ip(_request_domain(request), _client_ip(request)),
                    },
                    status=403,
                )
            return self.get_response(request)
        if source_host in _allowed_hosts():
            return self.get_response(request)

        api_key = _resolve_api_key(request)
        if api_key is None:
            if request.META.get('HTTP_AUTHORIZATION', '').startswith('Bearer '):
                return JsonResponse({'detail': 'Invalid API key.'}, status=401)
            return JsonResponse(
                {
                    'detail': 'Origin is not allowed and no API key provided.',
                    'source': _source_addr(request),
                    'ip': _client_ip(request),
                },
                status=401,
            )
        source_host = source_host or _hostname(request.META.get('HTTP_REFERER') or '')
        if not _domain_allowed_for_key(api_key, source_host, _client_ip(request)):
            _log_api_call_denied(request, api_key, 403)
            return JsonResponse(
                {
                    'detail': 'Authentication credentials were not provided.',
                    'source': _source_addr(request),
                    'ip': _checked_ip(source_host, _client_ip(request)),
                },
                status=403,
            )
        api_key.last_used_at = timezone.now()
        api_key.save(update_fields=['last_used_at'])
        request.api_key = api_key
        request.user = api_key.account.user
        return self.get_response(request)


class ApiCallLogMiddleware:
    """Logs an event for every API call authenticated with an API key."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        api_key = getattr(request, 'api_key', None)
        if api_key is None and 400 <= response.status_code < 500:
            api_key = _resolve_api_key(request)
        if api_key is not None and request.path.startswith(API_PREFIXES):
            try:
                from integrator.events import log_event

                body = ''
                if not getattr(response, 'streaming', False):
                    try:
                        content = getattr(response, 'rendered_content', None) or response.content
                        if content:
                            if isinstance(content, bytes):
                                content = content.decode('utf-8', errors='replace')
                            body = content[:4000]
                    except Exception:
                        body = ''
                log_event(
                    api_key.account,
                    'api-call',
                    api_key.pk,
                    'call',
                    {
                        'method': request.method,
                        'path': request.path,
                        'status': response.status_code,
                        'source': _source_addr(request),
                        'ip': _client_ip(request),
                        'response': body,
                    },
                    actor=api_key.account.user,
                    label=api_key.name,
                )
            except Exception:
                logger.exception('Failed to log API call event')
        return response
