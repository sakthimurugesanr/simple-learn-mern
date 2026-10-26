# Adapt to another domain

1. Sign in as admin. Open Dashboard → Categories & fields → New category. Create the new domain; Dresses and Electronics are already seeded for demonstration.
2. Add stable keys, labels and types. Electronics examples: `brand` (required text), `warranty` (number, unit months), `wireless` (boolean), `connectivity` (select: Bluetooth, USB, Wi-Fi).
3. Mark useful fields `filterable`. Save. The product editor renders the same definitions and the API validates them using the shared runtime schema.
4. Create a product in that category, set prices in paise, upload photos, and add SKU variants with arbitrary combinations such as `storage=128GB, color=Black`.
5. Publish and curate the product into a collection. Its category-specific filters and detail attributes follow the configured data.

Definition changes that invalidate existing products are blocked. Add fields as optional, populate products, then mark required. Key renaming/removal needs a reviewed data migration for populated catalogs; display label changes are safe. Parent definitions are not automatically inherited. Fields marked `showOnCard` render their configured values and units on product cards. The category tree exists; a full nested mega-menu remains outstanding.
