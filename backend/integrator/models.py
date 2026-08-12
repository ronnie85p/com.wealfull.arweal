import secrets

from django.conf import settings
from django.db import models


class ApiKey(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='api_keys'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_api_keys'
    )
    name = models.CharField(max_length=100)
    key = models.CharField(max_length=64, unique=True, editable=False)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.key:
            self.key = 'wf_' + secrets.token_hex(24)
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.name} ({self.user.username})'


class Address(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='addresses'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_addresses'
    )
    state = models.CharField(max_length=120, blank=True)
    city = models.CharField(max_length=120)
    street = models.CharField(max_length=255)
    room = models.CharField(max_length=50, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.street}, {self.city}'