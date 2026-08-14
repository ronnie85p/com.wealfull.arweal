from django.db import migrations

ACCOUNT_TYPES = [
    ('Company', 'Company or business account'),
    ('Employer', 'Individual employer account'),
]


def seed_account_types(apps, schema_editor):
    AccountType = apps.get_model('integrator', 'AccountType')
    for name, description in ACCOUNT_TYPES:
        AccountType.objects.get_or_create(name=name, defaults={'description': description})


def unseed_account_types(apps, schema_editor):
    AccountType = apps.get_model('integrator', 'AccountType')
    AccountType.objects.filter(name__in=[name for name, _ in ACCOUNT_TYPES]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ('integrator', '0020_accounttype'),
    ]

    operations = [
        migrations.RunPython(seed_account_types, unseed_account_types),
    ]
