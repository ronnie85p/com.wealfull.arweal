import secrets
import uuid

from django.conf import settings
from django.db import models

API_KEY_PERMISSIONS = [
    'orders.read',
    'orders.write',
    'services.read',
    'services.write',
    'projects.read',
    'projects.write',
    'categories.read',
    'categories.write',
    'locations.read',
    'locations.write',
    'customers.read',
    'customers.write',
    'companies.read',
    'companies.write',
    'materials.read',
    'materials.write',
    'invoices.read',
    'invoices.write',
    'payments.read',
    'payments.write',
]


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
    account = models.ForeignKey(
        'Account', on_delete=models.SET_NULL, null=True, blank=True, related_name='companies'
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
    account = models.ForeignKey(
        'Account', on_delete=models.SET_NULL, null=True, blank=True, related_name='api_keys'
    )
    name = models.CharField(max_length=100)
    key = models.CharField(max_length=64, unique=True, editable=False)
    domain = models.ForeignKey(
        'ApiDomain', on_delete=models.SET_NULL, null=True, blank=True, related_name='api_keys'
    )
    description = models.TextField(blank=True)
    permissions = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_used_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.key:
            self.key = 'wfk_' + secrets.token_hex(24)
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.name} ({self.account.uuid})'


class ApiDomain(models.Model):
    account = models.ForeignKey(
        'Account', on_delete=models.CASCADE, related_name='api_domains'
    )
    domain = models.CharField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['domain']
        constraints = [
            models.UniqueConstraint(fields=['id', 'account_id'], name='uniq_apidomain_id_account'),
        ]

    def __str__(self):
        return f'{self.domain} ({self.account.uuid})'


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


class Account(models.Model):
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    account_type = models.ForeignKey(
        AccountType, on_delete=models.PROTECT, related_name='accounts'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='accounts'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f'{self.user.username} -> {self.account_type.name}'


class AccountCustomer(models.Model):
    account = models.ForeignKey(
        Account, on_delete=models.CASCADE, related_name='customers'
    )
    customer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='customer_of'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['account', 'customer'], name='account_customer_unique'
            ),
        ]


class EmailSettings(models.Model):
    account = models.OneToOneField(
        Account, on_delete=models.CASCADE, related_name='email_settings'
    )
    host = models.CharField(max_length=255, blank=True)
    port = models.PositiveIntegerField(default=587)
    username = models.CharField(max_length=255, blank=True)
    password = models.CharField(max_length=255, blank=True)
    use_tls = models.BooleanField(default=True)
    from_email = models.EmailField(max_length=255, blank=True)

    def __str__(self):
        return f'Email settings for {self.account.uuid}'


class EventLog(models.Model):
    account = models.ForeignKey(
        Account, on_delete=models.CASCADE, null=True, blank=True, related_name='events'
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='event_logs',
    )
    entity = models.CharField(max_length=50)
    entity_id = models.PositiveBigIntegerField(null=True, blank=True)
    entity_label = models.CharField(max_length=255, blank=True)
    action = models.CharField(max_length=20)
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.action} {self.entity}#{self.entity_id}'
        ordering = ['created_at']

    def __str__(self):
        return f'{self.account.uuid} -> {self.customer.username}'