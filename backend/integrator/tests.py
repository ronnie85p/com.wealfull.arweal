import hashlib

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import Account, AccountType, Company, Profile
from .services import issue_code


def expected_username(email: str) -> str:
    local = (email.split('@')[0] or 'user')
    digest = hashlib.sha256(email.encode('utf-8')).hexdigest()[:8]
    return f'{local}{digest}'


class ApiTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        cfg = self.client.get('/api/config/')
        self.csrf = cfg.json().get('csrf', '')
        self.client.cookies['csrftoken'] = self.csrf

    def post(self, path, data):
        return self.client.post(path, data, format='json', HTTP_X_CSRFTOKEN=self.csrf)


class RegisterTests(ApiTestCase):
    def test_register_generates_username_from_email_and_hash(self):
        email = 'john.doe@example.com'
        res = self.post(
            '/api/v1/auth/register/',
            {'email': email, 'firstname': 'John', 'lastname': 'Doe'},
        )
        self.assertEqual(res.status_code, 201)
        user = User.objects.get(email=email)
        self.assertEqual(user.username, expected_username(email))
        self.assertEqual(res.data['user']['username'], expected_username(email))

    def test_register_ignores_client_supplied_username(self):
        res = self.post(
            '/api/v1/auth/register/',
            {'email': 'x@example.com', 'username': 'custom_login'},
        )
        self.assertEqual(res.status_code, 201)
        user = User.objects.get(email='x@example.com')
        self.assertEqual(user.username, expected_username('x@example.com'))
        self.assertNotEqual(user.username, 'custom_login')

    def test_register_creates_profile_and_company(self):
        res = self.post(
            '/api/v1/auth/register/',
            {
                'email': 'acme@example.com',
                'account_type': 'Business',
                'company_name': 'Acme',
                'ein': '123456789',
                'firstname': 'Ann',
            },
        )
        self.assertEqual(res.status_code, 201)
        user = User.objects.get(email='acme@example.com')
        self.assertTrue(Profile.objects.filter(user=user, email='acme@example.com').exists())
        self.assertTrue(Company.objects.filter(owner=user, name='Acme', ein='123456789').exists())

    def test_register_creates_account_with_requested_type(self):
        res = self.post(
            '/api/v1/auth/register/',
            {'email': 'c@example.com', 'account_type': 'Business'},
        )
        self.assertEqual(res.status_code, 201)
        user = User.objects.get(email='c@example.com')
        company_type = AccountType.objects.get(name='Business')
        self.assertTrue(Account.objects.filter(user=user, account_type=company_type).exists())

    def test_register_creates_account_defaulting_to_employer(self):
        res = self.post(
            '/api/v1/auth/register/',
            {'email': 'e@example.com'},
        )
        self.assertEqual(res.status_code, 201)
        user = User.objects.get(email='e@example.com')
        employer_type = AccountType.objects.get(name='Employer')
        self.assertTrue(Account.objects.filter(user=user, account_type=employer_type).exists())

    def test_register_rejects_invalid_email(self):
        res = self.post(
            '/api/v1/auth/register/',
            {'email': 'not-an-email', 'firstname': 'X'},
        )
        self.assertEqual(res.status_code, 400)


class ConfirmTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.post(
            '/api/v1/auth/register/',
            {'email': 'bob@example.com', 'firstname': 'Bob'},
        )
        self.user = User.objects.get(email='bob@example.com')
        self.profile = self.user.profile

    def test_confirm_with_valid_code(self):
        code, _ = issue_code(self.profile)
        res = self.post(
            '/api/v1/auth/confirm/',
            {'email': 'bob@example.com', 'code': code},
        )
        self.assertEqual(res.status_code, 200)
        self.profile.refresh_from_db()
        self.assertIsNotNone(self.profile.confirmed_at)
        self.assertEqual(self.profile.confirmation_code, '')

    def test_confirm_with_wrong_code(self):
        res = self.post(
            '/api/v1/auth/confirm/',
            {'email': 'bob@example.com', 'code': '000000'},
        )
        self.assertEqual(res.status_code, 400)


class CompleteRegistrationTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.post(
            '/api/v1/auth/register/',
            {'email': 'complete@example.com', 'firstname': 'C'},
        )
        self.user = User.objects.get(email='complete@example.com')
        self.profile = self.user.profile
        code, _ = issue_code(self.profile)
        self.post(
            '/api/v1/auth/confirm/',
            {'email': 'complete@example.com', 'code': code},
        )
        self.profile.refresh_from_db()

    def test_keeps_generated_username_when_blank(self):
        res = self.post(
            '/api/v1/auth/complete-registration/',
            {'email': 'complete@example.com', 'username': '', 'password': '', 'two_factor': False},
        )
        self.assertEqual(res.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, expected_username('complete@example.com'))
        self.assertFalse(self.user.has_usable_password())
        self.assertFalse(self.profile.two_factor)
        self.assertIn('token', res.data)

    def test_allows_custom_username_and_password(self):
        res = self.post(
            '/api/v1/auth/complete-registration/',
            {
                'email': 'complete@example.com',
                'username': 'my_login',
                'password': 'Str0ng!pass',
                'two_factor': True,
            },
        )
        self.assertEqual(res.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, 'my_login')
        self.assertTrue(self.user.has_usable_password())
        self.assertTrue(self.user.check_password('Str0ng!pass'))
        self.profile.refresh_from_db()
        self.assertTrue(self.profile.two_factor)

    def test_rejects_short_username(self):
        res = self.post(
            '/api/v1/auth/complete-registration/',
            {'email': 'complete@example.com', 'username': 'ab', 'password': '', 'two_factor': False},
        )
        self.assertEqual(res.status_code, 400)

    def test_rejects_weak_password(self):
        res = self.post(
            '/api/v1/auth/complete-registration/',
            {
                'email': 'complete@example.com',
                'username': '',
                'password': 'weak',
                'two_factor': False,
            },
        )
        self.assertEqual(res.status_code, 400)

    def test_requires_confirmed_email(self):
        self.profile.confirmed_at = None
        self.profile.save(update_fields=['confirmed_at'])
        res = self.post(
            '/api/v1/auth/complete-registration/',
            {'email': 'complete@example.com', 'username': '', 'password': '', 'two_factor': False},
        )
        self.assertEqual(res.status_code, 400)


class LoginTests(ApiTestCase):
    def setUp(self):
        super().setUp()
        self.post(
            '/api/v1/auth/register/',
            {'email': 'login@example.com', 'firstname': 'L'},
        )
        self.user = User.objects.get(email='login@example.com')
        self.profile = self.user.profile
        code, _ = issue_code(self.profile)
        self.post(
            '/api/v1/auth/confirm/',
            {'email': 'login@example.com', 'code': code},
        )
        self.user.set_password('Str0ng!pass')
        self.user.save()

    def test_login_by_username_returns_token(self):
        res = self.post(
            '/api/v1/auth/login/',
            {'username': self.user.username},
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn('token', res.data)
        self.assertEqual(res.data['user']['username'], self.user.username)

    def test_login_password(self):
        res = self.post(
            '/api/v1/auth/login/password/',
            {'username': self.user.username, 'password': 'Str0ng!pass'},
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn('token', res.data)

    def test_login_password_wrong(self):
        res = self.post(
            '/api/v1/auth/login/password/',
            {'username': self.user.username, 'password': 'wrong-pass'},
        )
        self.assertEqual(res.status_code, 400)

    def test_login_by_email(self):
        res = self.post(
            '/api/v1/auth/login/',
            {'username': 'login@example.com'},
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['user']['username'], self.user.username)

    def test_login_check_reports_password_state(self):
        res = self.post(
            '/api/v1/auth/login/check/',
            {'username': self.user.username},
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['password_set'], True)
        self.assertEqual(res.data['email'], 'login@example.com')
