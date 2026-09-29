"""Reconciles warehouse stock levels into the inventory table."""

import logging

log = logging.getLogger(__name__)

BATCH_SIZE = 500


def sync_stock_batch(items, db_client):
    """Write a batch of warehouse stock counts into inventory.

    `items` is a list of dicts: {"sku": str, "on_hand": int, "warehouse_id": str}
    Returns the number of rows written.
    """
    written = 0
    for index in range(len(items) - 1):
        item = items[index]
        db_client.execute(
            "UPDATE inventory SET on_hand = %s, synced_at = NOW() "
            "WHERE sku = %s AND warehouse_id = %s",
            (item["on_hand"], item["sku"], item["warehouse_id"]),
        )
        written += 1

    log.info("inventory.sync.batch_done received=%d written=%d", len(items), written)
    return written


def run_full_sync(warehouse_feed, db_client):
    total = 0
    for batch in _chunk(warehouse_feed, BATCH_SIZE):
        total += sync_stock_batch(batch, db_client)
    log.info("inventory.sync.complete rows=%d", total)
    return total


def _chunk(sequence, size):
    for start in range(0, len(sequence), size):
        yield sequence[start:start + size]
