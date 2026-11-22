import { useState } from "react";
import { ExternalLink, FileText } from "lucide-react";
import { getPortfolioFile } from "./portfolio-files";
import type { RecruiterPortfolioItem } from "./recruiter-materials";

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function RecruiterPortfolio({ items }: { items: RecruiterPortfolioItem[] }) {
  const [problem, setProblem] = useState("");

  async function openFile(id: string) {
    const blob = await getPortfolioFile(id).catch(() => undefined);
    if (!blob) {
      setProblem("Nie znaleziono pliku w tej przeglądarce.");
      return;
    }
    setProblem("");
    window.open(URL.createObjectURL(blob), "_blank", "noopener");
  }

  return (
    <div className="grid gap-4">
      <h3>Portfolio kandydata</h3>
      {items.length === 0 ? (
        <p className="record-caption">Kandydat nie dodał jeszcze wpisów w portfolio.</p>
      ) : (
        <ul className="grid gap-6" aria-label="Wpisy w portfolio kandydata">
          {items.map((item) => (
            <li key={item.id} className="grid gap-2">
              <p className="record-caption">{item.typeLabel}</p>
              <h4>{item.title}</h4>
              {item.notes && <p className="whitespace-pre-wrap">{item.notes}</p>}
              <div className="flex flex-wrap items-center gap-3">
                {item.link && (
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <a
                      className="inline-flex items-center gap-1 underline"
                      href={item.link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {item.link.host} <ExternalLink className="size-4" aria-hidden="true" />
                      <span className="sr-only">(otwiera się w nowej karcie)</span>
                    </a>
                    {!item.link.verified && (
                      <span className="text-sm text-muted-foreground">niezweryfikowany</span>
                    )}
                  </span>
                )}
                {item.file && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 underline"
                    onClick={() => void openFile(item.file!.id)}
                  >
                    <FileText className="size-4" aria-hidden="true" />
                    {item.file.name} ({formatSize(item.file.size)})
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {problem && (
        <p className="prototype-error" role="alert">
          {problem}
        </p>
      )}
    </div>
  );
}
