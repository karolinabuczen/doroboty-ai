import { hashPasswordSync } from "../../api/_lib/passwords";

// Test-only accounts for the isolated e2e server. These are not the real trial credentials.
export const TEST_ACCOUNTS = [
  { id: "candidate-anna", name: "Anna Kowalska", login: "anna.test", role: "candidate" },
  { id: "candidate-marek", name: "Marek Nowak", login: "marek.test", role: "candidate" },
  {
    id: "employer-brightlabs",
    name: "Karolina Wiśniewska",
    login: "karolina.test",
    role: "employer",
  },
  { id: "employer-northstar", name: "Tomasz Zieliński", login: "tomasz.test", role: "employer" },
  { id: "operator", name: "Prowadzący", login: "prowadzacy.test", role: "operator" },
  { id: "lockout-target", name: "Lockout", login: "lockout.test", role: "candidate" },
] as const;

export const TEST_PASSWORD = "e2e-Test-Passw0rd-only";

export function authServerEnv() {
  return {
    SESSION_SECRET: "e2e-session-secret-e2e-session-secret-0123456789",
    AUTH_USERS: JSON.stringify(
      TEST_ACCOUNTS.map(({ id, login, role }) => ({
        id,
        login,
        role,
        hash: hashPasswordSync(TEST_PASSWORD),
      })),
    ),
  };
}
