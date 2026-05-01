const MAX_GUIDELINE_FILES = 5;
const GUIDELINE_SECTION_TITLE = "## OpenClaw Guidelines";
const GUIDELINE_SECTION_INTRO =
  "Follow these repository files as guidance when creating or fixing this issue:";

function normalizePath(value) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/^\/+/, "");
}

export function normalizeGuidelineFiles(files, max = MAX_GUIDELINE_FILES) {
  const normalized = [];
  const seen = new Set();

  for (const file of Array.isArray(files) ? files : []) {
    const path = normalizePath(file);
    if (!path || seen.has(path)) continue;
    seen.add(path);
    normalized.push(path);
    if (normalized.length >= max) break;
  }

  return normalized;
}

export function mergeGuidelineFiles(...lists) {
  return normalizeGuidelineFiles(lists.flat());
}

export function appendGuidelineSectionToIssueBody(body, files) {
  const guidelineFiles = normalizeGuidelineFiles(files);
  const trimmedBody = typeof body === "string" ? body.trim() : "";

  if (guidelineFiles.length === 0) {
    return trimmedBody;
  }

  const guidelineSection = [
    GUIDELINE_SECTION_TITLE,
    GUIDELINE_SECTION_INTRO,
    ...guidelineFiles.map((file) => `- \`${file}\``),
  ].join("\n");

  return [trimmedBody, guidelineSection].filter(Boolean).join("\n\n");
}

export function extractGuidelineFilesFromIssueBody(body) {
  if (typeof body !== "string" || !body.trim()) return [];

  const lines = body.split(/\r?\n/);
  const selected = [];
  let inSection = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!inSection) {
      if (line === GUIDELINE_SECTION_TITLE) {
        inSection = true;
      }
      continue;
    }

    if (line && /^#{1,6}\s/.test(line)) {
      break;
    }

    const match =
      line.match(/^[-*]\s+`([^`]+)`\s*$/) ||
      line.match(/^[-*]\s+(.+?)\s*$/);
    if (!match) continue;

    selected.push(match[1]);
  }

  return normalizeGuidelineFiles(selected);
}
