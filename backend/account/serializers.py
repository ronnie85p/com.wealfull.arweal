from django.contrib.auth.models import User
from rest_framework import serializers

from integrator.models import Account, AccountType, Address, ApiDomain, ApiKey, Company


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

    class Meta:
        model = ApiKey
        fields = ['id', 'account_id', 'name', 'key', 'domain_id', 'description', 'created_at', 'updated_at', 'last_used_at']
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


class CompanySerializer(serializers.ModelSerializer):
    account_id = serializers.SlugRelatedField(
        source='account', slug_field='uuid', queryset=Account.objects.all(),
        required=False, allow_null=True,
    )

    class Meta:
        model = Company
        fields = ['id', 'account_id', 'name', 'description', 'ein', 'website', 'phone', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
