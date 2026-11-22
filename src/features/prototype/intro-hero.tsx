import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import peopleArt from "../../../docs/design-system/agent-kit/assets/people.png";
import heroDragon from "../../assets/hero-dragon.webp";

// Shared hero (headline + picture) used by the home page and the offers page.
export function IntroHero({ showActions = false }: { showActions?: boolean }) {
  return (
    <section className="home-intro bg-muted/25 shadow-[var(--gui-divider-bottom-shadow)]">
      <div className="mx-auto grid max-w-[1360px] gap-12 px-5 py-16 lg:grid-cols-[1.3fr_0.7fr] lg:px-8 lg:py-24">
        <div>
          <h1 className="max-w-4xl text-5xl leading-[var(--gui-leading-xxl)] font-semibold tracking-[var(--gui-tracking-xs)] sm:text-6xl lg:text-7xl">
            <span className="realm-off">Praca dla ludzi, którzy dowożą z AI.</span>
            <span className="realm-on">Zostań bohaterem własnej historii z pomocą AI</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Wyselekcjonowane role, w których AI jest częścią odpowiedzialności, decyzji i wyniku
            pracy — nie dopiskiem w employer brandingu.
          </p>
          {showActions && (
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/oferty" className={buttonVariants({ size: "lg" })}>
                Zobacz oferty <ArrowRight />
              </Link>
              <Link
                to="/metodologia"
                className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
              >
                Jak wybieramy role
              </Link>
            </div>
          )}
        </div>
        <img
          className="people-art realm-off"
          src={peopleArt}
          alt="Dwie osoby pracujące razem z laptopem"
        />
        <img
          className="realm-on hero-dragon"
          src={heroDragon}
          alt="Łuczniczka, czarodziej, rycerz i krasnolud walczą ze smokiem"
        />
      </div>
    </section>
  );
}
