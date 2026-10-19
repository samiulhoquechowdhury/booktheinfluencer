-- AlterTable
ALTER TABLE "public"."Talent" ADD COLUMN     "faqs" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "followers" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "pastEvents" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "public"."TalentMedia" ADD COLUMN     "blurDataURL" TEXT;

-- Keep "Talent"."searchVector" filled (trd §4 full-text search). 'simple' config: names and
-- tags are multilingual (Assamese, Hindi, English), so no stemming; unaccent folds diacritics.
CREATE OR REPLACE FUNCTION talent_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('simple', unaccent(coalesce(NEW."stageName", ''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(array_to_string(NEW."tags", ' '), ''))), 'B') ||
    setweight(to_tsvector('simple', unaccent(coalesce(NEW."tagline", ''))), 'B') ||
    setweight(to_tsvector('simple', unaccent(coalesce(NEW."bio", ''))), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER talent_search_vector
  BEFORE INSERT OR UPDATE OF "stageName", "tagline", "bio", "tags" ON "Talent"
  FOR EACH ROW EXECUTE FUNCTION talent_search_vector_update();

-- Backfill existing rows.
UPDATE "Talent" SET "stageName" = "stageName";
