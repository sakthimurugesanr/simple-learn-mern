CREATE TABLE "NewsletterSubscription" (
  "id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "confirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NewsletterSubscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NewsletterSubscription_email_key" ON "NewsletterSubscription"("email");
CREATE UNIQUE INDEX "NewsletterSubscription_tokenHash_key" ON "NewsletterSubscription"("tokenHash");
CREATE TABLE "Testimonial" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "quote" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "testimonial_rating_bounds" CHECK (rating BETWEEN 1 AND 5)
);
