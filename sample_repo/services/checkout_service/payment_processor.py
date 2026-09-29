"""Turns a validated cart into a payment authorization request."""

import logging
import uuid

from common.http_client import post_json

log = logging.getLogger(__name__)

PAYMENT_SERVICE_URL = "http://payment-service.internal/v1/charge"


def build_billing_payload(customer):
    address = customer.billing_address
    return {
        "line1": address.line1,
        "line2": address.line2,
        "city": address.city,
        "postal_code": address.postal_code,
        "country": address.country,
    }


def process_payment(cart, customer, idempotency_key=None):
    """Authorize payment for a cart. Returns the payment service response."""
    idempotency_key = idempotency_key or str(uuid.uuid4())

    payload = {
        "idempotency_key": idempotency_key,
        "customer_id": customer.id,
        "amount_cents": cart.total_cents,
        "currency": cart.currency,
        "billing": build_billing_payload(customer),
        "line_items": [
            {"sku": item.sku, "quantity": item.quantity, "price_cents": item.price_cents}
            for item in cart.items
        ],
    }

    log.info("checkout.payment.start customer_id=%s amount=%d", customer.id, cart.total_cents)
    response = post_json(PAYMENT_SERVICE_URL, payload, timeout=8.0)
    log.info("checkout.payment.authorized customer_id=%s charge_id=%s",
             customer.id, response.get("charge_id"))
    return response


def refund_eligible(order):
    if order.status != "captured":
        return False
    return order.refunded_cents < order.total_cents
