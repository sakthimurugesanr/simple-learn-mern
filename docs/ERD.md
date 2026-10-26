# Entity relationships

```mermaid
erDiagram
  User ||--o| Profile : has
  User ||--o{ Address : owns
  User ||--o{ Session : authenticates
  User ||--o{ VerificationToken : verifies
  User ||--o{ UserPermission : overrides
  Permission ||--o{ UserPermission : defines
  Permission ||--o{ RolePermission : defaults
  User ||--o{ Product : uploads
  User ||--o{ AuditLog : performs
  User ||--o| DashboardLayout : customizes
  Category o|--o{ Category : parent
  Category ||--o{ AttributeDefinition : configures
  Category ||--o{ Product : contains
  Product ||--o{ ProductVariant : has
  Product ||--o{ ProductImage : illustrates
  Product ||--o{ CollectionProduct : featured
  Collection ||--o{ CollectionProduct : curates
  User ||--o| Wishlist : owns
  Wishlist ||--o{ WishlistItem : saves
  Product ||--o{ WishlistItem : saved
  User ||--o| Cart : owns
  Cart ||--o{ CartItem : contains
  ProductVariant ||--o{ CartItem : selected
  User ||--o{ Order : places
  Order ||--|{ OrderItem : snapshots
  ProductVariant ||--o{ OrderItem : referenced
  Order ||--|{ OrderStatusHistory : records
```

Product attributes, variant combinations, address snapshots, audit diffs and layouts use JSONB. Product attributes use a GIN index; names have a trigram index. Indexes support owner/date, status/date and payment/date order queries. Integrity checks enforce nonnegative stock and money. Audit UPDATE/DELETE is rejected by a database trigger.

Roles are a PostgreSQL enum with RolePermission defaults and per-user overrides. Historical commerce references use restricted deletes. Products are soft deleted; variants have an active flag; order items retain name, SKU, price, attributes and uploader/category snapshots.
