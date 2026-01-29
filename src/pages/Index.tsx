import { useState } from 'react';
import { Header } from '@/components/Header';
import { ProductInputForm } from '@/components/ProductInputForm';
import { JsonOutput } from '@/components/JsonOutput';
import { ReviewNotes } from '@/components/ReviewNotes';
import { DataPreview } from '@/components/DataPreview';
import { ImportButton } from '@/components/ImportButton';
import { ApiHealthStatus } from '@/components/ApiHealthStatus';
import { ProductData } from '@/types/product';
import { 
  researchProduct, 
  validateSpecUniqueness, 
  registerSpecHash,
  extractPdfText 
} from '@/lib/api/productResearch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code, Eye, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const Index = () => {
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [researchStatus, setResearchStatus] = useState<string>('');

  const handleSubmit = async (productName: string, pdfFile: File | null) => {
    setIsLoading(true);
    setProductData(null);
    setResearchStatus('Initializing AI research...');
    
    try {
      // Extract PDF content if provided
      let pdfContent: string | undefined;
      if (pdfFile) {
        setResearchStatus('Extracting PDF content...');
        pdfContent = await extractPdfText(pdfFile);
      }

      setResearchStatus(`Researching specifications for "${productName}"...`);
      
      // Call the AI research edge function
      const result = await researchProduct(productName, pdfContent);

      if (!result.success || !result.data) {
        toast.error('Research Failed', {
          description: result.error || 'Could not extract product data',
        });
        setIsLoading(false);
        setResearchStatus('');
        return;
      }

      const specHash = result.spec_hash || result.data._metadata?.spec_hash;

      // Validate spec uniqueness
      if (specHash) {
        setResearchStatus('Validating specification uniqueness...');
        const validation = validateSpecUniqueness(specHash, productName);
        
        if (!validation.isUnique) {
          toast.error('Incorrect Spec Mapping Detected', {
            description: `Specifications match another product: "${validation.conflictingProduct}". Each product must have unique specifications.`,
            duration: 10000,
          });
          setIsLoading(false);
          setResearchStatus('');
          return;
        }

        // Register the spec hash for future duplicate detection
        registerSpecHash(specHash, productName);
      }

      setResearchStatus('Processing complete!');
      
      // Remove internal metadata before setting state (keep it clean for display)
      const { _metadata, ...displayData } = result.data;
      
      // Add metadata info to review notes if not already present
      const dataWithMetadataNote: ProductData = {
        ...displayData,
        review_notes: [
          ...displayData.review_notes,
          {
            type: 'source' as const,
            message: `Model researched: "${_metadata?.model_researched}". Spec hash: ${_metadata?.spec_hash?.substring(0, 8)}... (unique identifier for duplicate detection)`
          }
        ]
      };

      setProductData(dataWithMetadataNote);
      toast.success('Research Complete', {
        description: `Successfully extracted data for "${result.data.product_title}"`,
      });

    } catch (error) {
      console.error('Research error:', error);
      toast.error('Research Error', {
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    } finally {
      setIsLoading(false);
      setResearchStatus('');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="space-y-6">
            <div className="card-elevated p-6 animate-fade-in">
              <h2 className="section-title mb-4">Product Input</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Enter a product name or upload a product PDF. The AI will research 
                and extract model-specific data for WooCommerce import.
              </p>
              <ProductInputForm onSubmit={handleSubmit} isLoading={isLoading} />
              
              {/* Research Status */}
              {isLoading && researchStatus && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{researchStatus}</span>
                </div>
              )}
            </div>

            {/* Format Reference */}
            <div className="card-elevated p-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <h3 className="text-sm font-medium mb-3">Expected Title Format</h3>
              <div className="bg-secondary/50 rounded-lg p-3 font-mono text-sm">
                <span className="text-primary">Brand</span>
                <span className="text-muted-foreground"> + </span>
                <span className="text-success">Model</span>
                <span className="text-muted-foreground"> + </span>
                <span className="text-warning">Key Spec</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Example: Dyson V15 Detect Absolute Cordless Vacuum
              </p>
            </div>

            {/* AI Research Info */}
            <div className="card-elevated p-6 animate-fade-in border-l-4 border-l-primary" style={{ animationDelay: '0.15s' }}>
              <h3 className="text-sm font-medium mb-2">🤖 AI-Powered Research</h3>
              <p className="text-xs text-muted-foreground">
                Each product is researched individually using OpenAI. Specifications are extracted 
                specifically for the exact model you provide. No shared fallbacks or hardcoded data.
              </p>
              <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                <li>• Unique specs per product model</li>
                <li>• Duplicate detection via spec hashing</li>
                <li>• Source tracking in review notes</li>
              </ul>
            </div>

            {/* API Health Status */}
            <div className="card-elevated p-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <h3 className="text-sm font-medium mb-3">WooCommerce API Status</h3>
              <ApiHealthStatus />
            </div>
          </div>

          {/* Output Section */}
          <div className="space-y-6">
            {productData ? (
              <div className="card-elevated p-6 animate-fade-in">
                {/* Import Action */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
                  <div>
                    <h2 className="text-lg font-semibold">{productData.product_title}</h2>
                    <p className="text-sm text-muted-foreground font-mono">{productData.sku}</p>
                  </div>
                  <ImportButton productData={productData} />
                </div>

                <Tabs defaultValue="preview" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="preview" className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Preview
                    </TabsTrigger>
                    <TabsTrigger value="json" className="flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      JSON
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Notes
                      {productData.review_notes.length > 0 && (
                        <span className="ml-1 w-5 h-5 rounded-full bg-warning/20 text-warning text-xs flex items-center justify-center">
                          {productData.review_notes.length}
                        </span>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="preview">
                    <DataPreview data={productData} />
                  </TabsContent>

                  <TabsContent value="json">
                    <JsonOutput data={productData} />
                  </TabsContent>

                  <TabsContent value="notes">
                    <ReviewNotes notes={productData.review_notes} />
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="card-elevated p-6 animate-fade-in">
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary flex items-center justify-center">
                    <Code className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No Product Data Yet
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Enter a product name or upload a PDF to research and generate 
                    model-specific WooCommerce-ready JSON data
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
