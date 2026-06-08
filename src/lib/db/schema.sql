-- =====================================================================
-- Cross-Sell Recommendation Engine — Database Schema (PostgreSQL)
--
-- Design notes:
--   * `leads` stores the unified lead record; `motor_lead_details` and
--     `health_lead_details` are 1:1 extension tables so a single lead
--     can carry both Motor and Health profiles (the common cross-sell case)
--     without nullable-column sprawl on the parent table.
--   * `recommendations` persists each scoring run as an immutable record
--     (append-only) so the advisor dashboard can show history and so a
--     future ML model's outputs can be compared against the rules engine's.
--   * `recommendation_reason_codes` normalises reason codes for querying/
--     reporting (e.g. "how many leads triggered SALARY_ABOVE_20K").
-- =====================================================================

CREATE TABLE leads (
    lead_id         VARCHAR(32)   PRIMARY KEY,
    source          VARCHAR(16)   NOT NULL CHECK (source IN ('Motor', 'Health')),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE TABLE motor_lead_details (
    lead_id                     VARCHAR(32)   PRIMARY KEY REFERENCES leads(lead_id) ON DELETE CASCADE,
    vehicle_registration_type   VARCHAR(16)   NOT NULL CHECK (vehicle_registration_type IN ('Personal', 'Company')),
    vehicle_make                VARCHAR(64)   NOT NULL,
    vehicle_model               VARCHAR(64)   NOT NULL,
    vehicle_year                SMALLINT      NOT NULL,
    nationality                 VARCHAR(64)   NOT NULL,
    date_of_birth               DATE          NOT NULL,
    emirate                     VARCHAR(32)   NOT NULL,
    uae_license_duration_years  SMALLINT      NOT NULL
);

CREATE TABLE health_lead_details (
    lead_id                     VARCHAR(32)   PRIMARY KEY REFERENCES leads(lead_id) ON DELETE CASCADE,
    individual_or_family        VARCHAR(16)   NOT NULL CHECK (individual_or_family IN ('Individual', 'Family')),
    policyholder_type           VARCHAR(32)   NOT NULL,
    date_of_birth               DATE          NOT NULL,
    marital_status              VARCHAR(16)   NOT NULL CHECK (marital_status IN ('Single', 'Married', 'Divorced', 'Widowed')),
    nationality                 VARCHAR(64)   NOT NULL,
    salary_band                 VARCHAR(32)   NOT NULL,
    visa_category               VARCHAR(32)   NOT NULL,
    number_of_family_members    SMALLINT      NOT NULL DEFAULT 1,
    existing_medical_conditions BOOLEAN       NOT NULL DEFAULT FALSE
);

-- One row per scoring run. Append-only: re-scoring a lead inserts a new row
-- rather than overwriting, preserving an audit trail of how scores evolved.
CREATE TABLE recommendations (
    recommendation_id   BIGSERIAL     PRIMARY KEY,
    lead_id             VARCHAR(32)   NOT NULL REFERENCES leads(lead_id) ON DELETE CASCADE,
    life_score          SMALLINT      NOT NULL CHECK (life_score BETWEEN 0 AND 100),
    savings_score       SMALLINT      NOT NULL CHECK (savings_score BETWEEN 0 AND 100),
    engine_version      VARCHAR(32)   NOT NULL DEFAULT 'rules-v1',
    generated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX idx_recommendations_lead_id ON recommendations(lead_id);
CREATE INDEX idx_recommendations_life_score ON recommendations(life_score DESC);
CREATE INDEX idx_recommendations_savings_score ON recommendations(savings_score DESC);

-- Recommended products for a given scoring run (one-to-many).
CREATE TABLE recommendation_products (
    recommendation_id   BIGINT        NOT NULL REFERENCES recommendations(recommendation_id) ON DELETE CASCADE,
    product             VARCHAR(64)   NOT NULL,
    PRIMARY KEY (recommendation_id, product)
);

-- Reason codes that contributed to a given scoring run (one-to-many, normalised
-- for reporting e.g. "which reason codes most often precede a conversion").
CREATE TABLE recommendation_reason_codes (
    recommendation_id   BIGINT        NOT NULL REFERENCES recommendations(recommendation_id) ON DELETE CASCADE,
    reason_code         VARCHAR(64)   NOT NULL,
    PRIMARY KEY (recommendation_id, reason_code)
);

-- Convenience view: latest recommendation per lead, used by the advisor dashboard.
CREATE VIEW latest_recommendations AS
SELECT DISTINCT ON (r.lead_id)
    r.lead_id,
    r.recommendation_id,
    r.life_score,
    r.savings_score,
    r.engine_version,
    r.generated_at
FROM recommendations r
ORDER BY r.lead_id, r.generated_at DESC;
