export const ok = <T>(data: T, meta?: Record<string, unknown>) => ({
  success: true as const,
  data,
  meta: meta ?? null,
  error: null,
});

export const err = (
  code: string,
  message: string,
  details?: Record<string, unknown>
) => ({
  success: false as const,
  data: null,
  error: { code, message, details: details ?? null },
});
