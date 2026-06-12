/**
 * Unified Canonical Schema for Crime Data Integration
 *
 * Every upstream source (FIR, Complaint, Patrol, Cyber) must transform its
 * raw payload into this schema before ingestion into the core pipeline.
 */

export type CrimeCategory =
  | 'theft'
  | 'assault'
  | 'cybercrime'
  | 'traffic'
  | 'burglary'
  | 'fraud'
  | 'harassment'
  | 'kidnapping'
  | 'murder'
  | 'other';

export type ConnectorSource = 'fir' | 'complaint' | 'patrol_log' | 'cyber_branch';

export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * SOURCE PROVENANCE — tracks exactly where a record came from
 */
export interface SourceProvenance {
  source: ConnectorSource;
  source_system: string;       // e.g. "FIR_DB_v2", "CCTNS", "Patrol_MIS"
  source_id: string;            // Primary ID in the originating system
  source_case_id?: string;      // Linked case/FIR number
  source_officer_id?: string;   // Officer who filed/created
  source_timestamp: Date;       // When event occurred in source system
  ingestion_timestamp: Date;    // When we received it
  raw_payload?: Record<string, any>; // Original payload (for audit)
}

/**
 * CANONICAL CRIME RECORD — the unified internal representation
 */
export interface CanonicalCrimeRecord {
  // Identity
  canonical_id?: string;        // Set after dedup — uuid if new, matched_id if dup
  is_duplicate: boolean;
  duplicate_of?: string;        // source_id of the primary record

  // Classification
  crime_type: CrimeCategory;
  severity: number;             // 1–10
  description: string;

  // Location
  location: GeoPoint;
  location_address?: string;
  location_district?: string;
  location_zone?: string;

  // Timing
  occurred_at: Date;            // When crime occurred (from source)
  reported_at: Date;            // When it was reported/logged

  // Source provenance
  provenance: SourceProvenance;

  // Case linkage
  linked_case_ids?: string[];   // Other source IDs this case is linked to
  investigation_status?: string;

  // Source-specific extension fields (kept for downstream enrichment)
  extensions?: Record<string, any>;
}

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Failure record — stored when ingestion permanently fails
 */
export interface FailureRecord {
  id: string;
  source: ConnectorSource;
  source_id?: string;
  raw_payload: Record<string, any>;
  failure_reason: string;
  validation_errors?: string[];
  attempt_count: number;
  first_attempt_at: Date;
  last_attempt_at: Date;
}

/**
 * Retry record — in-flight records pending retry
 */
export interface RetryRecord {
  id: string;
  canonical: CanonicalCrimeRecord;
  source: ConnectorSource;
  attempt_count: number;
  next_retry_at: Date;
  last_error: string;
}
