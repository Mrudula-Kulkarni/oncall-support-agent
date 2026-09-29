"""Session token validation with an in-process cache in front of Redis."""

import logging
import time

log = logging.getLogger(__name__)

TOKEN_TTL_SECONDS = 1800
SWEEP_INTERVAL_SECONDS = 60

_token_cache = {}


def validate_token(token, redis_client):
    """Return the claims for a token, refreshing the cache entry when it has expired.

    Called on every authenticated request from all API workers.
    """
    entry = _token_cache.get(token)

    if entry is not None and _is_expired(entry):
        del _token_cache[token]
        entry = None

    if entry is None:
        claims = redis_client.hgetall(f"session:{token}")
        if not claims:
            return None
        entry = {"claims": claims, "cached_at": time.time()}
        _token_cache[token] = entry

    return entry["claims"]


def revoke_token(token, redis_client):
    redis_client.delete(f"session:{token}")
    _token_cache.pop(token, None)
    log.info("auth.token.revoked token_prefix=%s", token[:8])


def sweep_expired():
    """Periodic background sweep that drops stale cache entries."""
    dropped = 0
    for token in list(_token_cache.keys()):
        entry = _token_cache.get(token)
        if entry is not None and _is_expired(entry):
            del _token_cache[token]
            dropped += 1
    log.debug("auth.cache.sweep dropped=%d remaining=%d", dropped, len(_token_cache))
    return dropped


def _is_expired(entry):
    return (time.time() - entry["cached_at"]) > TOKEN_TTL_SECONDS
