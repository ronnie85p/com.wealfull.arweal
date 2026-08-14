#!/bin/sh
set -e

if [ "$1" = "migrate" ]; then
    echo "Applying database migrations..."
    exec python3 manage.py migrate --noinput
fi

echo "Applying database migrations..."
python3 manage.py migrate --noinput

echo "Starting gunicorn..."
exec gunicorn config.wsgi:application --bind 0.0.0.0:${DJANGO_PORT:-8000} --workers 3
