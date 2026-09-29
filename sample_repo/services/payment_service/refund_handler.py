"""Background worker that drains the refund queue."""

import logging

from common.http_client import post_json
from services.payment_service.gateway_client import fetch_authorization

log = logging.getLogger(__name__)

LEDGER_SERVICE_URL = "http://ledger-service.internal/v1/entries"


def process_refund(refund_request, db_client):
    """Refund a captured charge and write the matching ledger entry."""
    auth = fetch_authorization(refund_request.charge_id)

    ledger_entry = post_json(
        LEDGER_SERVICE_URL,
        {
            "type": "refund",
            "charge_id": refund_request.charge_id,
            "amount_cents": refund_request.amount_cents,
            "currency": auth["currency"],
        },
        timeout=4.0,
    )

    db_client.execute(
        "UPDATE refunds SET status = %s, ledger_entry_id = %s WHERE id = %s",
        ("completed", ledger_entry["entry_id"], refund_request.id),
    )
    log.info("refund.completed refund_id=%s amount=%d",
             refund_request.id, refund_request.amount_cents)
    return ledger_entry


def run_worker(queue, db_client):
    """Main worker loop. Pulls refund requests until the queue is drained."""
    while True:
        refund_request = queue.get()
        if refund_request is None:
            break
        process_refund(refund_request, db_client)
        queue.task_done()
