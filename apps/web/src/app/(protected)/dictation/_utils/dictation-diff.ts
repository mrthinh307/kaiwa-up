/**
 * Japanese character-level LCS diff algorithm for dictation answer comparison.
 * Zero external dependencies, fast and unicode-safe.
 */

export type DiffType = "equal" | "incorrect" | "missing";

export type DiffToken = {
  type: DiffType;
  value: string;
};

export type DictationComparison = {
  hasDifferences: boolean;
  userTokens: DiffToken[];
  expectedTokens: DiffToken[];
  accuracyPercent: number;
};

/**
 * Splits a string into unicode code points (safe for Japanese emoji, surrogate pairs, kanji).
 */
function splitChars(text: string): string[] {
  return Array.from(text);
}

/**
 * Computes the Longest Common Subsequence (LCS) matrix.
 */
function computeLcsTable(a: string[], b: string[]): number[][] {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i]![j] = (dp[i - 1]?.[j - 1] ?? 0) + 1;
      } else {
        dp[i]![j] = Math.max(dp[i - 1]?.[j] ?? 0, dp[i]?.[j - 1] ?? 0);
      }
    }
  }

  return dp;
}

/**
 * Merges consecutive tokens of the same type for cleaner rendering.
 */
function mergeTokens(tokens: DiffToken[]): DiffToken[] {
  if (tokens.length === 0) return [];

  const merged: DiffToken[] = [];
  let current = { ...tokens[0]! };

  for (let i = 1; i < tokens.length; i++) {
    const next = tokens[i]!;
    if (next.type === current.type) {
      current.value += next.value;
    } else {
      merged.push(current);
      current = { ...next };
    }
  }
  merged.push(current);

  return merged;
}

/**
 * Computes character-level diff between the user's transcript and the expected transcript.
 */
export function computeDictationDiff(
  userAnswer: string,
  expectedScript: string,
): DictationComparison {
  const userChars = splitChars(userAnswer);
  const expectedChars = splitChars(expectedScript);

  if (userChars.length === 0) {
    return {
      accuracyPercent: 0,
      expectedTokens: [{ type: "missing", value: expectedScript }],
      hasDifferences: expectedScript.length > 0,
      userTokens: [],
    };
  }

  if (expectedChars.length === 0) {
    return {
      accuracyPercent: 0,
      expectedTokens: [],
      hasDifferences: userChars.length > 0,
      userTokens: [{ type: "incorrect", value: userAnswer }],
    };
  }

  const dp = computeLcsTable(userChars, expectedChars);
  let i = userChars.length;
  let j = expectedChars.length;

  const rawUserTokens: DiffToken[] = [];
  const rawExpectedTokens: DiffToken[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && userChars[i - 1] === expectedChars[j - 1]) {
      const char = userChars[i - 1]!;
      rawUserTokens.unshift({ type: "equal", value: char });
      rawExpectedTokens.unshift({ type: "equal", value: char });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || (dp[i]?.[j - 1] ?? 0) >= (dp[i - 1]?.[j] ?? 0))) {
      // Missing in user's answer (present in expected)
      const char = expectedChars[j - 1]!;
      rawExpectedTokens.unshift({ type: "missing", value: char });
      j--;
    } else if (i > 0 && (j === 0 || (dp[i]?.[j - 1] ?? 0) < (dp[i - 1]?.[j] ?? 0))) {
      // Extra / wrong in user's answer
      const char = userChars[i - 1]!;
      rawUserTokens.unshift({ type: "incorrect", value: char });
      i--;
    }
  }

  const userTokens = mergeTokens(rawUserTokens);
  const expectedTokens = mergeTokens(rawExpectedTokens);

  const matchedChars = dp[userChars.length]?.[expectedChars.length] ?? 0;
  const maxChars = Math.max(userChars.length, expectedChars.length, 1);
  const accuracyPercent = Math.round((matchedChars / maxChars) * 100);

  const hasDifferences =
    userTokens.some((t) => t.type !== "equal") || expectedTokens.some((t) => t.type !== "equal");

  return {
    accuracyPercent,
    expectedTokens,
    hasDifferences,
    userTokens,
  };
}
