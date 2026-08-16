from django.utils import timezone
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter
from rest_framework.response import Response

from integrator.models import Account
from .models import (
    Category,
    Invoice,
    Location,
    Material,
    Order,
    Payment,
    Project,
    Service,
    ServiceImage,
)
from .serializers import (
    CategorySerializer,
    InvoiceSerializer,
    LocationSerializer,
    MaterialSerializer,
    OrderSerializer,
    PaymentSerializer,
    ProjectSerializer,
    ServiceImageSerializer,
    ServiceSerializer,
)


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [SearchFilter]
    search_fields = ['name', 'full_name', 'description', 'tags']

    def get_queryset(self):
        return Category.objects.filter(account__user=self.request.user, deleted_at__isnull=True).order_by('-created_at')

    def perform_create(self, serializer):
        account = serializer.validated_data.get('account') or Account.objects.filter(
            user=self.request.user
        ).order_by('id').first()
        if account is None:
            raise serializers.ValidationError({'account_id': 'No account for this user.'})
        if account.user_id != self.request.user.id:
            raise serializers.ValidationError({'account_id': 'Invalid account.'})
        location = serializer.validated_data.get('location')
        if location is not None and location.account_id != account.id:
            raise serializers.ValidationError({'location_id': 'Invalid location.'})
        serializer.save(account=account, created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.deleted_by = self.request.user
        instance.save(update_fields=['deleted_at', 'deleted_by'])


class LocationViewSet(viewsets.ModelViewSet):
    serializer_class = LocationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [SearchFilter]
    search_fields = ['location', 'full_location', 'description', 'tags', 'country', 'city', 'state']

    def get_queryset(self):
        return Location.objects.filter(account__user=self.request.user, deleted_at__isnull=True).order_by('-created_at')

    def perform_create(self, serializer):
        account = serializer.validated_data.get('account') or Account.objects.filter(
            user=self.request.user
        ).order_by('id').first()
        if account is None:
            raise serializers.ValidationError({'account_id': 'No account for this user.'})
        if account.user_id != self.request.user.id:
            raise serializers.ValidationError({'account_id': 'Invalid account.'})
        serializer.save(account=account, created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.deleted_by = self.request.user
        instance.save(update_fields=['deleted_at', 'deleted_by'])


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Project.objects.filter(owner=self.request.user, deleted_at__isnull=True)
        search = self.request.query_params.get('search', '')
        if search:
            qs = qs.filter(name__icontains=search)
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        account = serializer.validated_data.get('account') or Account.objects.filter(
            user=self.request.user
        ).order_by('id').first()
        if account is not None and account.user_id != self.request.user.id:
            raise serializers.ValidationError({'account_id': 'Invalid account.'})
        serializer.save(account=account)

    def perform_update(self, serializer):
        account = serializer.validated_data.get('account')
        if account is not None and account.user_id != self.request.user.id:
            raise serializers.ValidationError({'account_id': 'Invalid account.'})
        serializer.save()

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.save(update_fields=['deleted_at'])

    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        project = Project.objects.filter(owner=request.user, pk=pk).first()
        if project is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        project.deleted_at = None
        project.save(update_fields=['deleted_at'])
        return Response(
            ProjectSerializer(project, context=self.get_serializer_context()).data
        )


class ServiceViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Service.objects.filter(owner=self.request.user, deleted_at__isnull=True)
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        account = serializer.validated_data.get('account') or Account.objects.filter(
            user=self.request.user
        ).order_by('id').first()
        if account is not None and account.user_id != self.request.user.id:
            raise serializers.ValidationError({'account_id': 'Invalid account.'})
        serializer.save(
            account=account, created_by=self.request.user, updated_by=self.request.user
        )

    def perform_update(self, serializer):
        account = serializer.validated_data.get('account')
        if account is not None and account.user_id != self.request.user.id:
            raise serializers.ValidationError({'account_id': 'Invalid account.'})
        serializer.save(updated_by=self.request.user)

    def perform_destroy(self, instance):
        instance.deleted_at = timezone.now()
        instance.deleted_by = self.request.user
        instance.save(update_fields=['deleted_at', 'deleted_by'])

    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        service = Service.objects.filter(owner=request.user, pk=pk).first()
        if service is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        service.deleted_at = None
        service.deleted_by = None
        service.save(update_fields=['deleted_at', 'deleted_by'])
        return Response(
            ServiceSerializer(service, context=self.get_serializer_context()).data
        )

    @action(detail=True, methods=['get', 'post'], url_path='images')
    def images(self, request, pk=None):
        service = self.get_object()
        if request.method == 'GET':
            qs = service.images.order_by('order', 'id')
            return Response(ServiceImageSerializer(qs, many=True).data)
        file = request.FILES.get('image')
        if file is None:
            return Response({'image': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)
        img = ServiceImage.objects.create(
            service=service, owner=request.user, image=file
        )
        return Response(ServiceImageSerializer(img).data, status=status.HTTP_201_CREATED)


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
        account = serializer.validated_data.get('account') or Account.objects.filter(
            user=self.request.user
        ).order_by('id').first()
        if account is not None and account.user_id != self.request.user.id:
            raise serializers.ValidationError({'account_id': 'Invalid account.'})
        serializer.save(account=account)

    def perform_update(self, serializer):
        account = serializer.validated_data.get('account')
        if account is not None and account.user_id != self.request.user.id:
            raise serializers.ValidationError({'account_id': 'Invalid account.'})
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