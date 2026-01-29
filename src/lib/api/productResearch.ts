import { supabase } from '@/integrations/supabase/client';
import { ProductData } from '@/types/product';

// In-memory store for spec hashes during session
// In production, this could be stored in a database
const specHashRegistry: Map<string, string> = new Map();

interface ProductResearchResponse {
  success: boolean;
  data?: ProductData & {
    _metadata: {
      model_researched: string;
      extraction_timestamp: string;
      sources_used: string[];
      spec_hash: string;
    };
  };
  spec_hash?: string;
  error?: string;
  raw_response?: string;
}

export async function researchProduct(
  productName: string,
  pdfContent?: string,
  category?: string
): Promise<ProductResearchResponse> {
  try {
    const { data, error } = await supabase.functions.invoke('product-research', {
      body: {
        productName,
        pdfContent,
        category,
      },
    });

    if (error) {
      console.error('Product research error:', error);
      return {
        success: false,
        error: error.message || 'Failed to research product',
      };
    }

    return data as ProductResearchResponse;
  } catch (err) {
    console.error('Product research exception:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error occurred',
    };
  }
}

export function validateSpecUniqueness(
  specHash: string,
  productName: string
): { isUnique: boolean; conflictingProduct?: string } {
  // Check if this spec hash already exists
  const existingProduct = specHashRegistry.get(specHash);
  
  if (existingProduct && existingProduct !== productName) {
    return {
      isUnique: false,
      conflictingProduct: existingProduct,
    };
  }
  
  return { isUnique: true };
}

export function registerSpecHash(specHash: string, productName: string): void {
  specHashRegistry.set(specHash, productName);
}

export function clearSpecRegistry(): void {
  specHashRegistry.clear();
}

export function getRegisteredProducts(): string[] {
  return Array.from(specHashRegistry.values());
}

// Helper to extract text from PDF file
export async function extractPdfText(file: File): Promise<string> {
  // For now, we'll read the file as text if it's actually a text file
  // or return a placeholder for actual PDF parsing
  // In a real implementation, you'd use a PDF parsing library
  
  try {
    // Check if it's a text-based file we can read directly
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      return await file.text();
    }
    
    // For PDF files, we'll send the base64 content
    // The AI can try to extract what it can from the raw content
    const arrayBuffer = await file.arrayBuffer();
    const base64 = btoa(
      new Uint8Array(arrayBuffer).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        ''
      )
    );
    
    // Return a note that PDF parsing would happen server-side
    return `[PDF Document: ${file.name}]\nNote: PDF content requires server-side parsing. Using filename and any embedded text for context.`;
  } catch (err) {
    console.error('Error reading file:', err);
    return '';
  }
}
