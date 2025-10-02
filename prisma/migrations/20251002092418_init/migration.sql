-- CreateTable
CREATE TABLE "User" (
    "athleteId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "profileImage" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncAt" TIMESTAMP(3),
    "syncStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "syncProgress" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "User_pkey" PRIMARY KEY ("athleteId")
);

-- CreateTable
CREATE TABLE "Token" (
    "athleteId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scopes" TEXT[],

    CONSTRAINT "Token_pkey" PRIMARY KEY ("athleteId")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "distance" DOUBLE PRECISION NOT NULL,
    "movingTime" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocationStat" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT,
    "activityCount" INTEGER NOT NULL,
    "totalDistance" DOUBLE PRECISION NOT NULL,
    "totalTime" INTEGER NOT NULL,
    "firstActivity" TIMESTAMP(3) NOT NULL,
    "lastActivity" TIMESTAMP(3) NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocationStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Activity_activityId_key" ON "Activity"("activityId");

-- CreateIndex
CREATE INDEX "Activity_athleteId_country_city_idx" ON "Activity"("athleteId", "country", "city");

-- CreateIndex
CREATE INDEX "Activity_athleteId_startDate_idx" ON "Activity"("athleteId", "startDate");

-- CreateIndex
CREATE INDEX "Activity_country_idx" ON "Activity"("country");

-- CreateIndex
CREATE INDEX "Activity_city_idx" ON "Activity"("city");

-- CreateIndex
CREATE INDEX "LocationStat_athleteId_idx" ON "LocationStat"("athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "LocationStat_athleteId_country_city_key" ON "LocationStat"("athleteId", "country", "city");

-- AddForeignKey
ALTER TABLE "Token" ADD CONSTRAINT "Token_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("athleteId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "User"("athleteId") ON DELETE CASCADE ON UPDATE CASCADE;
