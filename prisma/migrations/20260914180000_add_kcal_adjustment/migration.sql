-- AlterTable: add kcalAdjustment to NutritionPlan
ALTER TABLE "NutritionPlan" ADD COLUMN "kcalAdjustment" INTEGER NOT NULL DEFAULT 0;
