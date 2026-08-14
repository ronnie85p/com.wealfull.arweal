import secrets
import uuid

from django.conf import settings
from django.db import models


class Profile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name='profile',
    )
    firstname = models.CharField(max_length=120, blank=True)
    midname = models.CharField(max_length=120, blank=True)
    lastname = models.CharField(max_length=120, blank=True)
    email = models.EmailField(blank=True)
    confirmation_code = models.CharField(max_length=6, blank=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    two_factor = models.BooleanField(default=False)
    code_expires_at = models.DateTimeField(null=True, blank=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.firstname} {self.lastname}'.strip() or self.user.username


class Company(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    address = models.ForeignKey(
        'Address', on_delete=models.SET_NULL, null=True, blank=True, related_name='companies'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_companies'
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    ein = models.CharField(max_length=50, blank=True)
    website = models.URLField(blank=True)
    phone = models.CharField(max_length=30, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class ApiKey(models.Model):
    company = models.ForeignKey(
        'Company', on_delete=models.CASCADE, related_name='api_keys'
    )
    name = models.CharField(max_length=100)
    key = models.CharField(max_length=64, unique=True, editable=False)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.key:
            self.key = 'wfk_' + secrets.token_hex(24)
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.name} ({self.company.name})'


class Address(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='addresses'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_addresses'
    )
    country = models.CharField(max_length=120, blank=True)
    state = models.CharField(max_length=120, blank=True)
    city = models.CharField(max_length=120)
    street = models.CharField(max_length=255)
    building = models.CharField(max_length=50, blank=True)
    unit = models.CharField(max_length=50, blank=True)
    zip = models.CharField(max_length=20, blank=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.street}, {self.city}'


class AccountType(models.Model):
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name