from django.contrib.auth.models import User
from rest_framework import serializers

from integrator.models import Account, Address

from .models import (
    Category,
    Invoice,
    Location,
    LocationServices,
    Material,
    Order,
    OrderAddress,
    OrderItem,
    Payment,
    Project,
    Service,
    ServiceImage,
)


class OrderAddressSerializer(serializers.ModelSerializer):
    source = serializers.PrimaryKeyRelatedField(
        queryset=Address.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = OrderAddress
        fields = ['id', 'source', 'country', 'state', 'city', 'street', 'building', 'unit', 'zip', 'created_at']
        read_only_fields = ['id', 'created_at']


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ['id', 'name', 'description', 'quantity', 'unit', 'amount', 'currency']
        read_only_fields = ['id']


class ProjectSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, default=serializers.CurrentUserDefault()
    )
    owner = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, default=serializers.CurrentUserDefault()
    )

    class Meta:
        model = Project
        fields = ['id', 'user', 'owner', 'name', 'description', 'start_time', 'duration', 'duration_to',
                  'duration_unit', 'available_from', 'available_to', 'created_at']
        read_only_fields = ['id', 'created_at']


class OrderSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, default=serializers.CurrentUserDefault()
    )
    owner = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, default=serializers.CurrentUserDefault()
    )
    address = OrderAddressSerializer(required=False, allow_null=True)
    project = serializers.PrimaryKeyRelatedField(
        queryset=Project.objects.all(), required=False, allow_null=True
    )
    materials_display = serializers.CharField(source='get_materials_display', read_only=True)
    executors = serializers.PrimaryKeyRelatedField(
        many=True, queryset=User.objects.all(), required=False
    )
    executors_display = serializers.SerializerMethodField()
    items = OrderItemSerializer(many=True, required=False)

    def get_executors_display(self, obj):
        return [
            {
                'id': u.id,
                'username': u.username,
                'first_name': u.first_name,
                'last_name': u.last_name,
            }
            for u in obj.executors.all()
        ]

    class Meta:
        model = Order
        fields = ['id', 'user', 'owner', 'external_id', 'amount', 'currency', 'status', 'materials',
                  'materials_display', 'description', 'notes', 'comment', 'executors',
                  'executors_display', 'created_at', 'address', 'project', 'items']
        read_only_fields = ['id', 'created_at']

    def _save_address(self, order, address_data):
        if address_data is None:
            return
        if order.address:
            for attr, value in address_data.items():
                setattr(order.address, attr, value)
            order.address.owner = order.owner
            order.address.save()
        else:
            OrderAddress.objects.create(order=order, owner=order.owner, **address_data)

    def _save_items(self, order, items_data):
        if items_data is None:
            return
        if self.instance:
            order.items.all().delete()
        for item in items_data:
            OrderItem.objects.create(order=order, owner=order.owner, **item)

    def create(self, validated_data):
        items_data = validated_data.pop('items', None)
        address_data = validated_data.pop('address', None)
        order = Order.objects.create(**validated_data)
        self._save_address(order, address_data)
        self._save_items(order, items_data)
        return order

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        address_data = validated_data.pop('address', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        self._save_address(instance, address_data)
        self._save_items(instance, items_data)
        return instance


class ServiceImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceImage
        fields = ['id', 'uri', 'url', 'order', 'created_at']
        read_only_fields = ['id', 'uri', 'url', 'order', 'created_at']


class ServiceSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, default=serializers.CurrentUserDefault()
    )
    owner = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, default=serializers.CurrentUserDefault()
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        source='category', queryset=Category.objects.all(), required=False, allow_null=True
    )
    service_locations = serializers.ListField(
        child=serializers.DictField(), required=False, write_only=True
    )
    location_links = serializers.SerializerMethodField()
    images = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = ['id', 'user', 'owner', 'name', 'short_description', 'description', 'features', 'tags', 'price',
                  'old_price', 'duration_start', 'duration_end', 'duration_unit', 'currency', 'status', 'status_display',
                  'category_id', 'service_locations', 'location_links', 'images', 'created_at',
                  'created_by', 'updated_by', 'deleted_by']
        read_only_fields = ['id', 'created_at', 'created_by', 'updated_by', 'deleted_by']

    def get_location_links(self, obj):
        return [
            {'location_id': link.location_id, 'location_name': link.location.full_location or link.location.location}
            for link in obj.location_links.select_related('location').all()
        ]

    def get_images(self, obj):
        return ServiceImageSerializer(
            obj.images.order_by('order', 'id').all(), many=True
        ).data

    def validate_category(self, value):
        account = Account.objects.filter(user=self.context['request'].user).order_by('id').first()
        if value is not None and account is not None and value.account_id != account.id:
            raise serializers.ValidationError('Invalid category.')
        return value

    def validate_name(self, value):
        name = value.strip()
        if not name:
            return value
        category_id = self.initial_data.get('category_id')
        if category_id in (None, ''):
            category_id = getattr(self.instance, 'category_id', None)
        qs = Service.objects.filter(name__iexact=name)
        if category_id not in (None, ''):
            qs = qs.filter(category_id=category_id)
        if self.instance is not None:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(
                'A service with this name already exists in the selected category.'
            )
        return value

    def _set_links(self, service, links):
        service.location_links.all().delete()
        for link in links:
            location_id = link.get('location_id')
            if not location_id:
                continue
            location = Location.objects.filter(
                id=location_id, account__user=self.context['request'].user
            ).first()
            if location is None:
                raise serializers.ValidationError({'service_locations': 'Invalid location.'})
            LocationServices.objects.create(service=service, location=location)

    def create(self, validated_data):
        links = validated_data.pop('service_locations', [])
        service = super().create(validated_data)
        self._set_links(service, links)
        return service

    def update(self, instance, validated_data):
        links = validated_data.pop('service_locations', None)
        service = super().update(instance, validated_data)
        if links is not None:
            self._set_links(service, links)
        return service


class CategorySerializer(serializers.ModelSerializer):
    account_id = serializers.SlugRelatedField(
        slug_field='uuid', queryset=Account.objects.all(), source='account',
        required=False, allow_null=True,
    )
    class Meta:
        model = Category
        fields = ['id', 'account_id', 'name', 'full_name', 'description', 'tags', 'created_at', 'updated_at',
                  'created_by', 'updated_by', 'deleted_by']
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_by']

    def validate_name(self, value):
        account = Account.objects.filter(user=self.context['request'].user).order_by('id').first()
        if (
            Category.objects.filter(account=account, name=value)
            .exclude(pk=getattr(self.instance, 'pk', None))
            .exists()
        ):
            raise serializers.ValidationError('A category with this name already exists.')
        return value


class LocationSerializer(serializers.ModelSerializer):
    account_id = serializers.SlugRelatedField(
        slug_field='uuid', queryset=Account.objects.all(), source='account',
        required=False, allow_null=True,
    )
    location_services = serializers.ListField(
        child=serializers.DictField(), required=False, write_only=True
    )
    service_links = serializers.SerializerMethodField()

    class Meta:
        model = Location
        fields = [
            'id', 'account_id', 'location', 'full_location', 'latitude', 'longitude',
            'country', 'type', 'city', 'county', 'state', 'short_state', 'postal_code',
            'description', 'tags', 'service_links', 'location_services', 'created_at', 'updated_at',
            'created_by', 'updated_by', 'deleted_by',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'deleted_by']

    def get_service_links(self, obj):
        return [
            {'service_id': link.service_id, 'service_name': link.service.name}
            for link in obj.service_links.select_related('service').all()
        ]

    def _set_links(self, location, links):
        location.services.clear()
        for link in links:
            service_id = link.get('service_id')
            if not service_id:
                continue
            service = Service.objects.filter(
                id=service_id, owner=self.context['request'].user
            ).first()
            if service is None:
                raise serializers.ValidationError({'location_services': 'Invalid service.'})
            LocationServices.objects.create(location=location, service=service)

    def create(self, validated_data):
        links = validated_data.pop('location_services', [])
        location = super().create(validated_data)
        self._set_links(location, links)
        return location

    def update(self, instance, validated_data):
        links = validated_data.pop('location_services', None)
        location = super().update(instance, validated_data)
        if links is not None:
            self._set_links(location, links)
        return location


class MaterialSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, default=serializers.CurrentUserDefault()
    )
    owner = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, default=serializers.CurrentUserDefault()
    )

    class Meta:
        model = Material
        fields = ['id', 'user', 'owner', 'name', 'created_at']
        read_only_fields = ['id', 'created_at']


class InvoiceSerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, default=serializers.CurrentUserDefault()
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Invoice
        fields = ['id', 'number', 'owner', 'order', 'amount', 'currency', 'status', 'status_display',
                  'due_date', 'issued_at', 'paid_at']
        read_only_fields = ['id', 'number', 'issued_at', 'paid_at']


class PaymentSerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, default=serializers.CurrentUserDefault()
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    method_display = serializers.CharField(source='get_method_display', read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'owner', 'invoice', 'external_ref', 'amount', 'currency', 'method',
                  'method_display', 'status', 'status_display', 'created_at']
        read_only_fields = ['id', 'created_at']
