from rest_framework.exceptions import AuthenticationFailed, NotAuthenticated
from rest_framework.views import exception_handler as drf_exception_handler

from config.middleware import _checked_ip, _client_ip, _request_domain, _resolve_api_key, _source_addr


def exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is not None and isinstance(exc, (AuthenticationFailed, NotAuthenticated)):
        request = context.get('request')
        data = response.data
        if request is not None and isinstance(data, dict):
            data['source'] = _source_addr(request)
            if _resolve_api_key(request) is not None:
                data['ip'] = _checked_ip(_request_domain(request), _client_ip(request))
            else:
                data['ip'] = _client_ip(request)
    return response
