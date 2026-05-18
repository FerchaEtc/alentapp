/*
  Warnings:

  - The primary key for the `members` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `id` on the `members` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('Pending', 'Paid', 'Canceled');



-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'Pending',
    "member_id" TEXT NOT NULL,

    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,   

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);
                                                                                                                      

-- CreateIndex
CREATE UNIQUE INDEX "payments_member_id_month_year_key" ON "payments"("member_id", "month", "year");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
