import { CanonicalCrimeRecord, ValidationResult } from './canonical.schema';

const VALID_CRIME_TYPES = new Set([
  'theft', 'assault', 'cybercrime', 'traffic', 'burglary',
  'fraud', 'harassment', 'kidnapping', 'murder', 'other'
]);

const VALID_SOURCES = new Set([
  'fir', 'complaint', 'patrol_log', 'cyber_branch'
]);

/**
 * CrimeRecordValidator
 * Validates a CanonicalCrimeRecord before ingestion.
 * Returns detailed errors and warnings.
 */
export class CrimeRecordValidator {
  validate(record: CanonicalCrimeRecord): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // --- Location validation ---
    const { lat, lng } = record.location || {};
    if (lat === undefined || lat === null) {
      errors.push('location.lat is required');
    } else if (typeof lat !== 'number' || isNaN(lat)) {
      errors.push(`location.lat must be a number, got: ${lat}`);
    } else if (lat < -90 || lat > 90) {
      errors.push(`location.lat out of range [-90, 90]: ${lat}`);
    }

    if (lng === undefined || lng === null) {
      errors.push('location.lng is required');
    } else if (typeof lng !== 'number' || isNaN(lng)) {
      errors.push(`location.lng must be a number, got: ${lng}`);
    } else if (lng < -180 || lng > 180) {
      errors.push(`location.lng out of range [-180, 180]: ${lng}`);
    }

    // --- Severity validation ---
    if (record.severity === undefined || record.severity === null) {
      errors.push('severity is required');
    } else if (!Number.isInteger(record.severity) || record.severity < 1 || record.severity > 10) {
      errors.push(`severity must be an integer between 1 and 10, got: ${record.severity}`);
    }

    // --- Crime type validation ---
    if (!record.crime_type) {
      errors.push('crime_type is required');
    } else if (!VALID_CRIME_TYPES.has(record.crime_type)) {
      errors.push(`crime_type '${record.crime_type}' is not a valid type. Valid: ${[...VALID_CRIME_TYPES].join(', ')}`);
    }

    // --- Source provenance validation ---
    if (!record.provenance) {
      errors.push('provenance is required');
    } else {
      if (!record.provenance.source) {
        errors.push('provenance.source is required');
      } else if (!VALID_SOURCES.has(record.provenance.source)) {
        errors.push(`provenance.source '${record.provenance.source}' is invalid`);
      }

      if (!record.provenance.source_id || record.provenance.source_id.trim() === '') {
        errors.push('provenance.source_id is required');
      }

      if (!record.provenance.source_system || record.provenance.source_system.trim() === '') {
        errors.push('provenance.source_system is required');
      }

      if (!record.provenance.source_timestamp) {
        errors.push('provenance.source_timestamp is required');
      } else {
        const ts = new Date(record.provenance.source_timestamp);
        if (isNaN(ts.getTime())) {
          errors.push(`provenance.source_timestamp is not a valid date: ${record.provenance.source_timestamp}`);
        }
        const future = new Date();
        future.setDate(future.getDate() + 1);
        if (ts > future) {
          warnings.push(`provenance.source_timestamp is in the future: ${record.provenance.source_timestamp}`);
        }
      }
    }

    // --- Timestamps ---
    if (!record.occurred_at) {
      errors.push('occurred_at is required');
    } else {
      const ts = new Date(record.occurred_at);
      if (isNaN(ts.getTime())) {
        errors.push(`occurred_at is not a valid date: ${record.occurred_at}`);
      }
    }

    if (!record.reported_at) {
      errors.push('reported_at is required');
    } else {
      const ts = new Date(record.reported_at);
      if (isNaN(ts.getTime())) {
        errors.push(`reported_at is not a valid date: ${record.reported_at}`);
      }
    }

    // --- Description ---
    if (!record.description || record.description.trim().length === 0) {
      warnings.push('description is empty — consider adding context');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}

export const validator = new CrimeRecordValidator();
