-- CreateTable: condition_formula_steps
CREATE TABLE "condition_formula_steps" (
    "id" SERIAL NOT NULL,
    "condition_type" TEXT NOT NULL,
    "step_number" INTEGER NOT NULL,
    "step_text" TEXT NOT NULL,
    "language" VARCHAR(5) NOT NULL DEFAULT 'ro',
    CONSTRAINT "condition_formula_steps_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "condition_formula_steps_condition_type_step_number_language_key" ON "condition_formula_steps"("condition_type", "step_number", "language");

-- CreateTable: condition_writeup_answers
CREATE TABLE "condition_writeup_answers" (
    "id" SERIAL NOT NULL,
    "condition_id" INTEGER NOT NULL,
    "step_number" INTEGER NOT NULL,
    "answer_text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "condition_writeup_answers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "condition_writeup_answers_condition_id_step_number_key" ON "condition_writeup_answers"("condition_id", "step_number");
ALTER TABLE "condition_writeup_answers" ADD CONSTRAINT "condition_writeup_answers_condition_id_fkey" FOREIGN KEY ("condition_id") REFERENCES "statistic_conditions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: battleplans
CREATE TABLE "battleplans" (
    "id" SERIAL NOT NULL,
    "organization_id" BIGINT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "battleplans_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "battleplans" ADD CONSTRAINT "battleplans_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable: condition_step_battleplans
CREATE TABLE "condition_step_battleplans" (
    "id" SERIAL NOT NULL,
    "condition_id" INTEGER NOT NULL,
    "step_number" INTEGER NOT NULL,
    "battleplan_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "condition_step_battleplans_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "condition_step_battleplans" ADD CONSTRAINT "condition_step_battleplans_battleplan_id_fkey" FOREIGN KEY ("battleplan_id") REFERENCES "battleplans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate condition_type column from enum to TEXT for Romanian values
ALTER TABLE "statistic_conditions" ALTER COLUMN "condition_type" TYPE TEXT;

-- Update existing enum values to Romanian
UPDATE "statistic_conditions" SET "condition_type" = 'putere' WHERE "condition_type" = 'power';
UPDATE "statistic_conditions" SET "condition_type" = 'schimbare_putere' WHERE "condition_type" = 'power_change';
UPDATE "statistic_conditions" SET "condition_type" = 'abundenta' WHERE "condition_type" = 'affluence';
UPDATE "statistic_conditions" SET "condition_type" = 'urgenta' WHERE "condition_type" = 'emergency';
UPDATE "statistic_conditions" SET "condition_type" = 'pericol_conducere' WHERE "condition_type" = 'danger';
UPDATE "statistic_conditions" SET "condition_type" = 'pericol_personal' WHERE "condition_type" = 'personal_danger';
UPDATE "statistic_conditions" SET "condition_type" = 'non_existenta' WHERE "condition_type" = 'non_existence';
UPDATE "statistic_conditions" SET "condition_type" = 'non_existenta_extinsa' WHERE "condition_type" = 'extended_non_existence';

-- Drop old enum type (if it exists)
DROP TYPE IF EXISTS "ConditionType";
