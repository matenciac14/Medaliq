-- AlterTable
ALTER TABLE "HealthProfile" ADD COLUMN     "dataSources" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "experienceLevel" TEXT,
ADD COLUMN     "ftp" INTEGER,
ADD COLUMN     "sport" TEXT,
ADD COLUMN     "sportDetails" JSONB NOT NULL DEFAULT '{}';
