from django.contrib import admin

from .models import Invoice, Order, Payment


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'external_id', 'user', 'amount', 'currency', 'status', 'created_at']
    list_filter = ['status', 'currency']


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['number', 'user', 'amount', 'currency', 'status', 'issued_at', 'paid_at']
    list_filter = ['status', 'currency']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['external_ref', 'user', 'invoice', 'amount', 'currency', 'method', 'status', 'created_at']
    list_filter = ['status', 'method']