from django.contrib import admin

from .models import Invoice, Material, Order, Payment, Project, Service


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'start_time', 'duration', 'created_at']
    list_filter = ['start_time']


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'price', 'currency', 'status', 'created_at']
    list_filter = ['status', 'currency']


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'created_at']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'external_id', 'user', 'project', 'amount', 'currency', 'status', 'created_at']
    list_filter = ['status', 'currency']


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['number', 'user', 'amount', 'currency', 'status', 'issued_at', 'paid_at']
    list_filter = ['status', 'currency']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['external_ref', 'user', 'invoice', 'amount', 'currency', 'method', 'status', 'created_at']
    list_filter = ['status', 'method']