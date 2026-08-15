# Generated manually: add uuid to account, backfill existing rows, then constrain.

import uuid

from django.db import migrations, models


def backfill_uuids(apps, schema_editor):
    Account = apps.get_model('integrator', 'Account')
    for account in Account.objects.all():
        account.uuid = uuid.uuid4()
        account.save(update_fields=['uuid'])


class Migration(migrations.Migration):

    dependencies = [
        ('integrator', '0024_accounts_for_existing_users'),
    ]

    operations = [
        migrations.AddField(
            model_name='account',
            name='uuid',
            field=models.UUIDField(null=True, editable=False),
        ),
        migrations.RunPython(backfill_uuids, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='account',
            name='uuid',
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
    ]
