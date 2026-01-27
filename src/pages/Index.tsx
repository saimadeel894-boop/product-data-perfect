import { useState } from 'react';
import { Header } from '@/components/Header';
import { ProductInputForm } from '@/components/ProductInputForm';
import { JsonOutput } from '@/components/JsonOutput';
import { ReviewNotes } from '@/components/ReviewNotes';
import { DataPreview } from '@/components/DataPreview';
import { ProductData } from '@/types/product';
import { generateMockProductData } from '@/lib/mockProductData';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Code, Eye, AlertCircle } from 'lucide-react';

const Index = () => {
  const [productData, setProductData] = useState<ProductData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (productName: string, pdfFile: File | null) => {
    setIsLoading(true);
    
    // Simulate API processing delay
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    // Generate mock data based on input
    const data = generateMockProductData(productName);
    setProductData(data);
    setIsLoading(false);
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
                Enter a product name or upload a product PDF. The system will extract, 
                validate, and structure the data for WooCommerce import.
              </p>
              <ProductInputForm onSubmit={handleSubmit} isLoading={isLoading} />
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
                Example: Jimmy H8 Flex Cordless Vacuum Cleaner 550W
              </p>
            </div>
          </div>

          {/* Output Section */}
          <div className="space-y-6">
            {productData ? (
              <div className="card-elevated p-6 animate-fade-in">
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
                    Enter a product name or upload a PDF to generate structured 
                    WooCommerce-ready JSON data
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
