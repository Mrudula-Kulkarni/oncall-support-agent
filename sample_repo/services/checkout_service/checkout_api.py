"""HTTP surface for the checkout flow."""

import logging

from flask import Blueprint, jsonify, request

from services.checkout_service.payment_processor import process_payment

log = logging.getLogger(__name__)

bp = Blueprint("checkout", __name__, url_prefix="/v1/checkout")


@bp.route("/session", methods=["POST"])
def create_session(cart_repo=None, customer_repo=None):
    body = request.get_json(silent=True) or {}
    cart_id = body.get("cart_id")
    if not cart_id:
        return jsonify({"error": "cart_id is required"}), 400

    cart = cart_repo.get(cart_id)
    if cart is None:
        return jsonify({"error": "cart not found"}), 404

    customer = customer_repo.get(cart.customer_id)
    result = process_payment(cart, customer)
    return jsonify({"checkout_id": result["charge_id"], "status": result["status"]}), 201


@bp.route("/session/<checkout_id>", methods=["GET"])
def get_session(checkout_id, checkout_repo=None):
    session = checkout_repo.get(checkout_id)
    if session is None:
        return jsonify({"error": "not found"}), 404
    return jsonify(session.to_dict()), 200
