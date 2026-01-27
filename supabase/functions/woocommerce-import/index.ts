import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  review_notes: {
    type: string;
    field?: string;
    message: string;
  }[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const wooUrl = Deno.env.get('WOOCOMMERCE_URL');
    const consumerKey = Deno.env.get('WOOCOMMERCE_CONSUMER_KEY');
    const consumerSecret = Deno.env.get('WOOCOMMERCE_CONSUMER_SECRET');

    if (!wooUrl || !consumerKey || !consumerSecret) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'WooCommerce credentials not configured' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { productData } = await req.json() as { productData: ProductData };

    if (!productData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Product data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build review notes as HTML for description
    const reviewNotesHtml = productData.review_notes.length > 0 
      ? `\n\n<h3>Review Notes:</h3>\n<ul>${productData.review_notes.map(n => 
          `<li><strong>${n.type.toUpperCase()}</strong>${n.field ? ` (${n.field})` : ''}: ${n.message}</li>`
        ).join('\n')}</ul>`
      : '';

    // Build key highlights as HTML
    const keyHighlightsHtml = productData.descriptions.key_highlights.length > 0
      ? `<h3>Key Highlights</h3>\n<ul>${productData.descriptions.key_highlights.map(h => `<li>${h}</li>`).join('\n')}</ul>`
      : '';

    // Build full description
    const fullDescription = `${productData.descriptions.product_overview}\n\n${keyHighlightsHtml}${reviewNotesHtml}`;

    // Build key specifications for short description
    const shortDescription = productData.sales_content.key_specifications.length > 0
      ? `<ul>${productData.sales_content.key_specifications.map(s => `<li>${s}</li>`).join('\n')}</ul>`
      : productData.descriptions.product_overview.substring(0, 200);

    // Prepare images array for WooCommerce
    const images = productData.images.map((url, index) => ({
      src: url,
      position: index,
    }));

    // Build meta data for ACF fields
    const metaData = [
      // Supplier & Trade
      { key: 'supplier_name', value: productData.supplier_trade.supplier_name },
      { key: 'hs_code', value: productData.supplier_trade.hs_code },
      { key: 'moq', value: productData.supplier_trade.moq?.toString() || '' },
      { key: 'moq_exclusive_importer', value: productData.supplier_trade.moq_exclusive_importer?.toString() || '' },
      { key: 'moq_distributor', value: productData.supplier_trade.moq_distributor?.toString() || '' },
      { key: 'moq_retailer', value: productData.supplier_trade.moq_retailer?.toString() || '' },
      
      // Pricing
      { key: 'cost_price', value: productData.pricing.cost_price?.toString() || '' },
      { key: 'supply_price', value: productData.pricing.supply_price?.toString() || '' },
      { key: 'wholesale_price', value: productData.pricing.wholesale_price?.toString() || '' },
      
      // Logistics
      { key: 'import_certification', value: productData.logistics.import_certification_required ? 'yes' : 'no' },
      { key: 'import_certification_details', value: productData.logistics.import_certification_details },
      { key: 'manufacturing_time', value: productData.logistics.manufacturing_time },
      
      // Sales Content
      { key: 'key_specifications', value: productData.sales_content.key_specifications.join('\n') },
      { key: 'package_options', value: productData.sales_content.package_options.join('\n') },
      { key: 'applications', value: productData.sales_content.applications.join('\n') },
      { key: 'certifications', value: JSON.stringify(productData.sales_content.certifications) },
      
      // Descriptions
      { key: 'product_overview', value: productData.descriptions.product_overview },
      { key: 'key_highlights', value: productData.descriptions.key_highlights.join('\n') },
    ];

    // Build WooCommerce product payload
    const wooProduct = {
      name: productData.product_title,
      type: 'simple',
      sku: productData.sku,
      regular_price: productData.pricing.retail_price?.toString() || '0',
      description: fullDescription,
      short_description: shortDescription,
      categories: [{ name: productData.category.split(' > ').pop() || productData.category }],
      images: images,
      meta_data: metaData,
      status: 'draft', // Import as draft for review
    };

    console.log('Importing product to WooCommerce:', productData.product_title);

    // Make request to WooCommerce REST API
    const apiUrl = `${wooUrl.replace(/\/$/, '')}/wp-json/wc/v3/products`;
    const auth = btoa(`${consumerKey}:${consumerSecret}`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(wooProduct),
    });

    const responseText = await response.text();
    let result;
    
    try {
      result = JSON.parse(responseText);
    } catch {
      console.error('Failed to parse WooCommerce response:', responseText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid response from WooCommerce',
          details: responseText.substring(0, 500)
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!response.ok) {
      console.error('WooCommerce API error:', result);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.message || 'Failed to import product',
          code: result.code,
          details: result.data
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Product imported successfully:', result.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        product_id: result.id,
        product_url: result.permalink,
        edit_url: `${wooUrl.replace(/\/$/, '')}/wp-admin/post.php?post=${result.id}&action=edit`,
        status: 'draft',
        message: `Product "${productData.product_title}" imported successfully as draft`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error importing product:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
