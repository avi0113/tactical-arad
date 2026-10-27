import { DomainError } from "../domain";

export const DEFAULT_LISTS = {
  tasks: "משימות מבצעיות",
  events: "אירועים מבצעיים",
  actions: "פעולות לאירוע",
  meta: "מצב מערכת המשימות",
} as const;

export type ListNames = {
  tasks: string;
  events: string;
  actions: string;
  meta: string;
};

export type AppAuth = {
  kind: "app";
  tenantId: string;
  clientId: string;
  clientSecret: string;
};

export type TokenAuth = {
  kind: "token";
  accessToken: string;
};

export type AuthConfig = AppAuth | TokenAuth;

export type SharePointSettings = {
  auth: AuthConfig;
  siteId?: string;
  siteUrl?: string;
  lists: ListNames;
};

export function parseSiteUrl(input: string): { hostname: string; path: string } {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new DomainError("כתובת אתר SharePoint לא תקינה", 503);
  }
  if (url.protocol !== "https:") {
    throw new DomainError("כתובת SharePoint חייבת להתחיל ב-https", 503);
  }
  let path = decodeURI(url.pathname).replace(/\/+$/, "");
  path = path.replace(/\/default\.aspx$/i, "");
  return { hostname: url.hostname, path: path || "/" };
}

export function graphSitePath(site: { hostname: string; path: string }): string {
  if (site.path === "/") return `/sites/${site.hostname}`;
  return `/sites/${site.hostname}:${encodeURI(site.path)}`;
}

function listName(envValue: string | undefined, fallback: string): string {
  const value = envValue?.trim();
  return value || fallback;
}

export function loadSharePointSettings(env: NodeJS.ProcessEnv = process.env): SharePointSettings {
  const siteId = env.SHAREPOINT_SITE_ID?.trim() || undefined;
  const siteUrl = env.SHAREPOINT_SITE_URL?.trim() || undefined;
  if (!siteId && !siteUrl) {
    throw new DomainError(
      "חיבור SharePoint לא הוגדר. צריך SHAREPOINT_SITE_URL או SHAREPOINT_SITE_ID, ובנוסף פרטי אפליקציה או SHAREPOINT_ACCESS_TOKEN.",
      503,
    );
  }
  if (siteUrl) parseSiteUrl(siteUrl);

  const tenantId = env.SHAREPOINT_TENANT_ID?.trim();
  const clientId = env.SHAREPOINT_CLIENT_ID?.trim();
  const clientSecret = env.SHAREPOINT_CLIENT_SECRET?.trim();
  const accessToken = env.SHAREPOINT_ACCESS_TOKEN?.trim();
  let auth: AuthConfig;
  if (tenantId && clientId && clientSecret) {
    auth = { kind: "app", tenantId, clientId, clientSecret };
  } else if (accessToken) {
    auth = { kind: "token", accessToken };
  } else {
    throw new DomainError(
      "חיבור SharePoint לא הוגדר. צריך SHAREPOINT_TENANT_ID, SHAREPOINT_CLIENT_ID ו-SHAREPOINT_CLIENT_SECRET, או SHAREPOINT_ACCESS_TOKEN זמני.",
      503,
    );
  }

  return {
    auth,
    siteId,
    siteUrl,
    lists: {
      tasks: listName(env.SHAREPOINT_LIST_TASKS, DEFAULT_LISTS.tasks),
      events: listName(env.SHAREPOINT_LIST_EVENTS, DEFAULT_LISTS.events),
      actions: listName(env.SHAREPOINT_LIST_ACTIONS, DEFAULT_LISTS.actions),
      meta: listName(env.SHAREPOINT_LIST_META, DEFAULT_LISTS.meta),
    },
  };
}
