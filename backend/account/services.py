"""Generic confirmation service.

Not tied to any specific model or feature: works with any object exposing
``confirmation_code`` and ``code_expires_at`` fields (Profile, User, 2FA
challenges, password-reset tokens, etc.).
"""

import secrets
import string

from django.utils import timezone

DEFAULT_TTL = 900
REGISTER_TTL = 900
LOGIN_TTL = 900
RESEND_COOLDOWN = 30


def generate_code(length: int = 6) -> str:
    """Generate a random numeric code of the given length."""
    return ''.join(secrets.choice(string.digits) for _ in range(length))


def issue_code(target, ttl: int = DEFAULT_TTL):
    """Set a fresh code and expiry on *target* and persist it.

    Returns a tuple ``(code, expires_at)``.
    """
    code = generate_code()
    expires_at = timezone.now() + timezone.timedelta(seconds=ttl)
    target.confirmation_code = code
    target.code_expires_at = expires_at
    target.save(update_fields=['confirmation_code', 'code_expires_at'])
    return code, expires_at


def has_code(target) -> bool:
    """True if a code is present at all (regardless of expiry)."""
    return bool(getattr(target, 'confirmation_code', ''))


def is_code_active(target) -> bool:
    """True if a code exists and has not expired."""
    if not has_code(target):
        return False
    expires_at = target.code_expires_at
    return expires_at is None or expires_at > timezone.now()


def code_expired(target) -> bool:
    """True if a code exists but its lifetime is over."""
    return has_code(target) and not is_code_active(target)


def remaining_seconds(target) -> int:
    """Seconds until the code expires (0 when missing or expired)."""
    if not is_code_active(target) or target.code_expires_at is None:
        return 0
    return max(0, int((target.code_expires_at - timezone.now()).total_seconds()))


def resend_available_in(target, ttl: int = DEFAULT_TTL) -> int:
    """Seconds until a new code may be issued (0 means allowed right now).

    ``ttl`` must match the TTL the current code was issued with.
    """
    if target.code_expires_at is None:
        return 0
    issued_at = target.code_expires_at - timezone.timedelta(seconds=ttl)
    allowed_at = issued_at + timezone.timedelta(seconds=RESEND_COOLDOWN)
    return max(0, int((allowed_at - timezone.now()).total_seconds()))


def matches(target, code) -> bool:
    """True if *code* equals the stored one and is still active."""
    return is_code_active(target) and target.confirmation_code == code


def clear_code(target) -> None:
    """Remove the stored code and expiry."""
    target.confirmation_code = ''
    target.code_expires_at = None
    target.save(update_fields=['confirmation_code', 'code_expires_at'])


def consume_code(target, code) -> bool:
    """Validate *code*; on success clear it and return True."""
    if not matches(target, code):
        return False
    clear_code(target)
    return True


def send_account_email(account, subject, message, recipients, fail_silently=True):
    """Send email using the account's SMTP settings when configured,
    otherwise fall back to the global EMAIL_* settings.

    Logs a ``mail`` event with action ``sent``/``failed`` on *account*.
    """
    from django.conf import settings as dj_settings
    from django.core.mail import EmailMessage, get_connection

    from integrator.events import log_event
    from integrator.models import EmailSettings

    s = EmailSettings.objects.filter(account=account).first()
    channel = 'account' if s and s.host else 'env'
    kwargs = {}
    use_smtp = False
    if s and s.host:
        port = s.port or dj_settings.EMAIL_PORT
        use_ssl = port == 465
        kwargs.update({
            'host': s.host,
            'port': port,
            'username': s.username or '',
            'password': s.password or '',
            'use_tls': s.use_tls and not use_ssl,
            'use_ssl': use_ssl,
            'timeout': dj_settings.EMAIL_TIMEOUT,
        })
        use_smtp = True
    elif dj_settings.EMAIL_HOST:
        use_ssl = dj_settings.EMAIL_USE_SSL
        kwargs.update({
            'host': dj_settings.EMAIL_HOST,
            'port': dj_settings.EMAIL_PORT,
            'username': dj_settings.EMAIL_HOST_USER,
            'password': dj_settings.EMAIL_HOST_PASSWORD,
            'use_tls': dj_settings.EMAIL_USE_TLS and not use_ssl,
            'use_ssl': use_ssl,
            'timeout': dj_settings.EMAIL_TIMEOUT,
        })
        use_smtp = True
    from_email = (s.from_email if s and s.from_email else '') or dj_settings.DEFAULT_FROM_EMAIL
    backend = (
        'django.core.mail.backends.smtp.EmailBackend' if use_smtp else dj_settings.EMAIL_BACKEND
    )
    connection = get_connection(backend=backend, fail_silently=fail_silently, **kwargs)
    message = EmailMessage(subject, message, from_email, recipients, connection=connection)
    try:
        result = message.send()
    except Exception as exc:
        log_event(
            account,
            'mail',
            None,
            'failed',
            {'to': list(recipients), 'subject': subject, 'channel': channel, 'error': str(exc)},
            label=subject,
        )
        if not fail_silently:
            raise
        return 0
    log_event(
        account,
        'mail',
        None,
        'sent',
        {'to': list(recipients), 'subject': subject, 'channel': channel},
        label=subject,
    )
    return result
