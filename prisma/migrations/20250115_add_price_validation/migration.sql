-- Add price validation fields to MigrosProduct
ALTER TABLE "migros_products" 
ADD COLUMN "price_variants" JSONB,
ADD COLUMN "price_confidence" VARCHAR(10),
ADD COLUMN "needs_price_review" BOOLEAN DEFAULT FALSE;

-- Add price validation fields to Product (compatibility table)
ALTER TABLE "products" 
ADD COLUMN "price_variants" JSONB,
ADD COLUMN "price_confidence" VARCHAR(10),
ADD COLUMN "needs_price_review" BOOLEAN DEFAULT FALSE;