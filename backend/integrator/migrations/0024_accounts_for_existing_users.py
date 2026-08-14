from django.db import migrations


def create_accounts_for_existing_users(apps, schema_editor):
    User = apps.get_model('auth', 'User')
    Account = apps.get_model('integrator', 'Account')
    AccountType = apps.get_model('integrator', 'AccountType')
    Company = apps.get_model('integrator', 'Company')

    business, _ = AccountType.objects.get_or_create(
        name='Business', defaults={'description': 'Business or company account'}
    )
    employer, _ = AccountType.objects.get_or_create(
        name='Employer', defaults={'description': 'Individual employer account'}
    )

    for user in User.objects.filter(accounts__isnull=True):
        if Company.objects.filter(owner=user).exists():
            Account.objects.create(account_type=business, user=user)
        else:
            Account.objects.create(account_type=employer, user=user)


def remove_created_accounts(apps, schema_editor):
    Account = apps.get_model('integrator', 'Account')
    Account.objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('integrator', '0023_rename_account_type_company_to_business'),
    ]

    operations = [
        migrations.RunPython(create_accounts_for_existing_users, remove_created_accounts),
    ]