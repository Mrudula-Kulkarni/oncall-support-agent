"""Client for the upstream card processor."""

import logging
import os

from common.http_client import get_json, post_json, with_retries

log = logging.getLogger(__name__)

GATEWAY_BASE_URL = os.environ.get("GATEWAY_BASE_URL", "https://api.cardgateway.example")
GATEWAY_TIMEOUT_SECONDS = 6.0


def charge_card(idempotency_key, customer_id, amount_cents, currency, billing):
    """Submit an authorization to the card gateway."""
    payload = {
        "idempotency_key": idempotency_key,
        "customer_ref": customer_id,
        "amount": amount_cents,
        "currency": currency,
        "billing_address": billing,
    }

    log.info("gateway.charge.start customer_id=%s amount=%d", customer_id, amount_cents)
    response = post_json(
        f"{GATEWAY_BASE_URL}/v2/authorizations",
        payload,
        timeout=GATEWAY_TIMEOUT_SECONDS,
        headers=_auth_headers(),
    )
    log.info("gateway.charge.ok customer_id=%s auth_id=%s", customer_id, response["id"])
    return {"charge_id": response["id"], "status": response["status"]}


@with_retries(attempts=3, backoff_seconds=0.25)
def capture_authorization(auth_id, amount_cents):
    """Capture a previously authorized charge."""
    return post_json(
        f"{GATEWAY_BASE_URL}/v2/authorizations/{auth_id}/capture",
        {"amount": amount_cents},
        timeout=GATEWAY_TIMEOUT_SECONDS,
        headers=_auth_headers(),
    )


@with_retries(attempts=3, backoff_seconds=0.25)
def fetch_authorization(auth_id):
    return get_json(
        f"{GATEWAY_BASE_URL}/v2/authorizations/{auth_id}",
        timeout=GATEWAY_TIMEOUT_SECONDS,
        headers=_auth_headers(),
    )


def _auth_headers():
    return {"Authorization": f"Bearer {os.environ['GATEWAY_API_KEY']}"}
