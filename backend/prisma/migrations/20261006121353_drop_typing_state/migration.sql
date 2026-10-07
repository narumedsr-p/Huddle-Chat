/*
  Warnings:

  - You are about to drop the `TypingState` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TypingState" DROP CONSTRAINT "TypingState_clientId_fkey";

-- DropTable
DROP TABLE "TypingState";
