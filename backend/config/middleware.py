from django.http import HttpResponseForbidden
from django.middleware.csrf import get_token
from django.utils.crypto import constant_time_compare

UNSAFE_METHODS = ('POST', 'PUT', 'PATCH', 'DELETE')


class CsrfHeaderMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method in UNSAFE_METHODS:
            header = request.headers.get('X-CSRFToken', '')
            if not header:
                return HttpResponseForbidden('CSRF token missing')
            expected = get_token(request)
            if not constant_time_compare(header, expected):
                return HttpResponseForbidden('CSRF token invalid')
        return self.get_response(request)
