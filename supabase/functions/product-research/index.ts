import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface ProductResearchRequest {
  productName: string;
  pdfContent?: string;
  category?: string;
}

interface ReviewNote {
  type: 'source' | 'estimate' | 'assumption' | 'missing';
  field?: string;
  message: string;
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

function generateSku(title: string): string {
  const words = title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').split(/\s+/).filter(w => w.length > 0);
  const brand = words[0] || 'product';
  const model = words.slice(1, 3).join('-') || 'item';
  return `${brand}-${model}`;
}

// Default pricing multipliers for category-based estimation
const CATEGORY_PRICING_MULTIPLIERS: Record<string, { costToSupply: number; supplyToWholesale: number; wholesaleToRetail: number }> = {
  'default': { costToSupply: 1.15, supplyToWholesale: 1.25, wholesaleToRetail: 1.5 },
  'electronics': { costToSupply: 1.2, supplyToWholesale: 1.3, wholesaleToRetail: 1.6 },
  'appliances': { costToSupply: 1.15, supplyToWholesale: 1.25, wholesaleToRetail: 1.4 },
  'cleaning': { costToSupply: 1.12, supplyToWholesale: 1.2, wholesaleToRetail: 1.35 },
};

const DEFAULT_MOQ = { base: 100, exclusive_importer: 500, distributor: 200, retailer: 50 };

function prefillPricing(pricing: any, category: string): { pricing: any; prefilled: string[] } {
  const prefilled: string[] = [];
  const categoryKey = Object.keys(CATEGORY_PRICING_MULTIPLIERS).find(k => category.toLowerCase().includes(k)) || 'default';
  const m = CATEGORY_PRICING_MULTIPLIERS[categoryKey];
  const result = { ...pricing };

  if (result.retail_price && result.retail_price > 0) {
    if (!result.wholesale_price || result.wholesale_price <= 0) { result.wholesale_price = Math.round(result.retail_price / m.wholesaleToRetail * 100) / 100; prefilled.push('wholesale_price'); }
    if (!result.supply_price || result.supply_price <= 0) { result.supply_price = Math.round((result.wholesale_price || result.retail_price / m.wholesaleToRetail) / m.supplyToWholesale * 100) / 100; prefilled.push('supply_price'); }
    if (!result.cost_price || result.cost_price <= 0) { result.cost_price = Math.round((result.supply_price || result.retail_price / m.wholesaleToRetail / m.supplyToWholesale) / m.costToSupply * 100) / 100; prefilled.push('cost_price'); }
  } else if (result.cost_price && result.cost_price > 0) {
    if (!result.supply_price || result.supply_price <= 0) { result.supply_price = Math.round(result.cost_price * m.costToSupply * 100) / 100; prefilled.push('supply_price'); }
    if (!result.wholesale_price || result.wholesale_price <= 0) { result.wholesale_price = Math.round((result.supply_price || result.cost_price * m.costToSupply) * m.supplyToWholesale * 100) / 100; prefilled.push('wholesale_price'); }
    if (!result.retail_price || result.retail_price <= 0) { result.retail_price = Math.round((result.wholesale_price || result.cost_price * m.costToSupply * m.supplyToWholesale) * m.wholesaleToRetail * 100) / 100; prefilled.push('retail_price'); }
  } else {
    const estimatedRetail = 199.99;
    result.retail_price = estimatedRetail;
    result.wholesale_price = Math.round(estimatedRetail / m.wholesaleToRetail * 100) / 100;
    result.supply_price = Math.round(result.wholesale_price / m.supplyToWholesale * 100) / 100;
    result.cost_price = Math.round(result.supply_price / m.costToSupply * 100) / 100;
    prefilled.push('cost_price', 'supply_price', 'wholesale_price', 'retail_price');
  }
  return { pricing: result, prefilled };
}

function prefillMoq(st: any): { supplier_trade: any; prefilled: string[] } {
  const prefilled: string[] = [];
  const result = { ...st };
  if (result.moq === null || result.moq <= 0) { result.moq = DEFAULT_MOQ.base; prefilled.push('moq'); }
  if (result.moq_exclusive_importer === null || result.moq_exclusive_importer <= 0) { result.moq_exclusive_importer = DEFAULT_MOQ.exclusive_importer; prefilled.push('moq_exclusive_importer'); }
  if (result.moq_distributor === null || result.moq_distributor <= 0) { result.moq_distributor = DEFAULT_MOQ.distributor; prefilled.push('moq_distributor'); }
  if (result.moq_retailer === null || result.moq_retailer <= 0) { result.moq_retailer = DEFAULT_MOQ.retailer; prefilled.push('moq_retailer'); }
  return { supplier_trade: result, prefilled };
}

function filterValidImages(images: string[]): { validImages: string[]; notes: string[] } {
  const notes: string[] = [];
  const invalidDomains = ['via.placeholder.com', 'placeholder.com', 'placehold.it', 'placekitten.com', 'picsum.photos'];
  const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const validFormats = ['fm=jpg', 'fm=jpeg', 'fm=png', 'fm=gif', 'fm=webp', 'format=jpg', 'format=png'];
  const trustedCdns = ['images.unsplash.com', 'cdn.shopify.com', 'i.imgur.com', 'cloudinary.com', 'res.cloudinary.com'];

  const validImages = images.filter(url => {
    if (!url || typeof url !== 'string') return false;
    const urlLower = url.toLowerCase();
    if (invalidDomains.some(d => urlLower.includes(d))) { notes.push(`Excluded placeholder: ${url.substring(0, 50)}...`); return false; }
    if (!url.startsWith('http://') && !url.startsWith('https://')) { notes.push(`Excluded non-HTTP: ${url.substring(0, 50)}...`); return false; }
    const hasValidExt = validExtensions.some(ext => urlLower.includes(ext));
    const hasValidFmt = validFormats.some(fmt => urlLower.includes(fmt));
    const isTrusted = trustedCdns.some(cdn => urlLower.includes(cdn));
    if (!hasValidExt && !hasValidFmt && !isTrusted) { notes.push(`Excluded invalid format: ${url.substring(0, 50)}...`); return false; }
    return true;
  });

  const limited = validImages.slice(0, 3);
  if (validImages.length > 3) notes.push(`Limited images from ${validImages.length} to 3`);
  return { validImages: limited, notes };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAiKey) {
      return new Response(JSON.stringify({ success: false, error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { productName, pdfContent, category } = await req.json() as ProductResearchRequest;
    if (!productName || productName.trim().length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Product name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`Researching product: ${productName}`);

    const systemPrompt = `You are a professional product data researcher for Transeo Africa e-commerce import system. Extract ACCURATE, MODEL-SPECIFIC product data.

CRITICAL RULES:
1. NEVER use generic or placeholder data
2. EVERY specification must be specific to the EXACT product model
3. If data is unavailable, leave the field as empty string and mark in estimated_fields/missing_fields
4. NEVER create new fields. Only fill the predefined fields below.
5. If a field already has data from PDF context, do NOT overwrite it.

Return valid JSON matching this EXACT structure with ALL fields:
{
  "product_title": "Brand Model Key-Spec format",
  "sku": "auto-generated",
  "product_type": "simple",
  "category": "Category > Subcategory",
  "images": [],
  "company_info": {
    "company_name": "Official company name",
    "country_of_origin": "Country where company is headquartered",
    "year_established": "Year the company was founded",
    "ownership_partnerships": "Ownership structure, public/private, key partnerships",
    "daily_production": "Estimated daily production capacity",
    "annual_output": "Estimated annual production output",
    "lines_installed": "Number of production lines",
    "major_products": "Main product categories manufactured"
  },
  "certifications_standards": {
    "safety_certificates": "Safety certifications held",
    "additional_certifications": "ISO and other certifications (e.g. ISO 9001, ISO 14001)",
    "export_licenses": "Export compliance licenses (e.g. CE, RoHS, REACH)",
    "traceability_systems": "Quality control and traceability systems in place"
  },
  "clients_markets": {
    "key_clients": "Key domestic and export clients description",
    "export_markets": "Regions/countries where products are exported",
    "government_supply_track_record": "Experience supplying government/public sector"
  },
  "contact_logistics": {
    "factory_address": "Full factory/HQ address",
    "nearest_port_of_loading": "Nearest shipping port",
    "export_documentation": "Documents provided (Commercial Invoice, Packing List, Bill of Lading, Certificate of Origin, etc.)",
    "email": "Export/sales contact email",
    "contact_number": "Contact phone number"
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
    "manufacturing_time": "e.g. 20-25 days",
    "transit_time": "e.g. 28-35 days sea freight from port",
    "packaging_details": "Packaging type, dimensions, weight per unit",
    "payment_method": "e.g. T/T, PayPal, LC"
  },
  "sales_content": {
    "key_specifications": ["spec1", "spec2"],
    "package_options": ["option1", "option2"],
    "applications": ["app1", "app2"],
    "certifications": [{"name": "CE", "details": "Conformity with EU standards"}]
  },
  "descriptions": {
    "product_overview": "Detailed product description paragraph",
    "product_identity": "Short product identity line (e.g. Brand Model Type)",
    "key_highlights": ["highlight1", "highlight2"],
    "trust_assurance": "Trust and assurance paragraph about warranty, quality, certifications"
  },
  "sources_used": ["source1", "source2"],
  "data_confidence": {
    "specifications": "high|medium|low",
    "pricing": "high|medium|low",
    "supplier_info": "high|medium|low"
  },
  "estimated_fields": ["field1"],
  "assumed_fields": ["field1"],
  "missing_fields": ["field1"]
}`;

    const userPrompt = `Research and extract complete product data for: "${productName}"
${category ? `Category hint: ${category}` : ''}
${pdfContent ? `\nAdditional context from PDF:\n${pdfContent}` : ''}

IMPORTANT:
- Extract REAL specifications for this EXACT model
- Fill ALL fields in the schema - leave empty string if truly unavailable
- Include company profile, certifications, clients/markets, contact/logistics sections
- Provide realistic pricing based on market research
- Include sources
Return ONLY valid JSON, no markdown formatting.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 6000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return new Response(JSON.stringify({ success: false, error: 'AI research failed', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(JSON.stringify({ success: false, error: 'No response from AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let parsedData;
    try {
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedData = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      return new Response(JSON.stringify({ success: false, error: 'Failed to parse AI response', raw_response: content.substring(0, 500) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Build review notes
    const reviewNotes: ReviewNote[] = [];

    if (parsedData.sources_used?.length > 0) {
      reviewNotes.push({ type: 'source', message: `Data researched from: ${parsedData.sources_used.join(', ')}` });
    } else {
      reviewNotes.push({ type: 'source', message: `Product researched: "${productName}". Data extracted via AI analysis.` });
    }
    if (pdfContent) {
      reviewNotes.push({ type: 'source', message: 'Additional data extracted from uploaded PDF document' });
    }
    if (parsedData.data_confidence) {
      if (parsedData.data_confidence.specifications !== 'high') {
        reviewNotes.push({ type: 'estimate', field: 'key_specifications', message: `Specifications confidence: ${parsedData.data_confidence.specifications}` });
      }
      if (parsedData.data_confidence.pricing !== 'high') {
        reviewNotes.push({ type: 'estimate', field: 'pricing', message: `Pricing confidence: ${parsedData.data_confidence.pricing}` });
      }
      if (parsedData.data_confidence.supplier_info !== 'high') {
        reviewNotes.push({ type: 'estimate', field: 'supplier_info', message: `Supplier info confidence: ${parsedData.data_confidence.supplier_info}` });
      }
    }
    if (parsedData.estimated_fields?.length > 0) {
      parsedData.estimated_fields.forEach((f: string) => reviewNotes.push({ type: 'estimate', field: f, message: `Value estimated based on market analysis` }));
    }
    if (parsedData.assumed_fields?.length > 0) {
      parsedData.assumed_fields.forEach((f: string) => reviewNotes.push({ type: 'assumption', field: f, message: `Value assumed based on category standards` }));
    }
    if (parsedData.missing_fields?.length > 0) {
      parsedData.missing_fields.forEach((f: string) => reviewNotes.push({ type: 'missing', field: f, message: `Could not find reliable data - requires manual verification` }));
    }

    // Generate spec hash & SKU
    const specHash = generateSpecHash(parsedData.sales_content?.key_specifications || []);
    const productTitle = parsedData.product_title || productName;
    const generatedSku = generateSku(productTitle);
    reviewNotes.push({ type: 'assumption', field: 'sku', message: `SKU auto-generated: "${generatedSku}"` });

    const productCategory = parsedData.category || category || 'Uncategorized';

    // Prefill pricing
    const rawPricing = {
      cost_price: parsedData.pricing?.cost_price ?? null,
      supply_price: parsedData.pricing?.supply_price ?? null,
      wholesale_price: parsedData.pricing?.wholesale_price ?? null,
      retail_price: parsedData.pricing?.retail_price ?? null,
    };
    const { pricing: prefilledPricing, prefilled: pricingPrefilled } = prefillPricing(rawPricing, productCategory);
    if (pricingPrefilled.length > 0) {
      reviewNotes.push({ type: 'estimate', field: 'pricing', message: `Pricing prefilled: ${pricingPrefilled.join(', ')}. Based on category "${productCategory}" margins.` });
    }

    // Prefill MOQ
    const rawST = {
      supplier_name: parsedData.supplier_trade?.supplier_name || `${productName.split(' ')[0]} International Ltd.`,
      hs_code: parsedData.supplier_trade?.hs_code || '',
      moq: parsedData.supplier_trade?.moq ?? null,
      moq_exclusive_importer: parsedData.supplier_trade?.moq_exclusive_importer ?? null,
      moq_distributor: parsedData.supplier_trade?.moq_distributor ?? null,
      moq_retailer: parsedData.supplier_trade?.moq_retailer ?? null,
    };
    const { supplier_trade: prefilledST, prefilled: moqPrefilled } = prefillMoq(rawST);
    if (moqPrefilled.length > 0) {
      reviewNotes.push({ type: 'estimate', field: 'supplier_trade', message: `MOQ prefilled: ${moqPrefilled.join(', ')}. Using industry defaults.` });
    }

    // Filter images
    const { validImages, notes: imageNotes } = filterValidImages(parsedData.images || []);
    if (validImages.length === 0) {
      reviewNotes.push({ type: 'missing', field: 'images', message: 'No valid product images found. Product imported as draft.' });
    } else if (validImages.length < (parsedData.images || []).length) {
      reviewNotes.push({ type: 'assumption', field: 'images', message: `Images filtered: ${validImages.length} valid out of ${(parsedData.images || []).length}. ${imageNotes.join(' ')}` });
    }

    // Company info with missing field tracking
    const companyInfo = {
      company_name: parsedData.company_info?.company_name || `${productName.split(' ')[0]} Inc.`,
      country_of_origin: parsedData.company_info?.country_of_origin || '',
      year_established: parsedData.company_info?.year_established || '',
      ownership_partnerships: parsedData.company_info?.ownership_partnerships || '',
      daily_production: parsedData.company_info?.daily_production || '',
      annual_output: parsedData.company_info?.annual_output || '',
      lines_installed: parsedData.company_info?.lines_installed || '',
      major_products: parsedData.company_info?.major_products || '',
    };
    if (!parsedData.company_info?.company_name) reviewNotes.push({ type: 'assumption', field: 'company_info.company_name', message: 'Company name assumed from product title.' });
    if (!companyInfo.country_of_origin) reviewNotes.push({ type: 'missing', field: 'company_info.country_of_origin', message: 'Country of origin not found.' });
    if (!companyInfo.daily_production) reviewNotes.push({ type: 'missing', field: 'company_info.daily_production', message: 'Daily production not found.' });
    if (!companyInfo.annual_output) reviewNotes.push({ type: 'missing', field: 'company_info.annual_output', message: 'Annual output not found.' });

    // Certifications & Standards
    const certStandards = {
      safety_certificates: parsedData.certifications_standards?.safety_certificates || '',
      additional_certifications: parsedData.certifications_standards?.additional_certifications || '',
      export_licenses: parsedData.certifications_standards?.export_licenses || '',
      traceability_systems: parsedData.certifications_standards?.traceability_systems || '',
    };

    // Clients & Markets
    const clientsMarkets = {
      key_clients: parsedData.clients_markets?.key_clients || '',
      export_markets: parsedData.clients_markets?.export_markets || '',
      government_supply_track_record: parsedData.clients_markets?.government_supply_track_record || '',
    };

    // Contact & Logistics
    const contactLogistics = {
      factory_address: parsedData.contact_logistics?.factory_address || '',
      nearest_port_of_loading: parsedData.contact_logistics?.nearest_port_of_loading || '',
      export_documentation: parsedData.contact_logistics?.export_documentation || 'Commercial Invoice, Packing List, Bill of Lading, Certificate of Origin',
      email: parsedData.contact_logistics?.email || '',
      contact_number: parsedData.contact_logistics?.contact_number || '',
    };

    // Track missing new fields
    const newFieldChecks = [
      { val: certStandards.safety_certificates, field: 'certifications_standards.safety_certificates' },
      { val: certStandards.export_licenses, field: 'certifications_standards.export_licenses' },
      { val: clientsMarkets.key_clients, field: 'clients_markets.key_clients' },
      { val: clientsMarkets.export_markets, field: 'clients_markets.export_markets' },
      { val: contactLogistics.factory_address, field: 'contact_logistics.factory_address' },
      { val: contactLogistics.email, field: 'contact_logistics.email' },
    ];
    newFieldChecks.forEach(({ val, field }) => {
      if (!val) reviewNotes.push({ type: 'missing', field, message: `${field.split('.').pop()?.replace(/_/g, ' ')} not found. Requires manual entry.` });
    });

    const productData = {
      product_title: productTitle,
      sku: generatedSku,
      product_type: 'simple' as const,
      category: productCategory,
      images: validImages,
      company_info: companyInfo,
      certifications_standards: certStandards,
      clients_markets: clientsMarkets,
      contact_logistics: contactLogistics,
      pricing: prefilledPricing,
      supplier_trade: prefilledST,
      logistics: {
        import_certification_required: parsedData.logistics?.import_certification_required ?? false,
        import_certification_details: parsedData.logistics?.import_certification_details || '',
        manufacturing_time: parsedData.logistics?.manufacturing_time || '15-30 days',
        transit_time: parsedData.logistics?.transit_time || '',
        packaging_details: parsedData.logistics?.packaging_details || '',
        payment_method: parsedData.logistics?.payment_method || 'T/T, PayPal, LC',
      },
      sales_content: {
        key_specifications: parsedData.sales_content?.key_specifications || [],
        package_options: parsedData.sales_content?.package_options || ['Standard packaging'],
        applications: parsedData.sales_content?.applications || [],
        certifications: parsedData.sales_content?.certifications || [],
      },
      descriptions: {
        product_overview: parsedData.descriptions?.product_overview || `${productTitle} - Professional grade product.`,
        product_identity: parsedData.descriptions?.product_identity || productTitle,
        key_highlights: parsedData.descriptions?.key_highlights || [],
        trust_assurance: parsedData.descriptions?.trust_assurance || '',
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
      JSON.stringify({ success: true, data: productData, spec_hash: specHash }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Product research error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
