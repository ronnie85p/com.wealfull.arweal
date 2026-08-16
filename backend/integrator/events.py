import logging
import uuid as uuid_module

from integrator.models import Account, EventLog

logger = logging.getLogger(__name__)


def _jsonable(value):
    if isinstance(value, uuid_module.UUID):
        return str(value)
    if isinstance(value, dict):
        return {k: _jsonable(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_jsonable(v) for v in value]
    return value


def log_event(account, entity, entity_id, action, payload=None, actor=None, label=''):
    EventLog.objects.create(
        account=account,
        actor=actor,
        entity=entity,
        entity_id=entity_id,
        entity_label=(label or '')[:255],
        action=action,
        payload=_jsonable(payload) or {},
    )


class Event:
    """A domain event. Actions can be attached with after(); when the
    event fires, the log is written first, then attached actions run."""

    def __init__(self, account, entity, entity_id, action, payload=None, actor=None, label=''):
        self.account = account
        self.entity = entity
        self.entity_id = entity_id
        self.action = action
        self.payload = payload
        self.actor = actor
        self.label = label
        self._after = []

    def after(self, callback):
        """Register an action to run after the event fires."""
        if callable(callback):
            self._after.append(callback)
        return self

    def fire(self):
        """Write the log entry, then run all attached actions."""
        log_event(
            self.account,
            self.entity,
            self.entity_id,
            self.action,
            payload=self.payload,
            actor=self.actor,
            label=self.label,
        )
        for callback in self._after:
            try:
                callback(self)
            except Exception:
                logger.exception(
                    'Event action failed for %s %s', self.action, self.entity
                )


class EventLogMixin:
    event_entity = None

    def _event_account(self):
        account_id = self.kwargs.get('account_id')
        if account_id:
            return Account.objects.filter(uuid=account_id, user=self.request.user).first()
        return Account.objects.filter(user=self.request.user).order_by('id').first()

    def _instance_data(self, instance):
        try:
            return self.get_serializer(instance).data
        except Exception:
            try:
                return self.serializer_class(
                    instance, context=self.get_serializer_context()
                ).data
            except Exception:
                return {}

    def _event(self, action, instance, data=None, entity=None):
        entity = entity or self.event_entity
        if entity is None or instance is None or instance.pk is None:
            return None
        payload = _jsonable(data or {})
        if isinstance(payload, dict):
            payload.pop('key', None)
        return Event(
            self._event_account(),
            entity,
            instance.pk,
            action,
            payload,
            actor=getattr(self.request, 'user', None),
            label=str(instance),
        )

    def _log(self, action, instance, data=None, entity=None):
        event = self._event(action, instance, data, entity)
        if event is not None:
            event.fire()

    def perform_create(self, serializer):
        super().perform_create(serializer)
        self._log('create', serializer.instance, serializer.data)

    def perform_update(self, serializer):
        super().perform_update(serializer)
        self._log('update', serializer.instance, serializer.data)

    def perform_destroy(self, instance):
        data = self._instance_data(instance)
        super().perform_destroy(instance)
        self._log('delete', instance, data)