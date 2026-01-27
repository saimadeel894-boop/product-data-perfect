import { supabase } from '@/integrations/supabase/client';
import { ProductData } from '@/types/product';

export interface WooCommerceImportResult {
  success: boolean;
  product_id?: number;
  product_url?: string;
  edit_url?: string;
  status?: string;
  message?: string;
  error?: string;
  code?: string;
  details?: unknown;
}

export const wooCommerceApi = {
  async importProduct(productData: ProductData): Promise<WooCommerceImportResult> {
    const { data, error } = await supabase.functions.invoke('woocommerce-import', {
      body: { productData },
    });

    if (error) {
      return { 
        success: false, 
        error: error.message || 'Failed to connect to import service' 
      };
    }

    return data as WooCommerceImportResult;
  },
};
