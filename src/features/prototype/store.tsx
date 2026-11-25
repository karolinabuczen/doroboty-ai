import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { initialState, transition, type Action, type State } from "./model";
import { parseState, readState, saveState, type StoragePort } from "./storage";
import { fetchSession, requestSignIn, requestSignOut, type SignInResult } from "./auth";
function browserStorage(): StoragePort | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
function useStore() {
  const [loaded] = useState(() => readState(browserStorage()));
  // Who is signed in is decided only by the server session, never by saved browser data.
  const [state, setState] = useState<State>(() => ({ ...loaded.state, activePersonId: null }));
  const [authReady, setAuthReady] = useState(false);
  const [issue, setIssue] = useState(loaded.issue);
  const [error, setError] = useState("");
  const [blocked, setBlocked] = useState(loaded.blocked);
  const latest = useRef(state);
  function commit(next: State, replace = false) {
    latest.current = next;
    setState(next);
    setError("");
    if (blocked && !replace) return;
    try {
      saveState(browserStorage(), next);
      setIssue("");
      if (replace) setBlocked(false);
    } catch (e) {
      setIssue((e as Error).message);
    }
  }
  function run(action: Action) {
    try {
      commit(transition(latest.current, action));
      return true;
    } catch (e) {
      setError(
        e instanceof Error && e.name !== "ZodError"
          ? e.message
          : "Sprawdź poprawność i długość wprowadzonych danych.",
      );
      return false;
    }
  }
  function importState(raw: string) {
    try {
      const next = parseState(raw);
      const keep = latest.current.activePersonId;
      commit(
        { ...next, activePersonId: next.people.some((x) => x.id === keep) ? keep : null },
        true,
      );
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }
  function applySession(user: { id: string } | null) {
    const known = user && latest.current.people.some((x) => x.id === user.id);
    const id = known ? user.id : null;
    if (latest.current.activePersonId !== id) run({ type: "select_person", id });
  }
  async function signIn(login: string, password: string): Promise<SignInResult> {
    const result = await requestSignIn(login, password);
    if (!result.ok) return result;
    if (!latest.current.people.some((x) => x.id === result.user.id)) {
      await requestSignOut();
      return { ok: false, reason: "unavailable" };
    }
    applySession(result.user);
    return result;
  }
  async function signOut() {
    await requestSignOut();
    applySession(null);
  }
  useEffect(() => {
    let active = true;
    const refresh = () =>
      void fetchSession().then((user) => {
        if (!active) return;
        applySession(user);
        setAuthReady(true);
      });
    refresh();
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
    // applySession only reads refs and stable setters; the session check must run once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);
  return {
    state,
    issue,
    error,
    blocked,
    authReady,
    signIn,
    signOut,
    original: loaded.original,
    run,
    importState,
    clearError: () => setError(""),
    reset: () => commit({ ...initialState(), activePersonId: latest.current.activePersonId }, true),
  };
}
type Store = ReturnType<typeof useStore>;
const Context = createContext<Store | null>(null);
export function PrototypeProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
export function usePrototype() {
  const store = useContext(Context);
  if (!store) throw new Error("PrototypeProvider is required");
  return store;
}
