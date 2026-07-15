const RMP_URL_REGEX = /https:\/\/www\.ratemyprofessors\.com\/professor\/\d+/g;

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

export class RmpScrapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RmpScrapeError";
  }
}

export interface ScrapedRating {
  comment: string;
  class?: string;
  grade?: string;
  difficultyRating?: number;
  clarityRating?: number;
  wouldTakeAgain?: boolean;
  date?: string;
}

export interface ScrapedProfessor {
  legacyId: string;
  name: string;
  department?: string;
  school?: string;
  avgRating?: number;
  avgDifficulty?: number;
  numRatings?: number;
  wouldTakeAgainPercent?: number;
  courseCodes: string[];
  ratings: ScrapedRating[];
  url: string;
}

export function getRmpUrls(text: string): string[] {
  return text.match(RMP_URL_REGEX) ?? [];
}

/**
 * Extracts the JSON object assigned to `window.__RELAY_STORE__` from raw HTML.
 * Review comments can legitimately contain `};`, so instead of a regex we walk
 * the braces while tracking string/escape state to find the matching close.
 */
function extractRelayStore(html: string): Record<string, unknown> {
  const marker = html.indexOf("window.__RELAY_STORE__");
  if (marker === -1) {
    throw new RmpScrapeError(
      "Could not find embedded professor data on the page — RateMyProfessors may have changed its page layout."
    );
  }

  const start = html.indexOf("{", marker);
  if (start === -1) {
    throw new RmpScrapeError("Embedded professor data is malformed.");
  }

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1));
        } catch {
          throw new RmpScrapeError("Failed to parse embedded professor data.");
        }
      }
    }
  }
  throw new RmpScrapeError("Embedded professor data is truncated.");
}

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type RelayRecord = Record<string, unknown> & { __typename?: string };

function resolveRef(
  store: Record<string, unknown>,
  ref: unknown
): RelayRecord | undefined {
  const key = (ref as { __ref?: string } | undefined)?.__ref;
  return key ? (store[key] as RelayRecord | undefined) : undefined;
}

export async function fetchProfessorFromUrl(
  url: string
): Promise<ScrapedProfessor> {
  const match = url.match(/https:\/\/www\.ratemyprofessors\.com\/professor\/(\d+)/);
  if (!match) {
    throw new RmpScrapeError(
      "That does not look like a RateMyProfessors professor URL (expected https://www.ratemyprofessors.com/professor/<id>)."
    );
  }
  const legacyId = match[1];

  let response: Response;
  try {
    response = await fetch(match[0], { headers: BROWSER_HEADERS });
  } catch {
    throw new RmpScrapeError(
      "Could not reach RateMyProfessors — please check the URL and try again."
    );
  }
  if (!response.ok) {
    throw new RmpScrapeError(
      `RateMyProfessors returned HTTP ${response.status} — the professor page may not exist or the site is blocking requests.`
    );
  }

  const html = await response.text();
  const store = extractRelayStore(html);
  const records = Object.values(store).filter(
    (v): v is RelayRecord => typeof v === "object" && v !== null
  );

  const teacher =
    records.find(
      (r) => r.__typename === "Teacher" && String(r.legacyId) === legacyId
    ) ?? records.find((r) => r.__typename === "Teacher");
  if (!teacher) {
    throw new RmpScrapeError(
      "Could not find professor data on that page — it may not be a professor profile."
    );
  }

  const school = resolveRef(store, teacher.school);

  const ratings: ScrapedRating[] = records
    .filter((r) => r.__typename === "Rating")
    .map((r) => ({
      comment: stripHtml(String(r.comment ?? "")),
      class: typeof r.class === "string" ? r.class : undefined,
      grade: typeof r.grade === "string" && r.grade ? r.grade : undefined,
      difficultyRating:
        typeof r.difficultyRating === "number" ? r.difficultyRating : undefined,
      clarityRating:
        typeof r.clarityRating === "number" ? r.clarityRating : undefined,
      wouldTakeAgain:
        typeof r.wouldTakeAgain === "number"
          ? r.wouldTakeAgain === 1
          : undefined,
      date: typeof r.date === "string" ? r.date : undefined,
    }))
    .filter((r) => r.comment.length > 0);

  const name = [teacher.firstName, teacher.lastName]
    .filter((part) => typeof part === "string" && part)
    .join(" ");
  if (!name) {
    throw new RmpScrapeError("Professor data on that page is incomplete.");
  }

  return {
    legacyId,
    name,
    department:
      typeof teacher.department === "string" ? teacher.department : undefined,
    school: typeof school?.name === "string" ? school.name : undefined,
    avgRating: typeof teacher.avgRating === "number" ? teacher.avgRating : undefined,
    avgDifficulty:
      typeof teacher.avgDifficulty === "number" ? teacher.avgDifficulty : undefined,
    numRatings: typeof teacher.numRatings === "number" ? teacher.numRatings : undefined,
    wouldTakeAgainPercent:
      typeof teacher.wouldTakeAgainPercent === "number" &&
      teacher.wouldTakeAgainPercent >= 0
        ? Math.round(teacher.wouldTakeAgainPercent)
        : undefined,
    courseCodes: (
      (teacher.courseCodes as { __refs?: string[] } | undefined)?.__refs ?? []
    )
      .map((ref) => (store[ref] as RelayRecord | undefined)?.courseName)
      .filter((c): c is string => typeof c === "string"),
    ratings,
    url: match[0],
  };
}
