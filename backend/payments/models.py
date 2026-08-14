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

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='services'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_services'
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='EUR')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    created_at = models.DateTimeField(auto_now_add=True)

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