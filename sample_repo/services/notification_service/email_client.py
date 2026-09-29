"""Sends transactional email through the ESP."""

import logging
import os

from common.http_client import post_json, with_retries

log = logging.getLogger(__name__)

ESP_BASE_URL = os.environ.get("ESP_BASE_URL", "https://api.esp.example")


@with_retries(attempts=3, backoff_seconds=0.3)
def send_email(to_address, template_id, variables):
    response = post_json(
        f"{ESP_BASE_URL}/v1/messages",
        {"to": to_address, "template": template_id, "variables": variables},
        timeout=6.0,
        headers={"Authorization": f"Bearer {os.environ['ESP_API_KEY']}"},
    )
    log.info("notification.email.sent template=%s provider_ref=%s",
             template_id, response.get("message_id"))
    return response["message_id"]


def render_preview(template_id, variables, template_repo):
    template = template_repo.get(template_id)
    if template is None:
        raise ValueError(f"unknown template: {template_id}")
    return template.render(**variables)
