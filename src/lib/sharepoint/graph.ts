import { DomainError } from "../domain";
import type { AuthConfig } from "./config";

export type GraphRequest = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
};

export interface GraphClient {
  request<T>(request: GraphRequest): Promise<T>;
}

const GRAPH_ROOT = "https://graph.microsoft.com/v1.0";

function endpoint(path: string): string {
  if (path.startsWith("https://")) return path;
  return `${GRAPH_ROOT}${path}`;
}

function errorText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const record = data as { error?: { message?: unknown; code?: unknown } };
  const message = record.error?.message;
  const code = record.error?.code;
  const parts = [typeof code === "string" ? code : "", typeof message === "string" ? message : ""].filter(Boolean);
  return parts.join(": ").slice(0, 300);
}

function sharePointError(status: number, data: unknown): DomainError {
  const detail = errorText(data);
  if (status === 401 || status === 403) {
    return new DomainError(
      "אין הרשאה ל-SharePoint. יש לאשר לאפליקציה גישה לאתר (Sites.ReadWrite.All או Sites.Selected) ולוודא שפרטי החיבור נכונים.",
      status,
    );
  }
  if (status === 404) {
    return new DomainError(detail ? `האתר או הרשימה לא נמצאו ב-SharePoint. ${detail}` : "האתר או הרשימה לא נמצאו ב-SharePoint.", 404);
  }
  return new DomainError(detail ? `SharePoint החזיר שגיאה: ${detail}` : `SharePoint החזיר שגיאה (${status}).`, status >= 400 ? status : 502);
}

async function readBody(response: Response): Promise<unknown> {
  if (response.status === 204 || response.status === 202) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: { message: text.slice(0, 300) } };
  }
}

export function createGraphClient(auth: AuthConfig, fetchImpl: typeof fetch = fetch): GraphClient {
  let cached: { value: string; expiresAt: number } | null = null;

  async function fetchToken(): Promise<string> {
    if (auth.kind === "token") return auth.accessToken;
    if (cached && cached.expiresAt > Date.now() + 60_000) return cached.value;
    const response = await fetchImpl(`https://login.microsoftonline.com/${encodeURIComponent(auth.tenantId)}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: auth.clientId,
        client_secret: auth.clientSecret,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
      signal: AbortSignal.timeout(30_000),
    });
    const data = (await readBody(response)) as { access_token?: string; expires_in?: number } | undefined;
    if (!response.ok || !data?.access_token) {
      console.error(`SharePoint token request failed: ${response.status}`);
      throw new DomainError("לא הצלחתי לקבל הרשאה מ-Microsoft. בדקו את מזהה הדייר, מזהה האפליקציה וסוד הלקוח.", 502);
    }
    cached = {
      value: data.access_token,
      expiresAt: Date.now() + Math.max(30, data.expires_in ?? 3600) * 1000,
    };
    return data.access_token;
  }

  async function send(request: GraphRequest, allowRefresh: boolean): Promise<Response> {
    const token = await fetchToken();
    const response = await fetchImpl(endpoint(request.path), {
      method: request.method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(request.body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: request.body === undefined ? undefined : JSON.stringify(request.body),
      signal: AbortSignal.timeout(30_000),
    });
    if (response.status === 401 && allowRefresh && auth.kind === "app") {
      await response.arrayBuffer().catch(() => undefined);
      cached = null;
      return send(request, false);
    }
    return response;
  }

  return {
    async request<T>(request: GraphRequest): Promise<T> {
      let attempt = 0;
      while (true) {
        const response = await send(request, true);
        if (response.status === 429 || response.status === 503 || response.status === 504) {
          attempt += 1;
          if (attempt <= 3) {
            const retryAfter = Number(response.headers.get("Retry-After"));
            const wait = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 500 * attempt;
            await response.arrayBuffer().catch(() => undefined);
            await new Promise((resolve) => setTimeout(resolve, wait));
            continue;
          }
        }
        if (response.status === 401 && auth.kind === "token") {
          throw new DomainError("פג תוקף הגישה ל-SharePoint. צריך לחדש את SHAREPOINT_ACCESS_TOKEN או לעבור לפרטי אפליקציה.", 401);
        }
        const data = await readBody(response);
        if (!response.ok) {
          console.error(`SharePoint ${request.method} failed: ${response.status}`);
          throw sharePointError(response.status, data);
        }
        return data as T;
      }
    },
  };
}
