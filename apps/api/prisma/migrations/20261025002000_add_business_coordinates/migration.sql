ALTER TABLE "businesses"
  ADD COLUMN "latitude" DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION,
  ADD CONSTRAINT "businesses_coordinates_pair_check"
    CHECK (("latitude" IS NULL) = ("longitude" IS NULL)),
  ADD CONSTRAINT "businesses_latitude_range_check"
    CHECK ("latitude" IS NULL OR ("latitude" >= -90 AND "latitude" <= 90)),
  ADD CONSTRAINT "businesses_longitude_range_check"
    CHECK ("longitude" IS NULL OR ("longitude" >= -180 AND "longitude" <= 180));
