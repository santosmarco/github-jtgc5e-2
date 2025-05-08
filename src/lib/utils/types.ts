import type { SimplifyDeep } from "type-fest";

import type { Database, Tables } from "../supabase/database.types";

/**
 * Symbol used for tagging types
 */
export const $TAG = Symbol("TAG");
export type $TAG = typeof $TAG;

/**
 * Symbol representing an unset/undefined value in type operations
 */
export const $UNSET = Symbol("UNSET");
export type $UNSET = typeof $UNSET;

/**
 * Represents any record type
 */
export type AnyRecord = Record<string | symbol, unknown>;

/**
 * Container for type tags with their metadata
 */
export type TagContainer<T> = { readonly [$TAG]: T };

/**
 * Creates a tag with associated metadata
 */
export type Tag<T extends PropertyKey, TMeta> = TagContainer<Record<T, TMeta>>;

/**
 * Attaches a tag to a type, creating a nominally typed variant
 * that maintains the original type's structure but is not assignable to it
 */
export type Tagged<T, TTag extends PropertyKey, TMeta = never> =
  Intersect<T, Tag<TTag, TMeta>> extends infer U extends T ? U : never;

/**
 * Extracts the metadata associated with a specific tag
 */
export type GetTagMetadata<
  T extends Tag<TTag, unknown>,
  TTag extends PropertyKey,
> = T[typeof $TAG][TTag];

/**
 * Recursively removes all tags from a type, unwrapping it to its base.
 * This utility iterates through the tags applied to a type via `Tagged`
 * and progressively strips them off to reveal the original, untagged type.
 * It handles types with potentially multiple (though current `Tagged` adds one layer)
 * or nested tags by ensuring full unwrapping.
 */
type RemoveAllTags<T> =
  T extends Tag<PropertyKey, unknown>
    ? {
        [K in keyof T[typeof $TAG]]: T extends Tagged<
          infer U,
          K,
          T[typeof $TAG][K]
        >
          ? RemoveAllTags<U>
          : never;
      }[keyof T[typeof $TAG]]
    : T;

/**
 * Unwraps a tagged type back to its original form
 */
export type UnwrapTagged<TaggedType extends Tag<PropertyKey, unknown>> =
  RemoveAllTags<TaggedType>;

/**
 * Creates a typed error with a specific error message
 */
export type $ERROR<TMessage extends string> = Tagged<Error, "ERROR", TMessage>;

/**
 * Checks if two types are exactly equal
 * Uses distributive conditional types to handle complex type comparisons
 */
export type IsEqual<T, U> =
  (<X>() => X extends (T & X) | X ? 1 : 0) extends <Y>() => Y extends
    | (U & Y)
    | Y
    ? 1
    : 0
    ? true
    : false;

/**
 * Checks if T extends U
 */
export type Extends<T, U> = T extends U ? true : false;

/**
 * Negates a boolean type
 */
export type Not<T extends boolean> =
  IsEqual<T, true> extends true
    ? false
    : IsEqual<T, false> extends true
      ? true
      : never;

/**
 * Implementation of logical AND for two boolean types
 */
type AndImpl<T extends boolean, U extends boolean> = [T, U][number] extends true
  ? true
  : true extends [IsEqual<T, false>, IsEqual<U, false>][number]
    ? false
    : never;

/**
 * Logical AND operation for boolean types.
 * Can operate on two individual boolean types or an array of boolean types.
 * - For two booleans (e.g., `And<true, false>`): performs A && B.
 * - For an array (e.g., `And<[true, true, false]>`): performs A && B && C ...
 *   An empty array `And<[]>` evaluates to `true`.
 */
export type And<
  T extends boolean | readonly boolean[],
  U extends T extends readonly boolean[] ? $UNSET : boolean | $UNSET = $UNSET,
> = T extends readonly []
  ? true
  : T extends readonly [
        infer THead extends boolean,
        ...infer TRest extends boolean[],
      ]
    ? AndImpl<THead, And<TRest>>
    : T extends boolean
      ? U extends boolean
        ? AndImpl<T, U>
        : never
      : never;

/**
 * Implementation of logical OR for two boolean types
 */
type OrImpl<A extends boolean, B extends boolean> = [A, B][number] extends false
  ? false
  : true extends [IsEqual<A, true>, IsEqual<B, true>][number]
    ? true
    : never;

/**
 * Logical OR operation for boolean types or arrays of boolean types
 */
export type Or<
  A extends boolean | readonly boolean[],
  B extends A extends readonly boolean[] ? $UNSET : boolean | $UNSET = $UNSET,
> = A extends readonly []
  ? false
  : A extends readonly [
        infer AHead extends boolean,
        ...infer ARest extends boolean[],
      ]
    ? OrImpl<AHead, Or<ARest>>
    : A extends boolean
      ? B extends boolean
        ? OrImpl<A, B>
        : never
      : never;

/**
 * Type representing a valid table name in the database
 */
export type TableName = keyof Database["public"]["Tables"];

/**
 * Picks properties from a type without requiring all keys to exist
 */
export type LoosePick<T, K> = { [P in Extract<K, keyof T>]: T[P] };

/**
 * Selects specific fields from a table or object type
 */
export type Select<
  T extends AnyRecord | TableName,
  K extends T extends TableName ? keyof Tables<T> : keyof T,
> = SimplifyDeep<LoosePick<T extends TableName ? Tables<T> : T, K>>;

/**
 * Implementation of type intersection for arrays or objects
 */
type IntersectImpl<T, U = $UNSET> = T extends readonly []
  ? unknown
  : T extends readonly [infer THead, ...infer TRest]
    ? THead & IntersectImpl<TRest>
    : T & U;

/**
 * Creates an intersection of multiple types
 * Provides compile-time error for invalid usage patterns
 */
export type Intersect<T, U = $UNSET> =
  And<[Extends<T, AnyRecord>, IsEqual<U, $UNSET>]> extends true
    ? $ERROR<"An object type used as the first argument to `Intersect` requires a second object type argument.">
    : SimplifyDeep<IntersectImpl<T, U>>;
