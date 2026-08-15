from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.trailing_slash = ''
router.register('orders', views.OrderViewSet, basename='order')
router.register('services', views.ServiceViewSet, basename='service')
router.register('materials', views.MaterialViewSet, basename='material')
router.register('projects', views.ProjectViewSet, basename='project')
router.register('invoices', views.InvoiceViewSet, basename='invoice')
router.register('payments', views.PaymentViewSet, basename='payment')

urlpatterns = router.urls