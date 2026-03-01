-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'user');

-- CreateEnum
CREATE TYPE "AggregationType" AS ENUM ('daily', 'weekly', 'monthly', 'quarterly', 'yearly');

-- CreateEnum
CREATE TYPE "MeasurementType" AS ENUM ('numeric', 'currency', 'percentage');

-- CreateEnum
CREATE TYPE "AxisMode" AS ENUM ('auto', 'manual');

-- CreateEnum
CREATE TYPE "GraphType" AS ENUM ('normal', 'formula');

-- CreateEnum
CREATE TYPE "StatStatus" AS ENUM ('active', 'archived');

-- CreateEnum
CREATE TYPE "AuthorType" AS ENUM ('user', 'system', 'api');

-- CreateEnum
CREATE TYPE "ConditionType" AS ENUM ('power', 'power_change', 'affluence', 'normal', 'emergency', 'danger', 'personal_danger', 'non_existence', 'extended_non_existence');

-- CreateTable
CREATE TABLE "organizations" (
    "id" BIGINT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "status" "OrgStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statistic_groups" (
    "id" SERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "statistic_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statistics" (
    "id" SERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "aggregation_type" "AggregationType" NOT NULL DEFAULT 'daily',
    "measurement_type" "MeasurementType" NOT NULL DEFAULT 'numeric',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "responsible_person_id" INTEGER,
    "viability_threshold" DECIMAL(15,2),
    "is_inverted" BOOLEAN NOT NULL DEFAULT false,
    "axis_mode" "AxisMode" NOT NULL DEFAULT 'auto',
    "axis_min" DECIMAL(15,2),
    "axis_max" DECIMAL(15,2),
    "work_days" JSONB NOT NULL DEFAULT '{"mon":true,"tue":true,"wed":true,"thu":true,"fri":true,"sat":false,"sun":false}',
    "graph_type" "GraphType" NOT NULL DEFAULT 'normal',
    "formula" TEXT,
    "api_key" VARCHAR(50),
    "status" "StatStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "statistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statistic_group_assignments" (
    "statistic_id" INTEGER NOT NULL,
    "group_id" INTEGER NOT NULL,

    CONSTRAINT "statistic_group_assignments_pkey" PRIMARY KEY ("statistic_id","group_id")
);

-- CreateTable
CREATE TABLE "statistic_values" (
    "id" BIGSERIAL NOT NULL,
    "statistic_id" INTEGER NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "record_date" DATE NOT NULL,
    "value" DECIMAL(15,2) NOT NULL,
    "author_id" INTEGER,
    "author_type" "AuthorType" NOT NULL DEFAULT 'user',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "statistic_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statistic_quotas" (
    "id" SERIAL NOT NULL,
    "statistic_id" INTEGER NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "quota_value" DECIMAL(15,2) NOT NULL,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "statistic_quotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statistic_conditions" (
    "id" SERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "statistic_id" INTEGER,
    "condition_type" "ConditionType" NOT NULL,
    "condition_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "statistic_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "statistics_api_key_key" ON "statistics"("api_key");

-- CreateIndex
CREATE UNIQUE INDEX "statistic_values_statistic_id_record_date_key" ON "statistic_values"("statistic_id", "record_date");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statistic_groups" ADD CONSTRAINT "statistic_groups_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statistics" ADD CONSTRAINT "statistics_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statistics" ADD CONSTRAINT "statistics_responsible_person_id_fkey" FOREIGN KEY ("responsible_person_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statistic_group_assignments" ADD CONSTRAINT "statistic_group_assignments_statistic_id_fkey" FOREIGN KEY ("statistic_id") REFERENCES "statistics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statistic_group_assignments" ADD CONSTRAINT "statistic_group_assignments_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "statistic_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statistic_values" ADD CONSTRAINT "statistic_values_statistic_id_fkey" FOREIGN KEY ("statistic_id") REFERENCES "statistics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statistic_values" ADD CONSTRAINT "statistic_values_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statistic_values" ADD CONSTRAINT "statistic_values_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statistic_quotas" ADD CONSTRAINT "statistic_quotas_statistic_id_fkey" FOREIGN KEY ("statistic_id") REFERENCES "statistics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statistic_quotas" ADD CONSTRAINT "statistic_quotas_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statistic_conditions" ADD CONSTRAINT "statistic_conditions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statistic_conditions" ADD CONSTRAINT "statistic_conditions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statistic_conditions" ADD CONSTRAINT "statistic_conditions_statistic_id_fkey" FOREIGN KEY ("statistic_id") REFERENCES "statistics"("id") ON DELETE SET NULL ON UPDATE CASCADE;
