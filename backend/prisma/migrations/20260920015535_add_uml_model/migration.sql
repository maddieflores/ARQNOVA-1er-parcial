-- CreateEnum
CREATE TYPE "UmlVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'PROTECTED', 'PACKAGE');

-- CreateEnum
CREATE TYPE "UmlRelationType" AS ENUM ('ASSOCIATION', 'AGGREGATION', 'COMPOSITION', 'INHERITANCE', 'DEPENDENCY');

-- CreateTable
CREATE TABLE "Diagram" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Diagram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UmlClass" (
    "id" UUID NOT NULL,
    "diagramId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "isAbstract" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UmlClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UmlAttribute" (
    "id" UUID NOT NULL,
    "umlClassId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "visibility" "UmlVisibility" NOT NULL DEFAULT 'PRIVATE',
    "isPrimaryKey" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UmlAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UmlMethod" (
    "id" UUID NOT NULL,
    "umlClassId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "returnType" TEXT NOT NULL,
    "visibility" "UmlVisibility" NOT NULL DEFAULT 'PUBLIC',
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "UmlMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UmlRelation" (
    "id" UUID NOT NULL,
    "diagramId" UUID NOT NULL,
    "sourceClassId" UUID NOT NULL,
    "targetClassId" UUID NOT NULL,
    "type" "UmlRelationType" NOT NULL,
    "sourceMultiplicity" TEXT NOT NULL DEFAULT '1',
    "targetMultiplicity" TEXT NOT NULL DEFAULT '1',
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UmlRelation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Diagram_projectId_key" ON "Diagram"("projectId");

-- CreateIndex
CREATE INDEX "UmlClass_diagramId_idx" ON "UmlClass"("diagramId");

-- CreateIndex
CREATE INDEX "UmlAttribute_umlClassId_position_idx" ON "UmlAttribute"("umlClassId", "position");

-- CreateIndex
CREATE INDEX "UmlMethod_umlClassId_position_idx" ON "UmlMethod"("umlClassId", "position");

-- CreateIndex
CREATE INDEX "UmlRelation_diagramId_idx" ON "UmlRelation"("diagramId");

-- CreateIndex
CREATE INDEX "UmlRelation_sourceClassId_idx" ON "UmlRelation"("sourceClassId");

-- CreateIndex
CREATE INDEX "UmlRelation_targetClassId_idx" ON "UmlRelation"("targetClassId");

-- AddForeignKey
ALTER TABLE "Diagram" ADD CONSTRAINT "Diagram_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UmlClass" ADD CONSTRAINT "UmlClass_diagramId_fkey" FOREIGN KEY ("diagramId") REFERENCES "Diagram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UmlAttribute" ADD CONSTRAINT "UmlAttribute_umlClassId_fkey" FOREIGN KEY ("umlClassId") REFERENCES "UmlClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UmlMethod" ADD CONSTRAINT "UmlMethod_umlClassId_fkey" FOREIGN KEY ("umlClassId") REFERENCES "UmlClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UmlRelation" ADD CONSTRAINT "UmlRelation_diagramId_fkey" FOREIGN KEY ("diagramId") REFERENCES "Diagram"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UmlRelation" ADD CONSTRAINT "UmlRelation_sourceClassId_fkey" FOREIGN KEY ("sourceClassId") REFERENCES "UmlClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UmlRelation" ADD CONSTRAINT "UmlRelation_targetClassId_fkey" FOREIGN KEY ("targetClassId") REFERENCES "UmlClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
