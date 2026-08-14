from django.conf import settings
from django.http import HttpResponseForbidden
from django.middleware.csrf import (
    InvalidTokenFormat,
    _check_token_format,
    _unmask_cipher_token,
    CSRF_TOKEN_LENGTH,
)
from django.utils.crypto import constant_time_compare

UNSAFE_METHODS = ('POST', 'PUT', 'PATCH', 'DELETE')


class CsrfHeaderMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method in UNSAFE_METHODS and not self._header_matches(request):
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
