import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthCheckResult {
  status: 'connected' | 'authentication_failed' | 'invalid_credentials' | 'network_error' | 'missing_credentials';
  message: string;
  details?: {
    url_configured: boolean;
    consumer_key_configured: boolean;
    consumer_secret_configured: boolean;
    api_reachable?: boolean;
    response_status?: number;
    store_name?: string;
    wc_version?: string;
  };
  timestamp: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const timestamp = new Date().toISOString();
  
  try {
    const wooUrl = Deno.env.get('WOOCOMMERCE_URL');
    const consumerKey = Deno.env.get('WOOCOMMERCE_CONSUMER_KEY');
    const consumerSecret = Deno.env.get('WOOCOMMERCE_CONSUMER_SECRET');

    console.log('[Health Check] Starting WooCommerce API verification...');
    console.log('[Health Check] URL configured:', !!wooUrl);
    console.log('[Health Check] Consumer Key configured:', !!consumerKey);
    console.log('[Health Check] Consumer Secret configured:', !!consumerSecret);

    // Check if credentials are configured
    if (!wooUrl || !consumerKey || !consumerSecret) {
      const result: HealthCheckResult = {
        status: 'missing_credentials',
        message: 'WooCommerce credentials not fully configured',
        details: {
          url_configured: !!wooUrl,
          consumer_key_configured: !!consumerKey,
          consumer_secret_configured: !!consumerSecret,
        },
        timestamp,
      };
      console.log('[Health Check] Result:', JSON.stringify(result));
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Normalize URL - remove /wp-admin if present, ensure we're hitting the site root
    let normalizedUrl = wooUrl.replace(/\/+$/, ''); // Remove trailing slashes
    normalizedUrl = normalizedUrl.replace(/\/wp-admin\/?.*$/i, ''); // Remove /wp-admin and anything after
    
    // Test API connectivity with a lightweight request
    const apiUrl = `${normalizedUrl}/wp-json/wc/v3`;
    const auth = btoa(`${consumerKey}:${consumerSecret}`);

    console.log('[Health Check] Original URL:', wooUrl);
    console.log('[Health Check] Normalized URL:', normalizedUrl);
    console.log('[Health Check] Testing API endpoint:', apiUrl);

    try {
      // First, test basic connectivity with system status endpoint
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[Health Check] API Response Status:', response.status);

      const responseText = await response.text();
      console.log('[Health Check] Raw Response (first 500 chars):', responseText.substring(0, 500));

      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        // Not JSON response - might be HTML error page
        const result: HealthCheckResult = {
          status: 'network_error',
          message: 'Invalid response from WooCommerce API - expected JSON',
          details: {
            url_configured: true,
            consumer_key_configured: true,
            consumer_secret_configured: true,
            api_reachable: true,
            response_status: response.status,
          },
          timestamp,
        };
        console.log('[Health Check] Result:', JSON.stringify(result));
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (response.status === 401) {
        const result: HealthCheckResult = {
          status: 'authentication_failed',
          message: responseData.message || 'Authentication failed - check API credentials',
          details: {
            url_configured: true,
            consumer_key_configured: true,
            consumer_secret_configured: true,
            api_reachable: true,
            response_status: response.status,
          },
          timestamp,
        };
        console.log('[Health Check] Result:', JSON.stringify(result));
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (response.status === 403) {
        const result: HealthCheckResult = {
          status: 'invalid_credentials',
          message: responseData.message || 'Access forbidden - API keys may lack required permissions',
          details: {
            url_configured: true,
            consumer_key_configured: true,
            consumer_secret_configured: true,
            api_reachable: true,
            response_status: response.status,
          },
          timestamp,
        };
        console.log('[Health Check] Result:', JSON.stringify(result));
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!response.ok) {
        const result: HealthCheckResult = {
          status: 'network_error',
          message: responseData.message || `API returned status ${response.status}`,
          details: {
            url_configured: true,
            consumer_key_configured: true,
            consumer_secret_configured: true,
            api_reachable: true,
            response_status: response.status,
          },
          timestamp,
        };
        console.log('[Health Check] Result:', JSON.stringify(result));
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Success - API is connected
      const result: HealthCheckResult = {
        status: 'connected',
        message: 'WooCommerce API connection verified successfully',
        details: {
          url_configured: true,
          consumer_key_configured: true,
          consumer_secret_configured: true,
          api_reachable: true,
          response_status: response.status,
          store_name: responseData.store?.name || responseData.name || 'Unknown',
          wc_version: responseData.version || 'Unknown',
        },
        timestamp,
      };
      console.log('[Health Check] Result:', JSON.stringify(result));
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (fetchError) {
      console.error('[Health Check] Fetch error:', fetchError);
      const result: HealthCheckResult = {
        status: 'network_error',
        message: fetchError instanceof Error ? fetchError.message : 'Failed to reach WooCommerce API',
        details: {
          url_configured: true,
          consumer_key_configured: true,
          consumer_secret_configured: true,
          api_reachable: false,
        },
        timestamp,
      };
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('[Health Check] Unexpected error:', error);
    const result: HealthCheckResult = {
      status: 'network_error',
      message: error instanceof Error ? error.message : 'Unexpected error during health check',
      timestamp,
    };
    return new Response(JSON.stringify(result), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
