from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('integrator', '0008_company'),
    ]

    operations = [
        migrations.AddField(
            model_name='address',
            name='country',
            field=models.CharField(blank=True, max_length=120),
        ),
        migrations.AddField(
            model_name='address',
            name='building',
            field=models.CharField(blank=True, max_length=50),
        ),
        migrations.RenameField(
            model_name='address',
            old_name='room',
            new_name='unit',
        ),
        migrations.RenameField(
            model_name='address',
            old_name='postal_code',
            new_name='zip',
        ),
    ]