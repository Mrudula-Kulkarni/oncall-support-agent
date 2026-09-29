"""Persists delivery status for every notification we send."""

import logging

from common.db_client import DBClient

log = logging.getLogger(__name__)

NOTIFICATION_DSN = "postgresql://notifications@notif-db.internal:5432/notifications"

_db = DBClient(
    NOTIFICATION_DSN,
    connect_timeout=5.0,
    statement_timeout_ms=50,
    pool_size=20,
)


def record_notification_status(notification_id, channel, status, provider_ref=None):
    """Write the terminal delivery status for a notification."""
    _db.execute(
        "INSERT INTO notification_status (notification_id, channel, status, provider_ref, "
        "recorded_at) VALUES (%s, %s, %s, %s, NOW()) "
        "ON CONFLICT (notification_id) DO UPDATE SET status = EXCLUDED.status",
        (notification_id, channel, status, provider_ref),
    )
    log.info("notification.status.recorded id=%s channel=%s status=%s",
             notification_id, channel, status)


def get_status(notification_id):
    row = _db.fetch_one(
        "SELECT status, recorded_at FROM notification_status WHERE notification_id = %s",
        (notification_id,),
    )
    if row is None:
        return None
    return {"status": row[0], "recorded_at": row[1]}
