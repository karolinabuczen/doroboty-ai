import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { JobCard } from "@/features/jobs/job-card";
import { usePrototype } from "./store";
import { publishedJobs } from "./model";
import { IntroHero } from "./intro-hero";

const categories = [
  {
    slug: "build",
    label: "Build",
    description: "Tworzysz modele, systemy i produkty wykorzystujące AI.",
  },
  {
    slug: "apply",
    label: "Apply",
    description: "Używasz AI, żeby lepiej wykonywać swoją właściwą pracę.",
  },
  {
    slug: "lead",
    label: "Lead",
    description: "Prowadzisz zmianę, decyzje i zespoły w świecie AI.",
  },
] as const;

export default function HomePage() {
  const { state } = usePrototype();
  const latestJobs = publishedJobs(state).slice(0, 4);

  return (
    <>
      <IntroHero showActions />

      <section className="mx-auto max-w-[1360px] px-5 py-16 lg:px-8 lg:py-20">
        <h2 className="text-3xl font-semibold tracking-[var(--gui-tracking-s)] sm:text-4xl">
          Build. Apply. Lead.
        </h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {categories.map((category) => (
            <article key={category.slug} className="prototype-panel">
              <h3 className="text-xl font-semibold">{category.label}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {category.description}
              </p>
              <Link
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--gui-link)] hover:underline"
                to={`/oferty?category=${category.slug}`}
              >
                Przeglądaj role <ArrowRight className="size-4" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-muted/25 shadow-[var(--gui-divider-top-shadow)]">
        <div className="mx-auto max-w-[1360px] px-5 py-16 lg:px-8 lg:py-20">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <h2 className="text-3xl font-semibold tracking-[var(--gui-tracking-s)] sm:text-4xl">
                Najnowsze oferty
              </h2>
            </div>
            <Link
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--gui-link)] hover:underline"
              to="/oferty"
            >
              Wszystkie oferty <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="mt-8 pp-job-list">
            {latestJobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
