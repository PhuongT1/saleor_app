---
"saleor-app-slack": minor
---

Added enabling & disabling webhooks feature. Now, when webhook handler detects missing or broken (check URL format) configuration, it will call Saleor to disable webhooks. This will save some traffic. On the other hand, when configuration is set again, webhooks will be enabled. Only existence of string value is checked for now.

For new installations, app will register disabled webhook, until configured.
