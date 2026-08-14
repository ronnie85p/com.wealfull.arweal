from django.db import migrations


def rename_company_to_business(apps, schema_editor):
    AccountType = apps.get_model('integrator', 'AccountType')
    AccountType.objects.filter(name='Company').update(
        name='Business', description='Business or company account'
    )


def rename_business_to_company(apps, schema_editor):
    AccountType = apps.get_model('integrator', 'AccountType')
    AccountType.objects.filter(name='Business').update(
        name='Company', description='Company or business account'
    )


class Migration(migrations.Migration):

    dependencies = [
        ('integrator', '0022_account'),
    ]

    operations = [
        migrations.RunPython(rename_company_to_business, rename_business_to_company),
    ]
