/**
 * Title Formatter Utility
 * Ensures product titles follow the strict format: Brand + Model + Key Specification
 * Example: "Jimmy H8 Flex Cordless Vacuum Cleaner 550W"
 */

export interface TitleComponents {
  brand: string;
  model: string;
  keySpec: string;
}

/**
 * Parse a product name into brand, model, and key spec components
 */
export const parseProductName = (productName: string): TitleComponents => {
  // Clean up the input - trim spaces and remove duplicate spaces
  const cleaned = productName.trim().replace(/\s+/g, ' ');
  const words = cleaned.split(' ').filter(w => w.length > 0);

  if (words.length === 0) {
    return {
      brand: 'Generic',
      model: 'Product',
      keySpec: 'Standard',
    };
  }

  // First word is always the brand (capitalize first letter)
  const brand = capitalizeFirstLetter(words[0]);

  // Try to identify model (usually alphanumeric codes like H8, R10, GSB-13)
  let model = '';
  let keySpecStart = 1;

  for (let i = 1; i < Math.min(words.length, 4); i++) {
    const word = words[i];
    // Model identifiers often contain numbers or are short alphanumeric codes
    if (isModelIdentifier(word)) {
      model += (model ? ' ' : '') + word;
      keySpecStart = i + 1;
    } else if (model === '' && i === 1) {
      // If second word isn't a model code, treat it as part of model anyway
      model = word;
      keySpecStart = 2;
    } else {
      break;
    }
  }

  // If no model found, use second word or generate one
  if (!model && words.length > 1) {
    model = words[1];
    keySpecStart = 2;
  } else if (!model) {
    model = 'Series';
    keySpecStart = 1;
  }

  // Remaining words form the key specification
  let keySpec = words.slice(keySpecStart).join(' ');

  // If no key spec found, it will be inferred later from specifications
  if (!keySpec) {
    keySpec = '';
  }

  return { brand, model, keySpec };
};

/**
 * Check if a word looks like a model identifier
 */
const isModelIdentifier = (word: string): boolean => {
  // Contains both letters and numbers (e.g., H8, R10, GSB13)
  const hasLettersAndNumbers = /[a-zA-Z]/.test(word) && /[0-9]/.test(word);
  // Is a short code (less than 10 chars)
  const isShortCode = word.length <= 10;
  // Contains hyphen with alphanumeric (e.g., H8-Flex, GSB-13)
  const isHyphenatedCode = /^[a-zA-Z0-9]+-[a-zA-Z0-9]+$/.test(word);
  
  return (hasLettersAndNumbers && isShortCode) || isHyphenatedCode;
};

/**
 * Capitalize first letter of a string
 */
const capitalizeFirstLetter = (str: string): string => {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Infer a key specification from available specifications array
 */
export const inferKeySpecFromSpecs = (specifications: string[], category?: string): string => {
  if (specifications.length === 0) {
    return inferKeySpecFromCategory(category);
  }

  // Look for power specs (most common key differentiator)
  const powerSpec = specifications.find(spec => 
    /\d+\s*(W|w|Watt|watt)/i.test(spec)
  );
  if (powerSpec) {
    const match = powerSpec.match(/(\d+\s*W)/i);
    if (match) return match[1].toUpperCase().replace(/\s/g, '');
  }

  // Look for capacity/size specs
  const capacitySpec = specifications.find(spec =>
    /\d+\s*(L|l|Liter|litre|ml|ML|GB|TB|MP)/i.test(spec)
  );
  if (capacitySpec) {
    const match = capacitySpec.match(/(\d+\s*(L|GB|TB|MP|ml))/i);
    if (match) return match[1].replace(/\s/g, '');
  }

  // Look for runtime/battery specs
  const runtimeSpec = specifications.find(spec =>
    /\d+\s*(min|minute|hour|hr)/i.test(spec)
  );
  if (runtimeSpec) {
    const match = runtimeSpec.match(/(\d+\s*(min|minute|hour|hr))/i);
    if (match) return match[1];
  }

  // Use first spec that contains a number
  const numericSpec = specifications.find(spec => /\d/.test(spec));
  if (numericSpec) {
    // Extract the key part (first 20 chars or until comma)
    const keyPart = numericSpec.split(',')[0].slice(0, 20).trim();
    return keyPart;
  }

  return inferKeySpecFromCategory(category);
};

/**
 * Infer a reasonable key spec based on product category
 */
const inferKeySpecFromCategory = (category?: string): string => {
  if (!category) return 'Professional Grade';

  const categoryLower = category.toLowerCase();

  // Map categories to typical key specs
  const categoryKeySpecs: Record<string, string> = {
    'vacuum': 'Cordless Vacuum Cleaner',
    'cleaner': 'Deep Clean System',
    'camera': 'Digital Camera',
    'drill': 'Power Drill',
    'tool': 'Power Tool',
    'appliance': 'Home Appliance',
    'electronics': 'Smart Device',
    'kitchen': 'Kitchen Appliance',
    'outdoor': 'Outdoor Equipment',
    'garden': 'Garden Tool',
    'lighting': 'LED Lighting',
    'audio': 'Audio System',
    'video': 'Video Equipment',
  };

  for (const [key, value] of Object.entries(categoryKeySpecs)) {
    if (categoryLower.includes(key)) {
      return value;
    }
  }

  return 'Professional Grade';
};

/**
 * Remove duplicate words from a string while preserving order
 */
const removeDuplicateWords = (str: string): string => {
  const words = str.split(' ');
  const seen = new Set<string>();
  const result: string[] = [];

  for (const word of words) {
    const lowerWord = word.toLowerCase();
    if (!seen.has(lowerWord)) {
      seen.add(lowerWord);
      result.push(word);
    }
  }

  return result.join(' ');
};

/**
 * Format a complete product title following the Brand + Model + Key Spec pattern
 */
export const formatProductTitle = (
  productName: string,
  specifications?: string[],
  category?: string
): string => {
  const { brand, model, keySpec } = parseProductName(productName);

  // If keySpec is empty or too short, infer from specifications or category
  let finalKeySpec = keySpec;
  if (!finalKeySpec || finalKeySpec.split(' ').length < 1) {
    finalKeySpec = inferKeySpecFromSpecs(specifications || [], category);
  }

  // Construct the full title
  let fullTitle = `${brand} ${model} ${finalKeySpec}`;

  // Clean up: remove duplicate words and extra spaces
  fullTitle = removeDuplicateWords(fullTitle);
  fullTitle = fullTitle.trim().replace(/\s+/g, ' ');

  // Ensure we have at least 3 parts
  const parts = fullTitle.split(' ');
  if (parts.length < 3) {
    // Add generic suffix if needed
    const suffix = inferKeySpecFromCategory(category);
    fullTitle = `${fullTitle} ${suffix}`;
    fullTitle = removeDuplicateWords(fullTitle);
  }

  return fullTitle;
};

/**
 * Validate that a title meets the minimum format requirements
 */
export const validateTitleFormat = (title: string): { isValid: boolean; message?: string } => {
  if (!title || title.trim() === '') {
    return { isValid: false, message: 'Title is required' };
  }

  const words = title.trim().split(' ').filter(w => w.length > 0);

  if (words.length < 3) {
    return { 
      isValid: false, 
      message: 'Title must include Brand + Model + Key Spec (minimum 3 parts)' 
    };
  }

  // Check if first word starts with capital (brand)
  if (!/^[A-Z]/.test(words[0])) {
    return { 
      isValid: false, 
      message: 'Brand name should start with a capital letter' 
    };
  }

  return { isValid: true };
};

/**
 * Generate a SKU from the formatted title
 */
export const generateSkuFromTitle = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(' ')
    .slice(0, 3)
    .join('-');
};
