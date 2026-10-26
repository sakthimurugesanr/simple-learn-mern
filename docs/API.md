# API reference

Base `/api/v1`. Responses use `{data,meta?}`; failures use `{error:{code,message,issues?,requestId}}`. Private requests need `Authorization: Bearer <accessToken>`. Mutations require the configured `WEB_URL` Origin. All money is integer paise.

| Method / path                                                   | Access and behavior                                                             |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| POST `/auth/register`                                           | Public: name, email, strong password, turnstileToken?; queues verification      |
| POST `/auth/login`                                              | Public: email/password; returns accessToken/user, sets HTTP-only refresh cookie |
| POST `/auth/refresh`                                            | Refresh cookie; rotates session; reuse ends token family                        |
| GET `/auth/me`, `/auth/sessions`                                | Authenticated identity / active session metadata                                |
| POST `/auth/logout`, `/auth/logout-all`                         | Revoke current / all sessions                                                   |
| POST `/auth/forgot-password`                                    | email, turnstileToken?; generic response                                        |
| POST `/auth/reset-password`                                     | token, password; single use; revokes sessions                                   |
| POST `/auth/verify-email`                                       | token; single use                                                               |
| POST `/auth/change-password`                                    | Authenticated: current, password; revokes sessions                              |
| GET `/catalog/products`                                         | Public published catalog; query below                                           |
| GET `/catalog/products/:slug`                                   | Public product, category definitions, images, active variants                   |
| GET `/catalog/categories`, `/catalog/home`, `/catalog/settings` | Public catalog configuration                                                    |
| GET `/catalog/manage/products`                                  | product:read; own uploads unless cross-owner access                             |
| POST `/catalog/manage/products`                                 | product:create; shared productSchema                                            |
| PUT `/catalog/manage/products/:id`                              | product:update + ownership or product:update:any                                |
| DELETE `/catalog/manage/products/:id`                           | product:delete + ownership or product:delete:any; soft archive                  |
| POST `/catalog/manage/categories`                               | Admin: name, slug, parentId?, image?                                            |
| PUT `/catalog/manage/categories/:id/attributes`                 | Admin: definition array; validates existing products                            |
| POST `/uploads`                                                 | product:create; multipart image, max 8MB; returns WebP URLs                     |
| GET/PATCH `/account/profile`                                    | Own profile; name, phone?                                                       |
| GET/POST `/account/addresses`                                   | Own list / validated Indian address                                             |
| DELETE `/account/addresses/:id`                                 | Owned address only                                                              |
| GET `/account/wishlist`                                         | Owned saved products                                                            |
| PUT/DELETE `/account/wishlist/:productId`                       | Save/remove owned wishlist entry                                                |
| GET/PUT `/account/cart`                                         | Owned cart; replace with variantId/quantity array                               |
| POST `/orders`                                                  | Authenticated, bot checked; transaction below                                   |
| GET `/orders`                                                   | Own orders, page, 20 per page                                                   |
| GET `/orders/:id`                                               | Owned order with snapshots and history                                          |
| POST `/orders/:id/whatsapp`                                     | Owned WhatsApp order; regenerate encoded link                                   |
| GET `/orders/manage`                                            | order:read; page, status filters                                                |
| PATCH `/orders/:id/status`                                      | order:update; status, note?; transition graph, one-time restock                 |

Catalog query: `page` (1+), `limit` (1–100), `q`, `category` slug, `sort` (`newest`, `name`, `price-asc`, `price-desc`), `min`/`max` paise, `collection` slug, and URL-encoded `attributes` JSON object of scalar equality filters. Metadata is `{total,page,limit}`. Product write contracts are defined by `productSchema` in the shared package; one image and one variant are required. Removed variants become inactive to preserve historical references. Existing SKUs cannot move between products.

Checkout example (turnstileToken also required in production):

```json
{
  "address": {
    "name": "Customer Name",
    "phone": "9876543210",
    "line1": "123 Example Street",
    "line2": "",
    "city": "Chennai",
    "state": "Tamil Nadu",
    "pincode": "600001"
  },
  "delivery": "standard",
  "paymentMethod": "COD",
  "items": [{ "variantId": "30000000-0000-4000-8000-000000000001", "quantity": 1 }],
  "idempotencyKey": "f578fc26-4d80-4bd7-83ce-4a25b074e527",
  "coupon": "HELLO10"
}
```

The server locks variant rows in stable ID order, reads actual prices, decrements available stock, validates discounts and creates the order in the same transaction. Successful retries with the same key return the owned order. Another user's key is rejected. COD/WhatsApp do not imply payment settlement. WhatsApp creation returns provider instructions and an encoded deep link; the API does not invent a sent-message receipt.

Allowed order graph: PLACED → CONFIRMED/CANCELLED; CONFIRMED → SHIPPED/CANCELLED; SHIPPED → DELIVERED; DELIVERED → RETURNED. Cancelling/returning restores stock once under an order lock. Refunds require a manual business process.

All `/admin/*` routes require ADMIN regardless of overrides:

| Method / path                                       | Behavior                                                                                                           |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| GET `/admin/analytics?from=<ISO>&to=<ISO>`          | SQL metrics/comparison/series/products/categories/supervisors/payment/status/cities/stock; 30s cache, max 366 days |
| GET `/admin/users?q=&role=&page=1`                  | Safe public fields and overrides                                                                                   |
| GET `/admin/users/:id`                              | Profile, 50 recent uploads, 25 orders, 100 audit entries                                                           |
| PATCH `/admin/users/:id`                            | active?, role?; no self change; revoke sessions                                                                    |
| PUT `/admin/users/:id/permissions`                  | `{permission,granted}[]`; no self change                                                                           |
| GET `/admin/audit?page=1&actorId=<uuid>`            | Immutable records, 50/page                                                                                         |
| GET/PUT `/admin/layout`                             | Current admin’s saved grid                                                                                         |
| PUT `/admin/settings`                               | Allowlisted brand, shipping, tax and maintenance                                                                   |
| GET/POST `/admin/banners`, PUT `/admin/banners/:id` | Read/create/update banners                                                                                         |
| GET/POST `/admin/offers`, PUT `/admin/offers/:id`   | Read/create/update offers                                                                                          |
| GET `/admin/collections`                            | Membership                                                                                                         |
| PUT `/admin/collections/:slug`                      | name, productIds; replace membership                                                                               |
| GET `/admin/export/orders`                          | Formula-neutralized CSV, cap 10,000                                                                                |

`/health` is process liveness. `/ready` checks PostgreSQL and Redis. Shared zod schemas are the validation source. Interactive auto-generated OpenAPI is outstanding.

## Newsletter and feedback

POST `/community/newsletter` accepts email, consent=true, optional website honeypot and turnstileToken; queues a double-opt-in email. POST `/community/newsletter/confirm` atomically consumes its token. POST `/community/newsletter/unsubscribe` removes a subscription using its unguessable token. Admin GET/POST `/admin/testimonials` and PUT `/admin/testimonials/:id` manage consented customer feedback; only active records appear in `/catalog/home`. No invented customer reviews are seeded.
