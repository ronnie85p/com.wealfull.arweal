from rest_framework import permissions, viewsets

from .models import Invoice, Material, Order, Payment, Project, Service
from .serializers import (
    InvoiceSerializer,
    MaterialSerializer,
    OrderSerializer,
    PaymentSerializer,
    ProjectSerializer,
    ServiceSerializer,
)


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Project.objects.filter(owner=self.request.user)
        search = self.request.query_params.get('search', '')
        if search:
            qs = qs.filter(name__icontains=search)
        return qs.order_by('-created_at')


class ServiceViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Service.objects.filter(owner=self.request.user)
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save()


class MaterialViewSet(viewsets.ModelViewSet):
    serializer_class = MaterialSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Material.objects.filter(owner=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save()


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Order.objects.filter(owner=self.request.user)
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        return qs

    def perform_create(self, serializer):
        serializer.save()


class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Invoice.objects.filter(owner=self.request.user)
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        return qs


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Payment.objects.filter(owner=self.request.user)
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        return qs.order_by('-created_at')