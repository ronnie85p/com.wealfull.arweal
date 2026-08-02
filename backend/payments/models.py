from django.conf import settings
from django.db import models


class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('canceled', 'Canceled'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders'
    )
    external_id = models.CharField(max_length=100, default='', blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='EUR')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    description = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Order #{self.pk} ({self.status})'


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