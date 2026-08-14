from django.contrib.auth.models import User
from rest_framework import serializers

from integrator.models import Address

from .models import Invoice, Material, Order, OrderAddress, OrderItem, Payment, Project, Service


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


class ServiceSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, default=serializers.CurrentUserDefault()
    )
    owner = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, default=serializers.CurrentUserDefault()
    )
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Service
        fields = ['id', 'user', 'owner', 'name', 'description', 'amount', 'currency', 'status',
                  'status_display', 'created_at']
        read_only_fields = ['id', 'created_at']


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
