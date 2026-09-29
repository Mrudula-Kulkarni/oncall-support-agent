"""Holds stock for in-flight checkouts by calling the stock-ledger service."""

import logging

from common.http_client import post_json

log = logging.getLogger(__name__)

STOCK_LEDGER_URL = "http://stock-ledger.internal/v3/reservations"
RESERVATION_TTL_SECONDS = 600


def reserve_items(cart_id, line_items, db_client):
    """Place a hold on stock for every line item in a cart."""
    response = post_json(
        STOCK_LEDGER_URL,
        {
            "cart_id": cart_id,
            "ttl_seconds": RESERVATION_TTL_SECONDS,
            "items": [
                {"sku": item["sku"], "quantity": item["quantity"]}
                for item in line_items
            ],
        },
        timeout=5.0,
    )

    reservation_id = response["reservation_id"]
    db_client.execute(
        "INSERT INTO reservations (id, cart_id, expires_at) "
        "VALUES (%s, %s, NOW() + INTERVAL '%s seconds')",
        (reservation_id, cart_id, RESERVATION_TTL_SECONDS),
    )
    log.info("inventory.reservation.created cart_id=%s reservation_id=%s",
             cart_id, reservation_id)
    return reservation_id


def release_reservation(reservation_id, db_client):
    post_json(f"{STOCK_LEDGER_URL}/{reservation_id}/release", {}, timeout=5.0)
    db_client.execute("DELETE FROM reservations WHERE id = %s", (reservation_id,))
