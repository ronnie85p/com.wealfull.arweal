from django.contrib.auth.models import User
from rest_framework import serializers

from integrator.models import (
    API_KEY_PERMISSIONS,
    Account,
    AccountType,
    Address,
    ApiDomain,
    ApiKey,
    Company,
    EmailSettings,
    EventLog,
)


class AccountTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountType
        fields = ['id', 'name', 'description']


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class AccountSerializer(serializers.ModelSerializer):
    account_type = AccountTypeSerializer(read_only=True)
    user = UserSerializer(read_only=True)

    class Meta:
        model = Account
        fields = ['id', 'uuid', 'account_type', 'user', 'created_at']
class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'password']

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, min_length=6)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'password']

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class ApiKeySerializer(serializers.ModelSerializer):
    key = serializers.CharField(read_only=True)
    account_id = serializers.SlugRelatedField(
        source='account', slug_field='uuid', queryset=Account.objects.all(), required=False, allow_null=True
    )
    domain_id = serializers.PrimaryKeyRelatedField(
        source='domain', queryset=ApiDomain.objects.all(), required=False, allow_null=True
    )

    def validate_permissions(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError('Permissions must be a list.')
        unknown = [p for p in value if p not in API_KEY_PERMISSIONS]
        if unknown:
            raise serializers.ValidationError(f'Unknown permissions: {", ".join(unknown)}')
        return list(dict.fromkeys(value))

    class Meta:
        model = ApiKey
        fields = ['id', 'account_id', 'name', 'key', 'domain_id', 'description', 'permissions', 'created_at', 'updated_at', 'last_used_at']
        read_only_fields = ['created_at', 'updated_at', 'last_used_at', 'key']


class ApiDomainSerializer(serializers.ModelSerializer):
    account = serializers.SlugRelatedField(slug_field='uuid', read_only=True)
    account_id = serializers.SlugRelatedField(
        source='account', slug_field='uuid', queryset=Account.objects.all(), required=False, allow_null=True, write_only=True
    )

    class Meta:
        model = ApiDomain
        fields = ['id', 'account', 'account_id', 'domain', 'description', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']


class AddressSerializer(serializers.ModelSerializer):
    owner = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(), required=False, default=serializers.CurrentUserDefault()
    )

    class Meta:
        model = Address
        fields = ['id', 'owner', 'country', 'state', 'city', 'street', 'building', 'unit', 'zip', 'is_default', 'created_at']
        read_only_fields = ['id', 'created_at']


class EventLogSerializer(serializers.ModelSerializer):
    actor = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = EventLog
        fields = [
            'id',
            'actor',
            'entity',
            'entity_id',
            'entity_label',
            'action',
            'payload',
            'created_at',
        ]


class EmailSettingsSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        required=False, allow_blank=True, write_only=True
    )

    class Meta:
        model = EmailSettings
        fields = ['host', 'port', 'username', 'password', 'use_tls', 'from_email']


class CompanySerializer(serializers.ModelSerializer):
    account_id = serializers.SlugRelatedField(
        source='account', slug_field='uuid', queryset=Account.objects.all(),
        required=False, allow_null=True,
    )

    class Meta:
        model = Company
        fields = ['id', 'account_id', 'name', 'description', 'ein', 'website', 'phone', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
