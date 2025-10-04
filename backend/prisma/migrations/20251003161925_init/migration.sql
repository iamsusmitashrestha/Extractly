-- CreateTable
CREATE TABLE "extraction_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "url" TEXT NOT NULL,
    "instruction" TEXT NOT NULL,
    "html_content" TEXT NOT NULL,
    "parsed_fields" JSONB,
    "extracted_data" JSONB,
    "confidence_scores" JSONB,
    "processing_status" TEXT NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "extraction_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "extraction_records_created_at_idx" ON "extraction_records"("created_at");

-- CreateIndex
CREATE INDEX "extraction_records_url_idx" ON "extraction_records"("url");

-- CreateIndex
CREATE INDEX "extraction_records_processing_status_idx" ON "extraction_records"("processing_status");
