from django.utils import timezone
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import SearchFilter
from rest_framework.response import Response

from integrator.events import EventLogMixin, log_event
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


def _account_from_kwargs(view):
    account_id = view.kwargs.get('account_id')
    if not account_id:
        return None
    return Account.objects.filter(uuid=account_id, user=view.request.user).first()


class CategoryViewSet(EventLogMixin, viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [SearchFilter]
    search_fields = ['name', 'full_name', 'description', 'tags']
    event_entity = 'category'

    def get_queryset(self):
        account = _account_from_kwargs(self)
        if account is None:
            return Category.objects.none()
        return Category.objects.filter(account=account, deleted_at__isnull=True).order_by('-created_at')

    def perform_create(self, serializer):
        account = _account_from_kwargs(self)
        if account is None:
            raise serializers.ValidationError({'account_id': 'Invalid account.'})
        location = serializer.validated_data.get('location')
        if location is not None and location.account_id != account.id:
            raise serializers.ValidationError({'location_id': 'Invalid location.'})
        instance = serializer.save(account=account, created_by=self.request.user, updated_by=self.request.user)
        self._log('create', instance, serializer.data)

    def perform_update(self, serializer):
        account = _account_from_kwargs(self)
        if account is None:
            raise serializers.ValidationError({'account_id': 'Invalid account.'})
        instance = serializer.save(account=account, updated_by=self.request.user)
        self._log('update', instance, serializer.data)

    def perform_destroy(self, instance):
        data = self._instance_data(instance)
        instance.deleted_at = timezone.now()
        instance.deleted_by = self.request.user
        instance.save(update_fields=['deleted_at', 'deleted_by'])
        self._log('delete', instance, data)


class LocationViewSet(EventLogMixin, viewsets.ModelViewSet):
    serializer_class = LocationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [SearchFilter]
    search_fields = ['location', 'full_location', 'description', 'tags', 'country', 'city', 'state']
    event_entity = 'location'

    def get_queryset(self):
        account = _account_from_kwargs(self)
        if account is None:
            return Location.objects.none()
        return Location.objects.filter(account=account, deleted_at__isnull=True).order_by('-created_at')

    def perform_create(self, serializer):
        account = _account_from_kwargs(self)
        if account is None:
            raise serializers.ValidationError({'account_id': 'Invalid account.'})
        instance = serializer.save(account=account, created_by=self.request.user, updated_by=self.request.user)
        self._log('create', instance, serializer.data)

    def perform_update(self, serializer):
        account = _account_from_kwargs(self)
        if account is None:
            raise serializers.ValidationError({'account_id': 'Invalid account.'})
        instance = serializer.save(account=account, updated_by=self.request.user)
        self._log('update', instance, serializer.data)

    def perform_destroy(self, instance):
        data = self._instance_data(instance)
        instance.deleted_at = timezone.now()
        instance.deleted_by = self.request.user
        instance.save(update_fields=['deleted_at', 'deleted_by'])
        self._log('delete', instance, data)


class ProjectViewSet(EventLogMixin, viewsets.ModelViewSet):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]
    event_entity = 'project'

    def get_queryset(self):
        account = _account_from_kwargs(self)
        if account is None:
            return Project.objects.none()
        qs = Project.objects.filter(account=account, owner=self.request.user, deleted_at__isnull=True)
        search = self.request.query_params.get('search', '')
        if search:
            qs = qs.filter(name__icontains=search)
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        account = _account_from_kwargs(self)
        if account is None:
            raise serializers.ValidationError({'account_id': 'Invalid account.'})
        instance = serializer.save(account=account)
        self._log('create', instance, serializer.data)

    def perform_update(self, serializer):
        account = _account_from_kwargs(self)
        if account is None:
            raise serializers.ValidationError({'account_id': 'Invalid account.'})
        instance = serializer.save(account=account)
        self._log('update', instance, serializer.data)

    def perform_destroy(self, instance):
        data = self._instance_data(instance)
        instance.deleted_at = timezone.now()
        instance.save(update_fields=['deleted_at'])
        self._log('delete', instance, data)

    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        account = _account_from_kwargs(self)
        if account is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        project = Project.objects.filter(account=account, owner=request.user, pk=pk).first()
        if project is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        project.deleted_at = None
        project.save(update_fields=['deleted_at'])
        self._log('restore', project)
        return Response(
            ProjectSerializer(project, context=self.get_serializer_context()).data
        )


class ServiceViewSet(EventLogMixin, viewsets.ModelViewSet):
    serializer_class = ServiceSerializer
    permission_classes = [permissions.IsAuthenticated]
    event_entity = 'service'

    def get_queryset(self):
        account = _account_from_kwargs(self)
        if account is None:
            return Service.objects.none()
        qs = Service.objects.filter(account=account, owner=self.request.user, deleted_at__isnull=True)
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        account = _account_from_kwargs(self)
        if account is None:
            raise serializers.ValidationError({'account_id': 'Invalid account.'})
        instance = serializer.save(
            account=account, created_by=self.request.user, updated_by=self.request.user
        )
        self._log('create', instance, serializer.data)

    def perform_update(self, serializer):
        account = _account_from_kwargs(self)
        if account is None:
            raise serializers.ValidationError({'account_id': 'Invalid account.'})
        instance = serializer.save(account=account, updated_by=self.request.user)
        self._log('update', instance, serializer.data)

    def perform_destroy(self, instance):
        data = self._instance_data(instance)
        instance.deleted_at = timezone.now()
        instance.deleted_by = self.request.user
        instance.save(update_fields=['deleted_at', 'deleted_by'])
        self._log('delete', instance, data)

    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        account = _account_from_kwargs(self)
        if account is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        service = Service.objects.filter(account=account, owner=request.user, pk=pk).first()
        if service is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        service.deleted_at = None
        service.deleted_by = None
        service.save(update_fields=['deleted_at', 'deleted_by'])
        self._log('restore', service)
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
        self._log(
            'create',
            img,
            ServiceImageSerializer(img, context=self.get_serializer_context()).data,
            entity='service-image',
        )
        return Response(ServiceImageSerializer(img).data, status=status.HTTP_201_CREATED)


class MaterialViewSet(EventLogMixin, viewsets.ModelViewSet):
    serializer_class = MaterialSerializer
    permission_classes = [permissions.IsAuthenticated]
    event_entity = 'material'

    def get_queryset(self):
        return Material.objects.filter(owner=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        instance = serializer.save()
        self._log('create', instance, serializer.data)


class OrderViewSet(EventLogMixin, viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]
    event_entity = 'order'

    def get_queryset(self):
        account = _account_from_kwargs(self)
        if account is None:
            return Order.objects.none()
        qs = Order.objects.filter(account=account, owner=self.request.user)
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        return qs

    def perform_create(self, serializer):
        account = _account_from_kwargs(self)
        if account is None:
            raise serializers.ValidationError({'account_id': 'Invalid account.'})
        instance = serializer.save(account=account)
        self._log('create', instance, serializer.data)

    def perform_update(self, serializer):
        account = _account_from_kwargs(self)
        if account is None:
            raise serializers.ValidationError({'account_id': 'Invalid account.'})
        instance = serializer.save(account=account)
        self._log('update', instance, serializer.data)


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