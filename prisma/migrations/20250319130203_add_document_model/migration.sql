-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tamano" DOUBLE PRECISION NOT NULL,
    "paginas" INTEGER NOT NULL,
    "caracteres" INTEGER NOT NULL,
    "texto_original" TEXT,
    "texto_traducido" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);
