import { z } from "zod";
import marketplace from "./data/marketplace.json" with { type: "json" };
import people from "./data/people.json" with { type: "json" };
import type { JobWithCompany } from "@/features/jobs/types";
import { checkPortfolioUrl } from "./portfolio-links";

const id = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/);
const shortText = z.string().trim().min(1).max(200);
const text = z.string().trim().max(12000);
export const MIN_APPLICATION_ANSWER_LENGTH = 20;
const companySchema = z.object({
  id,
  slug: id,
  name: shortText,
  summary: text,
  description: text,
  websiteUrl: z.string().max(500),
  location: shortText,
  sizeLabel: shortText,
  logoUrl: z
    .string()
    .regex(/^\/(?!\/)/)
    .optional(),
});
export const jobSchema = z
  .object({
    id,
    slug: id,
    companyId: id,
    title: shortText,
    summary: text.min(10),
    description: text.min(30),
    category: z.enum(["build", "apply", "lead"]),
    function: z.enum(["product", "engineering", "data", "design", "marketing", "operations"]),
    remoteStatus: z.enum(["onsite", "hybrid", "remote"]),
    locations: z.array(shortText).min(1).max(10),
    coordinates: z
      .object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) })
      .optional(),
    seniority: z.enum(["junior", "mid", "senior", "lead"]),
    contract: z.enum(["employment", "b2b", "mandate"]),
    salaryMin: z.number().nonnegative().optional(),
    salaryMax: z.number().nonnegative().optional(),
    salaryCurrency: z.enum(["PLN", "EUR"]).optional(),
    salaryPeriod: z.enum(["month", "year"]).optional(),
    salaryKind: z.enum(["gross", "net"]).optional(),
    publicationStatus: z.enum(["draft", "review", "published", "hidden", "expired", "archived"]),
    publishedAt: z.iso.datetime(),
    expiryAt: z.iso.datetime(),
    verificationStatus: z.enum(["unverified", "editorial", "employer_verified"]),
    sourceBrief: text.optional(),
    generatedDescription: text.optional(),
  })
  .refine(
    (job) =>
      job.salaryMin === undefined || job.salaryMax === undefined || job.salaryMin <= job.salaryMax,
    { path: ["salaryMax"], message: "Salary maximum must not be below minimum" },
  );
export const profileSchema = z.object({
  name: shortText,
  headline: shortText,
  bio: text,
  location: shortText,
});
const personSchema = profileSchema.extend({
  id,
  role: z.enum(["candidate", "employer", "operator"]),
  companyId: id.optional(),
  cv: text,
  exampleScore: z.number().int().min(0).max(100),
  exampleSummary: text,
});
// To add a portfolio type, add it to portfolioTypes and to portfolioTypeConfig below.
export const portfolioTypes = [
  "repository",
  "application",
  "video",
  "contribution",
  "agent_chat",
] as const;
export type PortfolioType = (typeof portfolioTypes)[number];
export const portfolioTypeConfig: Record<
  PortfolioType,
  {
    label: string;
    titleLabel: string;
    titlePlaceholder: string;
    urlLabel: string;
    urlPlaceholder: string;
    notesLabel: string;
    notesPlaceholder: string;
    fileKind?: PortfolioFileKind;
  }
> = {
  repository: {
    label: "Repozytorium",
    titleLabel: "Nazwa projektu",
    titlePlaceholder: "np. Asystent obsługi zgłoszeń",
    urlLabel: "Link do repozytorium",
    urlPlaceholder: "https://github.com/...",
    notesLabel: "Notatki",
    notesPlaceholder: "Co robi projekt i jaka była Twoja rola?",
  },
  application: {
    label: "Link do działającej aplikacji",
    titleLabel: "Nazwa aplikacji",
    titlePlaceholder: "np. Planer podróży z AI",
    urlLabel: "Link do aplikacji",
    urlPlaceholder: "https://...",
    notesLabel: "Notatki",
    notesPlaceholder: "Dla kogo jest aplikacja i jak jej używać?",
  },
  video: {
    label: "Wideo (nagranie ekranu lub demo)",
    titleLabel: "Tytuł nagrania",
    titlePlaceholder: "np. Demo agenta w akcji",
    urlLabel: "Link do wideo",
    urlPlaceholder: "https://...",
    notesLabel: "Notatki",
    notesPlaceholder: "Co widać na nagraniu i które minuty są najważniejsze?",
    fileKind: "video",
  },
  contribution: {
    label: "Wkład w publiczne repozytoria open source (link)",
    titleLabel: "Tytuł wkładu",
    titlePlaceholder: "np. Poprawka błędu w bibliotece X",
    urlLabel: "Link do wkładu",
    urlPlaceholder: "https://github.com/.../pull/123",
    notesLabel: "Notatki",
    notesPlaceholder: "Jaki problem rozwiązałeś/aś i czy zmiana została przyjęta?",
  },
  agent_chat: {
    label: "Nagrana rozmowa z agentem",
    titleLabel: "Temat rozmowy",
    titlePlaceholder: "np. Budowa funkcji z agentem kodującym",
    urlLabel: "Link do rozmowy lub nagrania",
    urlPlaceholder: "https://...",
    notesLabel: "Notatki",
    notesPlaceholder: "Jaki był cel i jak sprawdzałeś/aś odpowiedzi agenta?",
    fileKind: "text",
  },
};
export const portfolioTypeLabels = Object.fromEntries(
  portfolioTypes.map((t) => [t, portfolioTypeConfig[t].label]),
) as Record<PortfolioType, string>;
// Files are kept in IndexedDB (see portfolio-files.ts); the saved state only holds this metadata.
export const PORTFOLIO_TEXT_MAX_BYTES = 1024 * 1024;
export const PORTFOLIO_VIDEO_MAX_BYTES = 50 * 1024 * 1024;
const fileKinds = {
  video: {
    accept: ".mp4,.webm,.mov",
    max: PORTFOLIO_VIDEO_MAX_BYTES,
    types: { mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime" },
    unsupported: "Dla wideo dodaj plik .mp4, .webm lub .mov.",
    tooLarge: "Plik wideo moze miec maksymalnie 50 MB.",
  },
  text: {
    accept: ".txt,.md,.json",
    max: PORTFOLIO_TEXT_MAX_BYTES,
    types: { txt: "text/plain", md: "text/markdown", json: "application/json" },
    unsupported: "Dla rozmowy dodaj plik tekstowy: .txt, .md lub .json.",
    tooLarge: "Plik tekstowy moze miec maksymalnie 1 MB.",
  },
} as const;
export type PortfolioFileKind = keyof typeof fileKinds;
export const portfolioFileKinds = fileKinds;
export const portfolioMimeTypes = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "text/plain",
  "text/markdown",
  "application/json",
] as const;
export type PortfolioMime = (typeof portfolioMimeTypes)[number];
const mimeKind = (mime: PortfolioMime): PortfolioFileKind =>
  mime.startsWith("video/") ? "video" : "text";
// Returns a Polish error message, or the normalized MIME type when the file fits the kind.
export function checkPortfolioFile(
  file: { name: string; type: string; size: number },
  kind: PortfolioFileKind,
): { error: string } | { mimeType: PortfolioMime } {
  const rules = fileKinds[kind];
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const mimeType = (rules.types as Record<string, PortfolioMime>)[extension];
  const declaredOk =
    !file.type ||
    file.type === "application/octet-stream" ||
    file.type.split("/")[0] === mimeType?.split("/")[0] ||
    file.type === mimeType;
  if (!mimeType || !declaredOk) return { error: rules.unsupported };
  if (file.size === 0) return { error: "Plik jest pusty." };
  if (file.size > rules.max) return { error: rules.tooLarge };
  return { mimeType };
}
const portfolioFileSchema = z.object({
  id,
  name: shortText,
  mimeType: z.enum(portfolioMimeTypes),
  size: z.number().int().positive().max(PORTFOLIO_VIDEO_MAX_BYTES),
});
const portfolioUrl = z.string().trim().max(500);
const portfolioFields = z.object({
  title: shortText,
  type: z.enum(portfolioTypes),
  url: portfolioUrl,
  file: portfolioFileSchema.optional(),
  description: text.max(1000),
});
function portfolioRules(
  item: z.infer<typeof portfolioFields>,
  ctx: {
    addIssue: (issue: { code: "custom"; path: string[]; message: string }) => void;
  },
) {
  const config = portfolioTypeConfig[item.type];
  if (item.url) {
    const checked = checkPortfolioUrl(item.type, item.url);
    if ("error" in checked) ctx.addIssue({ code: "custom", path: ["url"], message: checked.error });
  }
  if (item.file && (!config.fileKind || mimeKind(item.file.mimeType) !== config.fileKind))
    ctx.addIssue({
      code: "custom",
      path: ["file"],
      message: "Ten rodzaj pracy nie przyjmuje plików.",
    });
  if (!item.url && !item.file)
    ctx.addIssue({
      code: "custom",
      path: ["url"],
      message: config.fileKind ? "Podaj link albo dodaj plik." : "Podaj adres URL.",
    });
}
export const portfolioItemSchema = portfolioFields.superRefine(portfolioRules);
const storedPortfolioItemSchema = portfolioFields
  .extend({ id, candidateId: id })
  .superRefine(portfolioRules);
export const stages = [
  "submitted",
  "reviewed",
  "interview_invited",
  "first_conversation_held",
  "continued",
  "rejected",
  "withdrawn",
  "hired",
] as const;
export type Stage = (typeof stages)[number];
export const stageLabels: Record<Stage, string> = {
  submitted: "Aplikacja wysłana",
  reviewed: "W przeglądzie",
  interview_invited: "Zaproszenie na rozmowę",
  first_conversation_held: "Pierwsza rozmowa odbyta",
  continued: "Kolejny etap",
  rejected: "Proces zakończony",
  withdrawn: "Wycofana",
  hired: "Zatrudnienie",
};
export const nextStages: Record<Stage, Stage[]> = {
  submitted: ["reviewed", "rejected"],
  reviewed: ["interview_invited", "rejected"],
  interview_invited: ["first_conversation_held", "rejected"],
  first_conversation_held: ["continued", "rejected"],
  continued: ["hired", "rejected"],
  rejected: [],
  withdrawn: [],
  hired: [],
};
const applicationSchema = z.object({
  id,
  candidateId: id,
  jobId: id,
  companyId: id,
  jobTitle: shortText,
  candidateName: shortText,
  cv: text.min(20),
  answer: text.min(MIN_APPLICATION_ANSWER_LENGTH),
  sourceNotes: text,
  generatedAnswer: text,
  score: z.number().int().min(0).max(100),
  summary: text,
  stage: z.enum(stages),
  events: z
    .array(z.object({ stage: z.enum(stages), at: z.iso.datetime(), note: text }))
    .min(1)
    .max(30),
});
const draftSchema = z.object({
  candidateId: id,
  jobId: id,
  notes: text,
  generated: text,
  answer: text,
});
export const stateSchema = z
  .object({
    version: z.literal(1),
    activePersonId: id.nullable(),
    companies: z.array(companySchema).min(1).max(200),
    jobs: z.array(jobSchema).min(1).max(1000),
    people: z.array(personSchema).min(1).max(100),
    applications: z.array(applicationSchema).max(2000),
    saved: z.array(z.object({ candidateId: id, jobId: id })).max(5000),
    drafts: z.array(draftSchema).max(1000),
    portfolio: z
      .preprocess(
        // Drop saved items that no longer pass the link rules instead of failing the whole state.
        (items) =>
          Array.isArray(items)
            ? items.filter((x) => storedPortfolioItemSchema.safeParse(x).success)
            : items,
        z.array(storedPortfolioItemSchema).max(500),
      )
      .default([]),
  })
  .superRefine((s, ctx) => {
    const problem = (message: string) => ctx.addIssue({ code: "custom", message });
    for (const list of [s.companies, s.jobs, s.people, s.applications]) {
      if (new Set(list.map((x) => x.id)).size !== list.length) problem("Duplicate identifiers");
    }
    if (
      new Set(s.jobs.map((x) => x.slug)).size !== s.jobs.length ||
      new Set(s.companies.map((x) => x.slug)).size !== s.companies.length
    )
      problem("Duplicate slugs");
    const companyIds = new Set(s.companies.map((x) => x.id));
    const jobs = new Map(s.jobs.map((x) => [x.id, x]));
    const candidates = new Set(s.people.filter((x) => x.role === "candidate").map((x) => x.id));
    if (s.activePersonId !== null && !s.people.some((x) => x.id === s.activePersonId))
      problem("Unknown active person");
    for (const p of s.people)
      if (p.role === "employer" && (!p.companyId || !companyIds.has(p.companyId)))
        problem("Unknown employer company");
    for (const j of s.jobs) if (!companyIds.has(j.companyId)) problem("Unknown job company");
    const keys = new Set<string>();
    for (const a of s.applications) {
      const key = `${a.candidateId}:${a.jobId}`;
      if (
        !candidates.has(a.candidateId) ||
        jobs.get(a.jobId)?.companyId !== a.companyId ||
        keys.has(key)
      )
        problem("Invalid application reference");
      keys.add(key);
      if (a.events[0]?.stage !== "submitted" || a.events.at(-1)?.stage !== a.stage)
        problem("Invalid application history");
      for (let i = 1; i < a.events.length; i++) {
        const before = a.events[i - 1];
        const after = a.events[i];
        if (!(
          nextStages[before.stage].includes(after.stage) ||
          (after.stage === "withdrawn" &&
            !["hired", "rejected", "withdrawn"].includes(before.stage))
        ))
          problem("Invalid stage transition");
        if (after.at < before.at) problem("Invalid event order");
      }
    }
    for (const list of [s.saved, s.drafts]) {
      const pairs = new Set<string>();
      for (const item of list) {
        const key = `${item.candidateId}:${item.jobId}`;
        if (!candidates.has(item.candidateId) || !jobs.has(item.jobId) || pairs.has(key))
          problem("Invalid candidate/job reference");
        pairs.add(key);
      }
    }
  });
export type State = z.output<typeof stateSchema>;
export type Person = State["people"][number];
export type Application = State["applications"][number];
export type Action =
  | { type: "select_person"; id: string | null }
  | { type: "profile"; value: z.infer<typeof profileSchema> }
  | { type: "toggle_saved"; jobId: string }
  | { type: "portfolio_add"; value: z.input<typeof portfolioItemSchema> }
  | { type: "portfolio_remove"; id: string }
  | { type: "draft"; jobId: string; notes: string; generated: string; answer: string }
  | {
      type: "submit";
      jobId: string;
      notes: string;
      generated: string;
      answer: string;
      consent: boolean;
    }
  | { type: "stage"; applicationId: string; stage: Stage; note: string }
  | { type: "withdraw"; applicationId: string }
  | { type: "publish"; job: z.infer<typeof jobSchema> }
  | { type: "company"; name: string; description: string };

export function initialState(): State {
  const state = stateSchema.parse({
    version: 1,
    activePersonId: null,
    ...marketplace,
    people,
    applications: [],
    saved: [],
    drafts: [],
    portfolio: [
      {
        id: "portfolio-anna-1",
        candidateId: "candidate-anna",
        type: "repository",
        title: "Asystent do klasyfikacji zgłoszeń",
        url: "https://github.com/example-anna/ticket-triage-assistant",
        description:
          "Prototyp asystenta AI, który wstępnie kategoryzuje zgłoszenia operacyjne. Dane testowe są syntetyczne.",
      },
      {
        id: "portfolio-anna-2",
        candidateId: "candidate-anna",
        type: "video",
        title: "Demo prototypu w 3 minuty",
        url: "https://www.youtube.com/watch?v=demo-anna-triage",
        description:
          "Nagranie ekranu: od zgłoszenia do propozycji odpowiedzi i ręcznej akceptacji.",
      },
      {
        id: "portfolio-anna-3",
        candidateId: "candidate-anna",
        type: "contribution",
        title: "Poprawka dokumentacji biblioteki open source",
        url: "https://github.com/example-org/open-docs/pull/42",
        description: "Uzupełniłam przykład użycia i opisałam ograniczenia modelu językowego.",
      },
      {
        id: "portfolio-anna-4",
        candidateId: "candidate-anna",
        type: "agent_chat",
        title: "Rozmowa z agentem: projekt kryteriów akceptacji",
        url: "https://example.com/rozmowy/kryteria-akceptacji",
        description: "Pokazuje, jak doprecyzowuję polecenia i weryfikuję odpowiedzi agenta.",
      },
    ],
  });
  const bob = state.people.find((x) => x.id === "candidate-marek")!;
  const job = state.jobs[0];
  state.applications.push({
    id: "application-example",
    candidateId: bob.id,
    jobId: job.id,
    companyId: job.companyId,
    jobTitle: job.title,
    candidateName: bob.name,
    cv: bob.cv,
    answer:
      "Pracowałem nad automatyzacją obsługi zgłoszeń. Poprowadziłem badania z użytkownikami i wdrożenie, które skróciło czas odpowiedzi o 25%. Chętnie opowiem o decyzjach i ograniczeniach tego projektu.",
    sourceNotes: "",
    generatedAnswer: "",
    score: bob.exampleScore,
    summary: bob.exampleSummary,
    stage: "submitted",
    events: [{ stage: "submitted", at: "2026-11-02T09:00:00.000Z", note: "" }],
  });
  return stateSchema.parse(state);
}
export function publishedJobs(state: State): JobWithCompany[] {
  return state.jobs
    .filter((x) => x.publicationStatus === "published")
    .map((job) => ({ ...job, company: state.companies.find((x) => x.id === job.companyId)! }))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}
export function currentPerson(state: State) {
  return state.people.find((x) => x.id === state.activePersonId);
}
export function transition(
  state: State,
  action: Action,
  now = new Date().toISOString(),
  newId: string = crypto.randomUUID(),
): State {
  const s = structuredClone(state);
  const person = currentPerson(s);
  const fail = (message: string): never => {
    throw new Error(message);
  };
  const candidate = () => {
    if (person?.role !== "candidate") return fail("Wybierz profil kandydata.");
    return person;
  };
  const employer = () => {
    if (person?.role !== "employer") return fail("Wybierz profil pracodawcy.");
    return person;
  };
  if (action.type === "select_person") {
    if (action.id !== null && !s.people.some((x) => x.id === action.id))
      fail("Nie znaleziono osoby.");
    s.activePersonId = action.id;
  } else if (action.type === "profile")
    Object.assign(candidate(), profileSchema.parse(action.value));
  else if (action.type === "toggle_saved") {
    const p = candidate();
    if (!s.jobs.some((x) => x.id === action.jobId)) fail("Nie znaleziono oferty.");
    const index = s.saved.findIndex((x) => x.candidateId === p.id && x.jobId === action.jobId);
    if (index >= 0) s.saved.splice(index, 1);
    else s.saved.push({ candidateId: p.id, jobId: action.jobId });
  } else if (action.type === "portfolio_add") {
    const p = candidate();
    s.portfolio.push({ id: newId, candidateId: p.id, ...portfolioItemSchema.parse(action.value) });
  } else if (action.type === "portfolio_remove") {
    const p = candidate();
    const index = s.portfolio.findIndex((x) => x.id === action.id && x.candidateId === p.id);
    if (index < 0) fail("Nie znaleziono elementu portfolio.");
    s.portfolio.splice(index, 1);
  } else if (action.type === "draft") {
    const p = candidate();
    const draft = draftSchema.parse({ candidateId: p.id, ...action });
    s.drafts = s.drafts.filter((x) => !(x.candidateId === p.id && x.jobId === action.jobId));
    s.drafts.push(draft);
  } else if (action.type === "submit") {
    const p = candidate();
    const job = s.jobs.find((x) => x.id === action.jobId && x.publicationStatus === "published");
    if (!job) return fail("Oferta nie jest dostępna.");
    if (!action.consent) fail("Zatwierdź treść i zgodę na przesłanie aplikacji.");
    if (s.applications.some((x) => x.candidateId === p.id && x.jobId === job.id))
      fail("Aplikacja na tę ofertę została już wysłana.");
    s.applications.push(
      applicationSchema.parse({
        id: newId,
        candidateId: p.id,
        jobId: job.id,
        companyId: job.companyId,
        jobTitle: job.title,
        candidateName: p.name,
        cv: p.cv,
        answer: action.answer,
        sourceNotes: action.notes,
        generatedAnswer: action.generated,
        score: p.exampleScore,
        summary: p.exampleSummary,
        stage: "submitted",
        events: [{ stage: "submitted", at: now, note: "" }],
      }),
    );
    s.drafts = s.drafts.filter((x) => !(x.candidateId === p.id && x.jobId === job.id));
  } else if (action.type === "stage" || action.type === "withdraw") {
    const application = s.applications.find((x) => x.id === action.applicationId);
    if (!application) return fail("Nie znaleziono aplikacji.");
    const stage = action.type === "withdraw" ? "withdrawn" : action.stage;
    if (action.type === "withdraw") {
      const p = candidate();
      if (
        application.candidateId !== p.id ||
        ["hired", "rejected", "withdrawn"].includes(application.stage)
      )
        fail("Nie można wycofać tej aplikacji.");
    } else {
      const p = employer();
      if (application.companyId !== p.companyId || !nextStages[application.stage].includes(stage))
        fail("Ta zmiana etapu nie jest dostępna.");
    }
    application.stage = stage;
    application.events.push({ stage, at: now, note: action.type === "stage" ? action.note : "" });
  } else if (action.type === "publish") {
    const p = employer();
    const job = jobSchema.parse(action.job);
    if (job.companyId !== p.companyId) fail("Wybierz ofertę własnej firmy.");
    const index = s.jobs.findIndex((x) => x.id === job.id);
    if (index >= 0) {
      if (s.jobs[index].companyId !== p.companyId) fail("Nie można zmienić tej oferty.");
      s.jobs[index] = job;
    } else s.jobs.unshift(job);
  } else if (action.type === "company") {
    const p = employer();
    Object.assign(
      s.companies.find((x) => x.id === p.companyId)!,
      { name: shortText.parse(action.name), description: text.parse(action.description) },
    );
  }
  return stateSchema.parse(s);
}
