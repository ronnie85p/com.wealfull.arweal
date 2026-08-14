import os

from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

load_dotenv(os.path.join(BASE_DIR, '.env'))

ENVIRONMENT = os.environ.get('ENVIRONMENT', 'production')

load_dotenv(os.path.join(BASE_DIR, f'.env.{ENVIRONMENT}'))

from config.wsgi import application  # noqa: E402
