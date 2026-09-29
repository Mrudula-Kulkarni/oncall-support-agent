"""In-process cart cache sitting in front of the carts table."""

import json
import logging
import time

log = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 900


class CartCache:
    """Caches hydrated carts so checkout page loads avoid a round trip to Postgres."""

    def __init__(self, db_client):
        self.db = db_client
        self._entries = {}

    def get_cart(self, cart_id):
        entry = self._entries.get(cart_id)
        if entry is not None:
            return entry["cart"]

        row = self.db.fetch_one(
            "SELECT id, customer_id, currency, payload FROM carts WHERE id = %s",
            (cart_id,),
        )
        if row is None:
            return None

        cart = json.loads(row[3])
        self._entries[cart_id] = {"cart": cart, "stored_at": time.time()}
        log.debug("cart_cache.store cart_id=%s size=%d", cart_id, len(self._entries))
        return cart

    def put_cart(self, cart_id, cart):
        self._entries[cart_id] = {"cart": cart, "stored_at": time.time()}

    def invalidate(self, cart_id):
        self._entries.pop(cart_id, None)

    def stats(self):
        return {"entries": len(self._entries)}
