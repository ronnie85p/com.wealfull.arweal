from django.contrib import admin

from .models import Address, ApiKey


@admin.register(ApiKey)
class ApiKeyAdmin(admin.ModelAdmin):
    list_display = ['name', 'user', 'active', 'created_at', 'last_used_at']
    list_filter = ['active']
    readonly_fields = ['key']


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ['user', 'street', 'city', 'is_default']