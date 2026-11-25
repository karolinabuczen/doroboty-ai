import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { currentPerson } from "./model";
import { usePrototype } from "./store";
import { Field } from "./workspace";
import { Empty } from "./shell";

type Problem = "invalid" | "locked" | "unavailable";

export function defaultLanding(role: "candidate" | "employer" | "operator") {
  return role === "candidate" ? "/app" : role === "employer" ? "/app/oferty" : "/app/case";
}
export function safeNextPath(next: string | null) {
  return next && /^\/(?!\/)/.test(next) && !next.includes("\\") && !next.startsWith("/auth")
    ? next
    : null;
}
function problemText(problem: Problem, retryAfterSeconds?: number) {
  if (problem === "locked") {
    const minutes = Math.max(1, Math.ceil((retryAfterSeconds ?? 60) / 60));
    return `Zbyt wiele nieudanych prób logowania. Spróbuj ponownie za ${minutes} min.`;
  }
  if (problem === "unavailable")
    return "Logowanie jest chwilowo niedostępne. Spróbuj ponownie za chwilę.";
  return "Nieprawidłowy login lub hasło.";
}

export function LoginPage() {
  const { state, authReady, signIn, signOut } = usePrototype();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [problem, setProblem] = useState<{ kind: Problem; wait?: number } | null>(null);
  const [pending, setPending] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const person = currentPerson(state);
  if (!authReady)
    return (
      <section className="prototype-section max-w-xl">
        <Empty>
          <p role="status">Sprawdzamy sesję…</p>
        </Empty>
      </section>
    );
  if (person)
    return (
      <section className="prototype-section max-w-xl">
        <h1>Jesteś zalogowany</h1>
        <div className="prototype-panel mt-6">
          <p className="mb-6 text-muted-foreground">
            Zalogowano jako <strong>{person.name}</strong>.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link className={buttonVariants()} to={next ?? defaultLanding(person.role)}>
              Przejdź do aplikacji
            </Link>
            <Button variant="outline" onClick={() => void signOut()}>
              Wyloguj się
            </Button>
          </div>
        </div>
      </section>
    );
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setProblem(null);
    const result = await signIn(login.trim(), password);
    setPending(false);
    if (result.ok) {
      const role = result.user.role;
      navigate(next ?? defaultLanding(role), { replace: true });
      return;
    }
    setPassword("");
    setProblem({ kind: result.reason, wait: result.retryAfterSeconds });
    passwordRef.current?.focus();
  }
  const invalid = problem?.kind === "invalid";
  return (
    <section className="prototype-section max-w-xl">
      <h1>Zaloguj się</h1>
      <p className="mt-4 mb-8 text-muted-foreground">
        Użyj loginu i hasła otrzymanych od organizatora próby.
      </p>
      <form className="prototype-panel grid gap-5" onSubmit={submit} noValidate>
        {problem && (
          <p id="login-error" className="prototype-error" role="alert">
            {problemText(problem.kind, problem.wait)}
          </p>
        )}
        <Field label="Login">
          <Input
            name="login"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            aria-invalid={invalid || undefined}
            aria-describedby={problem ? "login-error" : undefined}
          />
        </Field>
        <Field label="Hasło">
          <Input
            ref={passwordRef}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={invalid || undefined}
            aria-describedby={problem ? "login-error" : undefined}
          />
        </Field>
        <Button type="submit" disabled={pending || !login.trim() || !password}>
          {pending ? "Logowanie…" : "Zaloguj się"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-muted-foreground">
        Nie masz danych logowania? Skontaktuj się z organizatorem próby.{" "}
        <Link className="underline" to="/oferty">
          Przeglądaj oferty bez logowania
        </Link>
        .
      </p>
    </section>
  );
}
