-- Customer ordering by kg, harvest video records, several boxes per order.
-- Written when the Order table was empty (0 rows), so replacing boxSizeKg
-- with quantityKg / pricePerKg loses no data.

-- Several boxes per order: a big order is packed in more than one box
DROP INDEX "Box_orderId_key";
CREATE INDEX "Box_orderId_idx" ON "Box"("orderId");

-- Order any amount in kg; keep the seller's price as it was at order time
ALTER TABLE "Order" DROP COLUMN "boxSizeKg",
ADD COLUMN     "giftFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "landmark" TEXT,
ADD COLUMN     "pricePerKg" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "quantityKg" INTEGER NOT NULL;

-- Harvest videos: the compressed file lives in storage, this row describes it
CREATE TABLE "HarvestVideo" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "posterUrl" TEXT,
    "title" TEXT,
    "durationSec" INTEGER,
    "sizeBytes" INTEGER,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "orchardId" TEXT NOT NULL,
    "batchId" TEXT,
    CONSTRAINT "HarvestVideo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HarvestVideo_orchardId_recordedAt_idx" ON "HarvestVideo"("orchardId", "recordedAt");

ALTER TABLE "HarvestVideo" ADD CONSTRAINT "HarvestVideo_orchardId_fkey" FOREIGN KEY ("orchardId") REFERENCES "Orchard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "HarvestVideo" ADD CONSTRAINT "HarvestVideo_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
