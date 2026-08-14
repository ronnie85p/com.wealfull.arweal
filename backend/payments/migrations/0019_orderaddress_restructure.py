from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0021_alter_orderitem_unit'),
    ]

    operations = [
        migrations.AddField(
            model_name='orderaddress',
            name='country',
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name='orderaddress',
            name='building',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.RenameField(
            model_name='orderaddress',
            old_name='room',
            new_name='unit',
        ),
        migrations.RenameField(
            model_name='orderaddress',
            old_name='postal_code',
            new_name='zip',
        ),
    ]