import { ProductData } from '@/types/product';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  category: 'title' | 'sku' | 'category' | 'images' | 'pricing' | 'moq' | 'specifications' | 'logistics' | 'review_notes';
}

export interface ValidationWarning {
  field: string;
  message: string;
}

// SKU format: brand-model (lowercase, hyphenated) - now accepts auto-generated format
const SKU_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)+$/;

export const validateProduct = (data: ProductData): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // === TITLE VALIDATION ===
  if (!data.product_title || data.product_title.trim() === '') {
    errors.push({
      field: 'product_title',
      message: 'Product title is required',
      category: 'title',
    });
  } else {
    const words = data.product_title.trim().split(' ');
    if (words.length < 2) {
      errors.push({
        field: 'product_title',
        message: 'Title must include at least Brand + Model (minimum 2 parts)',
        category: 'title',
      });
    }
    // Check if first word starts with capital (brand)
    if (words[0] && !/^[A-Z]/.test(words[0])) {
      warnings.push({
        field: 'product_title',
        message: 'Brand name should start with a capital letter',
      });
    }
  }

  // === SKU VALIDATION (now lenient - auto-generated is acceptable) ===
  if (!data.sku || data.sku.trim() === '') {
    errors.push({
      field: 'sku',
      message: 'SKU is required',
      category: 'sku',
    });
  } else if (!SKU_PATTERN.test(data.sku)) {
    // Just a warning now - SKU format is preferred but not required
    warnings.push({
      field: 'sku',
      message: 'SKU should be lowercase, hyphenated (e.g., jimmy-h8-flex)',
    });
  }

  // === CATEGORY VALIDATION ===
  if (!data.category || data.category.trim() === '') {
    errors.push({
      field: 'category',
      message: 'Category is required',
      category: 'category',
    });
  }

  // === IMAGES VALIDATION (now warning instead of error) ===
  if (!data.images || data.images.length === 0) {
    warnings.push({
      field: 'images',
      message: 'No product images - product will be imported as draft for manual image addition',
    });
  } else if (data.images.length < 3) {
    warnings.push({
      field: 'images',
      message: `Only ${data.images.length} image(s) found - recommend at least 3 for better presentation`,
    });
  } else {
    // Check for valid URLs
    const invalidUrls = data.images.filter(url => !isValidUrl(url));
    if (invalidUrls.length > 0) {
      warnings.push({
        field: 'images',
        message: `${invalidUrls.length} image(s) may have invalid URLs`,
      });
    }
  }

  // === PRICING VALIDATION (now lenient - prefilled values are acceptable) ===
  // Only error if ALL pricing is missing/zero
  const hasSomePricing = 
    (data.pricing.cost_price !== null && data.pricing.cost_price > 0) ||
    (data.pricing.supply_price !== null && data.pricing.supply_price > 0) ||
    (data.pricing.wholesale_price !== null && data.pricing.wholesale_price > 0) ||
    (data.pricing.retail_price !== null && data.pricing.retail_price > 0);
  
  if (!hasSomePricing) {
    errors.push({
      field: 'pricing',
      message: 'At least one pricing field must be set',
      category: 'pricing',
    });
  } else {
    // Individual missing prices are warnings, not errors
    if (data.pricing.cost_price === null || data.pricing.cost_price <= 0) {
      warnings.push({
        field: 'pricing.cost_price',
        message: 'Cost price is missing or zero - using estimated value',
      });
    }
    if (data.pricing.supply_price === null || data.pricing.supply_price <= 0) {
      warnings.push({
        field: 'pricing.supply_price',
        message: 'Supply price is missing or zero - using estimated value',
      });
    }
    if (data.pricing.wholesale_price === null || data.pricing.wholesale_price <= 0) {
      warnings.push({
        field: 'pricing.wholesale_price',
        message: 'Wholesale price is missing or zero - using estimated value',
      });
    }
    if (data.pricing.retail_price === null || data.pricing.retail_price <= 0) {
      warnings.push({
        field: 'pricing.retail_price',
        message: 'Retail price is missing or zero - using estimated value',
      });
    }
  }

  // Pricing hierarchy check
  if (
    data.pricing.cost_price &&
    data.pricing.supply_price &&
    data.pricing.wholesale_price &&
    data.pricing.retail_price
  ) {
    if (data.pricing.cost_price >= data.pricing.supply_price) {
      warnings.push({
        field: 'pricing',
        message: 'Cost price should be less than supply price',
      });
    }
    if (data.pricing.supply_price >= data.pricing.wholesale_price) {
      warnings.push({
        field: 'pricing',
        message: 'Supply price should be less than wholesale price',
      });
    }
    if (data.pricing.wholesale_price >= data.pricing.retail_price) {
      warnings.push({
        field: 'pricing',
        message: 'Wholesale price should be less than retail price',
      });
    }
  }

  // === MOQ VALIDATION (now all warnings, no errors - prefilled values are acceptable) ===
  if (data.supplier_trade.moq === null || data.supplier_trade.moq <= 0) {
    warnings.push({
      field: 'supplier_trade.moq',
      message: 'Base MOQ is missing - using default value',
    });
  }
  if (data.supplier_trade.moq_exclusive_importer === null || data.supplier_trade.moq_exclusive_importer <= 0) {
    warnings.push({
      field: 'supplier_trade.moq_exclusive_importer',
      message: 'MOQ for Exclusive Importer using default value',
    });
  }
  if (data.supplier_trade.moq_distributor === null || data.supplier_trade.moq_distributor <= 0) {
    warnings.push({
      field: 'supplier_trade.moq_distributor',
      message: 'MOQ for Distributor using default value',
    });
  }
  if (data.supplier_trade.moq_retailer === null || data.supplier_trade.moq_retailer <= 0) {
    warnings.push({
      field: 'supplier_trade.moq_retailer',
      message: 'MOQ for Retailer using default value',
    });
  }

  // === SUPPLIER & LOGISTICS VALIDATION ===
  if (!data.supplier_trade.supplier_name || data.supplier_trade.supplier_name.trim() === '') {
    warnings.push({
      field: 'supplier_trade.supplier_name',
      message: 'Supplier name should be specified',
    });
  }
  if (!data.supplier_trade.hs_code || data.supplier_trade.hs_code.trim() === '') {
    warnings.push({
      field: 'supplier_trade.hs_code',
      message: 'HS Code should be specified for import compliance',
    });
  }
  if (!data.logistics.manufacturing_time || data.logistics.manufacturing_time.trim() === '') {
    warnings.push({
      field: 'logistics.manufacturing_time',
      message: 'Manufacturing time should be specified',
    });
  }

  // === SPECIFICATIONS VALIDATION ===
  if (!data.sales_content.key_specifications || data.sales_content.key_specifications.length === 0) {
    errors.push({
      field: 'sales_content.key_specifications',
      message: 'At least one key specification is required',
      category: 'specifications',
    });
  }
  if (!data.sales_content.applications || data.sales_content.applications.length === 0) {
    warnings.push({
      field: 'sales_content.applications',
      message: 'Applications/use cases should be specified',
    });
  }

  // === DESCRIPTIONS VALIDATION ===
  if (!data.descriptions.product_overview || data.descriptions.product_overview.trim() === '') {
    warnings.push({
      field: 'descriptions.product_overview',
      message: 'Product overview is recommended',
    });
  }
  if (!data.descriptions.key_highlights || data.descriptions.key_highlights.length === 0) {
    warnings.push({
      field: 'descriptions.key_highlights',
      message: 'Key highlights should be included',
    });
  }

  // === REVIEW NOTES VALIDATION (check for auto-generated notes) ===
  if (!data.review_notes || data.review_notes.length === 0) {
    warnings.push({
      field: 'review_notes',
      message: 'No review notes found - data sources should be documented',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
};

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const getValidationSummary = (result: ValidationResult): string => {
  if (result.isValid && result.warnings.length === 0) {
    return 'All validation checks passed';
  }
  if (result.isValid) {
    return `Ready to import with ${result.warnings.length} warning(s) - review notes document any prefilled values`;
  }
  return `${result.errors.length} error(s) must be fixed before import`;
};

export const groupErrorsByCategory = (errors: ValidationError[]): Record<string, ValidationError[]> => {
  return errors.reduce((acc, error) => {
    if (!acc[error.category]) {
      acc[error.category] = [];
    }
    acc[error.category].push(error);
    return acc;
  }, {} as Record<string, ValidationError[]>);
};
