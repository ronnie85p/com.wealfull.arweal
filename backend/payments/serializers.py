from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Invoice, Order, Payment


class OrderSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, default=serializers.CurrentUserDefault()
    )

    class Meta:
        model = Order
        fields = ['id', 'user', 'external_id', 'amount', 'currency', 'status', 'description', 'created_at']
        read_only_fields = ['id', 'created_at']


class InvoiceSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Invoice
        fields = ['id', 'number', 'order', 'amount', 'currency', 'status', 'status_display',
                  'due_date', 'issued_at', 'paid_at']
        read_only_fields = ['id', 'number', 'issued_at', 'paid_at']


class PaymentSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    method_display = serializers.CharField(source='get_method_display', read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'invoice', 'external_ref', 'amount', 'currency', 'method',
                  'method_display', 'status', 'status_display', 'created_at']
        read_only_fields = ['id', 'created_at']