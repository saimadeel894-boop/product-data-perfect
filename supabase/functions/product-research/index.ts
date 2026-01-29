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

// Generate SKU from product title
function generateSku(title: string): string {
  const words = title.split(/\s+/).filter(w => w.length > 1);
  const brand = words[0]?.toUpperCase().substring(0, 3) || 'PRD';
  const model = words.slice(1, 3).map(w => w.toUpperCase().substring(0, 2)).join('');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${brand}-${model}-${random}`;
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
5. Include sources in your research notes

You must return valid JSON matching this exact structure:
{
  "product_title": "Brand Model Key-Spec format",
  "sku": "auto-generated",
  "product_type": "simple",
  "category": "Category > Subcategory",
  "images": [],
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
    "manufacturing_time": "string"
  },
  "sales_content": {
    "key_specifications": ["spec1", "spec2", ...],
    "package_options": ["option1", "option2"],
    "applications": ["app1", "app2"],
    "certifications": [{"name": "cert", "details": "info"}]
  },
  "descriptions": {
    "product_overview": "paragraph",
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

    // Always note about images
    if (!parsedData.images || parsedData.images.length === 0) {
      reviewNotes.push({
        type: 'missing',
        field: 'images',
        message: 'REQUIRES ACTION: No product images found - add official manufacturer images before publishing'
      });
    }

    // Generate spec hash for duplicate detection
    const specHash = generateSpecHash(parsedData.sales_content?.key_specifications || []);

    // Build the final product data
    const productData: ProductData = {
      product_title: parsedData.product_title || productName,
      sku: generateSku(parsedData.product_title || productName),
      product_type: 'simple',
      category: parsedData.category || category || 'Uncategorized',
      images: parsedData.images || [],
      pricing: {
        cost_price: parsedData.pricing?.cost_price ?? null,
        supply_price: parsedData.pricing?.supply_price ?? null,
        wholesale_price: parsedData.pricing?.wholesale_price ?? null,
        retail_price: parsedData.pricing?.retail_price ?? null,
      },
      supplier_trade: {
        supplier_name: parsedData.supplier_trade?.supplier_name || `${productName.split(' ')[0]} International Ltd.`,
        hs_code: parsedData.supplier_trade?.hs_code || '',
        moq: parsedData.supplier_trade?.moq ?? null,
        moq_exclusive_importer: parsedData.supplier_trade?.moq_exclusive_importer ?? null,
        moq_distributor: parsedData.supplier_trade?.moq_distributor ?? null,
        moq_retailer: parsedData.supplier_trade?.moq_retailer ?? null,
      },
      logistics: {
        import_certification_required: parsedData.logistics?.import_certification_required ?? false,
        import_certification_details: parsedData.logistics?.import_certification_details || '',
        manufacturing_time: parsedData.logistics?.manufacturing_time || '',
      },
      sales_content: {
        key_specifications: parsedData.sales_content?.key_specifications || [],
        package_options: parsedData.sales_content?.package_options || [],
        applications: parsedData.sales_content?.applications || [],
        certifications: parsedData.sales_content?.certifications || [],
      },
      descriptions: {
        product_overview: parsedData.descriptions?.product_overview || '',
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
