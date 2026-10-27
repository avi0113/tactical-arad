const demo = globalThis.DEMO;

const priorityLabel = { low: "נמוכה", medium: "בינונית", high: "גבוהה", critical: "קריטית" };
const eventStatusLabel = { open: "פתוח", in_progress: "בביצוע", completed: "הושלם", cancelled: "בוטל" };
const actionStatusLabel = { pending: "ממתינה", in_progress: "בביצוע", done: "הושלמה", blocked: "חסומה" };
const priorityRank = { critical: 0, high: 1, medium: 2, low: 3 };
const eventStatusRank = { in_progress: 0, open: 1, completed: 2, cancelled: 3 };
const categoryPreference = ["פיקוד ושליטה", "ביטחון", "חירום והצלה", "רפואה", "אוכלוסייה", "הסברה", "תשתיות", "לוגיסטיקה"];

function h(tag, props, ...children) {
  const node = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value == null || value === false) continue;
      if (key === "class") node.className = value;
      else node.setAttribute(key, String(value));
    }
  }
  append(node, children);
  return node;
}

function append(node, children) {
  for (const child of children) {
    if (child == null || child === false) continue;
    if (Array.isArray(child)) append(node, child);
    else if (child instanceof Node) node.append(child);
    else node.append(document.createTextNode(String(child)));
  }
}

function formatWhen(iso) {
  return new Intl.DateTimeFormat("he-IL", {
    timeZone: "Asia/Jerusalem",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function formatMinutes(minutes) {
  if (!minutes) return "ללא הערכת זמן";
  return minutes === 1 ? "דקה" : `${minutes} דקות`;
}

function orderedActions(event) {
  return [...event.actions].sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}

function actionProgress(actions) {
  const total = actions.length;
  const done = actions.filter((action) => action.status === "done").length;
  const blocked = actions.filter((action) => action.status === "blocked").length;
  const active = actions.filter((action) => action.status === "in_progress").length;
  const pending = actions.filter((action) => action.status === "pending").length;
  return { total, done, blocked, active, pending };
}

function isLiveEvent(event) {
  return event.status === "open" || event.status === "in_progress";
}

function nextOpenAction(event) {
  return orderedActions(event).find((action) => action.status !== "done");
}

function sortEvents(events) {
  return [...events].sort((a, b) => {
    const byStatus = eventStatusRank[a.status] - eventStatusRank[b.status];
    if (byStatus !== 0) return byStatus;
    return b.startedAt.localeCompare(a.startedAt);
  });
}

function templateUsageCount(templateId) {
  return demo.events.filter((event) => event.actions.some((action) => action.templateId === templateId)).length;
}

function attentionActions() {
  const rows = [];
  for (const event of demo.events) {
    if (!isLiveEvent(event)) continue;
    for (const action of orderedActions(event)) {
      if (action.status === "blocked" || (action.status !== "done" && (action.priority === "critical" || action.priority === "high"))) {
        rows.push({ event, action });
      }
    }
  }
  return rows
    .sort((a, b) => {
      const blocked = Number(b.action.status === "blocked") - Number(a.action.status === "blocked");
      if (blocked !== 0) return blocked;
      return priorityRank[a.action.priority] - priorityRank[b.action.priority];
    })
    .slice(0, 6);
}

function categoryOrder() {
  const present = new Set(demo.templates.map((template) => template.category));
  const ordered = categoryPreference.filter((category) => present.has(category));
  const extras = [...present].filter((category) => !categoryPreference.includes(category)).sort((a, b) => a.localeCompare(b, "he"));
  return [...ordered, ...extras];
}

function signature(title, description, steps) {
  return JSON.stringify({ title, description, steps });
}

function progressBar(done, total) {
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return h(
    "div",
    { class: "progress" },
    h("div", { class: "progress-track" }, h("div", { class: "progress-fill", style: `width:${percent}%` })),
    h("span", { class: "progress-label" }, `${percent}%`),
  );
}

function intro(kicker, title, text) {
  return h("div", { class: "intro" }, kicker ? h("p", { class: "kicker" }, kicker) : null, h("h1", { class: "display" }, title), text ? h("p", null, text) : null);
}

function dashboardView() {
  const live = sortEvents(demo.events.filter(isLiveEvent));
  const openActions = live.reduce((sum, event) => sum + event.actions.filter((action) => action.status !== "done").length, 0);
  const blocked = demo.events.reduce((sum, event) => sum + event.actions.filter((action) => action.status === "blocked").length, 0);
  const attention = attentionActions();

  return h(
    "div",
    null,
    intro("חדר מצב", "מה פתוח עכשיו", "תצוגה מקומית של אירועי דוגמה והפעולות שעדיין מופיעות בהם. אין שרת, אין שמירה ואין עריכה."),
    h(
      "section",
      { class: "stats" },
      stat("אירועים פעילים", live.length),
      stat("פעולות שטרם הושלמו", openActions),
      stat("פעולות חסומות", blocked),
      stat("משימות במאגר", demo.templates.length),
    ),
    h(
      "div",
      { class: "split" },
      h(
        "section",
        null,
        h("h2", { class: "section-label" }, "אירועים פעילים"),
        h(
          "div",
          { class: "stack" },
          live.map((event) => {
            const progress = actionProgress(event.actions);
            const next = nextOpenAction(event);
            return h(
              "a",
              { class: "card card-link", href: `#/events/${event.id}` },
              h(
                "div",
                { class: "row" },
                h(
                  "div",
                  null,
                  h("h3", null, event.title),
                  h("p", { class: "meta" }, [event.location || "ללא מיקום", event.commander ? ` · ${event.commander}` : ""].join("")),
                ),
                h("span", { class: `pill tone-${event.status}` }, eventStatusLabel[event.status]),
              ),
              progressBar(progress.done, progress.total),
              h("p", { class: "progress-copy" }, `${progress.done} מתוך ${progress.total} פעולות הושלמו${next ? ` · הבאה: ${next.title}` : ""}`),
            );
          }),
        ),
      ),
      h(
        "section",
        null,
        h("h2", { class: "section-label" }, "דורש טיפול"),
        h(
          "div",
          { class: "stack-tight" },
          attention.map(({ event, action }) =>
            h(
              "a",
              { class: "card card-link", href: `#/events/${event.id}` },
              h(
                "div",
                { class: "row" },
                h("span", { style: "font-size:0.875rem;font-weight:500" }, action.title),
                h("span", { class: `pill tone-${action.priority}` }, priorityLabel[action.priority]),
              ),
              h(
                "p",
                { class: "fine" },
                `${event.title} · ${actionStatusLabel[action.status]}${action.status === "blocked" && action.notes ? ` · ${action.notes}` : ""}`,
              ),
            ),
          ),
        ),
        h("a", { class: "library-link", href: "#/templates" }, `למאגר המשימות (${demo.templates.length})`),
      ),
    ),
  );
}

function stat(label, value) {
  return h("div", { class: "stat" }, h("span", null, label), h("strong", { class: "display" }, String(value)));
}

function eventsView() {
  const events = sortEvents(demo.events);
  return h(
    "div",
    null,
    intro("אירועים", "כל האירועים", "לכל אירוע מוצגת רשימת הפעולות שלו. זו דוגמה קבועה בקובץ המקומי, בלי יצירה או מחיקה."),
    h(
      "div",
      { class: "stack" },
      events.map((event) => {
        const progress = actionProgress(event.actions);
        return h(
          "article",
          { class: "card" },
          h(
            "div",
            { class: "row" },
            h(
              "div",
              null,
              h("a", { class: "title-link", href: `#/events/${event.id}` }, h("h3", null, event.title)),
              h(
                "p",
                { class: "meta" },
                `${event.eventType}${event.location ? ` · ${event.location}` : ""}${event.commander ? ` · ${event.commander}` : ""} · ${formatWhen(event.startedAt)}`,
              ),
            ),
            h(
              "div",
              { class: "pills" },
              h("span", { class: `pill tone-${event.severity}` }, priorityLabel[event.severity]),
              h("span", { class: `pill tone-${event.status}` }, eventStatusLabel[event.status]),
            ),
          ),
          progressBar(progress.done, progress.total),
          h(
            "div",
            { class: "row-wrap" },
            h(
              "p",
              { class: "progress-copy" },
              `${progress.done} מתוך ${progress.total} פעולות הושלמו${progress.blocked ? ` · ${progress.blocked} חסומות` : ""}`,
            ),
            h("a", { class: "button", href: `#/events/${event.id}` }, "לרשימת הפעולות"),
          ),
        );
      }),
    ),
  );
}

function templatesView() {
  return h(
    "div",
    null,
    intro(
      "מאגר",
      "משימות מוכנות מראש",
      "אלה המשימות לדוגמה. בתצוגה הזו אי אפשר לערוך אותן. פעולה שמופיעה באירוע היא עותק, והנוסח שלה יכול להיות שונה מהמשימה כאן.",
    ),
    h(
      "div",
      { class: "groups" },
      categoryOrder().map((category) => {
        const items = demo.templates
          .filter((template) => template.category === category)
          .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || a.title.localeCompare(b.title, "he"));
        return h(
          "section",
          null,
          h("h2", { class: "section-label" }, category),
          h(
            "div",
            { class: "template-grid" },
            items.map((template) => {
              const usage = templateUsageCount(template.id);
              const usageText =
                usage === 0 ? "לא מופיעה באירוע לדוגמה" : usage === 1 ? "מופיעה באירוע אחד, כעותק נפרד" : `מופיעה ב־${usage} אירועים, כעותקים נפרדים`;
              return h(
                "article",
                { class: "card" },
                h(
                  "div",
                  { class: "row" },
                  h("h3", null, template.title),
                  h("span", { class: `pill tone-${template.priority}` }, priorityLabel[template.priority]),
                ),
                template.description ? h("p", { class: "copy" }, template.description) : null,
                h(
                  "p",
                  { class: "fine" },
                  `${template.defaultRole || "ללא תפקיד מוצע"} · ${formatMinutes(template.estimatedMinutes)}${template.steps.length ? ` · ${template.steps.length} שלבים` : ""}`,
                ),
                h("p", { class: "fine" }, usageText),
                template.steps.length
                  ? h(
                      "ol",
                      { class: "template-steps" },
                      template.steps.map((step) => h("li", null, step)),
                    )
                  : null,
              );
            }),
          ),
        );
      }),
    ),
  );
}

function eventView(eventId) {
  const event = demo.events.find((item) => item.id === eventId);
  if (!event) {
    return h(
      "div",
      null,
      intro(null, "האירוע לא נמצא", "אין אירוע כזה בנתוני הדוגמה."),
      h("a", { class: "library-link", href: "#/events" }, "חזרה לאירועים"),
    );
  }
  const actions = orderedActions(event);
  const progress = actionProgress(actions);
  return h(
    "div",
    null,
    h("a", { class: "back-link", href: "#/events" }, "כל האירועים"),
    h(
      "header",
      { class: "card event-head" },
      h("p", { class: "event-type" }, event.eventType),
      h("h1", { class: "display" }, event.title),
      event.description ? h("p", { class: "copy" }, event.description) : null,
      h(
        "dl",
        { class: "facts" },
        fact("מיקום", event.location || "לא צוין"),
        fact("אחראי", event.commander || "לא צוין"),
        fact("התחלה", formatWhen(event.startedAt)),
        fact("סטטוס", eventStatusLabel[event.status]),
      ),
    ),
    h(
      "section",
      { class: "actions" },
      h("h2", { class: "display" }, "פעולות נדרשות לביצוע"),
      h(
        "p",
        { class: "lead" },
        "הרשימה שייכת לאירוע הזה. כשהנוסח שונה מהמשימה במאגר, זה מסומן על הפעולה. בתצוגה הזו אי אפשר לסמן ביצוע או לערוך.",
      ),
      h(
        "div",
        { class: "panel" },
        progressBar(progress.done, progress.total),
        h(
          "p",
          { class: "progress-copy" },
          `${progress.done} מתוך ${progress.total} הושלמו · ${progress.pending} ממתינות · ${progress.active} בביצוע · ${progress.blocked} חסומות`,
        ),
      ),
      h(
        "div",
        { class: "stack" },
        actions.map((action) => actionCard(action)),
      ),
    ),
  );
}

function fact(label, value) {
  return h("div", null, h("dt", null, label), h("dd", null, value));
}

function actionCard(action) {
  const origin = action.templateId ? demo.templates.find((template) => template.id === action.templateId) : undefined;
  const diverged = origin ? signature(origin.title, origin.description, origin.steps) !== signature(action.title, action.description, action.steps.map((step) => step.text)) : false;
  const classes = ["card", action.status === "blocked" ? "card-blocked" : "", action.status === "done" ? "card-done" : ""].filter(Boolean).join(" ");
  return h(
    "article",
    { class: classes },
    h(
      "div",
      { class: "row" },
      h(
        "div",
        null,
        h("h3", null, action.title),
        h("p", { class: "fine" }, origin ? `עותק של «${origin.title}»${diverged ? " · שונה מהנוסח שבמאגר" : ""}` : "פעולה של האירוע"),
      ),
      h(
        "div",
        { class: "pills" },
        h("span", { class: `pill tone-${action.priority}` }, priorityLabel[action.priority]),
        h("span", { class: `pill tone-${action.status}` }, actionStatusLabel[action.status]),
      ),
    ),
    action.description ? h("p", { class: "copy" }, action.description) : null,
    action.notes ? h("p", { class: action.status === "blocked" ? "note note-blocked" : "note" }, action.notes) : null,
    h(
      "p",
      { class: "fine" },
      `${action.category || "כללי"} · ${action.assignee ? `אחראי: ${action.assignee}` : "ללא אחראי"} · ${formatMinutes(action.estimatedMinutes)}${action.completedAt ? ` · הושלמה ${formatWhen(action.completedAt)}` : ""} · ${actionStatusLabel[action.status]}`,
    ),
    action.steps.length
      ? h(
          "ul",
          { class: "steps" },
          action.steps.map((step) =>
            h(
              "li",
              null,
              h("span", { class: step.done ? "mark-done" : "mark-open", "aria-hidden": "true" }, step.done ? "✓" : "○"),
              h("span", { class: step.done ? "step-done" : "" }, step.text),
            ),
          ),
        )
      : null,
  );
}

function parseRoute() {
  const raw = (location.hash || "#/").replace(/^#/, "");
  const path = raw.startsWith("/") ? raw : `/${raw}`;
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return { name: "dashboard" };
  if (parts[0] === "events" && !parts[1]) return { name: "events" };
  if (parts[0] === "events" && parts[1]) return { name: "event", id: decodeURIComponent(parts[1]) };
  if (parts[0] === "templates") return { name: "templates" };
  return { name: "missing" };
}

function render() {
  if (!demo || !Array.isArray(demo.events) || !Array.isArray(demo.templates)) {
    document.getElementById("view").replaceChildren(intro(null, "הדוגמה לא נטענה", "הקובץ demo.js חסר או לא נפתח ליד index.html."));
    return;
  }
  const route = parseRoute();
  const view = document.getElementById("view");
  const navName = route.name === "event" ? "events" : route.name === "missing" ? "" : route.name;
  for (const link of document.querySelectorAll("[data-nav]")) {
    link.classList.toggle("is-active", link.dataset.nav === navName);
  }
  const screen =
    route.name === "dashboard"
      ? dashboardView()
      : route.name === "events"
        ? eventsView()
        : route.name === "templates"
          ? templatesView()
          : route.name === "event"
            ? eventView(route.id)
            : intro(null, "העמוד לא נמצא", "אפשר לחזור ללוח הבקרה.");
  view.replaceChildren(screen);
}

window.addEventListener("hashchange", render);
render();
