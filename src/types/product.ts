export interface ProductPricing {
  cost_price: number | null;
  supply_price: number | null;
  wholesale_price: number | null;
  retail_price: number | null;
}

export interface SupplierTrade {
  supplier_name: string;
  hs_code: string;
  moq: number | null;
  moq_exclusive_importer: number | null;
  moq_distributor: number | null;
  moq_retailer: number | null;
}

export interface CompanyInfo {
  company_name: string;
  country_of_origin: string;
  year_established: string;
  ownership_partnerships: string;
  daily_production: string;
  annual_output: string;
  lines_installed: string;
  major_products: string;
}

export interface CertificationsStandards {
  safety_certificates: string;
  additional_certifications: string;
  export_licenses: string;
  traceability_systems: string;
}

export interface ClientsMarkets {
  key_clients: string;
  export_markets: string;
  government_supply_track_record: string;
}

export interface ContactLogistics {
  factory_address: string;
  nearest_port_of_loading: string;
  export_documentation: string;
  email: string;
  contact_number: string;
}

export interface Logistics {
  import_certification_required: boolean;
  import_certification_details: string;
  manufacturing_time: string;
  transit_time: string;
  packaging_details: string;
  payment_method: string;
}

export interface Certification {
  name: string;
  details: string;
}

export interface SalesContent {
  key_specifications: string[];
  package_options: string[];
  applications: string[];
  certifications: Certification[];
}

export interface Descriptions {
  product_overview: string;
  product_identity: string;
  key_highlights: string[];
  trust_assurance: string;
}

export interface ReviewNote {
  type: 'source' | 'estimate' | 'assumption' | 'missing';
  field?: string;
  message: string;
}

export interface ProductMetadata {
  model_researched: string;
  extraction_timestamp: string;
  sources_used: string[];
  spec_hash: string;
}

export interface ProductData {
  product_title: string;
  sku: string;
  product_type: 'simple';
  category: string;
  images: string[];
  company_info: CompanyInfo;
  certifications_standards: CertificationsStandards;
  clients_markets: ClientsMarkets;
  contact_logistics: ContactLogistics;
  pricing: ProductPricing;
  supplier_trade: SupplierTrade;
  logistics: Logistics;
  sales_content: SalesContent;
  descriptions: Descriptions;
  review_notes: ReviewNote[];
  _metadata?: ProductMetadata;
}

export interface ProductFormInput {
  productName: string;
  pdfFile: File | null;
}
