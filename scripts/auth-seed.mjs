// Generates TEST-ONLY credentials for the fictional personas.
// Writes .env.local (session secret + password hashes) and TEST-CREDENTIALS.local.md (plain passwords).
// Both files are gitignored and must never be committed or pushed.
import { randomBytes, randomInt } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { hashPasswordSync } from "../api/_lib/passwords.ts";

const root = new URL("../", import.meta.url);
const envFile = new URL(".env.local", root);
const credentialsFile = new URL("TEST-CREDENTIALS.local.md", root);
const people = JSON.parse(
  readFileSync(new URL("src/features/prototype/data/people.json", root), "utf8"),
);
const logins = {
  "candidate-anna": "anna.kowalska",
  "candidate-marek": "marek.nowak",
  "employer-brightlabs": "karolina.wisniewska",
  "employer-northstar": "tomasz.zielinski",
  operator: "prowadzacy",
};
const roleLabels = { candidate: "kandydat", employer: "rekruter", operator: "prowadzący" };
// No look-alike characters (0/O, 1/l/I) so passwords are easy to type.
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function generatePassword(length = 20) {
  return Array.from({ length }, () => alphabet[randomInt(alphabet.length)]).join("");
}

if ((existsSync(envFile) || existsSync(credentialsFile)) && !process.argv.includes("--force")) {
  console.error("Credentials already exist. Run `npm run auth:seed -- --force` to replace them.");
  process.exit(1);
}

const accounts = people.map((person) => {
  const login = logins[person.id];
  if (!login) throw new Error(`No login defined for ${person.id}`);
  return {
    id: person.id,
    name: person.name,
    role: person.role,
    login,
    password: generatePassword(),
  };
});
const users = accounts.map(({ id, login, role, password }) => ({
  id,
  login,
  role,
  hash: hashPasswordSync(password),
}));

writeFileSync(
  envFile,
  [
    "# Local secrets. Gitignored. Never commit or push.",
    `SESSION_SECRET=${randomBytes(48).toString("base64url")}`,
    `AUTH_USERS='${JSON.stringify(users)}'`,
    "",
  ].join("\n"),
);
writeFileSync(
  credentialsFile,
  [
    "# Test credentials (fictional personas)",
    "",
    "TEST ONLY. Do not commit, push, e-mail or share publicly. This file is gitignored.",
    "Passwords are random and unique per person. Only their salted hashes are stored in `.env.local`.",
    "",
    "| Person | Role | Login | Password |",
    "| --- | --- | --- | --- |",
    ...accounts.map(
      (a) => `| ${a.name} | ${roleLabels[a.role]} | \`${a.login}\` | \`${a.password}\` |`,
    ),
    "",
    "To put the same accounts on Vercel, copy `SESSION_SECRET` and `AUTH_USERS` from `.env.local`",
    "into the Vercel project environment variables (see docs/release.md).",
    "",
  ].join("\n"),
);
console.log(`Wrote .env.local and TEST-CREDENTIALS.local.md for ${accounts.length} accounts.`);
