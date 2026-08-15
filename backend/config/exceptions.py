from rest_framework.exceptions import AuthenticationFailed, NotAuthenticated
from rest_framework.views import exception_handler as drf_exception_handler

from config.middleware import _source_addr


def exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is not None and isinstance(exc, (AuthenticationFailed, NotAuthenticated)):
        request = context.get('request')
        data = response.data
        if request is not None and isinstance(data, dict):
            data['source'] = _source_addr(request)
    return response
