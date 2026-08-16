from django.conf import settings
from django.db import migrations, models


def backfill_owners(apps, schema_editor):
    from django.contrib.auth.models import User

    first = User.objects.order_by('id').first()
    first_id = first.id if first else None

    for app_label, model_name in (('payments', 'Order'), ('payments', 'Service'),
                                  ('payments', 'Project'), ('payments', 'Material'),
                                  ('payments', 'Invoice'), ('payments', 'Payment'),
                                  ('integrator', 'Address')):
        model = apps.get_model(app_label, model_name)
        for obj in model.objects.filter(owner__isnull=True):
            obj.owner_id = obj.user_id or first_id
            obj.save(update_fields=['owner_id'])

    OrderAddress = apps.get_model('payments', 'OrderAddress')
    for obj in OrderAddress.objects.filter(owner__isnull=True):
        obj.owner_id = obj.order.user_id if obj.order_id else first_id
        obj.save(update_fields=['owner_id'])


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0017_user_groups'),
        ('integrator', '0007_add_owner'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='owner',
            field=models.ForeignKey(
                null=True,
                on_delete=models.deletion.CASCADE,
                related_name='owned_orders',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='orderaddress',
            name='owner',
            field=models.ForeignKey(
                null=True,
                on_delete=models.deletion.CASCADE,
                related_name='owned_order_addresses',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='service',
            name='owner',
            field=models.ForeignKey(
                null=True,
                on_delete=models.deletion.CASCADE,
                related_name='owned_services',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='project',
            name='owner',
            field=models.ForeignKey(
                null=True,
                on_delete=models.deletion.CASCADE,
                related_name='owned_projects',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='material',
            name='owner',
            field=models.ForeignKey(
                null=True,
                on_delete=models.deletion.CASCADE,
                related_name='owned_materials',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='invoice',
            name='owner',
            field=models.ForeignKey(
                null=True,
                on_delete=models.deletion.CASCADE,
                related_name='owned_invoices',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='payment',
            name='owner',
            field=models.ForeignKey(
                null=True,
                on_delete=models.deletion.CASCADE,
                related_name='owned_payments',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.RunPython(backfill_owners, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='order',
            name='owner',
            field=models.ForeignKey(
                on_delete=models.deletion.CASCADE,
                related_name='owned_orders',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name='orderaddress',
            name='owner',
            field=models.ForeignKey(
                on_delete=models.deletion.CASCADE,
                related_name='owned_order_addresses',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name='service',
            name='owner',
            field=models.ForeignKey(
                on_delete=models.deletion.CASCADE,
                related_name='owned_services',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name='project',
            name='owner',
            field=models.ForeignKey(
                on_delete=models.deletion.CASCADE,
                related_name='owned_projects',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name='material',
            name='owner',
            field=models.ForeignKey(
                on_delete=models.deletion.CASCADE,
                related_name='owned_materials',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name='invoice',
            name='owner',
            field=models.ForeignKey(
                on_delete=models.deletion.CASCADE,
                related_name='owned_invoices',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name='payment',
            name='owner',
            field=models.ForeignKey(
                on_delete=models.deletion.CASCADE,
                related_name='owned_payments',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
