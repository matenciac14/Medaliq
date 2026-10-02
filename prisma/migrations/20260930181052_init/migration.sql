-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ATHLETE', 'COACH', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BLOCKED', 'DELETED');

-- CreateEnum
CREATE TYPE "AthleteStatus" AS ENUM ('ACTIVE', 'PAUSED');

-- CreateEnum
CREATE TYPE "GoalType" AS ENUM ('RACE_5K', 'RACE_10K', 'RACE_HALF_MARATHON', 'RACE_MARATHON', 'RACE_TRIATHLON', 'RACE_CYCLING', 'RACE_SWIMMING', 'FOOTBALL_GPP', 'STRENGTH_TRAINING', 'BODY_RECOMPOSITION', 'WEIGHT_LOSS', 'GENERAL_FITNESS');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'PAUSED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "PlanSource" AS ENUM ('COACH');

-- CreateEnum
CREATE TYPE "Phase" AS ENUM ('BASE', 'DESARROLLO', 'ESPECIFICO', 'AFINAMIENTO');

-- CreateEnum
CREATE TYPE "SessionIntensity" AS ENUM ('HIGH', 'MODERATE', 'LOW', 'REST');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('RODAJE_Z2', 'FARTLEK', 'TEMPO', 'INTERVALOS', 'TIRADA_LARGA', 'FUERZA', 'CICLA', 'NATACION', 'DESCANSO', 'TEST', 'SIMULACRO', 'OTRO');

-- CreateEnum
CREATE TYPE "SessionDiscipline" AS ENUM ('RUNNING', 'STRENGTH', 'CYCLING', 'SWIMMING', 'OTHER');

-- CreateEnum
CREATE TYPE "SetType" AS ENUM ('NORMAL', 'SUPERSET', 'BISERIE', 'DROPSET', 'CIRCUIT');

-- CreateEnum
CREATE TYPE "SetLogType" AS ENUM ('WORK', 'WARMUP', 'DROPSET');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('TIP', 'ROUTINE_SHOWCASE', 'ACHIEVEMENT', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "NutritionSource" AS ENUM ('SYSTEM', 'COACH', 'ATHLETE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID');

-- CreateEnum
CREATE TYPE "CoachSpecialty" AS ENUM ('RUNNING', 'GYM', 'NUTRITION', 'ALL');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('TRIAL', 'FREE', 'PRO');

-- CreateEnum
CREATE TYPE "CoachSubscriptionTier" AS ENUM ('STARTER', 'GROWTH', 'PRO', 'SCALE');

-- CreateEnum
CREATE TYPE "AdjustmentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'PRE_WORKOUT', 'POST_WORKOUT');

-- CreateEnum
CREATE TYPE "NutritionDayType" AS ENUM ('HARD', 'EASY', 'REST');

-- CreateEnum
CREATE TYPE "FoodProposalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SuggestionType" AS ENUM ('PLAN_ADJUSTMENT', 'RECOVERY_WEEK', 'NUTRITION_CHANGE', 'GYM_DELOAD');

-- CreateEnum
CREATE TYPE "CoachProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AthleteUserType" AS ENUM ('B2C_FREE', 'B2C_PRO', 'B2B');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'ATHLETE',
    "password" TEXT,
    "emailVerified" TIMESTAMP(3),
    "featurePlan" BOOLEAN NOT NULL DEFAULT true,
    "featureCheckin" BOOLEAN NOT NULL DEFAULT true,
    "featureNutrition" BOOLEAN NOT NULL DEFAULT true,
    "featureProgress" BOOLEAN NOT NULL DEFAULT true,
    "featureLog" BOOLEAN NOT NULL DEFAULT true,
    "featureCoach" BOOLEAN NOT NULL DEFAULT false,
    "featureGym" BOOLEAN NOT NULL DEFAULT true,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "onboardingCompletedAt" TIMESTAMP(3),
    "needsRoleSelection" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT,
    "locale" TEXT,
    "pushToken" TEXT,
    "identification" TEXT,
    "phoneWa" TEXT,
    "showPhoneWa" BOOLEAN NOT NULL DEFAULT false,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "CoachAthlete" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "status" "AthleteStatus" NOT NULL DEFAULT 'ACTIVE',
    "coachGoal" TEXT,
    "privateNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachAthlete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "usedBy" TEXT,
    "usedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateOfBirth" DATE,
    "age" INTEGER NOT NULL,
    "heightCm" DOUBLE PRECISION NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "weightGoalKg" DOUBLE PRECISION,
    "hrResting" INTEGER,
    "hrMax" INTEGER,
    "ftp" INTEGER,
    "altitudeMeters" INTEGER,
    "injuries" TEXT[],
    "conditions" TEXT[],
    "medications" TEXT[],
    "sleepHoursAvg" DOUBLE PRECISION,
    "sleepScoreAvg" DOUBLE PRECISION,
    "vo2maxEstimate" DOUBLE PRECISION,
    "gender" TEXT,
    "sport" TEXT,
    "sportGoal" TEXT,
    "experienceLevel" TEXT,
    "sessionMinutes" INTEGER,
    "sportDetails" JSONB NOT NULL DEFAULT '{}',
    "dataSources" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goalType" "GoalType",
    "totalWeeks" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "PlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "hrZones" JSONB NOT NULL,
    "generatedBy" "PlanSource" NOT NULL DEFAULT 'COACH',
    "nutritionTemplateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrainingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanWeek" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "phase" "Phase" NOT NULL,
    "volumeKm" DOUBLE PRECISION,
    "focusDescription" TEXT,
    "isRecoveryWeek" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannedSession" (
    "id" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "type" "SessionType" NOT NULL,
    "intensity" "SessionIntensity" NOT NULL DEFAULT 'MODERATE',
    "durationMin" INTEGER NOT NULL,
    "distanceKm" DOUBLE PRECISION,
    "zoneTarget" TEXT,
    "structure" TEXT,
    "detailText" TEXT,
    "sportLabel" TEXT,
    "coachNote" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "workoutDayId" TEXT,

    CONSTRAINT "PlannedSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionTemplate" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SessionType" NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "distanceKm" DOUBLE PRECISION,
    "zoneTarget" TEXT,
    "detailText" TEXT,
    "sportLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plannedSessionId" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionDate" DATE,
    "rpe" INTEGER,
    "hrAvg" INTEGER,
    "hrMax" INTEGER,
    "distanceKm" DOUBLE PRECISION,
    "durationMin" INTEGER,
    "energyState" TEXT,
    "discomfort" TEXT,
    "notes" TEXT,
    "garminActivityId" TEXT,
    "freeSessionType" "SessionType",
    "actualIntensity" "SessionIntensity",
    "discipline" "SessionDiscipline",
    "caloriesBurned" INTEGER,
    "avgPaceSecPerKm" INTEGER,
    "dataSource" TEXT,
    "externalId" TEXT,

    CONSTRAINT "SessionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyRoutine" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "daysPerWeek" INTEGER NOT NULL DEFAULT 4,
    "days" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyRoutine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "hrResting" INTEGER,
    "sleepHours" DOUBLE PRECISION,
    "energyLevel" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyCheckIn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT,
    "weekNumber" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weightKg" DOUBLE PRECISION,
    "hrResting" INTEGER,
    "sleepHours" DOUBLE PRECISION,
    "sleepScore" DOUBLE PRECISION,
    "hardestSessionRpe" INTEGER,
    "dietAdherencePct" INTEGER,
    "painLevel" INTEGER,
    "painFlag" BOOLEAN NOT NULL DEFAULT false,
    "painDescription" TEXT,
    "energyLevel" INTEGER,
    "stressLevel" INTEGER,
    "motivationLevel" INTEGER,
    "nutritionAdherencePct" INTEGER,
    "waistCm" DOUBLE PRECISION,
    "armsCm" DOUBLE PRECISION,
    "hipsCm" DOUBLE PRECISION,
    "thighsCm" DOUBLE PRECISION,
    "hrvMs" DOUBLE PRECISION,
    "notes" TEXT,
    "adjustmentsTriggered" TEXT[],

    CONSTRAINT "WeeklyCheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "coachId" TEXT,
    "name" TEXT NOT NULL,
    "bodyPart" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "equipment" TEXT NOT NULL,
    "difficulty" TEXT,
    "mechanic" TEXT,
    "force" TEXT,
    "caloriesPerMinute" DOUBLE PRECISION,
    "met" DOUBLE PRECISION,
    "popularityRank" INTEGER,
    "isUnilateral" BOOLEAN NOT NULL DEFAULT false,
    "recommendedSets" TEXT,
    "recommendedReps" TEXT,
    "description" TEXT,
    "secondaryMuscles" TEXT[],
    "instructions" TEXT[],
    "nameEs" TEXT,
    "instructionsEs" TEXT[],
    "gifUrl" TEXT,
    "gifStoredUrl" TEXT,
    "videoUrl" TEXT,
    "source" TEXT NOT NULL DEFAULT 'workoutx',
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutTemplate" (
    "id" TEXT NOT NULL,
    "coachId" TEXT,
    "athleteId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "goal" TEXT,
    "level" TEXT,
    "daysPerWeek" INTEGER NOT NULL DEFAULT 3,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutDay" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "muscleGroups" TEXT[],
    "isRestDay" BOOLEAN NOT NULL DEFAULT false,
    "warmupNotes" TEXT,
    "cardioNotes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WorkoutDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutExercise" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "sets" INTEGER NOT NULL,
    "repsScheme" TEXT NOT NULL,
    "restSeconds" INTEGER,
    "notes" TEXT,
    "setType" "SetType" NOT NULL DEFAULT 'NORMAL',
    "supersetWith" TEXT,
    "suggestedNextWeightKg" DOUBLE PRECISION,

    CONSTRAINT "WorkoutExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignedWorkout" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "coachId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "weeksDuration" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignedWorkout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymSession" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "assignedWorkoutId" TEXT,
    "plannedSessionId" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "durationMin" INTEGER,
    "rpe" INTEGER,
    "energyState" TEXT,
    "discomfort" TEXT,
    "caloriesBurned" INTEGER,
    "notes" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "exerciseOverrides" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GymSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "workoutExerciseId" TEXT,
    "exerciseName" TEXT,
    "setNumber" INTEGER NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "repsCompleted" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "isPR" BOOLEAN NOT NULL DEFAULT false,
    "setLogType" "SetLogType" NOT NULL DEFAULT 'WORK',
    "rpe" INTEGER,
    "notes" TEXT,

    CONSTRAINT "SetLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachProfile" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "primarySpecialty" "CoachSpecialty" NOT NULL DEFAULT 'ALL',
    "bio" TEXT,
    "avatarUrl" TEXT,
    "headline" TEXT,
    "specialties" TEXT[],
    "city" TEXT,
    "country" TEXT NOT NULL DEFAULT 'CO',
    "whatsapp" TEXT,
    "instagram" TEXT,
    "yearsExp" INTEGER,
    "certifications" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachProgram" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sport" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "durationWeeks" INTEGER,
    "priceMonth" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "includes" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachPost" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "type" "PostType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "tags" TEXT[],
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoachPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "NutritionSource" NOT NULL DEFAULT 'SYSTEM',
    "tdee" INTEGER NOT NULL,
    "targetKcalHard" INTEGER NOT NULL,
    "targetKcalEasy" INTEGER NOT NULL,
    "targetKcalRest" INTEGER NOT NULL,
    "proteinG" INTEGER NOT NULL,
    "carbsHardG" INTEGER NOT NULL,
    "carbsEasyG" INTEGER NOT NULL,
    "fatG" INTEGER NOT NULL,
    "kcalAdjustment" INTEGER NOT NULL DEFAULT 0,
    "waterMlTarget" INTEGER DEFAULT 2000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "availableFoods" TEXT[],
    "availableFoodIds" TEXT[],
    "restrictions" TEXT[],
    "mealsPerDay" INTEGER NOT NULL DEFAULT 3,
    "weighsFood" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Food" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "kcalPer100g" DOUBLE PRECISION NOT NULL,
    "proteinPer100g" DOUBLE PRECISION NOT NULL,
    "carbsPer100g" DOUBLE PRECISION NOT NULL,
    "fatPer100g" DOUBLE PRECISION NOT NULL,
    "fiberPer100g" DOUBLE PRECISION,
    "calciumMg" DOUBLE PRECISION,
    "ironMg" DOUBLE PRECISION,
    "potassiumMg" DOUBLE PRECISION,
    "vitaminCMg" DOUBLE PRECISION,
    "magnesiumMg" DOUBLE PRECISION,
    "sodiumMg" DOUBLE PRECISION,
    "servingG" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "servingLabel" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "source" TEXT NOT NULL DEFAULT 'system',
    "barcode" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Food_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "mealType" "MealType" NOT NULL,
    "grams" DOUBLE PRECISION NOT NULL,
    "kcalLogged" DOUBLE PRECISION,
    "proteinLogged" DOUBLE PRECISION,
    "carbsLogged" DOUBLE PRECISION,
    "fatLogged" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FoodLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mealType" "MealType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "grams" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "MealTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceBenchmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "coachId" TEXT,
    "sport" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "testedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerformanceBenchmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "athleteId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAuditLog" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'TRIAL',
    "coachTier" "CoachSubscriptionTier" NOT NULL DEFAULT 'STARTER',
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "externalCustomerId" TEXT,
    "externalPriceId" TEXT,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "gateway" TEXT,
    "lastWebhookEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "fromId" TEXT,
    "toId" TEXT,
    "content" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingNutritionAdjustment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "sessionLogId" TEXT,
    "plannedIntensity" "SessionIntensity" NOT NULL,
    "actualIntensity" "SessionIntensity" NOT NULL,
    "deltaKcal" INTEGER NOT NULL,
    "deltaCarbsG" INTEGER NOT NULL,
    "plannedKcal" INTEGER NOT NULL,
    "plannedCarbsG" INTEGER NOT NULL,
    "adjustedKcal" INTEGER NOT NULL,
    "adjustedCarbsG" INTEGER NOT NULL,
    "status" "AdjustmentStatus" NOT NULL DEFAULT 'PENDING',
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingNutritionAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionTemplate" (
    "id" TEXT NOT NULL,
    "coachId" TEXT,
    "athleteId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "goal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NutritionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionTemplateDay" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "dayType" "NutritionDayType" NOT NULL,

    CONSTRAINT "NutritionTemplateDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionTemplateMeal" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "mealType" "MealType" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NutritionTemplateMeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionTemplateFoodItem" (
    "id" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "grams" DOUBLE PRECISION NOT NULL,
    "kcal" DOUBLE PRECISION NOT NULL,
    "proteinG" DOUBLE PRECISION NOT NULL,
    "carbsG" DOUBLE PRECISION NOT NULL,
    "fatG" DOUBLE PRECISION NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "NutritionTemplateFoodItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignedNutritionPlan" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignedNutritionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodProposal" (
    "id" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "kcalPer100g" DOUBLE PRECISION NOT NULL,
    "proteinPer100g" DOUBLE PRECISION NOT NULL,
    "carbsPer100g" DOUBLE PRECISION NOT NULL,
    "fatPer100g" DOUBLE PRECISION NOT NULL,
    "country" TEXT,
    "notes" TEXT,
    "status" "FoodProposalStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "foodId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetUserId" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityStreak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityStreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WearableConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "scopes" TEXT[],
    "providerAccountId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WearableConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannedMeal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "mealType" "MealType" NOT NULL,
    "foodId" TEXT NOT NULL,
    "grams" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlannedMeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AthleteNutritionOverride" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "plannedMealId" TEXT NOT NULL,
    "overrideFoodId" TEXT NOT NULL,
    "overrideGrams" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AthleteNutritionOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeIngredient" (
    "id" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "foodId" TEXT NOT NULL,
    "grams" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "mlLogged" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaterLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlanVersion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mealPlanId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "planData" JSONB NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedById" TEXT,

    CONSTRAINT "MealPlanVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressPhoto" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "takenAt" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgressPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckInSuggestion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkInId" TEXT NOT NULL,
    "type" "SuggestionType" NOT NULL,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckInSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoachNutritionProposal" (
    "id" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "deltaKcal" INTEGER NOT NULL DEFAULT 0,
    "deltaProtein" INTEGER NOT NULL DEFAULT 0,
    "deltaCarbs" INTEGER NOT NULL DEFAULT 0,
    "deltaFat" INTEGER NOT NULL DEFAULT 0,
    "status" "CoachProposalStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoachNutritionProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TierFeatureConfig" (
    "id" TEXT NOT NULL,
    "userType" "AthleteUserType" NOT NULL,
    "featurePlan" BOOLEAN NOT NULL DEFAULT false,
    "featureCheckin" BOOLEAN NOT NULL DEFAULT false,
    "featureNutrition" BOOLEAN NOT NULL DEFAULT true,
    "featureProgress" BOOLEAN NOT NULL DEFAULT false,
    "featureLog" BOOLEAN NOT NULL DEFAULT true,
    "featureGym" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,

    CONSTRAINT "TierFeatureConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_identification_key" ON "User"("identification");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneWa_key" ON "User"("phoneWa");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "CoachAthlete_athleteId_idx" ON "CoachAthlete"("athleteId");

-- CreateIndex
CREATE INDEX "CoachAthlete_coachId_status_idx" ON "CoachAthlete"("coachId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CoachAthlete_coachId_athleteId_key" ON "CoachAthlete"("coachId", "athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "InviteCode_code_key" ON "InviteCode"("code");

-- CreateIndex
CREATE INDEX "InviteCode_coachId_idx" ON "InviteCode"("coachId");

-- CreateIndex
CREATE INDEX "InviteCode_expiresAt_idx" ON "InviteCode"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "HealthProfile_userId_key" ON "HealthProfile"("userId");

-- CreateIndex
CREATE INDEX "TrainingPlan_userId_status_idx" ON "TrainingPlan"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PlanWeek_planId_weekNumber_key" ON "PlanWeek"("planId", "weekNumber");

-- CreateIndex
CREATE INDEX "PlannedSession_weekId_idx" ON "PlannedSession"("weekId");

-- CreateIndex
CREATE INDEX "PlannedSession_date_idx" ON "PlannedSession"("date");

-- CreateIndex
CREATE INDEX "SessionTemplate_coachId_idx" ON "SessionTemplate"("coachId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionLog_plannedSessionId_key" ON "SessionLog"("plannedSessionId");

-- CreateIndex
CREATE INDEX "SessionLog_userId_idx" ON "SessionLog"("userId");

-- CreateIndex
CREATE INDEX "SessionLog_completedAt_idx" ON "SessionLog"("completedAt");

-- CreateIndex
CREATE INDEX "SessionLog_userId_completedAt_idx" ON "SessionLog"("userId", "completedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyRoutine_userId_key" ON "WeeklyRoutine"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DailyLog_userId_date_key" ON "DailyLog"("userId", "date");

-- CreateIndex
CREATE INDEX "WeeklyCheckIn_userId_idx" ON "WeeklyCheckIn"("userId");

-- CreateIndex
CREATE INDEX "WeeklyCheckIn_planId_idx" ON "WeeklyCheckIn"("planId");

-- CreateIndex
CREATE INDEX "WeeklyCheckIn_userId_weekNumber_idx" ON "WeeklyCheckIn"("userId", "weekNumber");

-- CreateIndex
CREATE INDEX "Exercise_bodyPart_idx" ON "Exercise"("bodyPart");

-- CreateIndex
CREATE INDEX "Exercise_target_idx" ON "Exercise"("target");

-- CreateIndex
CREATE INDEX "Exercise_equipment_idx" ON "Exercise"("equipment");

-- CreateIndex
CREATE INDEX "WorkoutTemplate_isPublic_isActive_idx" ON "WorkoutTemplate"("isPublic", "isActive");

-- CreateIndex
CREATE INDEX "AssignedWorkout_athleteId_isActive_idx" ON "AssignedWorkout"("athleteId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "GymSession_plannedSessionId_key" ON "GymSession"("plannedSessionId");

-- CreateIndex
CREATE INDEX "GymSession_athleteId_completed_idx" ON "GymSession"("athleteId", "completed");

-- CreateIndex
CREATE INDEX "GymSession_athleteId_date_idx" ON "GymSession"("athleteId", "date");

-- CreateIndex
CREATE INDEX "GymSession_athleteId_completed_date_idx" ON "GymSession"("athleteId", "completed", "date");

-- CreateIndex
CREATE UNIQUE INDEX "GymSession_athleteId_date_assignedWorkoutId_key" ON "GymSession"("athleteId", "date", "assignedWorkoutId");

-- CreateIndex
CREATE UNIQUE INDEX "GymSession_athleteId_date_plannedSessionId_key" ON "GymSession"("athleteId", "date", "plannedSessionId");

-- CreateIndex
CREATE INDEX "SetLog_sessionId_idx" ON "SetLog"("sessionId");

-- CreateIndex
CREATE INDEX "SetLog_workoutExerciseId_idx" ON "SetLog"("workoutExerciseId");

-- CreateIndex
CREATE INDEX "SetLog_exerciseName_completed_idx" ON "SetLog"("exerciseName", "completed");

-- CreateIndex
CREATE UNIQUE INDEX "CoachProfile_coachId_key" ON "CoachProfile"("coachId");

-- CreateIndex
CREATE UNIQUE INDEX "CoachProfile_slug_key" ON "CoachProfile"("slug");

-- CreateIndex
CREATE INDEX "CoachProfile_isPublic_idx" ON "CoachProfile"("isPublic");

-- CreateIndex
CREATE UNIQUE INDEX "NutritionPlan_userId_key" ON "NutritionPlan"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FoodProfile_userId_key" ON "FoodProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MealPlan_userId_key" ON "MealPlan"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Food_barcode_key" ON "Food"("barcode");

-- CreateIndex
CREATE INDEX "Food_category_idx" ON "Food"("category");

-- CreateIndex
CREATE INDEX "Food_isActive_idx" ON "Food"("isActive");

-- CreateIndex
CREATE INDEX "Food_barcode_idx" ON "Food"("barcode");

-- CreateIndex
CREATE INDEX "Food_country_idx" ON "Food"("country");

-- CreateIndex
CREATE INDEX "FoodLog_userId_date_idx" ON "FoodLog"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "FoodLog_userId_foodId_date_mealType_key" ON "FoodLog"("userId", "foodId", "date", "mealType");

-- CreateIndex
CREATE INDEX "MealTemplate_userId_idx" ON "MealTemplate"("userId");

-- CreateIndex
CREATE INDEX "PerformanceBenchmark_userId_sport_idx" ON "PerformanceBenchmark"("userId", "sport");

-- CreateIndex
CREATE INDEX "PerformanceBenchmark_userId_metric_testedAt_idx" ON "PerformanceBenchmark"("userId", "metric", "testedAt");

-- CreateIndex
CREATE INDEX "Payment_coachId_status_idx" ON "Payment"("coachId", "status");

-- CreateIndex
CREATE INDEX "Payment_coachId_athleteId_idx" ON "Payment"("coachId", "athleteId");

-- CreateIndex
CREATE INDEX "Payment_dueDate_status_idx" ON "Payment"("dueDate", "status");

-- CreateIndex
CREATE INDEX "PaymentAuditLog_paymentId_idx" ON "PaymentAuditLog"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSubscription_userId_key" ON "UserSubscription"("userId");

-- CreateIndex
CREATE INDEX "Message_fromId_toId_createdAt_idx" ON "Message"("fromId", "toId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_toId_readAt_idx" ON "Message"("toId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "PendingNutritionAdjustment_sessionLogId_key" ON "PendingNutritionAdjustment"("sessionLogId");

-- CreateIndex
CREATE INDEX "PendingNutritionAdjustment_userId_status_idx" ON "PendingNutritionAdjustment"("userId", "status");

-- CreateIndex
CREATE INDEX "PendingNutritionAdjustment_userId_date_idx" ON "PendingNutritionAdjustment"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "PendingNutritionAdjustment_userId_date_key" ON "PendingNutritionAdjustment"("userId", "date");

-- CreateIndex
CREATE INDEX "NutritionTemplate_coachId_idx" ON "NutritionTemplate"("coachId");

-- CreateIndex
CREATE INDEX "NutritionTemplate_athleteId_idx" ON "NutritionTemplate"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "NutritionTemplateDay_templateId_dayType_key" ON "NutritionTemplateDay"("templateId", "dayType");

-- CreateIndex
CREATE UNIQUE INDEX "NutritionTemplateMeal_dayId_mealType_key" ON "NutritionTemplateMeal"("dayId", "mealType");

-- CreateIndex
CREATE INDEX "NutritionTemplateFoodItem_mealId_idx" ON "NutritionTemplateFoodItem"("mealId");

-- CreateIndex
CREATE UNIQUE INDEX "AssignedNutritionPlan_athleteId_key" ON "AssignedNutritionPlan"("athleteId");

-- CreateIndex
CREATE INDEX "AssignedNutritionPlan_coachId_idx" ON "AssignedNutritionPlan"("coachId");

-- CreateIndex
CREATE INDEX "AssignedNutritionPlan_templateId_idx" ON "AssignedNutritionPlan"("templateId");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "FoodProposal_status_idx" ON "FoodProposal"("status");

-- CreateIndex
CREATE INDEX "FoodProposal_submittedById_idx" ON "FoodProposal"("submittedById");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminId_idx" ON "AdminAuditLog"("adminId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_targetUserId_idx" ON "AdminAuditLog"("targetUserId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ActivityStreak_userId_key" ON "ActivityStreak"("userId");

-- CreateIndex
CREATE INDEX "UserAchievement_userId_idx" ON "UserAchievement"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_type_key" ON "UserAchievement"("userId", "type");

-- CreateIndex
CREATE INDEX "WearableConnection_userId_idx" ON "WearableConnection"("userId");

-- CreateIndex
CREATE INDEX "WearableConnection_provider_providerAccountId_idx" ON "WearableConnection"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "WearableConnection_userId_provider_key" ON "WearableConnection"("userId", "provider");

-- CreateIndex
CREATE INDEX "PlannedMeal_userId_date_idx" ON "PlannedMeal"("userId", "date");

-- CreateIndex
CREATE INDEX "AthleteNutritionOverride_athleteId_idx" ON "AthleteNutritionOverride"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "AthleteNutritionOverride_athleteId_plannedMealId_key" ON "AthleteNutritionOverride"("athleteId", "plannedMealId");

-- CreateIndex
CREATE INDEX "Recipe_userId_idx" ON "Recipe"("userId");

-- CreateIndex
CREATE INDEX "RecipeIngredient_recipeId_idx" ON "RecipeIngredient"("recipeId");

-- CreateIndex
CREATE INDEX "WaterLog_userId_idx" ON "WaterLog"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WaterLog_userId_date_key" ON "WaterLog"("userId", "date");

-- CreateIndex
CREATE INDEX "MealPlanVersion_userId_mealPlanId_idx" ON "MealPlanVersion"("userId", "mealPlanId");

-- CreateIndex
CREATE INDEX "ProgressPhoto_userId_takenAt_idx" ON "ProgressPhoto"("userId", "takenAt");

-- CreateIndex
CREATE INDEX "CheckInSuggestion_userId_status_idx" ON "CheckInSuggestion"("userId", "status");

-- CreateIndex
CREATE INDEX "CheckInSuggestion_checkInId_idx" ON "CheckInSuggestion"("checkInId");

-- CreateIndex
CREATE INDEX "CoachNutritionProposal_athleteId_status_idx" ON "CoachNutritionProposal"("athleteId", "status");

-- CreateIndex
CREATE INDEX "CoachNutritionProposal_coachId_idx" ON "CoachNutritionProposal"("coachId");

-- CreateIndex
CREATE UNIQUE INDEX "TierFeatureConfig_userType_key" ON "TierFeatureConfig"("userType");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachAthlete" ADD CONSTRAINT "CoachAthlete_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachAthlete" ADD CONSTRAINT "CoachAthlete_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteCode" ADD CONSTRAINT "InviteCode_usedBy_fkey" FOREIGN KEY ("usedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthProfile" ADD CONSTRAINT "HealthProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlan" ADD CONSTRAINT "TrainingPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingPlan" ADD CONSTRAINT "TrainingPlan_nutritionTemplateId_fkey" FOREIGN KEY ("nutritionTemplateId") REFERENCES "NutritionTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanWeek" ADD CONSTRAINT "PlanWeek_planId_fkey" FOREIGN KEY ("planId") REFERENCES "TrainingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedSession" ADD CONSTRAINT "PlannedSession_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "PlanWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedSession" ADD CONSTRAINT "PlannedSession_workoutDayId_fkey" FOREIGN KEY ("workoutDayId") REFERENCES "WorkoutDay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionTemplate" ADD CONSTRAINT "SessionTemplate_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionLog" ADD CONSTRAINT "SessionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionLog" ADD CONSTRAINT "SessionLog_plannedSessionId_fkey" FOREIGN KEY ("plannedSessionId") REFERENCES "PlannedSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyRoutine" ADD CONSTRAINT "WeeklyRoutine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyLog" ADD CONSTRAINT "DailyLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyCheckIn" ADD CONSTRAINT "WeeklyCheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercise" ADD CONSTRAINT "Exercise_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutTemplate" ADD CONSTRAINT "WorkoutTemplate_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutTemplate" ADD CONSTRAINT "WorkoutTemplate_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutDay" ADD CONSTRAINT "WorkoutDay_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "WorkoutDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedWorkout" ADD CONSTRAINT "AssignedWorkout_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "WorkoutTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedWorkout" ADD CONSTRAINT "AssignedWorkout_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedWorkout" ADD CONSTRAINT "AssignedWorkout_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymSession" ADD CONSTRAINT "GymSession_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymSession" ADD CONSTRAINT "GymSession_assignedWorkoutId_fkey" FOREIGN KEY ("assignedWorkoutId") REFERENCES "AssignedWorkout"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GymSession" ADD CONSTRAINT "GymSession_plannedSessionId_fkey" FOREIGN KEY ("plannedSessionId") REFERENCES "PlannedSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetLog" ADD CONSTRAINT "SetLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GymSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetLog" ADD CONSTRAINT "SetLog_workoutExerciseId_fkey" FOREIGN KEY ("workoutExerciseId") REFERENCES "WorkoutExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachProfile" ADD CONSTRAINT "CoachProfile_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachProgram" ADD CONSTRAINT "CoachProgram_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachPost" ADD CONSTRAINT "CoachPost_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CoachProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionPlan" ADD CONSTRAINT "NutritionPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodProfile" ADD CONSTRAINT "FoodProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodLog" ADD CONSTRAINT "FoodLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodLog" ADD CONSTRAINT "FoodLog_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealTemplate" ADD CONSTRAINT "MealTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealTemplateItem" ADD CONSTRAINT "MealTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MealTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealTemplateItem" ADD CONSTRAINT "MealTemplateItem_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceBenchmark" ADD CONSTRAINT "PerformanceBenchmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAuditLog" ADD CONSTRAINT "PaymentAuditLog_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAuditLog" ADD CONSTRAINT "PaymentAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingNutritionAdjustment" ADD CONSTRAINT "PendingNutritionAdjustment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingNutritionAdjustment" ADD CONSTRAINT "PendingNutritionAdjustment_sessionLogId_fkey" FOREIGN KEY ("sessionLogId") REFERENCES "SessionLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionTemplate" ADD CONSTRAINT "NutritionTemplate_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionTemplate" ADD CONSTRAINT "NutritionTemplate_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionTemplateDay" ADD CONSTRAINT "NutritionTemplateDay_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NutritionTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionTemplateMeal" ADD CONSTRAINT "NutritionTemplateMeal_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "NutritionTemplateDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionTemplateFoodItem" ADD CONSTRAINT "NutritionTemplateFoodItem_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "NutritionTemplateMeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NutritionTemplateFoodItem" ADD CONSTRAINT "NutritionTemplateFoodItem_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedNutritionPlan" ADD CONSTRAINT "AssignedNutritionPlan_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "NutritionTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedNutritionPlan" ADD CONSTRAINT "AssignedNutritionPlan_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedNutritionPlan" ADD CONSTRAINT "AssignedNutritionPlan_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodProposal" ADD CONSTRAINT "FoodProposal_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodProposal" ADD CONSTRAINT "FoodProposal_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodProposal" ADD CONSTRAINT "FoodProposal_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityStreak" ADD CONSTRAINT "ActivityStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WearableConnection" ADD CONSTRAINT "WearableConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedMeal" ADD CONSTRAINT "PlannedMeal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedMeal" ADD CONSTRAINT "PlannedMeal_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteNutritionOverride" ADD CONSTRAINT "AthleteNutritionOverride_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteNutritionOverride" ADD CONSTRAINT "AthleteNutritionOverride_plannedMealId_fkey" FOREIGN KEY ("plannedMealId") REFERENCES "PlannedMeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AthleteNutritionOverride" ADD CONSTRAINT "AthleteNutritionOverride_overrideFoodId_fkey" FOREIGN KEY ("overrideFoodId") REFERENCES "Food"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_foodId_fkey" FOREIGN KEY ("foodId") REFERENCES "Food"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaterLog" ADD CONSTRAINT "WaterLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlanVersion" ADD CONSTRAINT "MealPlanVersion_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "MealPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlanVersion" ADD CONSTRAINT "MealPlanVersion_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressPhoto" ADD CONSTRAINT "ProgressPhoto_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInSuggestion" ADD CONSTRAINT "CheckInSuggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckInSuggestion" ADD CONSTRAINT "CheckInSuggestion_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "WeeklyCheckIn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachNutritionProposal" ADD CONSTRAINT "CoachNutritionProposal_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoachNutritionProposal" ADD CONSTRAINT "CoachNutritionProposal_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
