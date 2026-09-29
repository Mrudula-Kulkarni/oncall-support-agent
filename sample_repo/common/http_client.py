"""HTTP helper with a retry decorator available to all services."""

import functools
import logging
import time

import requests

log = logging.getLogger(__name__)

RETRYABLE_STATUS = {429, 502, 503, 504}


def with_retries(attempts=3, backoff_seconds=0.2, retry_on=(requests.Timeout,
                                                            requests.ConnectionError)):
    """Retry a call on transient transport errors with exponential backoff."""

    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            last_error = None
            for attempt in range(attempts):
                try:
                    return fn(*args, **kwargs)
                except retry_on as exc:
                    last_error = exc
                    sleep_for = backoff_seconds * (2 ** attempt)
                    log.warning("http.retry fn=%s attempt=%d/%d sleep=%.2fs",
                                fn.__name__, attempt + 1, attempts, sleep_for)
                    time.sleep(sleep_for)
            raise last_error

        return wrapper

    return decorator


def post_json(url, payload, timeout=5.0, headers=None):
    response = requests.post(url, json=payload, timeout=timeout, headers=headers or {})
    response.raise_for_status()
    return response.json()


def get_json(url, params=None, timeout=5.0, headers=None):
    response = requests.get(url, params=params, timeout=timeout, headers=headers or {})
    response.raise_for_status()
    return response.json()
