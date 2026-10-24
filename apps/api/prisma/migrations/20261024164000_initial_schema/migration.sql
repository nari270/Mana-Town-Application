-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('RESIDENT', 'BUSINESS_OWNER', 'WOMEN_ENTREPRENEUR', 'ADMIN');

-- CreateEnum
CREATE TYPE "EntrepreneurClassificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AdvertisementStatus" AS ENUM ('ACTIVE', 'PAUSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AdvertisementEventKind" AS ENUM ('IMPRESSION', 'CLICK');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "display_name" VARCHAR(120) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profiles" (
    "user_id" UUID NOT NULL,
    "preferred_language" VARCHAR(2) NOT NULL DEFAULT 'en',
    "locality" VARCHAR(120),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role" "UserRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role")
);

-- CreateTable
CREATE TABLE "business_categories" (
    "id" UUID NOT NULL,
    "name_en" VARCHAR(100) NOT NULL,
    "name_te" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "businesses" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(3000) NOT NULL,
    "address" VARCHAR(300) NOT NULL,
    "locality" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(32),
    "whatsapp" VARCHAR(32),
    "status" "BusinessStatus" NOT NULL DEFAULT 'DRAFT',
    "rejection_reason" VARCHAR(1000),
    "approved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "businesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_ownerships" (
    "business_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_ownerships_pkey" PRIMARY KEY ("business_id","user_id")
);

-- CreateTable
CREATE TABLE "business_category_assignments" (
    "business_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,

    CONSTRAINT "business_category_assignments_pkey" PRIMARY KEY ("business_id","category_id")
);

-- CreateTable
CREATE TABLE "business_images" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "object_key" VARCHAR(512) NOT NULL,
    "alt_text" VARCHAR(240) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_hours" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "opens_at" VARCHAR(5),
    "closes_at" VARCHAR(5),
    "closed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "business_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_moderation_history" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "status" "BusinessStatus" NOT NULL,
    "reason" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_moderation_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entrepreneur_classifications" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "requester_id" UUID NOT NULL,
    "status" "EntrepreneurClassificationStatus" NOT NULL DEFAULT 'PENDING',
    "rejection_reason" VARCHAR(1000),
    "approved_at" TIMESTAMP(3),
    "reviewed_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "entrepreneur_classifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_reports" (
    "id" UUID NOT NULL,
    "reference" VARCHAR(32) NOT NULL,
    "reporter_id" UUID NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "description" VARCHAR(5000) NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "locality" VARCHAR(120) NOT NULL,
    "status" "IssueStatus" NOT NULL DEFAULT 'SUBMITTED',
    "resolution" VARCHAR(2000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "issue_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_attachments" (
    "id" UUID NOT NULL,
    "issue_id" UUID NOT NULL,
    "object_key" VARCHAR(512) NOT NULL,
    "mime_type" VARCHAR(80) NOT NULL,

    CONSTRAINT "issue_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_status_history" (
    "id" UUID NOT NULL,
    "issue_id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "status" "IssueStatus" NOT NULL,
    "details" VARCHAR(1000),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_internal_notes" (
    "id" UUID NOT NULL,
    "issue_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "note" VARCHAR(2000) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_internal_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advertisement_campaigns" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "business_id" UUID,
    "placement" VARCHAR(80) NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "status" "AdvertisementStatus" NOT NULL DEFAULT 'PAUSED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advertisement_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advertisement_assets" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "object_key" VARCHAR(512) NOT NULL,

    CONSTRAINT "advertisement_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advertisement_events" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "kind" "AdvertisementEventKind" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advertisement_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "entity_type" VARCHAR(80) NOT NULL,
    "entity_id" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_configuration" (
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_configuration_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "key" VARCHAR(100) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "business_categories_slug_key" ON "business_categories"("slug");

-- CreateIndex
CREATE INDEX "businesses_status_locality_idx" ON "businesses"("status", "locality");

-- CreateIndex
CREATE INDEX "businesses_name_idx" ON "businesses"("name");

-- CreateIndex
CREATE INDEX "business_ownerships_user_id_idx" ON "business_ownerships"("user_id");

-- CreateIndex
CREATE INDEX "business_category_assignments_category_id_idx" ON "business_category_assignments"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "business_images_object_key_key" ON "business_images"("object_key");

-- CreateIndex
CREATE INDEX "business_images_business_id_sort_order_idx" ON "business_images"("business_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "business_hours_business_id_weekday_key" ON "business_hours"("business_id", "weekday");

-- CreateIndex
CREATE INDEX "business_moderation_history_business_id_created_at_idx" ON "business_moderation_history"("business_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "entrepreneur_classifications_business_id_key" ON "entrepreneur_classifications"("business_id");

-- CreateIndex
CREATE INDEX "entrepreneur_classifications_status_created_at_idx" ON "entrepreneur_classifications"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "issue_reports_reference_key" ON "issue_reports"("reference");

-- CreateIndex
CREATE INDEX "issue_reports_reporter_id_created_at_idx" ON "issue_reports"("reporter_id", "created_at");

-- CreateIndex
CREATE INDEX "issue_reports_status_created_at_idx" ON "issue_reports"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "issue_attachments_object_key_key" ON "issue_attachments"("object_key");

-- CreateIndex
CREATE INDEX "issue_status_history_issue_id_created_at_idx" ON "issue_status_history"("issue_id", "created_at");

-- CreateIndex
CREATE INDEX "issue_internal_notes_issue_id_created_at_idx" ON "issue_internal_notes"("issue_id", "created_at");

-- CreateIndex
CREATE INDEX "advertisement_campaigns_status_starts_at_ends_at_idx" ON "advertisement_campaigns"("status", "starts_at", "ends_at");

-- CreateIndex
CREATE UNIQUE INDEX "advertisement_assets_object_key_key" ON "advertisement_assets"("object_key");

-- CreateIndex
CREATE INDEX "advertisement_events_campaign_id_kind_created_at_idx" ON "advertisement_events"("campaign_id", "kind", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_ownerships" ADD CONSTRAINT "business_ownerships_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_ownerships" ADD CONSTRAINT "business_ownerships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_category_assignments" ADD CONSTRAINT "business_category_assignments_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_category_assignments" ADD CONSTRAINT "business_category_assignments_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "business_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_images" ADD CONSTRAINT "business_images_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_hours" ADD CONSTRAINT "business_hours_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_moderation_history" ADD CONSTRAINT "business_moderation_history_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_moderation_history" ADD CONSTRAINT "business_moderation_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrepreneur_classifications" ADD CONSTRAINT "entrepreneur_classifications_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrepreneur_classifications" ADD CONSTRAINT "entrepreneur_classifications_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "entrepreneur_classifications" ADD CONSTRAINT "entrepreneur_classifications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_reports" ADD CONSTRAINT "issue_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_attachments" ADD CONSTRAINT "issue_attachments_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issue_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_status_history" ADD CONSTRAINT "issue_status_history_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issue_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_status_history" ADD CONSTRAINT "issue_status_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_internal_notes" ADD CONSTRAINT "issue_internal_notes_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "issue_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_internal_notes" ADD CONSTRAINT "issue_internal_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advertisement_campaigns" ADD CONSTRAINT "advertisement_campaigns_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advertisement_assets" ADD CONSTRAINT "advertisement_assets_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "advertisement_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advertisement_events" ADD CONSTRAINT "advertisement_events_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "advertisement_campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

