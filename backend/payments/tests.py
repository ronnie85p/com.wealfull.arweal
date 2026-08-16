from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from integrator.models import Account, AccountCustomer, AccountType, Profile
from payments.models import Material, Order, Project, Service


class AuthenticatedTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='paymentsuser', email='payments@example.com', password='Str0ng!pass'
        )
        Profile.objects.create(user=self.user, email='payments@example.com')
        account_type = AccountType.objects.create(name='integration')
        self.account = Account.objects.create(account_type=account_type, user=self.user)
        AccountCustomer.objects.create(account=self.account, customer=self.user)
        self.token = Token.objects.create(user=self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        cfg = self.client.get('/api/config')
        self.csrf = cfg.json().get('csrf', '')
        self.client.cookies['csrftoken'] = self.csrf

    def post(self, path, data):
        return self.client.post(path, data, format='json', HTTP_X_CSRFTOKEN=self.csrf)

    def account_path(self, suffix):
        return f'/api/v1/account/{self.account.uuid}/{suffix}'


class OrderTests(AuthenticatedTestCase):
    def test_create_order(self):
        res = self.post(
            self.account_path('orders'),
            {'amount': '100.00', 'currency': 'EUR', 'status': 'pending', 'materials': 'included'},
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Order.objects.filter(owner=self.user).count(), 1)

    def test_list_orders_only_owned(self):
        other = User.objects.create_user(username='otheruser', password='x')
        Order.objects.create(user=other, owner=other, amount=50, currency='EUR')
        Order.objects.create(user=self.user, owner=self.user, account=self.account, amount=100, currency='EUR')
        res = self.client.get(self.account_path('orders'))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['amount'], '100.00')

    def test_order_requires_authentication(self):
        anon = APIClient()
        res = anon.get(self.account_path('orders'))
        self.assertEqual(res.status_code, 401)


class ServiceTests(AuthenticatedTestCase):
    def test_create_and_filter_service(self):
        self.post(
            self.account_path('services'),
            {'name': 'Cleaning', 'amount': '50.00', 'status': 'active'},
        )
        res = self.client.get(self.account_path('services?status=active'))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['name'], 'Cleaning')
        res_inactive = self.client.get(self.account_path('services?status=inactive'))
        self.assertEqual(len(res_inactive.data), 0)

    def test_services_are_owned(self):
        other = User.objects.create_user(username='svcother', password='x')
        Service.objects.create(user=other, owner=other, name='Other', price=10)
        res = self.client.get(self.account_path('services'))
        self.assertEqual(len(res.data), 0)


class MaterialTests(AuthenticatedTestCase):
    def test_create_material(self):
        res = self.post(
            '/api/v1/materials',
            {'name': 'Wood', 'unit': 'm', 'amount': '10.00'},
        )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(Material.objects.filter(owner=self.user).count(), 1)


class ProjectTests(AuthenticatedTestCase):
    def test_create_and_search_project(self):
        self.post(self.account_path('projects'), {'name': 'Kitchen remodel'})
        self.post(self.account_path('projects'), {'name': 'Bathroom fix'})
        res = self.client.get(self.account_path('projects?search=kitchen'))
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.data), 1)
        self.assertEqual(res.data[0]['name'], 'Kitchen remodel')

    def test_projects_are_owned(self):
        other = User.objects.create_user(username='projother', password='x')
        Project.objects.create(user=other, owner=other, name='Secret')
        res = self.client.get(self.account_path('projects'))
        self.assertEqual(len(res.data), 0)


class InvoicesTests(AuthenticatedTestCase):
    def test_invoices_readonly(self):
        res = self.post('/api/v1/invoices', {'amount': '10.00'})
        self.assertEqual(res.status_code, 405)
        res_list = self.client.get('/api/v1/invoices')
        self.assertEqual(res_list.status_code, 200)