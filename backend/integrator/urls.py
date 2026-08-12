from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register('api-keys', views.ApiKeyViewSet, basename='api-key')

urlpatterns = [
    path('csrf/', views.CsrfTokenView.as_view(), name='csrf-token'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/me/', views.MeView.as_view(), name='me'),
    path('users/', views.UserListView.as_view(), name='users'),
    path('users/recent/', views.UserRecentView.as_view(), name='users-recent'),
    path('users/<int:pk>/', views.UserDetailView.as_view(), name='user-detail'),
    path('users/<int:user_id>/orders/', views.UserOrdersView.as_view(), name='user-orders'),
    path('users/<int:user_id>/addresses/', views.AddressListCreateView.as_view(), name='user-addresses'),
    path('users/<int:user_id>/addresses/<int:pk>/', views.AddressDetailView.as_view(), name='user-address-detail'),
    path('places/autocomplete/', views.PlacesAutocompleteView.as_view(), name='places-autocomplete'),
    path('places/details/', views.PlacesDetailsView.as_view(), name='places-details'),
    path('', include(router.urls)),
]