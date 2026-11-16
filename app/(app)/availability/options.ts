export const OPEN_TO_OPTIONS = [
  { value: "joyful", label: "Joyful leader" },
  { value: "solemn", label: "Solemn leader" },
  { value: "backup", label: "Back-up vocals" },
  { value: "band", label: "Band or sound" },
  { value: "devotion", label: "Devotion" },
  { value: "soaking", label: "Soaking" },
] as const;

export const OPEN_TO_LABELS: Record<string, string> = Object.fromEntries(
  OPEN_TO_OPTIONS.map((o) => [o.value, o.label]),
);
