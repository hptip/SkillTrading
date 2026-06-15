/*
  Warnings:

  - The `status` column on the `Booking` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `Skill` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `type` on the `Transaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "slotDay" TEXT,
ADD COLUMN     "slotEndTime" TEXT,
ADD COLUMN     "slotStartTime" TEXT,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Skill" ADD COLUMN     "availabilitySlots" JSONB DEFAULT '[]',
ADD COLUMN     "coverImage" TEXT,
ADD COLUMN     "galleryImages" JSONB DEFAULT '[]',
ADD COLUMN     "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'USER',
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- DropEnum
DROP TYPE "BookingStatus";

-- DropEnum
DROP TYPE "SkillStatus";

-- DropEnum
DROP TYPE "TransactionType";

-- DropEnum
DROP TYPE "UserRole";

-- DropEnum
DROP TYPE "UserStatus";
