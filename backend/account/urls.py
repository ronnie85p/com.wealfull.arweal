from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.trailing_slash = ''

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
    path('account/<uuid:account_id>/api-keys', views.AccountApiKeyListView.as_view(), name='account-api-keys'),
    path('account/<uuid:account_id>/api-keys/<int:pk>', views.AccountApiKeyDetailView.as_view(), name='account-api-key-detail'),
    path('account/<uuid:account_id>/api-domains', views.AccountApiDomainListView.as_view(), name='account-api-domains'),
    path('account/<uuid:account_id>/api-domains/<int:pk>', views.AccountApiDomainDetailView.as_view(), name='account-api-domain-detail'),
    path('account/<uuid:account_id>/companies', views.CompanyListView.as_view(), name='account-companies'),
    path('account/<uuid:account_id>/companies/<int:pk>', views.CompanyDetailView.as_view(), name='account-company-detail'),
    path('account/<uuid:account_id>/customers', views.CustomerListView.as_view(), name='account-customers'),
    path('account/<uuid:account_id>/customers/<int:pk>', views.CustomerUnbindView.as_view(), name='account-customer-unbind'),
    path('account/<uuid:account_id>/events', views.AccountEventListView.as_view(), name='account-events'),
    path('account/<uuid:account_id>/email-settings', views.AccountEmailSettingsView.as_view(), name='account-email-settings'),
    path('account/<uuid:account_id>/email-settings/test', views.EmailTestSendView.as_view(), name='account-email-settings-test'),
    path('users', views.UserListView.as_view(), name='users'),
    path('users/recent', views.UserRecentView.as_view(), name='users-recent'),
    path('users/invite', views.UserInviteView.as_view(), name='user-invite'),
    path('users/<int:pk>', views.UserDetailView.as_view(), name='user-detail'),
    path('users/<int:user_id>/orders', views.UserOrdersView.as_view(), name='user-orders'),
    path('users/<int:user_id>/addresses', views.AddressListCreateView.as_view(), name='user-addresses'),
    path('users/<int:user_id>/addresses/<int:pk>', views.AddressDetailView.as_view(), name='user-address-detail'),
    path('places/autocomplete', views.PlacesAutocompleteView.as_view(), name='places-autocomplete'),
    path('places/details', views.PlacesDetailsView.as_view(), name='places-details'),
    path('', include(router.urls)),
]