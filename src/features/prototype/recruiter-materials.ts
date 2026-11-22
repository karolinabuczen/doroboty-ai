import { portfolioForApplication, portfolioTypeLabels, type Application, type State } from "./model";
import { checkPortfolioUrl } from "./portfolio-links";

export type RecruiterPortfolioItem = {
  id: string;
  title: string;
  typeLabel: string;
  notes: string;
  link?: { url: string; host: string; verified: boolean };
  file?: { id: string; name: string; size: number };
};

/** Read-only projection of the portfolio items attached to one application. */
export function recruiterPortfolio(
  state: State,
  application: Application,
): RecruiterPortfolioItem[] {
  return portfolioForApplication(state, application)
    .map((item) => {
      const checked = item.url ? checkPortfolioUrl(item.type, item.url) : undefined;
      return {
        id: item.id,
        title: item.title,
        typeLabel: portfolioTypeLabels[item.type],
        notes: item.description,
        // Links that fail the safe-link rules are never rendered as clickable.
        link:
          checked && !("error" in checked)
            ? { url: item.url, host: checked.host, verified: checked.verified }
            : undefined,
        file: item.file && { id: item.file.id, name: item.file.name, size: item.file.size },
      };
    });
}
