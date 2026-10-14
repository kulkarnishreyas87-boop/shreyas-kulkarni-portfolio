import type { HighlightKind } from "./repo";

/** Highlights are edited as one per line: "decision | text". A line without a known kind becomes a feature. */
export function parseHighlights(text: string): { kind: HighlightKind; text: string }[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^(feature|decision|metric)\s*\|\s*(.+)$/i);
      return m ? { kind: m[1].toLowerCase() as HighlightKind, text: m[2].trim() } : { kind: "feature" as const, text: line };
    });
}

export const formatHighlights = (hs: { kind: string; text: string }[]) => hs.map((h) => `${h.kind} | ${h.text}`).join("\n");

export const parseStack = (text: string) => [...new Set(text.split(",").map((s) => s.trim()).filter(Boolean))];
