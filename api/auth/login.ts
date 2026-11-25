import type { IncomingMessage, ServerResponse } from "node:http";
import { handleLogin } from "../_lib/routes.js";

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    await handleLogin(req, res);
  } catch {
    res.statusCode = 500;
    res.end();
  }
}
