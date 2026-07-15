import { tool } from "ai";
import { z } from "zod";
import type { RecordMetadata } from "@pinecone-database/pinecone";
import { embedText, embedTexts, getIndex } from "@/lib/pinecone";
import { fetchProfessorFromUrl, RmpScrapeError } from "@/lib/rmp";

/** Builds vector metadata, dropping null/undefined values (Pinecone rejects them). */
function cleanMetadata(
  fields: Record<string, string | number | boolean | undefined | null>
): RecordMetadata {
  const metadata: RecordMetadata = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null && value !== "") {
      metadata[key] = value;
    }
  }
  return metadata;
}

function describeMatch(metadata: RecordMetadata | undefined, id: string) {
  if (!metadata) return { id };
  // Vectors seeded by the old Python scripts use {review, subject, stars}.
  const legacy = !metadata.type;
  return {
    id,
    professorName: metadata.professorName ?? id,
    department: metadata.department ?? metadata.subject,
    school: metadata.school,
    avgRating: metadata.avgRating ?? metadata.stars,
    avgDifficulty: metadata.avgDifficulty,
    numRatings: metadata.numRatings,
    wouldTakeAgainPercent: metadata.wouldTakeAgainPercent,
    review: metadata.review,
    class: metadata.class,
    grade: metadata.grade,
    source: metadata.source ?? (legacy ? "seed-data" : "ratemyprofessors"),
    url: metadata.url,
  };
}

export const searchProfessors = tool({
  description:
    "Search the professor review database. Use this before answering any question about professors, courses, ratings, difficulty, or teaching style.",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "Natural-language description of the professor or course the student is asking about, e.g. 'easy calculus professor' or 'Jacqueline Stephens architecture'"
      ),
  }),
  execute: async ({ query }) => {
    try {
      const vector = await embedText(query);
      const results = await getIndex().query({
        topK: 8,
        vector,
        includeMetadata: true,
      });
      if (results.matches.length === 0) {
        return {
          found: false,
          message:
            "No professors in the database matched this query. Suggest the student paste a ratemyprofessors.com professor URL to add one.",
        };
      }
      return {
        found: true,
        matches: results.matches.map((m) => ({
          score: m.score,
          ...describeMatch(m.metadata, m.id),
        })),
      };
    } catch (error) {
      console.error("searchProfessors failed:", error);
      return { found: false, error: "Searching the professor database failed. Please try again." };
    }
  },
});

export const addProfessorFromUrl = tool({
  description:
    "Fetch a professor's profile and reviews from a ratemyprofessors.com professor URL and store them in the database. Use this whenever the user shares a RateMyProfessors link.",
  inputSchema: z.object({
    url: z
      .string()
      .describe(
        "A RateMyProfessors professor page URL, e.g. https://www.ratemyprofessors.com/professor/12345"
      ),
  }),
  execute: async ({ url }) => {
    try {
      const prof = await fetchProfessorFromUrl(url);

      const shared = {
        professorId: prof.legacyId,
        professorName: prof.name,
        department: prof.department,
        school: prof.school,
        avgRating: prof.avgRating,
        avgDifficulty: prof.avgDifficulty,
        numRatings: prof.numRatings,
        wouldTakeAgainPercent: prof.wouldTakeAgainPercent,
        url: prof.url,
      };

      const summaryText =
        `Professor ${prof.name}, ${prof.department ?? "unknown"} department at ${prof.school ?? "unknown school"}. ` +
        `Overall rating ${prof.avgRating ?? "n/a"}/5 from ${prof.numRatings ?? 0} ratings. ` +
        `Difficulty ${prof.avgDifficulty ?? "n/a"}/5. ` +
        (prof.wouldTakeAgainPercent !== undefined
          ? `${prof.wouldTakeAgainPercent}% would take again. `
          : "") +
        (prof.courseCodes.length > 0 ? `Teaches: ${prof.courseCodes.join(", ")}.` : "");

      const reviewTexts = prof.ratings.map(
        (r) =>
          `Professor ${prof.name} (${prof.department ?? ""}, ${prof.school ?? ""}) — course ${r.class ?? "unknown"}: ${r.comment}`
      );

      const embeddings = await embedTexts([summaryText, ...reviewTexts]);

      const records = [
        {
          id: `prof-${prof.legacyId}`,
          values: embeddings[0],
          metadata: cleanMetadata({ type: "summary", ...shared }),
        },
        ...prof.ratings.map((r, i) => ({
          id: `prof-${prof.legacyId}-review-${i}`,
          values: embeddings[i + 1],
          metadata: cleanMetadata({
            type: "review",
            ...shared,
            review: r.comment,
            class: r.class,
            grade: r.grade,
            date: r.date,
          }),
        })),
      ];

      await getIndex().upsert({ records });

      return {
        success: true,
        professorName: prof.name,
        department: prof.department,
        school: prof.school,
        avgRating: prof.avgRating,
        avgDifficulty: prof.avgDifficulty,
        numRatings: prof.numRatings,
        wouldTakeAgainPercent: prof.wouldTakeAgainPercent,
        courses: prof.courseCodes,
        reviewsStored: prof.ratings.length,
        reviews: prof.ratings.map((r) => ({
          class: r.class,
          comment: r.comment,
          grade: r.grade,
        })),
      };
    } catch (error) {
      console.error("addProfessorFromUrl failed:", error);
      return {
        success: false,
        error:
          error instanceof RmpScrapeError
            ? error.message
            : "Something went wrong while saving that professor. Please try again.",
      };
    }
  },
});

export const saveSharedInfo = tool({
  description:
    "Save professor information or an opinion the user shares in chat (e.g. their own experience with a professor) into the database so future conversations can use it.",
  inputSchema: z.object({
    professorName: z.string().describe("The professor's name"),
    review: z
      .string()
      .describe("What the user shared about the professor, in their words"),
    school: z.string().optional().describe("The school, if mentioned"),
    department: z
      .string()
      .optional()
      .describe("The department or subject, if mentioned"),
    rating: z
      .number()
      .min(0)
      .max(5)
      .optional()
      .describe("A 0-5 rating, only if the user gave one"),
  }),
  execute: async ({ professorName, review, school, department, rating }) => {
    try {
      const slug = professorName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const text = `Professor ${professorName} (${department ?? ""}, ${school ?? ""}): ${review}`;
      const values = await embedText(text);

      await getIndex().upsert({
        records: [
          {
            id: `shared-${slug}-${Date.now()}`,
            values,
            metadata: cleanMetadata({
              type: "review",
              source: "user-shared",
              professorName,
              department,
              school,
              avgRating: rating,
              review,
            }),
          },
        ],
      });

      return { success: true, professorName };
    } catch (error) {
      console.error("saveSharedInfo failed:", error);
      return {
        success: false,
        error: "Saving that information failed. Please try again.",
      };
    }
  },
});

export const chatTools = {
  searchProfessors,
  addProfessorFromUrl,
  saveSharedInfo,
};
