import { ProductData } from '@/types/product';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  category: 'title' | 'sku' | 'category' | 'images' | 'pricing' | 'moq' | 'specifications' | 'logistics' | 'review_notes' | 'company' | 'certifications' | 'clients' | 'contact' | 'descriptions';
}

export interface ValidationWarning {
  field: string;
  message: string;
}

const SKU_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)+$/;

export const validateProduct = (data: ProductData): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // === TITLE ===
  if (!data.product_title || data.product_title.trim() === '') {
    errors.push({ field: 'product_title', message: 'Product title is required', category: 'title' });
  } else {
    const words = data.product_title.trim().split(' ');
    if (words.length < 2) errors.push({ field: 'product_title', message: 'Title must include at least Brand + Model', category: 'title' });
    if (words[0] && !/^[A-Z]/.test(words[0])) warnings.push({ field: 'product_title', message: 'Brand name should start with a capital letter' });
  }

  // === SKU ===
  if (!data.sku || data.sku.trim() === '') {
    errors.push({ field: 'sku', message: 'SKU is required', category: 'sku' });
  } else if (!SKU_PATTERN.test(data.sku)) {
    warnings.push({ field: 'sku', message: 'SKU should be lowercase, hyphenated (e.g., jimmy-h8-flex)' });
  }

  // === CATEGORY ===
  if (!data.category || data.category.trim() === '') {
    errors.push({ field: 'category', message: 'Category is required', category: 'category' });
  }

  // === IMAGES ===
  if (!data.images || data.images.length === 0) {
    warnings.push({ field: 'images', message: 'No product images - product will be imported as draft' });
  } else if (data.images.length < 3) {
    warnings.push({ field: 'images', message: `Only ${data.images.length} image(s) - recommend at least 3` });
  }

  // === PRICING ===
  const hasSomePricing = 
    (data.pricing.cost_price !== null && data.pricing.cost_price > 0) ||
    (data.pricing.supply_price !== null && data.pricing.supply_price > 0) ||
    (data.pricing.wholesale_price !== null && data.pricing.wholesale_price > 0) ||
    (data.pricing.retail_price !== null && data.pricing.retail_price > 0);
  if (!hasSomePricing) {
    errors.push({ field: 'pricing', message: 'At least one pricing field must be set', category: 'pricing' });
  } else {
    if (!data.pricing.cost_price || data.pricing.cost_price <= 0) warnings.push({ field: 'pricing.cost_price', message: 'Cost price missing - using estimated value' });
    if (!data.pricing.supply_price || data.pricing.supply_price <= 0) warnings.push({ field: 'pricing.supply_price', message: 'Supply price missing - using estimated value' });
    if (!data.pricing.wholesale_price || data.pricing.wholesale_price <= 0) warnings.push({ field: 'pricing.wholesale_price', message: 'Wholesale price missing - using estimated value' });
    if (!data.pricing.retail_price || data.pricing.retail_price <= 0) warnings.push({ field: 'pricing.retail_price', message: 'Retail price missing - using estimated value' });
  }

  // Pricing hierarchy
  if (data.pricing.cost_price && data.pricing.supply_price && data.pricing.wholesale_price && data.pricing.retail_price) {
    if (data.pricing.cost_price >= data.pricing.supply_price) warnings.push({ field: 'pricing', message: 'Cost price should be less than supply price' });
    if (data.pricing.supply_price >= data.pricing.wholesale_price) warnings.push({ field: 'pricing', message: 'Supply price should be less than wholesale price' });
    if (data.pricing.wholesale_price >= data.pricing.retail_price) warnings.push({ field: 'pricing', message: 'Wholesale price should be less than retail price' });
  }

  // === MOQ ===
  if (data.supplier_trade.moq === null || data.supplier_trade.moq <= 0) warnings.push({ field: 'supplier_trade.moq', message: 'Base MOQ missing - using default' });
  if (data.supplier_trade.moq_exclusive_importer === null || data.supplier_trade.moq_exclusive_importer <= 0) warnings.push({ field: 'supplier_trade.moq_exclusive_importer', message: 'MOQ Exclusive Importer using default' });
  if (data.supplier_trade.moq_distributor === null || data.supplier_trade.moq_distributor <= 0) warnings.push({ field: 'supplier_trade.moq_distributor', message: 'MOQ Distributor using default' });
  if (data.supplier_trade.moq_retailer === null || data.supplier_trade.moq_retailer <= 0) warnings.push({ field: 'supplier_trade.moq_retailer', message: 'MOQ Retailer using default' });

  // === SUPPLIER ===
  if (!data.supplier_trade.supplier_name) warnings.push({ field: 'supplier_trade.supplier_name', message: 'Supplier name should be specified' });
  if (!data.supplier_trade.hs_code) warnings.push({ field: 'supplier_trade.hs_code', message: 'HS Code should be specified' });

  // === COMPANY INFO ===
  if (!data.company_info?.company_name) warnings.push({ field: 'company_info.company_name', message: 'Company name should be specified' });
  if (!data.company_info?.country_of_origin) warnings.push({ field: 'company_info.country_of_origin', message: 'Country of origin should be specified' });
  if (!data.company_info?.year_established) warnings.push({ field: 'company_info.year_established', message: 'Year established should be specified' });
  if (!data.company_info?.ownership_partnerships) warnings.push({ field: 'company_info.ownership_partnerships', message: 'Ownership/partnerships should be specified' });
  if (!data.company_info?.daily_production) warnings.push({ field: 'company_info.daily_production', message: 'Daily production should be specified' });
  if (!data.company_info?.annual_output) warnings.push({ field: 'company_info.annual_output', message: 'Annual output should be specified' });
  if (!data.company_info?.lines_installed) warnings.push({ field: 'company_info.lines_installed', message: 'Lines installed should be specified' });
  if (!data.company_info?.major_products) warnings.push({ field: 'company_info.major_products', message: 'Major products should be specified' });

  // === CERTIFICATIONS & STANDARDS ===
  if (!data.certifications_standards?.safety_certificates) warnings.push({ field: 'certifications_standards.safety_certificates', message: 'Safety certificates should be specified' });
  if (!data.certifications_standards?.additional_certifications) warnings.push({ field: 'certifications_standards.additional_certifications', message: 'Additional certifications should be specified' });
  if (!data.certifications_standards?.export_licenses) warnings.push({ field: 'certifications_standards.export_licenses', message: 'Export licenses should be specified' });
  if (!data.certifications_standards?.traceability_systems) warnings.push({ field: 'certifications_standards.traceability_systems', message: 'Traceability systems should be specified' });

  // === CLIENTS & MARKETS ===
  if (!data.clients_markets?.key_clients) warnings.push({ field: 'clients_markets.key_clients', message: 'Key clients should be specified' });
  if (!data.clients_markets?.export_markets) warnings.push({ field: 'clients_markets.export_markets', message: 'Export markets should be specified' });
  if (!data.clients_markets?.government_supply_track_record) warnings.push({ field: 'clients_markets.government_supply_track_record', message: 'Government supply track record should be specified' });

  // === CONTACT & LOGISTICS ===
  if (!data.contact_logistics?.factory_address) warnings.push({ field: 'contact_logistics.factory_address', message: 'Factory address should be specified' });
  if (!data.contact_logistics?.nearest_port_of_loading) warnings.push({ field: 'contact_logistics.nearest_port_of_loading', message: 'Nearest port should be specified' });
  if (!data.contact_logistics?.export_documentation) warnings.push({ field: 'contact_logistics.export_documentation', message: 'Export documentation should be specified' });
  if (!data.contact_logistics?.email) warnings.push({ field: 'contact_logistics.email', message: 'Contact email should be specified' });
  if (!data.contact_logistics?.contact_number) warnings.push({ field: 'contact_logistics.contact_number', message: 'Contact number should be specified' });

  // === LOGISTICS ===
  if (!data.logistics?.manufacturing_time) warnings.push({ field: 'logistics.manufacturing_time', message: 'Manufacturing time should be specified' });
  if (!data.logistics?.transit_time) warnings.push({ field: 'logistics.transit_time', message: 'Transit time should be specified' });
  if (!data.logistics?.packaging_details) warnings.push({ field: 'logistics.packaging_details', message: 'Packaging details should be specified' });
  if (!data.logistics?.payment_method) warnings.push({ field: 'logistics.payment_method', message: 'Payment method should be specified' });

  // === SPECIFICATIONS ===
  if (!data.sales_content?.key_specifications || data.sales_content.key_specifications.length === 0) {
    errors.push({ field: 'sales_content.key_specifications', message: 'At least one key specification is required', category: 'specifications' });
  }
  if (!data.sales_content?.applications || data.sales_content.applications.length === 0) {
    warnings.push({ field: 'sales_content.applications', message: 'Applications should be specified' });
  }

  // === DESCRIPTIONS ===
  if (!data.descriptions?.product_overview) warnings.push({ field: 'descriptions.product_overview', message: 'Product overview should be provided' });
  if (!data.descriptions?.product_identity) warnings.push({ field: 'descriptions.product_identity', message: 'Product identity should be provided' });
  if (!data.descriptions?.key_highlights || data.descriptions.key_highlights.length === 0) warnings.push({ field: 'descriptions.key_highlights', message: 'Key highlights should be included' });
  if (!data.descriptions?.trust_assurance) warnings.push({ field: 'descriptions.trust_assurance', message: 'Trust & assurance should be provided' });

  // === REVIEW NOTES ===
  if (!data.review_notes || data.review_notes.length === 0) {
    warnings.push({ field: 'review_notes', message: 'No review notes found' });
  }

  return { isValid: errors.length === 0, errors, warnings };
};

const isValidUrl = (url: string): boolean => {
  try { new URL(url); return true; } catch { return false; }
};

export const getValidationSummary = (result: ValidationResult): string => {
  if (result.isValid && result.warnings.length === 0) return 'All validation checks passed';
  if (result.isValid) return `Ready to import with ${result.warnings.length} warning(s)`;
  return `${result.errors.length} error(s) must be fixed before import`;
};

export const groupErrorsByCategory = (errors: ValidationError[]): Record<string, ValidationError[]> => {
  return errors.reduce((acc, error) => {
    if (!acc[error.category]) acc[error.category] = [];
    acc[error.category].push(error);
    return acc;
  }, {} as Record<string, ValidationError[]>);
};
