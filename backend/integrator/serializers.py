from django.contrib.auth.models import User
from rest_framework import serializers

from .models import Address, ApiKey


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'password']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
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

    class Meta:
        model = ApiKey
        fields = ['id', 'name', 'key', 'active', 'created_at', 'last_used_at']
        read_only_fields = ['created_at', 'last_used_at', 'key']


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = ['id', 'state', 'city', 'street', 'room', 'postal_code', 'is_default', 'created_at']
        read_only_fields = ['id', 'created_at']