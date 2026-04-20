const offlineHints = [
  "failed to fetch",
  "networkerror",
  "network request failed",
  "fetch failed",
  "load failed",
  "econnrefused",
  "enotfound",
  "timed out",
];

const notConfiguredHints = ["api not configured", "apibaseurl required"];

function hasHint(message: string, hints: string[]) {
  const normalized = message.toLowerCase();
  return hints.some((hint) => normalized.includes(hint));
}

export function getMutationErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    if (error.name === "TypeError" || hasHint(error.message, offlineHints)) {
      return `${fallback} Could not reach the API. Check your connection, confirm the API is running, then retry.`;
    }
    if (hasHint(error.message, notConfiguredHints)) {
      return `${fallback} API endpoint is not configured. Set NEXT_PUBLIC_API_URL and retry.`;
    }
    if (error.message.trim()) {
      return `${fallback} ${error.message} Retry once the issue is resolved.`;
    }
  }
  return `${fallback} Please retry.`;
}
