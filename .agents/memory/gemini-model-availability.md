---
name: Gemini model availability
description: Google Gemini model names and access can vary by account and endpoint.
---

Keep the Gemini model configurable through an environment variable and surface
provider errors instead of silently falling back to another model.

**Why:** Model discovery can list models that a specific account cannot use,
while older model aliases may return 404 or quota restrictions at request time.

**How to apply:** Preserve the user's requested model as the default when they
specify one, verify it directly when practical, retry one transient 503, and
document any provider-side availability limitation.