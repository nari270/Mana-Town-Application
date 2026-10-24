-- AlterTable
ALTER TABLE "users" ADD COLUMN "username" VARCHAR(50),
ADD COLUMN "password_hash" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
