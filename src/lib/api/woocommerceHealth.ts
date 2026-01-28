import { supabase } from '@/integrations/supabase/client';

export type HealthStatus = 'connected' | 'authentication_failed' | 'invalid_credentials' | 'network_error' | 'missing_credentials';

export interface HealthCheckResult {
  status: HealthStatus;
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

export const wooCommerceHealthApi = {
  async checkHealth(): Promise<HealthCheckResult> {
    try {
      const { data, error } = await supabase.functions.invoke('woocommerce-health');

      if (error) {
        return {
          status: 'network_error',
          message: error.message || 'Failed to connect to health check service',
          timestamp: new Date().toISOString(),
        };
      }

      return data as HealthCheckResult;
    } catch (err) {
      return {
        status: 'network_error',
        message: err instanceof Error ? err.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
      };
    }
  },
};
