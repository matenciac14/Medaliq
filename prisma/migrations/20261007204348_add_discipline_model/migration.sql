/*
  Warnings:

  - You are about to drop the `PendingNutritionAdjustment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PendingNutritionAdjustment" DROP CONSTRAINT "PendingNutritionAdjustment_sessionLogId_fkey";

-- DropForeignKey
ALTER TABLE "PendingNutritionAdjustment" DROP CONSTRAINT "PendingNutritionAdjustment_userId_fkey";

-- AlterTable
ALTER TABLE "Exercise" ADD COLUMN     "discipline" TEXT,
ADD COLUMN     "disciplineId" TEXT;

-- AlterTable
ALTER TABLE "SessionLog" ADD COLUMN     "disciplineId" TEXT;

-- DropTable
DROP TABLE "PendingNutritionAdjustment";

-- DropEnum
DROP TYPE "AdjustmentStatus";

-- CreateTable
CREATE TABLE "Discipline" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEs" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT '#6b7280',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "hasExerciseLibrary" BOOLEAN NOT NULL DEFAULT false,
    "trackingFields" JSONB NOT NULL DEFAULT '{}',
    "sessionTypes" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Discipline_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Discipline_slug_key" ON "Discipline"("slug");

-- CreateIndex
CREATE INDEX "Exercise_disciplineId_idx" ON "Exercise"("disciplineId");

-- CreateIndex
CREATE INDEX "SessionLog_disciplineId_idx" ON "SessionLog"("disciplineId");

-- AddForeignKey
ALTER TABLE "SessionLog" ADD CONSTRAINT "SessionLog_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_disciplineId_fkey" FOREIGN KEY ("disciplineId") REFERENCES "Discipline"("id") ON DELETE SET NULL ON UPDATE CASCADE;
