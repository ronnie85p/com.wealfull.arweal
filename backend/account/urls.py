from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.trailing_slash = ''
router.register('api-keys', views.ApiKeyViewSet, basename='api-key')
router.register('api-domains', views.ApiDomainViewSet, basename='api-domain')

urlpatterns = [
    path('auth/login', views.LoginView.as_view(), name='login'),
    path('auth/login/check', views.LoginCheckView.as_view(), name='login-check'),
    path('auth/login/password', views.LoginPasswordView.as_view(), name='login-password'),
    path('auth/login/send-code', views.LoginSendCodeView.as_view(), name='login-send-code'),
    path('auth/login/check-code', views.LoginCheckCodeView.as_view(), name='login-check-code'),
    path('auth/login/confirm', views.LoginConfirmView.as_view(), name='login-confirm'),
    path('auth/register', views.RegisterView.as_view(), name='register'),
    path('auth/confirm', views.ConfirmView.as_view(), name='confirm'),
    path('auth/check-registration', views.CheckRegistrationView.as_view(), name='check-registration'),
    path('auth/resend-code', views.ResendCodeView.as_view(), name='resend-code'),
    path('auth/complete-registration', views.CompleteRegistrationView.as_view(), name='complete-registration'),
    path('auth/me', views.MeView.as_view(), name='me'),
    path('auth/status', views.AuthStatusView.as_view(), name='auth-status'),
    path('account-types', views.AccountTypeListView.as_view(), name='account-types'),
    path('account', views.AccountDetailView.as_view(), name='account-detail'),
    path('account/<uuid:uuid>', views.AccountDetailView.as_view(), name='account-detail-uuid'),
    path('users', views.UserListView.as_view(), name='users'),
    path('users/recent', views.UserRecentView.as_view(), name='users-recent'),
    path('users/invite', views.UserInviteView.as_view(), name='user-invite'),
    path('users/<int:pk>', views.UserDetailView.as_view(), name='user-detail'),
    path('users/<int:user_id>/orders', views.UserOrdersView.as_view(), name='user-orders'),
    path('users/<int:user_id>/addresses', views.AddressListCreateView.as_view(), name='user-addresses'),
    path('users/<int:user_id>/addresses/<int:pk>', views.AddressDetailView.as_view(), name='user-address-detail'),
    path('companies', views.CompanyListView.as_view(), name='companies'),
    path('places/autocomplete', views.PlacesAutocompleteView.as_view(), name='places-autocomplete'),
    path('places/details', views.PlacesDetailsView.as_view(), name='places-details'),
    path('api-keys/create', views.ApiKeyCreateView.as_view(), name='api-key-create'),
    path('api-domains/create', views.ApiDomainCreateView.as_view(), name='api-domain-create'),
    path('customers', views.CustomerListView.as_view(), name='customers'),
    path('customers/<int:pk>', views.CustomerUnbindView.as_view(), name='customer-unbind'),
    path('', include(router.urls)),
]
