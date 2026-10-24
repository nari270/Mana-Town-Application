-- CreateTable
CREATE TABLE "access_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "username" VARCHAR(50),
    "event" VARCHAR(30) NOT NULL,
    "method" VARCHAR(10),
    "path" VARCHAR(300),
    "status_code" INTEGER,
    "ip_address" VARCHAR(64),
    "user_agent" VARCHAR(300),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_views" (
    "id" UUID NOT NULL,
    "business_id" UUID NOT NULL,
    "viewer_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "access_logs_created_at_idx" ON "access_logs"("created_at");

-- CreateIndex
CREATE INDEX "access_logs_user_id_created_at_idx" ON "access_logs"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "access_logs_event_created_at_idx" ON "access_logs"("event", "created_at");

-- CreateIndex
CREATE INDEX "business_views_business_id_created_at_idx" ON "business_views"("business_id", "created_at");

-- CreateIndex
CREATE INDEX "business_views_viewer_id_idx" ON "business_views"("viewer_id");

-- AddForeignKey
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_views" ADD CONSTRAINT "business_views_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_views" ADD CONSTRAINT "business_views_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
