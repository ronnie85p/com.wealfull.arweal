from django.conf import settings
from django.db import models


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('canceled', 'Canceled'),
    ]

    MATERIALS_CHOICES = [
        ('included', 'Included'),
        ('not_included', 'Not included'),
        ('finish_not_included', 'Finish not included'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_orders'
    )
    external_id = models.CharField(max_length=100, default='', blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='EUR')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    materials = models.CharField(max_length=30, choices=MATERIALS_CHOICES, default='included')
    description = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    comment = models.TextField(blank=True)
    executors = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name='executed_orders', blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    project = models.OneToOneField(
        'Project', on_delete=models.SET_NULL, null=True, blank=True, related_name='order'
    )

    def __str__(self):
        return f'Order #{self.pk} ({self.status})'


class OrderAddress(models.Model):
    order = models.OneToOneField(
        Order, on_delete=models.CASCADE, related_name='address'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_order_addresses'
    )
    source = models.ForeignKey(
        'integrator.Address',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='order_addresses',
    )
    country = models.CharField(max_length=120, blank=True)
    state = models.CharField(max_length=120, blank=True)
    city = models.CharField(max_length=120)
    street = models.CharField(max_length=255)
    building = models.CharField(max_length=50, blank=True)
    unit = models.CharField(max_length=50, blank=True)
    zip = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.street}, {self.city} (order #{self.order_id})'


class OrderItem(models.Model):
    UNIT_CHOICES = [
        ('pc', 'Pieces'),
        ('in', 'Inches'),
        ('ft', 'Feet'),
        ('m', 'Meters'),
        ('in2', 'Square inches'),
        ('ft2', 'Square feet'),
        ('m2', 'Square meters'),
    ]

    order = models.ForeignKey(
        Order, on_delete=models.CASCADE, related_name='items'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_order_items'
    )
    name = models.CharField(max_length=200)
    description = models.CharField(max_length=255, blank=True)
    quantity = models.PositiveIntegerField(default=1)
    unit = models.CharField(max_length=30, choices=UNIT_CHOICES, default='pc')
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='EUR')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.name} × {self.quantity}'


class Service(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ]
    DURATION_UNIT_CHOICES = [
        ('days', 'Days'),
        ('weeks', 'Weeks'),
        ('months', 'Months'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='services'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_services'
    )
    name = models.CharField(max_length=200)
    short_description = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    features = models.CharField(max_length=200, blank=True)
    tags = models.CharField(max_length=200, blank=True)
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    old_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    duration_start = models.PositiveIntegerField(default=0)
    duration_end = models.PositiveIntegerField(default=0)
    duration_unit = models.CharField(max_length=20, choices=DURATION_UNIT_CHOICES, default='days')
    currency = models.CharField(max_length=3, default='EUR')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    category = models.ForeignKey(
        'Category', on_delete=models.SET_NULL, null=True, blank=True, related_name='services'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='services_created_by',
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='services_updated_by',
    )
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='services_deleted_by',
    )

    def __str__(self):
        return self.name


class ServiceImage(models.Model):
    service = models.ForeignKey(
        'Service', on_delete=models.CASCADE, related_name='images'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_service_images'
    )
    image = models.ImageField(upload_to='services/%Y/%m/')
    uri = models.CharField(max_length=500, blank=True)
    url = models.CharField(max_length=1000, blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if self.image:
            self.uri = self.image.name
            self.url = self.image.url
        super().save(*args, **kwargs)

    def __str__(self):
        return f'Service image #{self.pk}'


class LocationServices(models.Model):
    location = models.ForeignKey(
        'Location', on_delete=models.CASCADE, related_name='service_links'
    )
    service = models.ForeignKey(
        'Service', on_delete=models.CASCADE, related_name='location_links'
    )

    class Meta:
        db_table = 'location_services'
        constraints = [
            models.UniqueConstraint(fields=['location', 'service'], name='location_services_unique'),
        ]


class Category(models.Model):
    account = models.ForeignKey(
        'integrator.Account', on_delete=models.SET_NULL, null=True, blank=True, related_name='categories'
    )
    name = models.CharField(max_length=200)
    full_name = models.CharField(max_length=200, blank=True)
    description = models.TextField(blank=True)
    tags = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='categories_created_by',
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='categories_updated_by',
    )
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='categories_deleted_by',
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['account', 'name'], name='category_account_name_unique'),
        ]

    def __str__(self):
        return self.name


class Location(models.Model):
    TYPE_CHOICES = [
        ('city', 'City'),
        ('county', 'County'),
        ('state', 'State'),
    ]

    account = models.ForeignKey(
        'integrator.Account', on_delete=models.SET_NULL, null=True, blank=True, related_name='locations'
    )
    services = models.ManyToManyField(
        'Service', blank=True, related_name='locations', through='LocationServices'
    )
    location = models.CharField(max_length=200, unique=True)
    full_location = models.TextField(blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    country = models.CharField(max_length=120, blank=True)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, blank=True)
    city = models.CharField(max_length=120, blank=True)
    county = models.CharField(max_length=120, blank=True)
    state = models.CharField(max_length=120, blank=True)
    short_state = models.CharField(max_length=20, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    description = models.TextField(blank=True)
    tags = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='locations_created_by',
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='locations_updated_by',
    )
    deleted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='locations_deleted_by',
    )

    def __str__(self):
        return self.name


class Project(models.Model):
    DURATION_UNIT_CHOICES = [
        ('days', 'Days'),
        ('weeks', 'Weeks'),
        ('months', 'Months'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='projects'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_projects'
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    start_time = models.DateTimeField(null=True, blank=True)
    duration = models.PositiveIntegerField(default=0)
    duration_to = models.PositiveIntegerField(default=0)
    duration_unit = models.CharField(max_length=20, choices=DURATION_UNIT_CHOICES, default='days')
    available_from = models.DateTimeField(null=True, blank=True)
    available_to = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Material(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='materials'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_materials'
    )
    name = models.CharField(max_length=200)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Invoice(models.Model):
    STATUS_CHOICES = [
        ('issued', 'Issued'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
        ('voided', 'Void'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='invoices'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_invoices'
    )
    number = models.CharField(max_length=40, unique=True)
    order = models.ForeignKey(
        Order, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices'
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='EUR')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='issued')
    due_date = models.DateField(null=True, blank=True)
    issued_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f'Invoice {self.number}'


class Payment(models.Model):
    METHOD_CHOICES = [
        ('card', 'Card'),
        ('transfer', 'Bank transfer'),
        ('wallet', 'E-wallet'),
    ]
    STATUS_CHOICES = [
        ('created', 'Created'),
        ('authorized', 'Authorized'),
        ('captured', 'Captured'),
        ('refunded', 'Refunded'),
        ('failed', 'Failed'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='payments'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_payments'
    )
    invoice = models.ForeignKey(
        Invoice, on_delete=models.SET_NULL, null=True, blank=True, related_name='payments'
    )
    external_ref = models.CharField(max_length=100, db_index=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='EUR')
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default='card')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='created')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Payment {self.external_ref} ({self.status})'