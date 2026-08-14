from django.db import migrations, models


def backfill_company(apps, schema_editor):
    ApiKey = apps.get_model('integrator', 'ApiKey')
    Company = apps.get_model('integrator', 'Company')
    for key in ApiKey.objects.all():
        company = Company.objects.filter(owner_id=key.owner_id).first()
        if company is None and key.owner_id is not None:
            company = Company.objects.create(
                owner_id=key.owner_id,
                name=f'{key.owner.username} Company' if key.owner_id else 'Company',
            )
        key.company_id = company.pk if company else None
        key.save(update_fields=['company_id'])


class Migration(migrations.Migration):

    dependencies = [
        ('integrator', '0012_company_updated_at'),
    ]

    operations = [
        migrations.AddField(
            model_name='apikey',
            name='company',
            field=models.ForeignKey(null=True, on_delete=models.deletion.CASCADE, related_name='api_keys', to='integrator.company'),
        ),
        migrations.AddField(
            model_name='apikey',
            name='description',
            field=models.TextField(blank=True),
        ),
        migrations.RunPython(backfill_company, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='apikey',
            name='company',
            field=models.ForeignKey(on_delete=models.deletion.CASCADE, related_name='api_keys', to='integrator.company'),
        ),
        migrations.AddField(
            model_name='apikey',
            name='updated_at',
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.RemoveField(model_name='apikey', name='active'),
        migrations.RemoveField(model_name='apikey', name='last_used_at'),
        migrations.RemoveField(model_name='apikey', name='owner'),
        migrations.RemoveField(model_name='apikey', name='user'),
    ]