import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ProductResearchRequest {
  productName: string;
  pdfContent?: string; // Base64 encoded PDF text or extracted text
  category?: string;
}

interface ReviewNote {
  type: 'source' | 'estimate' | 'assumption' | 'missing';
  field?: string;
  message: string;
}

interface ProductData {
  product_title: string;
  sku: string;
  product_type: 'simple';
  category: string;
  images: string[];
  company_info: {
    company_name: string;
    country_of_origin: string;
    year_established: string;
    daily_production: string;
  };
  pricing: {
    cost_price: number | null;
    supply_price: number | null;
    wholesale_price: number | null;
    retail_price: number | null;
  };
  supplier_trade: {
    supplier_name: string;
    hs_code: string;
    moq: number | null;
    moq_exclusive_importer: number | null;
    moq_distributor: number | null;
    moq_retailer: number | null;
  };
  logistics: {
    import_certification_required: boolean;
    import_certification_details: string;
    manufacturing_time: string;
    packaging_details: string;
  };
  sales_content: {
    key_specifications: string[];
    package_options: string[];
    applications: string[];
    certifications: { name: string; details: string }[];
  };
  descriptions: {
    product_overview: string;
    key_highlights: string[];
  };
  review_notes: ReviewNote[];
  _metadata: {
    model_researched: string;
    extraction_timestamp: string;
    sources_used: string[];
    spec_hash: string;
  };
}

// Generate a hash of specifications to detect duplicates
function generateSpecHash(specs: string[]): string {
  const normalized = specs.map(s => s.toLowerCase().trim()).sort().join('|');
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Generate SKU from product title in brand-model format (lowercase, hyphenated)
function generateSku(title: string): string {
  // Extract brand and model from title, convert to lowercase, hyphenated format
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .split(/\s+/)
    .filter(w => w.length > 0);
  
  // Take first word as brand, next 1-2 as model
  const brand = words[0] || 'product';
  const model = words.slice(1, 3).join('-') || 'item';
  
  return `${brand}-${model}`;
}

// Generate unique SKU suffix for duplicates
function generateUniqueSkuSuffix(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 4);
  return `${timestamp}${random}`;
}

// Default pricing multipliers for category-based estimation
const CATEGORY_PRICING_MULTIPLIERS: Record<string, { costToSupply: number; supplyToWholesale: number; wholesaleToRetail: number }> = {
  'default': { costToSupply: 1.15, supplyToWholesale: 1.25, wholesaleToRetail: 1.5 },
  'electronics': { costToSupply: 1.2, supplyToWholesale: 1.3, wholesaleToRetail: 1.6 },
  'appliances': { costToSupply: 1.15, supplyToWholesale: 1.25, wholesaleToRetail: 1.4 },
  'cleaning': { costToSupply: 1.12, supplyToWholesale: 1.2, wholesaleToRetail: 1.35 },
};

// Default MOQ values by tier
const DEFAULT_MOQ = {
  base: 100,
  exclusive_importer: 500,
  distributor: 200,
  retailer: 50,
};

// Prefill missing pricing based on available values or category defaults
function prefillPricing(
  pricing: ProductData['pricing'], 
  category: string
): { pricing: ProductData['pricing']; prefilled: string[] } {
  const prefilled: string[] = [];
  const categoryKey = Object.keys(CATEGORY_PRICING_MULTIPLIERS).find(k => 
    category.toLowerCase().includes(k)
  ) || 'default';
  const multipliers = CATEGORY_PRICING_MULTIPLIERS[categoryKey];
  
  const result = { ...pricing };
  
  // If we have retail price, work backwards
  if (result.retail_price && result.retail_price > 0) {
    if (!result.wholesale_price || result.wholesale_price <= 0) {
      result.wholesale_price = Math.round(result.retail_price / multipliers.wholesaleToRetail * 100) / 100;
      prefilled.push('wholesale_price');
    }
    if (!result.supply_price || result.supply_price <= 0) {
      result.supply_price = Math.round((result.wholesale_price || result.retail_price / multipliers.wholesaleToRetail) / multipliers.supplyToWholesale * 100) / 100;
      prefilled.push('supply_price');
    }
    if (!result.cost_price || result.cost_price <= 0) {
      result.cost_price = Math.round((result.supply_price || result.retail_price / multipliers.wholesaleToRetail / multipliers.supplyToWholesale) / multipliers.costToSupply * 100) / 100;
      prefilled.push('cost_price');
    }
  }
  // If we have cost price, work forwards
  else if (result.cost_price && result.cost_price > 0) {
    if (!result.supply_price || result.supply_price <= 0) {
      result.supply_price = Math.round(result.cost_price * multipliers.costToSupply * 100) / 100;
      prefilled.push('supply_price');
    }
    if (!result.wholesale_price || result.wholesale_price <= 0) {
      result.wholesale_price = Math.round((result.supply_price || result.cost_price * multipliers.costToSupply) * multipliers.supplyToWholesale * 100) / 100;
      prefilled.push('wholesale_price');
    }
    if (!result.retail_price || result.retail_price <= 0) {
      result.retail_price = Math.round((result.wholesale_price || result.cost_price * multipliers.costToSupply * multipliers.supplyToWholesale) * multipliers.wholesaleToRetail * 100) / 100;
      prefilled.push('retail_price');
    }
  }
  // No pricing available - use category defaults starting from estimated retail
  else {
    const estimatedRetail = 199.99; // Conservative default
    result.retail_price = estimatedRetail;
    result.wholesale_price = Math.round(estimatedRetail / multipliers.wholesaleToRetail * 100) / 100;
    result.supply_price = Math.round(result.wholesale_price / multipliers.supplyToWholesale * 100) / 100;
    result.cost_price = Math.round(result.supply_price / multipliers.costToSupply * 100) / 100;
    prefilled.push('cost_price', 'supply_price', 'wholesale_price', 'retail_price');
  }
  
  return { pricing: result, prefilled };
}

// Prefill missing MOQ values
function prefillMoq(
  supplierTrade: ProductData['supplier_trade']
): { supplier_trade: ProductData['supplier_trade']; prefilled: string[] } {
  const prefilled: string[] = [];
  const result = { ...supplierTrade };
  
  if (result.moq === null || result.moq <= 0) {
    result.moq = DEFAULT_MOQ.base;
    prefilled.push('moq');
  }
  if (result.moq_exclusive_importer === null || result.moq_exclusive_importer <= 0) {
    result.moq_exclusive_importer = DEFAULT_MOQ.exclusive_importer;
    prefilled.push('moq_exclusive_importer');
  }
  if (result.moq_distributor === null || result.moq_distributor <= 0) {
    result.moq_distributor = DEFAULT_MOQ.distributor;
    prefilled.push('moq_distributor');
  }
  if (result.moq_retailer === null || result.moq_retailer <= 0) {
    result.moq_retailer = DEFAULT_MOQ.retailer;
    prefilled.push('moq_retailer');
  }
  
  return { supplier_trade: result, prefilled };
}

// Filter and validate images - max 3, no placeholders
function filterValidImages(images: string[]): { validImages: string[]; notes: string[] } {
  const notes: string[] = [];
  const invalidDomains = ['via.placeholder.com', 'placeholder.com', 'placehold.it', 'placekitten.com', 'picsum.photos'];
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const validFormats = ['fm=jpg', 'fm=jpeg', 'fm=png', 'fm=gif', 'fm=webp', 'format=jpg', 'format=png'];
  const trustedCdns = ['images.unsplash.com', 'cdn.shopify.com', 'i.imgur.com', 'cloudinary.com', 'res.cloudinary.com'];
  
  const validImages = images.filter(url => {
    if (!url || typeof url !== 'string') return false;
    
    const urlLower = url.toLowerCase();
    
    // Check for placeholder domains
    if (invalidDomains.some(domain => urlLower.includes(domain))) {
      notes.push(`Excluded placeholder image: ${url.substring(0, 50)}...`);
      return false;
    }
    
    // Must be HTTP(S)
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      notes.push(`Excluded non-HTTP image: ${url.substring(0, 50)}...`);
      return false;
    }
    
    // Check for valid extension or format
    const hasValidExtension = validExtensions.some(ext => urlLower.includes(ext));
    const hasValidFormat = validFormats.some(fmt => urlLower.includes(fmt));
    const isTrustedCdn = trustedCdns.some(cdn => urlLower.includes(cdn));
    
    if (!hasValidExtension && !hasValidFormat && !isTrustedCdn) {
      notes.push(`Excluded image without valid format: ${url.substring(0, 50)}...`);
      return false;
    }
    
    return true;
  });
  
  // Limit to 3 images
  const limitedImages = validImages.slice(0, 3);
  if (validImages.length > 3) {
    notes.push(`Limited images from ${validImages.length} to 3`);
  }
  
  return { validImages: limitedImages, notes };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { productName, pdfContent, category } = await req.json() as ProductResearchRequest;

    if (!productName || productName.trim().length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Product name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Researching product: ${productName}`);

    // Build the research prompt
    const systemPrompt = `You are a professional product data researcher for an e-commerce import system. Your job is to extract ACCURATE, MODEL-SPECIFIC product data.

CRITICAL RULES:
1. NEVER use generic or placeholder specifications
2. EVERY specification must be specific to the EXACT product model provided
3. If you cannot find specific data for this exact model, clearly mark it as "estimated" or "assumed"
4. Research the ACTUAL product - different models have DIFFERENT specs
5. Include sources where you found the information
6. NEVER create new fields. Only fill the predefined fields below.
7. If a field already has data from PDF context, do NOT overwrite it.

You must return valid JSON matching this exact structure:
{
  "product_title": "Brand Model Key-Spec format",
  "sku": "auto-generated",
  "product_type": "simple",
  "category": "Category > Subcategory",
  "images": [],
  "company_info": {
    "company_name": "Official company/manufacturer name",
    "country_of_origin": "Country where company is headquartered",
    "year_established": "Year the company was founded",
    "daily_production": "Estimated daily production capacity from official/industry reports"
  },
  "pricing": {
    "cost_price": number or null,
    "supply_price": number or null,
    "wholesale_price": number or null,
    "retail_price": number or null
  },
  "supplier_trade": {
    "supplier_name": "string",
    "hs_code": "string",
    "moq": number or null,
    "moq_exclusive_importer": number or null,
    "moq_distributor": number or null,
    "moq_retailer": number or null
  },
  "logistics": {
    "import_certification_required": boolean,
    "import_certification_details": "string",
    "manufacturing_time": "string",
    "packaging_details": "Packaging type, dimensions, weight per unit"
  },
  "sales_content": {
    "key_specifications": ["CPU", "RAM", "storage", "size", "weight", "battery", etc.],
    "package_options": ["option1", "option2"],
    "applications": ["app1", "app2"],
    "certifications": [{"name": "cert", "details": "info"}]
  },
  "descriptions": {
    "product_overview": "Short and accurate paragraph",
    "key_highlights": ["highlight1", "highlight2"]
  },
  "sources_used": ["source1", "source2"],
  "data_confidence": {
    "specifications": "high|medium|low",
    "pricing": "high|medium|low",
    "supplier_info": "high|medium|low"
  },
  "estimated_fields": ["field1", "field2"],
  "assumed_fields": ["field1", "field2"],
  "missing_fields": ["field1", "field2"]
}`;

    const userPrompt = `Research and extract complete product data for: "${productName}"
${category ? `Category hint: ${category}` : ''}
${pdfContent ? `\nAdditional context from PDF:\n${pdfContent}` : ''}

IMPORTANT:
- Extract REAL specifications for this EXACT model
- If this is a vacuum cleaner, get the ACTUAL motor power, runtime, filtration type, weight, etc. for THIS model
- If this is an appliance, get the ACTUAL capacity, power consumption, dimensions for THIS model
- DO NOT use specifications from similar or related products
- Mark any data you couldn't find with confidence levels
- Provide realistic pricing based on market research for THIS specific product
- Include sources where you found the information

Return ONLY valid JSON, no markdown formatting.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'AI research failed', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ success: false, error: 'No response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the AI response
    let parsedData;
    try {
      // Remove markdown code blocks if present
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to parse AI response',
          raw_response: content.substring(0, 500)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build review notes from AI response
    const reviewNotes: ReviewNote[] = [];
    
    // Add source notes
    if (parsedData.sources_used && parsedData.sources_used.length > 0) {
      reviewNotes.push({
        type: 'source',
        message: `Data researched from: ${parsedData.sources_used.join(', ')}`
      });
    } else {
      reviewNotes.push({
        type: 'source',
        message: `Product researched: "${productName}". Data extracted via AI analysis.`
      });
    }

    // Add PDF source if provided
    if (pdfContent) {
      reviewNotes.push({
        type: 'source',
        message: 'Additional data extracted from uploaded PDF document'
      });
    }

    // Add confidence/estimation notes
    if (parsedData.data_confidence) {
      if (parsedData.data_confidence.specifications !== 'high') {
        reviewNotes.push({
          type: 'estimate',
          field: 'sales_content.key_specifications',
          message: `Specifications confidence: ${parsedData.data_confidence.specifications}. Verify with manufacturer.`
        });
      }
      if (parsedData.data_confidence.pricing !== 'high') {
        reviewNotes.push({
          type: 'estimate',
          field: 'pricing',
          message: `Pricing confidence: ${parsedData.data_confidence.pricing}. Verify with supplier.`
        });
      }
    }

    // Add estimated fields
    if (parsedData.estimated_fields && parsedData.estimated_fields.length > 0) {
      parsedData.estimated_fields.forEach((field: string) => {
        reviewNotes.push({
          type: 'estimate',
          field: field,
          message: `Value estimated based on market analysis for similar products`
        });
      });
    }

    // Add assumed fields
    if (parsedData.assumed_fields && parsedData.assumed_fields.length > 0) {
      parsedData.assumed_fields.forEach((field: string) => {
        reviewNotes.push({
          type: 'assumption',
          field: field,
          message: `Value assumed based on product category standards`
        });
      });
    }

    // Add missing fields
    if (parsedData.missing_fields && parsedData.missing_fields.length > 0) {
      parsedData.missing_fields.forEach((field: string) => {
        reviewNotes.push({
          type: 'missing',
          field: field,
          message: `Could not find reliable data - requires manual verification`
        });
      });
    }

    // Generate spec hash for duplicate detection
    const specHash = generateSpecHash(parsedData.sales_content?.key_specifications || []);

    // Generate SKU in brand-model format
    const productTitle = parsedData.product_title || productName;
    const generatedSku = generateSku(productTitle);
    reviewNotes.push({
      type: 'assumption',
      field: 'sku',
      message: `SKU auto-generated: "${generatedSku}" (format: brand-model)`
    });

    // Determine category
    const productCategory = parsedData.category || category || 'Uncategorized';

    // Prefill pricing with defaults if missing
    const rawPricing = {
      cost_price: parsedData.pricing?.cost_price ?? null,
      supply_price: parsedData.pricing?.supply_price ?? null,
      wholesale_price: parsedData.pricing?.wholesale_price ?? null,
      retail_price: parsedData.pricing?.retail_price ?? null,
    };
    const { pricing: prefilledPricing, prefilled: pricingPrefilled } = prefillPricing(rawPricing, productCategory);
    
    if (pricingPrefilled.length > 0) {
      reviewNotes.push({
        type: 'estimate',
        field: 'pricing',
        message: `Pricing prefilled: ${pricingPrefilled.join(', ')}. Based on category "${productCategory}" standard margins. Verify with supplier.`
      });
    }

    // Prefill MOQ with defaults if missing
    const rawSupplierTrade = {
      supplier_name: parsedData.supplier_trade?.supplier_name || `${productName.split(' ')[0]} International Ltd.`,
      hs_code: parsedData.supplier_trade?.hs_code || '',
      moq: parsedData.supplier_trade?.moq ?? null,
      moq_exclusive_importer: parsedData.supplier_trade?.moq_exclusive_importer ?? null,
      moq_distributor: parsedData.supplier_trade?.moq_distributor ?? null,
      moq_retailer: parsedData.supplier_trade?.moq_retailer ?? null,
    };
    const { supplier_trade: prefilledSupplierTrade, prefilled: moqPrefilled } = prefillMoq(rawSupplierTrade);
    
    if (moqPrefilled.length > 0) {
      reviewNotes.push({
        type: 'estimate',
        field: 'supplier_trade',
        message: `MOQ prefilled: ${moqPrefilled.join(', ')}. Using industry-standard defaults. Confirm with supplier.`
      });
    }

    // Filter and limit images to 3 valid ones
    const rawImages = parsedData.images || [];
    const { validImages, notes: imageNotes } = filterValidImages(rawImages);
    
    if (validImages.length === 0) {
      reviewNotes.push({
        type: 'missing',
        field: 'images',
        message: 'No valid product images found. Product will be imported as draft without images. Add official manufacturer images before publishing.'
      });
    } else if (validImages.length < rawImages.length) {
      reviewNotes.push({
        type: 'assumption',
        field: 'images',
        message: `Images filtered: ${validImages.length} valid out of ${rawImages.length} total. ${imageNotes.join(' ')}`
      });
    }

    // Build company info with review notes for missing data
    const companyInfo = {
      company_name: parsedData.company_info?.company_name || `${productName.split(' ')[0]} Inc.`,
      country_of_origin: parsedData.company_info?.country_of_origin || '',
      year_established: parsedData.company_info?.year_established || '',
      daily_production: parsedData.company_info?.daily_production || '',
    };
    
    if (!parsedData.company_info?.company_name) {
      reviewNotes.push({ type: 'assumption', field: 'company_info.company_name', message: 'Company name assumed from product title. Verify with manufacturer.' });
    }
    if (!companyInfo.country_of_origin) {
      reviewNotes.push({ type: 'missing', field: 'company_info.country_of_origin', message: 'Country of origin not found. Requires manual entry.' });
    }
    if (!companyInfo.daily_production) {
      reviewNotes.push({ type: 'missing', field: 'company_info.daily_production', message: 'Daily production capacity not found. Check industry reports.' });
    }

    const packagingDetails = parsedData.logistics?.packaging_details || '';
    if (!packagingDetails) {
      reviewNotes.push({ type: 'missing', field: 'logistics.packaging_details', message: 'Packaging details not found. Requires manual entry.' });
    }

    // Build the final product data with prefilled values
    const productData: ProductData = {
      product_title: productTitle,
      sku: generatedSku,
      product_type: 'simple',
      category: productCategory,
      images: validImages,
      company_info: companyInfo,
      pricing: prefilledPricing,
      supplier_trade: prefilledSupplierTrade,
      logistics: {
        import_certification_required: parsedData.logistics?.import_certification_required ?? false,
        import_certification_details: parsedData.logistics?.import_certification_details || '',
        manufacturing_time: parsedData.logistics?.manufacturing_time || '15-30 days',
        packaging_details: packagingDetails,
      },
      sales_content: {
        key_specifications: parsedData.sales_content?.key_specifications || [],
        package_options: parsedData.sales_content?.package_options || ['Standard packaging'],
        applications: parsedData.sales_content?.applications || [],
        certifications: parsedData.sales_content?.certifications || [],
      },
      descriptions: {
        product_overview: parsedData.descriptions?.product_overview || `${productTitle} - Professional grade product for commercial and residential use.`,
        key_highlights: parsedData.descriptions?.key_highlights || [],
      },
      review_notes: reviewNotes,
      _metadata: {
        model_researched: productName,
        extraction_timestamp: new Date().toISOString(),
        sources_used: parsedData.sources_used || ['AI Analysis'],
        spec_hash: specHash,
      },
    };

    console.log(`Successfully researched: ${productData.product_title} (hash: ${specHash})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: productData,
        spec_hash: specHash
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Product research error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
