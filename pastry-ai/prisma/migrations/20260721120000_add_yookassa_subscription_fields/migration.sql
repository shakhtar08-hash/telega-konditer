ALTER TABLE "Payment"
ADD COLUMN "providerPaymentId" TEXT,
ADD COLUMN "providerEventType" TEXT,
ADD COLUMN "tariffPlanId" TEXT,
ADD COLUMN "paymentMethodId" TEXT,
ADD COLUMN "paidAt" TIMESTAMP(3),
ADD COLUMN "metadata" JSONB;

ALTER TABLE "Subscription"
ADD COLUMN "tariffPlanId" TEXT,
ADD COLUMN "paymentMethodId" TEXT,
ADD COLUMN "nextChargeAt" TIMESTAMP(3),
ADD COLUMN "lastPaidAt" TIMESTAMP(3),
ADD COLUMN "canceledAt" TIMESTAMP(3),
ADD COLUMN "lastFailureAt" TIMESTAMP(3),
ADD COLUMN "failureReason" TEXT;

ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_tariffPlanId_fkey"
FOREIGN KEY ("tariffPlanId") REFERENCES "TariffPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Subscription"
ADD CONSTRAINT "Subscription_tariffPlanId_fkey"
FOREIGN KEY ("tariffPlanId") REFERENCES "TariffPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
