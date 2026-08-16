import django.db.models.deletion
from django.db import migrations, models


def delete_orphan_images(apps, schema_editor):
    ServiceImage = apps.get_model('payments', 'ServiceImage')
    ServiceImage.objects.filter(service__isnull=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('payments', '0049_serviceimage'),
    ]

    operations = [
        migrations.RunPython(delete_orphan_images, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='serviceimage',
            name='service',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='images',
                to='payments.service',
            ),
        ),
        migrations.AddField(
            model_name='serviceimage',
            name='uri',
            field=models.CharField(blank=True, max_length=500),
        ),
        migrations.AddField(
            model_name='serviceimage',
            name='url',
            field=models.CharField(blank=True, max_length=1000),
        ),
    ]