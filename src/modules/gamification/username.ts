import User from "../../models/User.model.js";

function collapseSeparators(value: string): string {
  return value.replace(/[-_.]{2,}/g, "-");
}

export function normalizeUsernameCandidate(value: string): string {
  const normalized = collapseSeparators(
    value
      .trim()
      .toLowerCase()
      .replace(/@.*$/, "")
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "")
  );

  return normalized.slice(0, 24) || "player";
}

export async function generateUniqueUsername(baseValue: string): Promise<string> {
  const base = normalizeUsernameCandidate(baseValue);

  let attempt = base;
  let suffix = 1;

  while (await User.exists({ username: attempt })) {
    suffix += 1;
    const suffixText = `${suffix}`;
    const trimmedBase = base.slice(0, Math.max(1, 24 - suffixText.length - 1));
    attempt = `${trimmedBase}-${suffixText}`;
  }

  return attempt;
}
