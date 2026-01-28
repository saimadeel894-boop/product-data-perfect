import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

    // Filter out placeholder/invalid image URLs and prepare for WooCommerce
    const validImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const validImageFormats = ['fm=jpg', 'fm=jpeg', 'fm=png', 'fm=gif', 'fm=webp', 'format=jpg', 'format=jpeg', 'format=png'];
    const invalidDomains = ['via.placeholder.com', 'placeholder.com', 'placehold.it', 'placekitten.com', 'picsum.photos'];
    const trustedCdns = ['images.unsplash.com', 'cdn.shopify.com', 'i.imgur.com', 'cloudinary.com', 'res.cloudinary.com'];
    
    const validImages = productData.images.filter(url => {
      if (!url || typeof url !== 'string') {
        console.log('Skipping invalid image URL:', url);
        return false;
      }
      
      // Check if URL is from a placeholder service
      const isPlaceholder = invalidDomains.some(domain => url.toLowerCase().includes(domain));
      if (isPlaceholder) {
        console.log('Skipping placeholder image:', url);
        return false;
      }
      
      const urlLower = url.toLowerCase();
      const isHttpUrl = url.startsWith('http://') || url.startsWith('https://');
      
      if (!isHttpUrl) {
        console.log('Skipping non-HTTP image:', url);
        return false;
      }
      
      // Check for valid file extension
      const hasValidExtension = validImageExtensions.some(ext => urlLower.includes(ext));
      
      // Check for valid format parameter (common in CDNs like Unsplash)
      const hasValidFormat = validImageFormats.some(fmt => urlLower.includes(fmt));
      
      // Check if from a trusted CDN (these serve images without extensions)
      const isTrustedCdn = trustedCdns.some(cdn => urlLower.includes(cdn));
      
      const isValid = hasValidExtension || hasValidFormat || isTrustedCdn;
      
      if (!isValid) {
        console.log('Skipping image without valid extension/format:', url);
      }
      
      return isValid;
    });

    const images = validImages.map((url, index) => ({
      src: url,
      position: index,
    }));
    
    console.log(`Filtered images: ${validImages.length} valid out of ${productData.images.length} total`);

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

    // Normalize URL - remove /wp-admin if present
    let normalizedUrl = wooUrl.replace(/\/+$/, ''); // Remove trailing slashes
    normalizedUrl = normalizedUrl.replace(/\/wp-admin\/?.*$/i, ''); // Remove /wp-admin and anything after
    
    // Make request to WooCommerce REST API
    const apiUrl = `${normalizedUrl}/wp-json/wc/v3/products`;
    const auth = btoa(`${consumerKey}:${consumerSecret}`);
    
    console.log('API endpoint:', apiUrl);

    // Helper function to make API request
    const makeRequest = async (payload: typeof wooProduct) => {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const responseText = await response.text();
      let result;
      
      try {
        result = JSON.parse(responseText);
      } catch {
        console.error('Failed to parse WooCommerce response:', responseText);
        return { ok: false, error: 'Invalid response from WooCommerce', details: responseText.substring(0, 500) };
      }
      
      return { ok: response.ok, status: response.status, result };
    };

    // Helper function to generate unique SKU suffix
    const generateUniqueSku = (baseSku: string) => {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 6);
      return `${baseSku}-${timestamp}${random}`;
    };

    // First attempt with images
    let apiResponse = await makeRequest(wooProduct);
    let importedWithImages = true;
    let skuModified = false;
    let finalSku = wooProduct.sku;
    
    // If failed due to duplicate SKU, retry with unique SKU
    if (!apiResponse.ok && apiResponse.result?.code === 'product_invalid_sku') {
      console.log('Duplicate SKU detected, generating unique SKU...');
      finalSku = generateUniqueSku(wooProduct.sku);
      const payloadWithUniqueSku = { ...wooProduct, sku: finalSku };
      apiResponse = await makeRequest(payloadWithUniqueSku);
      skuModified = true;
    }
    
    // If failed due to image upload error, retry without images
    if (!apiResponse.ok && apiResponse.result?.code === 'woocommerce_product_image_upload_error') {
      console.log('Image upload failed, retrying without images...');
      const payloadWithoutImages = { ...wooProduct, images: [], sku: finalSku };
      apiResponse = await makeRequest(payloadWithoutImages);
      importedWithImages = false;
    }

    // Handle parsing errors
    if (apiResponse.error) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: apiResponse.error,
          details: apiResponse.details
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!apiResponse.ok) {
      console.error('WooCommerce API error:', apiResponse.result);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: apiResponse.result.message || 'Failed to import product',
          code: apiResponse.result.code,
          details: apiResponse.result.data
        }),
        { status: apiResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = apiResponse.result;
    console.log('Product imported successfully:', result.id, 'with images:', importedWithImages);

    // Normalize URL for edit link (remove /wp-admin if present)
    const baseUrl = wooUrl.replace(/\/+$/, '').replace(/\/wp-admin\/?.*$/i, '');
    
    // Build success message
    let successMessage = `Product "${productData.product_title}" imported successfully as draft`;
    if (skuModified) {
      successMessage += `. Note: SKU was modified to "${finalSku}" because the original SKU already exists.`;
    }
    if (!importedWithImages && images.length > 0) {
      successMessage += ' Images could not be uploaded - please add them manually in WordPress.';
    }
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        product_id: result.id,
        product_url: result.permalink,
        edit_url: `${baseUrl}/wp-admin/post.php?post=${result.id}&action=edit`,
        status: 'draft',
        sku: finalSku,
        sku_modified: skuModified,
        original_sku: skuModified ? productData.sku : undefined,
        images_imported: importedWithImages,
        images_count: importedWithImages ? images.length : 0,
        message: successMessage
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
