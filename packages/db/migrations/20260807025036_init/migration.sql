-- CreateTable
CREATE TABLE "PlaygroundSession" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaygroundSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentTask" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "codeDiff" TEXT,
    "infraDiff" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "approved" BOOLEAN,

    CONSTRAINT "AgentTask_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "AgentTask" ADD CONSTRAINT "AgentTask_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PlaygroundSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
