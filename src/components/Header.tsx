export const Header = () => {
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          {/* Placeholder logo - replace with official Transeo Africa logo */}
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground font-bold text-lg">
            TA
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
              Product Data Architect
              <span className="text-xs font-normal text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                WooCommerce
              </span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Extract, validate, and structure B2B product data for WP All Import
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
