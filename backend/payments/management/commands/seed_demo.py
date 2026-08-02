import random
from datetime import timedelta

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.utils import timezone

from integrator.models import ApiKey
from payments.models import Invoice, Order, Payment

FIRST_NAMES = ['Ava', 'Liam', 'Noah', 'Mia', 'Ella', 'Lucas', 'Emma', 'Lena']
LAST_NAMES = ['Miller', 'Johnson', 'Brown', 'Davis', 'Garcia', 'Wilson']
CURRENCIES = ['EUR', 'USD', 'GBP']
STATUSES = ['pending', 'paid', 'canceled']
INVOICE_STATUSES = ['issued', 'issued', 'paid', 'overdue']


class Command(BaseCommand):
    help = 'Seed a demo integrator user with API keys, orders, invoices and payments.'

    def handle(self, *args, **options):
        username = 'demo'
        demo, created = User.objects.get_or_create(username=username)
        if created:
            demo.set_password('demo12345')
            demo.first_name = 'Demo'
            demo.last_name = 'Integrator'
            demo.email = 'demo@example.com'
            demo.save()
            self.stdout.write('Created demo user (login: demo / demo12345).')
        else:
            self.stdout.write('Demo user already exists, seeding data.')

        if not demo.api_keys.exists():
            ApiKey.objects.create(user=demo, name='Production', active=True)
            ApiKey.objects.create(user=demo, name='Sandbox', active=True)
            ApiKey.objects.create(user=demo, name='Testing (revoked)', active=False)

        if not demo.orders.exists():
            now = timezone.now()
            orders = []
            invoices = []
            for i in range(14):
                created_at = now - timedelta(days=random.randint(0, 45), hours=random.randint(0, 23))
                order = Order.objects.create(
                    user=demo,
                    external_id=f'ORD-{1000 + i}',
                    amount=round(random.uniform(9.9, 999.9), 2),
                    currency=random.choice(CURRENCIES),
                    status=random.choice(STATUSES),
                    description=random.choice([
                        'Monthly subscription', 'Enterprise plan', 'SMS package',
                        'API usage top-up', 'Premium support', 'Data export',
                    ]),
                )
                order.created_at = created_at
                order.save(update_fields=['created_at'])
                orders.append(order)

                invoice = Invoice.objects.create(
                    user=demo,
                    number=f'INV-2026-{1000 + i}',
                    order=order,
                    amount=order.amount,
                    currency=order.currency,
                    status=random.choice(INVOICE_STATUSES),
                    issued_at=created_at,
                    due_date=(created_at + timedelta(days=14)).date(),
                )
                if invoice.status == 'paid':
                    invoice.paid_at = created_at + timedelta(days=random.randint(0, 6))
                    invoice.save(update_fields=['paid_at'])
                invoices.append(invoice)

                for j in range(random.randint(0, 2)):
                    payment_status = random.choice(['created', 'authorized', 'captured', 'refunded', 'failed'])
                    Payment.objects.create(
                        user=demo,
                        invoice=invoice,
                        external_ref=f'PAY-{10000 + i * 10 + j}',
                        amount=invoice.amount,
                        currency=invoice.currency,
                        method=random.choice(['card', 'transfer', 'wallet']),
                        status=payment_status,
                    )
            self.stdout.write(self.style.SUCCESS(f'Seeded {len(orders)} orders and {len(invoices)} invoices.'))

        # Demo key for interop/other users
        if not User.objects.filter(username='acme').exists():
            acme = User.objects.create_user(username='acme', password='acme12345')
            ApiKey.objects.create(user=acme, name='Main API key', active=True)
            Order.objects.create(user=acme, external_id='ORD-9999', amount=199.00, currency='USD', status='paid')

        self.stdout.write(self.style.SUCCESS('Seeding complete.'))