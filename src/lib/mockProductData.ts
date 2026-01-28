import { ProductData } from '@/types/product';
import { formatProductTitle, generateSkuFromTitle, parseProductName } from './utils/titleFormatter';

// Default specifications used for title inference when needed
const DEFAULT_SPECIFICATIONS = [
  '550W Motor Power',
  '60min Runtime',
  'HEPA Filtration',
  'LED Display',
  '0.5L Dust Capacity',
  'Lightweight Design (2.5kg)',
];

export const generateMockProductData = (productName: string): ProductData => {
  // Default category for title inference
  const category = 'Home Appliances > Vacuum Cleaners';
  
  // Format the title using the strict Brand + Model + Key Spec pattern
  const formattedTitle = formatProductTitle(
    productName || 'Sample Product',
    DEFAULT_SPECIFICATIONS,
    category
  );
  
  // Generate SKU from the formatted title
  const sku = generateSkuFromTitle(formattedTitle);
  
  // Parse for brand name (used in supplier name)
  const { brand } = parseProductName(productName);

  return {
    product_title: formattedTitle,
    sku: sku || 'sample-product',
    product_type: 'simple',
    category: 'Home Appliances > Vacuum Cleaners',
    images: [
      'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&fm=jpg',
      'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&fm=jpg',
      'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=800&fm=jpg',
    ],
    pricing: {
      cost_price: 85.00,
      supply_price: 120.00,
      wholesale_price: 165.00,
      retail_price: 249.99,
    },
    supplier_trade: {
      supplier_name: `${brand} International Ltd.`,
      hs_code: '8508.11.00',
      moq: 100,
      moq_exclusive_importer: 500,
      moq_distributor: 200,
      moq_retailer: 50,
    },
    logistics: {
      import_certification_required: true,
      import_certification_details: 'CE, FCC, RoHS certification required for import',
      manufacturing_time: '15-20 business days',
    },
    sales_content: {
      key_specifications: [
        '550W Motor Power',
        '60min Runtime',
        'HEPA Filtration',
        'LED Display',
        '0.5L Dust Capacity',
        'Lightweight Design (2.5kg)',
      ],
      package_options: [
        'Standard Package: Main unit + 2 brush heads',
        'Premium Package: Main unit + 4 brush heads + wall mount',
      ],
      applications: [
        'Home cleaning',
        'Office environments',
        'Car interiors',
        'Pet hair removal',
      ],
      certifications: [
        { name: 'CE', details: 'European Conformity' },
        { name: 'FCC', details: 'Federal Communications Commission' },
        { name: 'RoHS', details: 'Restriction of Hazardous Substances' },
      ],
    },
    descriptions: {
      product_overview: `The ${formattedTitle} represents the next generation of cordless cleaning technology. Engineered for modern homes and busy professionals, this powerful yet lightweight vacuum delivers exceptional suction performance with the convenience of cord-free operation. The advanced brushless motor ensures quiet, efficient cleaning across all floor types.`,
      key_highlights: [
        'Powerful 550W brushless motor delivers consistent suction',
        'Up to 60 minutes of runtime on a single charge',
        'Advanced HEPA filtration captures 99.97% of particles',
        'Lightweight 2.5kg design reduces fatigue during extended use',
        'Smart LED display shows battery level and cleaning mode',
        'Converts to handheld for versatile cleaning tasks',
      ],
    },
    review_notes: [
      {
        type: 'source',
        message: `Data sources: Product name input "${productName}". No PDF provided. Specifications are mock data for demonstration.`,
      },
      {
        type: 'source',
        message: 'Image sources: Unsplash placeholder images (not official product images)',
      },
      {
        type: 'estimate',
        field: 'pricing.cost_price',
        message: 'Cost price estimated at $85 USD based on similar cordless vacuum market analysis',
      },
      {
        type: 'estimate',
        field: 'pricing.retail_price',
        message: 'Retail price estimated at $249.99 USD based on competitor pricing for similar specifications',
      },
      {
        type: 'assumption',
        field: 'supplier_trade.moq',
        message: 'MOQ values assumed: 100 units base, 500 for exclusive importers, 200 for distributors, 50 for retailers',
      },
      {
        type: 'assumption',
        field: 'logistics.manufacturing_time',
        message: 'Manufacturing time assumed at 15-20 business days based on typical Chinese manufacturer lead times',
      },
      {
        type: 'missing',
        field: 'images',
        message: 'REQUIRES ACTION: Official product images not available - replace placeholder images with manufacturer images before publishing',
      },
      {
        type: 'missing',
        field: 'supplier_trade.hs_code',
        message: 'HS Code 8508.11.00 is placeholder - verify with supplier for accurate customs classification',
      },
    ],
  };
};
