from django.urls import path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.trailing_slash = ''
router.register('materials', views.MaterialViewSet, basename='material')
router.register('invoices', views.InvoiceViewSet, basename='invoice')
router.register('payments', views.PaymentViewSet, basename='payment')

urlpatterns = [
    path('account/<uuid:account_id>/categories', views.CategoryViewSet.as_view({'get': 'list', 'post': 'create'}), name='account-categories'),
    path('account/<uuid:account_id>/categories/<int:pk>', views.CategoryViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}), name='account-category-detail'),
    path('account/<uuid:account_id>/locations', views.LocationViewSet.as_view({'get': 'list', 'post': 'create'}), name='account-locations'),
    path('account/<uuid:account_id>/locations/<int:pk>', views.LocationViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}), name='account-location-detail'),
    path('account/<uuid:account_id>/projects', views.ProjectViewSet.as_view({'get': 'list', 'post': 'create'}), name='account-projects'),
    path('account/<uuid:account_id>/projects/<int:pk>', views.ProjectViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}), name='account-project-detail'),
    path('account/<uuid:account_id>/projects/<int:pk>/restore', views.ProjectViewSet.as_view({'post': 'restore'}), name='account-project-restore'),
    path('account/<uuid:account_id>/services', views.ServiceViewSet.as_view({'get': 'list', 'post': 'create'}), name='account-services'),
    path('account/<uuid:account_id>/services/<int:pk>', views.ServiceViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}), name='account-service-detail'),
    path('account/<uuid:account_id>/services/<int:pk>/restore', views.ServiceViewSet.as_view({'post': 'restore'}), name='account-service-restore'),
    path('account/<uuid:account_id>/services/<int:pk>/images', views.ServiceViewSet.as_view({'get': 'images', 'post': 'images'}), name='account-service-images'),
    path('account/<uuid:account_id>/orders', views.OrderViewSet.as_view({'get': 'list', 'post': 'create'}), name='account-orders'),
    path('account/<uuid:account_id>/orders/<int:pk>', views.OrderViewSet.as_view({'get': 'retrieve', 'patch': 'partial_update', 'delete': 'destroy'}), name='account-order-detail'),
] + router.urls