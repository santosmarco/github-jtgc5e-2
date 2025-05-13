import type { PineconeMetadata } from "./schemas";

// Type for extracting the type of a field in a type
export type FieldValueType<T, K extends keyof T> = T[K];

// Basic filter operator types
export type EqualsFilter<T extends string | number | boolean> = { $eq: T };
export type NotEqualsFilter<T extends string | number | boolean> = { $ne: T };
export type GreaterThanFilter = { $gt: number };
export type GreaterThanEqualFilter = { $gte: number };
export type LessThanFilter = { $lt: number };
export type LessThanEqualFilter = { $lte: number };
export type InFilter<T extends string | number> = { $in: T[] };
export type NotInFilter<T extends string | number> = { $nin: T[] };
export type ExistsFilter = { $exists: boolean };

// String-specific filter type
export type StringFilter =
  | EqualsFilter<string>
  | NotEqualsFilter<string>
  | InFilter<string>
  | NotInFilter<string>
  | ExistsFilter;

// Number-specific filter type
export type NumberFilter =
  | EqualsFilter<number>
  | NotEqualsFilter<number>
  | GreaterThanFilter
  | GreaterThanEqualFilter
  | LessThanFilter
  | LessThanEqualFilter
  | InFilter<number>
  | NotInFilter<number>
  | ExistsFilter;

// Boolean-specific filter type
export type BooleanFilter =
  | EqualsFilter<boolean>
  | NotEqualsFilter<boolean>
  | ExistsFilter;

// Array-specific filter type
export type ArrayFilter<T extends string | number> =
  | EqualsFilter<T>
  | InFilter<T>
  | ExistsFilter;

// Map field types to their corresponding filter types
export type MetadataFieldFilter<T, K extends keyof T> =
  Exclude<T[K], undefined> extends infer U
    ? U extends number
      ? NumberFilter
      : U extends string
        ? StringFilter
        : U extends boolean
          ? BooleanFilter
          : U extends ReadonlyArray<infer V>
            ? V extends string | number
              ? ArrayFilter<V>
              : never
            : never
    : never;

// Single field filter expression
export type FieldFilterExpression<T, K extends keyof T> =
  | T[K]
  | MetadataFieldFilter<T, K>;

// Filter expression for a specific type
export type FilterExpressionFor<T> = {
  [K in keyof T]?: FieldFilterExpression<T, K>;
};

// Logical operators for combining filters
export type AndFilter<T> = {
  $and: Array<FilterExpression<T>>;
};

export type OrFilter<T> = {
  $or: Array<FilterExpression<T>>;
};

// Complete filter expression type that can be nested
export type FilterExpression<T> =
  | FilterExpressionFor<T>
  | AndFilter<T>
  | OrFilter<T>;

// Type-safe filter builder for PineconeMetadata
export type PineconeFilter = FilterExpression<PineconeMetadata>;

// Helper functions to create type-safe filters

/**
 * Create an equals filter
 */
export function $eq<T extends string | number | boolean>(
  value: T,
): EqualsFilter<T> {
  return { $eq: value };
}

/**
 * Create a not-equals filter
 */
export function $ne<T extends string | number | boolean>(
  value: T,
): NotEqualsFilter<T> {
  return { $ne: value };
}

/**
 * Create a greater-than filter
 */
export function $gt(value: number): GreaterThanFilter {
  return { $gt: value };
}

/**
 * Create a greater-than-or-equal filter
 */
export function $gte(value: number): GreaterThanEqualFilter {
  return { $gte: value };
}

/**
 * Create a less-than filter
 */
export function $lt(value: number): LessThanFilter {
  return { $lt: value };
}

/**
 * Create a less-than-or-equal filter
 */
export function $lte(value: number): LessThanEqualFilter {
  return { $lte: value };
}

/**
 * Create an in-array filter
 */
export function $in<T extends string | number>(values: T[]): InFilter<T> {
  return { $in: values };
}

/**
 * Create a not-in-array filter
 */
export function $nin<T extends string | number>(values: T[]): NotInFilter<T> {
  return { $nin: values };
}

/**
 * Create an exists filter
 */
export function $exists(exists = true): ExistsFilter {
  return { $exists: exists };
}

/**
 * Create an AND filter combining multiple filter expressions
 */
export function $and<
  T extends PineconeMetadata,
  U extends readonly FilterExpression<T>[],
>(filters: U): AndFilter<T> {
  return { $and: [...filters] };
}

/**
 * Create an OR filter combining multiple filter expressions
 */
export function $or<
  T extends PineconeMetadata,
  U extends readonly FilterExpression<T>[],
>(filters: U): OrFilter<T> {
  return { $or: [...filters] };
}

/**
 * Type-safe filter builder for a specific metadata field
 *
 * Example usage:
 *
 * ```typescript
 * // Simple filter
 * const filter = createFilter({
 *   profile_id: "123",
 *   type: $eq("chunks")
 * });
 *
 * // Complex filter with logical operators
 * const complexFilter = createFilter(
 *   $and([
 *     { profile_id: "123" },
 *     $or([
 *       { type: $eq("chunks") },
 *       { type: $eq("moments") }
 *     ])
 *   ])
 * );
 * ```
 */
export function createFilter<T extends PineconeMetadata>(
  filter: FilterExpression<T>,
): FilterExpression<T> {
  return filter;
}

// Example usage
/* 
// This code is for demonstration purposes only

import { PineconeMeetingChunkMetadata } from "./schemas";

// Filter for meeting chunks
const meetingChunkFilter = createFilter<PineconeMeetingChunkMetadata>({
  // Simple equals for string field
  profile_id: "user123",
  
  // Using helper functions for more complex filters
  type: $eq("chunks"),
  
  // Numeric comparison
  chunk_index: $gt(5),
  
  // Time range filter
  chunk_start_time_unix: $gte(1623456789),
  chunk_end_time_unix: $lte(1623556789),
  
  // Array operations
  participants_list: $in(["Alice", "Bob"]),
});

// Complex filter with logical operators
const complexFilter = createFilter<PineconeMeetingChunkMetadata>(
  $and([
    // Base conditions
    { 
      profile_id: "user123",
      type: $eq("chunks")
    },
    
    // Time-based OR conditions
    $or([
      // Recent meetings
      { 
        meeting_start_time_unix: $gte(Date.now() - 7 * 24 * 60 * 60 * 1000) 
      },
      // Meetings with specific participants
      { 
        participants_list: $in(["Alice", "Bob"]) 
      }
    ])
  ])
);

// Example usage with entity filter
import { PineconeEntityMetadata } from "./schemas";

const entityFilter = createFilter<PineconeEntityMetadata>({
  content_type: $eq("entity"),
  entity_type: $in(["person", "organization"]),
  profile_id: "user123"
});

// Example of combining multiple metadata types with OR
import { PineconeMetadata, PineconeRelationshipMetadata } from "./schemas";

const combinedFilter = createFilter<PineconeMetadata>(
  $or([
    // Entity filter
    {
      content_type: $eq("entity"),
      entity_type: $eq("person")
    },
    
    // Relationship filter
    {
      content_type: $eq("relationship"),
      relationship_type: $eq("manages")
    }
  ])
);
*/
