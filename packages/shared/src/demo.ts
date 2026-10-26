import type { Product, AttributeDefinition } from './index';
export const dressCategoryId = '10000000-0000-4000-8000-000000000001';
export const electronicsCategoryId = '10000000-0000-4000-8000-000000000002';
export const dressDefinitions: AttributeDefinition[] = [
  {
    key: 'fabric',
    label: 'Fabric',
    type: 'select',
    options: ['Cotton', 'Linen', 'Silk', 'Viscose'],
    required: true,
    filterable: true,
    showOnCard: true,
    sortOrder: 0,
  },
  ...[
    { key: 'fit', options: ['Relaxed', 'Regular', 'Fitted'] },
    { key: 'occasion', options: ['Everyday', 'Work', 'Celebration'] },
    { key: 'sleeve', options: ['Sleeveless', 'Short', 'Long'] },
    { key: 'neck', options: ['Round', 'V-neck', 'Collared'] },
    { key: 'pattern', options: ['Solid', 'Floral', 'Striped'] },
  ].map((d, i) => ({
    ...d,
    label: d.key[0].toUpperCase() + d.key.slice(1),
    type: 'select' as const,
    required: false,
    filterable: true,
    showOnCard: false,
    sortOrder: i + 1,
  })),
  {
    key: 'care',
    label: 'Care instructions',
    type: 'text',
    options: [],
    required: false,
    filterable: false,
    showOnCard: false,
    sortOrder: 8,
  },
  {
    key: 'size',
    label: 'Available sizes',
    type: 'multi-select',
    options: ['XS', 'S', 'M', 'L', 'XL'],
    required: false,
    filterable: false,
    showOnCard: false,
    sortOrder: 9,
  },
  {
    key: 'color',
    label: 'Color',
    type: 'color',
    options: [],
    required: false,
    filterable: true,
    showOnCard: false,
    sortOrder: 10,
  },
];
export const electronicsDefinitions: AttributeDefinition[] = [
  {
    key: 'brand',
    label: 'Brand',
    type: 'text',
    options: [],
    required: true,
    filterable: true,
    showOnCard: true,
    sortOrder: 0,
  },
  {
    key: 'warranty',
    label: 'Warranty',
    type: 'number',
    unit: 'months',
    options: [],
    required: true,
    filterable: true,
    showOnCard: false,
    sortOrder: 1,
  },
  {
    key: 'wireless',
    label: 'Wireless',
    type: 'boolean',
    options: [],
    required: false,
    filterable: true,
    showOnCard: false,
    sortOrder: 2,
  },
];
export const fashionImages = [
  'photo-1515372039744-b8f02a3ae446',
  'photo-1496747611176-843222e1e57c',
  'photo-1539008835657-9e8e9680c956',
  'photo-1595777457583-95e059d581b8',
  'photo-1594633312681-425c7b97ccd1',
  'photo-1483985988355-763728e1935b',
  'photo-1515886657613-9f3515b0c78f',
  'photo-1485968579580-b6d095142e6e',
];
export const imageUrl = (id: string, w = 1000) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=85`;
const names = [
  'The Sunday Linen Dress',
  'Meadow Cotton Midi',
  'The Everyday Wrap',
  'Sienna Pleated Dress',
  'The Olive Edit',
  'Weekend Cotton Co-ord',
  'The City Shirt Dress',
  'Wildflower Maxi',
];
export const demoProducts: Product[] = Array.from({ length: 32 }, (_, i) => ({
  id: `20000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
  name:
    i < 24
      ? `${names[i % 8]}${i >= 8 ? [' · Ivory', ' · Terracotta'][Math.floor(i / 8) - 1] : ''}`
      : [
          'Studio Wireless Headphones',
          'Pocket Bluetooth Speaker',
          'Desk Light',
          'Everyday Power Bank',
          'Travel Charger',
          'Wireless Keyboard',
          'Studio Mouse',
          'Compact Earbuds',
        ][i - 24],
  slug:
    i < 24 ? `${names[i % 8].toLowerCase().replaceAll(' ', '-')}-${i + 1}` : `studio-tech-${i + 1}`,
  description:
    i < 24
      ? 'An effortless silhouette for the days you want to feel most like yourself. Thoughtfully cut from breathable natural fabric, with a beautiful drape and considered details. Designed to be worn on repeat.'
      : 'Considered technology for your everyday. Simple, dependable design with a 12 month manufacturer warranty.',
  price:
    i < 24
      ? [249900, 189900, 279900, 329900, 219900, 299900, 259900, 349900][i % 8]
      : 199900 + (i - 24) * 50000,
  compareAtPrice: i % 3 === 0 ? 399900 : null,
  status: 'PUBLISHED',
  categoryId: i < 24 ? dressCategoryId : electronicsCategoryId,
  category: {
    name: i < 24 ? 'Dresses' : 'Electronics',
    slug: i < 24 ? 'dresses' : 'electronics',
    definitions: i < 24 ? dressDefinitions : electronicsDefinitions,
  },
  attributes:
    i < 24
      ? {
          fabric: ['Linen', 'Cotton', 'Viscose', 'Silk'][i % 4],
          fit: 'Relaxed',
          occasion: 'Everyday',
          pattern: i % 2 ? 'Floral' : 'Solid',
          color: ['#f0e9db', '#3e5145', '#a6684f'][i % 3],
          care: 'Cold gentle wash. Dry in shade.',
          size: ['S', 'M', 'L'],
        }
      : { brand: 'Aurel Studio', warranty: 12, wireless: true },
  images: [
    {
      url: imageUrl(i < 24 ? fashionImages[i % 8] : 'photo-1505740420928-5e560c06d30e'),
      alt: i < 24 ? names[i % 8] : 'Studio technology',
    },
  ],
  variants: Array.from({ length: i < 24 ? 3 : 1 }, (_, j) => ({
    id: `30000000-0000-4000-8000-${String(i * 3 + j + 1).padStart(12, '0')}`,
    sku: `AUR-${i + 1}-${j + 1}`,
    stock: 12 + (i % 15),
    price: null,
    attributes:
      i < 24
        ? ({ size: ['S', 'M', 'L'][j], color: 'Natural' } as Record<string, string>)
        : ({ model: 'Standard' } as Record<string, string>),
  })),
  createdAt: new Date(Date.UTC(2026, 9, 25 - (i % 20))).toISOString(),
}));
