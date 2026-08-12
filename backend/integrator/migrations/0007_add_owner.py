from django.conf import settings
from django.db import migrations, models


def backfill_owners(apps, schema_editor):
    from django.contrib.auth.models import User

    first = User.objects.order_by('id').first()
    first_id = first.id if first else None

    for model_name in ('ApiKey', 'Address'):
        model = apps.get_model('integrator', model_name)
        for obj in model.objects.filter(owner__isnull=True):
            obj.owner_id = obj.user_id or first_id
            obj.save(update_fields=['owner_id'])


class Migration(migrations.Migration):

    dependencies = [
        ('integrator', '0006_remove_address_building'),
    ]

    operations = [
        migrations.AddField(
            model_name='apikey',
            name='owner',
            field=models.ForeignKey(
                null=True,
                on_delete=models.deletion.CASCADE,
                related_name='owned_api_keys',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='address',
            name='owner',
            field=models.ForeignKey(
                null=True,
                on_delete=models.deletion.CASCADE,
                related_name='owned_addresses',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.RunPython(backfill_owners, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='apikey',
            name='owner',
            field=models.ForeignKey(
                on_delete=models.deletion.CASCADE,
                related_name='owned_api_keys',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name='address',
            name='owner',
            field=models.ForeignKey(
                on_delete=models.deletion.CASCADE,
                related_name='owned_addresses',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
