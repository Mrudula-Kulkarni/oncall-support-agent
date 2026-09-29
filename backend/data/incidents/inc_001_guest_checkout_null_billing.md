---
incident_id: INC-2025-1142
title: Guest checkout crashed when no billing profile was saved
date: 2025-11-12
service: checkout-service
category: error_rate_spike
resolved_in_minutes: 47
---

**Symptom:** 500s on POST /v1/checkout/session climbed to 28% of traffic within minutes of a
release. Stack traces showed `AttributeError: 'NoneType' object has no attribute` while
assembling the billing section of the payment request.

**Root cause:** A release let customers check out without a saved billing profile, but the
payload builder still dereferenced `customer.billing_address` unconditionally. For guest
customers that attribute is `None`, so every guest checkout raised.

**Fix:** Guarded the dereference — return an empty billing block when the address is absent,
and let the payment service apply its own address-optional validation. Shipped as a hotfix
inside the hour.

**Prevention:** Added a contract test that runs the checkout happy path with a customer
fixture whose optional relations are all `None`.
