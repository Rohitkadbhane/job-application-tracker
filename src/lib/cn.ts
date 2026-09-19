/** Tiny class-name joiner: cn("a", cond && "b") -> "a b". Avoids a dependency for one helper. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
