/**
 * Performs a shallow equality comparison between two objects.
 * Handles Date instances by comparing their timestamps.
 */
export function shallowEqual(
  objA: Record<string, unknown>,
  objB: Record<string, unknown>,
): boolean {
  if (objA === objB) return true;
  if (!objA || !objB) return false;

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    const valA = objA[key];
    const valB = objB[key];

    if (valA instanceof Date && valB instanceof Date) {
      if (valA.getTime() !== valB.getTime()) return false;
      continue;
    }

    if (valA !== valB) return false;
  }

  return true;
}
