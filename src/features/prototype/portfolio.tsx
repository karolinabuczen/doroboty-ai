import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { ExternalLink, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormSelect } from "@/components/ui/form-select";
import { usePrototype } from "./store";
import {
  applicationsForPortfolioItem,
  checkPortfolioFile,
  currentPerson,
  portfolioFileKinds,
  portfolioTypeConfig,
  portfolioTypeLabels,
  portfolioTypes,
  type PortfolioMime,
  type PortfolioType,
} from "./model";
import { deletePortfolioFile, getPortfolioFile, putPortfolioFile } from "./portfolio-files";
import { PageTitle, Empty } from "./shell";
import { checkPortfolioUrl, portfolioAllowedHosts } from "./portfolio-links";
import { Field } from "./workspace";

const typeOptions = portfolioTypes.map((value) => ({ value, label: portfolioTypeLabels[value] }));

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function AttachedApplications({ itemId }: { itemId: string }) {
  const { state } = usePrototype();
  const applications = applicationsForPortfolioItem(state, itemId);
  return (
    <div className="mb-3 text-sm">
      <p className="text-muted-foreground">Dołączono do aplikacji:</p>
      {applications.length ? (
        <ul className="mt-1 grid gap-1">
          {applications.map((application) => (
            <li key={application.id}>
              <Link className="underline" to={`/app/aplikacje/${application.id}`}>
                {application.jobTitle}
                {" – "}
                {state.companies.find((x) => x.id === application.companyId)?.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>Nie dołączono do żadnej aplikacji.</p>
      )}
    </div>
  );
}

function PortfolioLink({ type, url }: { type: string; url: string }) {
  const checked = checkPortfolioUrl(type, url);
  if ("error" in checked) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <a
        className="inline-flex items-center gap-1 break-all underline"
        href={url}
        target="_blank"
        rel="noopener noreferrer"
      >
        {checked.host} <ExternalLink className="size-4" aria-hidden="true" />
        <span className="sr-only">(otwiera się w nowej karcie)</span>
      </a>
      {!checked.verified && <span className="text-sm text-muted-foreground">niezweryfikowany</span>}
    </span>
  );
}

export function PortfolioPage() {
  const { state, run } = usePrototype();
  const person = currentPerson(state)!;
  const items = state.portfolio.filter((x) => x.candidateId === person.id);
  const [type, setType] = useState<PortfolioType | "">("");
  const [formKey, setFormKey] = useState(0);
  const [message, setMessage] = useState("");
  const [removing, setRemoving] = useState("");
  const [problem, setProblem] = useState("");
  const [videoSource, setVideoSource] = useState<"file" | "link">("file");
  const config = type ? portfolioTypeConfig[type] : null;
  const showLink = type !== "video" || videoSource === "link";
  const showFile = type !== "video" || videoSource === "file";

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!type || !config) return;
    const form = e.currentTarget;
    const data = new FormData(form);
    const url = String(data.get("url") ?? "").trim();
    const picked = data.get("file");
    const file = picked instanceof File && picked.size > 0 ? picked : null;
    setMessage("");
    setProblem("");
    if (!url && !file) {
      setProblem(
        type === "video"
          ? videoSource === "file"
            ? "Dodaj plik wideo."
            : "Podaj adres URL."
          : config.fileKind
            ? "Podaj link albo dodaj plik."
            : "Podaj adres URL.",
      );
      return;
    }
    let meta: { id: string; name: string; mimeType: PortfolioMime; size: number } | undefined;
    if (file && !config.fileKind) return;
    if (file && config.fileKind) {
      const checked = checkPortfolioFile(file, config.fileKind);
      if ("error" in checked) {
        setProblem(checked.error);
        return;
      }
      meta = {
        id: crypto.randomUUID(),
        name: file.name,
        mimeType: checked.mimeType,
        size: file.size,
      };
      try {
        await putPortfolioFile(meta.id, new Blob([file], { type: checked.mimeType }));
      } catch (error) {
        setProblem((error as Error).message);
        return;
      }
    }
    const added = run({
      type: "portfolio_add",
      value: {
        title: String(data.get("title")),
        type,
        url,
        file: meta,
        description: String(data.get("description")),
      },
    });
    if (added) {
      setMessage("Dodano do portfolio.");
      setType("");
      setVideoSource("file");
      setFormKey((k) => k + 1);
    } else if (meta) void deletePortfolioFile(meta.id);
  }

  async function openFile(id: string) {
    const blob = await getPortfolioFile(id).catch(() => undefined);
    if (!blob) {
      setProblem("Nie znaleziono pliku w tej przeglądarce.");
      return;
    }
    window.open(URL.createObjectURL(blob), "_blank", "noopener");
  }

  return (
    <>
      <PageTitle>Moje portfolio</PageTitle>
      <p className="mb-6 max-w-2xl text-muted-foreground">
        Wybierz rodzaj pracy, która pokazuje Twoje kompetencje, i dodaj do niej link oraz notatki.
        Wpisy widzisz tylko Ty w tym prototypie.
      </p>
      <form key={formKey} onSubmit={add} className="prototype-panel prototype-form">
        <Field label="Rodzaj pracy">
          <FormSelect
            ariaLabel="Rodzaj pracy"
            value={type}
            placeholder="Wybierz rodzaj pracy"
            options={typeOptions}
            onValueChange={(value) => {
              setType(value as PortfolioType);
              setMessage("");
              setProblem("");
            }}
          />
        </Field>
        {config ? (
          <>
            <Field label={config.titleLabel}>
              <Input name="title" required maxLength={200} placeholder={config.titlePlaceholder} />
            </Field>
            {type === "video" && (
              <fieldset className="grid gap-2">
                <legend className="mb-1 font-medium">Źródło wideo</legend>
                {(
                  [
                    ["file", "Plik wideo"],
                    ["link", "Link"],
                  ] as const
                ).map(([value, label]) => (
                  <label key={value} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="videoSource"
                      value={value}
                      checked={videoSource === value}
                      onChange={() => {
                        setVideoSource(value);
                        setProblem("");
                      }}
                    />
                    {label}
                  </label>
                ))}
              </fieldset>
            )}
            {showLink && (
              <Field
                label={
                  config.fileKind && type !== "video"
                    ? `${config.urlLabel} (opcjonalnie)`
                    : config.urlLabel
                }
              >
                <Input
                  name="url"
                  type="url"
                  required={!config.fileKind || type === "video"}
                  maxLength={500}
                  placeholder={config.urlPlaceholder}
                />
                <span className="text-sm text-muted-foreground">
                  {portfolioAllowedHosts[type!]
                    ? `Dozwolone serwisy: ${portfolioAllowedHosts[type!].join(", ")}.`
                    : "Dowolny link https. Zostanie oznaczony jako niezweryfikowany."}
                </span>
              </Field>
            )}
            {config.fileKind && showFile && (
              <Field label={type === "video" ? "Plik wideo" : "Albo dodaj plik"}>
                <Input
                  key={config.fileKind}
                  name="file"
                  type="file"
                  accept={portfolioFileKinds[config.fileKind].accept}
                />
                <span className="text-sm text-muted-foreground">
                  {config.fileKind === "video"
                    ? "Tylko wideo: .mp4, .webm lub .mov, do 50 MB."
                    : "Tylko pliki tekstowe: .txt, .md lub .json, do 1 MB."}{" "}
                  Plik zostaje tylko w tej przeglądarce.
                </span>
              </Field>
            )}
            <Field label={config.notesLabel}>
              <Textarea name="description" maxLength={1000} placeholder={config.notesPlaceholder} />
            </Field>
            <Button type="submit">Dodaj do portfolio</Button>
          </>
        ) : (
          <p className="text-muted-foreground">
            Po wyborze rodzaju pracy pojawią się pola na tytuł, link i notatki.
          </p>
        )}
        {problem && (
          <p className="prototype-error" role="alert">
            {problem}
          </p>
        )}
      </form>
      {message && (
        <p role="status" className="mt-4">
          {message}
        </p>
      )}
      <section className="mt-6" aria-label="Twoje wpisy">
        {items.length ? (
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-4">
            {items.map((item) => (
              <li key={item.id} className="prototype-panel min-w-0 [overflow-wrap:anywhere]">
                <p className="text-sm text-muted-foreground">{portfolioTypeLabels[item.type]}</p>
                <h2 className="my-2 text-xl">{item.title}</h2>
                {item.description && <p className="mb-3">{item.description}</p>}
                <AttachedApplications itemId={item.id} />
                <div className="flex flex-wrap items-center gap-3">
                  {item.url && <PortfolioLink type={item.type} url={item.url} />}
                  {item.file && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto min-w-0 whitespace-normal text-left"
                      onClick={() => void openFile(item.file!.id)}
                    >
                      <FileText aria-hidden="true" />
                      {item.file.name} ({formatSize(item.file.size)})
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`Usuń: ${item.title}`}
                    onClick={() => setRemoving(item.id)}
                  >
                    <Trash2 aria-hidden="true" /> Usuń
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>
            <p>Nie masz jeszcze żadnych wpisów w portfolio.</p>
          </Empty>
        )}
      </section>
      <ConfirmDialog
        open={removing !== ""}
        onOpenChange={(open) => {
          if (!open) setRemoving("");
        }}
        title="Usunąć wpis z portfolio?"
        description="Wpis zostanie usunięty wraz z dodanym plikiem. Tej operacji nie można cofnąć."
        label="Usuń"
        pending={false}
        onConfirm={() => {
          const item = items.find((x) => x.id === removing);
          if (item && run({ type: "portfolio_remove", id: item.id })) {
            if (item.file) void deletePortfolioFile(item.file.id);
            setMessage("Usunięto z portfolio.");
          }
          setRemoving("");
        }}
      />
    </>
  );
}
