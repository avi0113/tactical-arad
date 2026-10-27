import { snapshotTemplate } from "./domain";
import type { ActionStatus, Db, EventAction, EventStatus, OpsEvent, Priority, TaskTemplate } from "./types";

interface TemplateSeed {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  estimatedMinutes: number;
  defaultRole: string;
  steps: string[];
}

const TEMPLATES: TemplateSeed[] = [
  {
    id: "t01",
    title: "פתיחת חדר מצב",
    description: "פתיחת חדר המצב העירוני, איוש עמדות ומינוי גורם מפקד לאירוע.",
    category: "פיקוד ושליטה",
    priority: "critical",
    estimatedMinutes: 15,
    defaultRole: "קצין משמרת",
    steps: ["וידוא איוש עמדות בחדר המצב", "פתיחת יומן אירוע", "מינוי מפקד אירוע ודיווח לגורם בכיר"],
  },
  {
    id: "t02",
    title: "הערכת מצב ראשונית",
    description: "גיבוש תמונת מצב קצרה: מה קרה, היכן, מי מעורב ומה נדרש מייד.",
    category: "פיקוד ושליטה",
    priority: "critical",
    estimatedMinutes: 20,
    defaultRole: "מפקד אירוע",
    steps: ["איסוף דיווחים ראשונים מהשטח", "הגדרת היקף וחומרה", "קביעת הפעולות המיידיות"],
  },
  {
    id: "t03",
    title: "חסימת צירי גישה",
    description: "חסימת הצירים המובילים אל הזירה, כדי לאפשר גישה לכוחות ולמנוע כניסת קהל.",
    category: "ביטחון",
    priority: "high",
    estimatedMinutes: 30,
    defaultRole: "שיטור עירוני",
    steps: ["סימון נקודות החסימה", "הצבת מחסומים וכוח אדם", "עדכון מוקד 106 על הצירים החסומים"],
  },
  {
    id: "t04",
    title: "פינוי אוכלוסייה",
    description: "פינוי תושבים מגזרה שהוגדרה בסיכון אל נקודת כינוס.",
    category: "אוכלוסייה",
    priority: "critical",
    estimatedMinutes: 60,
    defaultRole: "שירותים חברתיים",
    steps: ["הגדרת גזרת הפינוי", "הנחיה לתושבים לצאת", "ריכוז בנקודת הכינוס וספירה"],
  },
  {
    id: "t05",
    title: "פתיחת נקודת כינוס",
    description: "פתיחת מבנה לקליטת תושבים, כולל רישום וסיוע ראשוני.",
    category: "אוכלוסייה",
    priority: "high",
    estimatedMinutes: 40,
    defaultRole: "אגף חינוך",
    steps: ["פתיחת המבנה ובדיקת נגישות", "הצבת עמדת רישום", "מים, ישיבה וסיוע ראשוני"],
  },
  {
    id: "t06",
    title: "תיאום מד״א",
    description: "דיווח למגן דוד אדום ותיאום הגעה, פינוי נפגעים ונקודת איסוף.",
    category: "רפואה",
    priority: "critical",
    estimatedMinutes: 15,
    defaultRole: "קצין קישור",
    steps: ["דיווח על נפגעים ומיקום מדויק", "תיאום ציר הגעה", "עדכון נקודת איסוף נפגעים"],
  },
  {
    id: "t07",
    title: "תיאום כיבוי והצלה",
    description: "מסירת תמונת מצב לכיבוי והצלה ופינוי ציר גישה לכבאיות.",
    category: "חירום והצלה",
    priority: "critical",
    estimatedMinutes: 15,
    defaultRole: "קצין קישור",
    steps: ["מסירת מיקום וסוג האירוע", "פינוי ציר לכבאיות", "דיווח על חומרים מסוכנים אם ידוע"],
  },
  {
    id: "t08",
    title: "תיאום משטרת ישראל",
    description: "דיווח למשטרה ותיאום שליטה בזירה, חסימות וקהל.",
    category: "ביטחון",
    priority: "high",
    estimatedMinutes: 15,
    defaultRole: "קצין קישור",
    steps: ["דיווח למוקד 100", "תיאום גורם שולט בזירה", "סיוע בחסימות"],
  },
  {
    id: "t09",
    title: "הודעה לתושבים",
    description: "פרסום הודעה אחידה ומאושרת לתושבים בערוצי העירייה.",
    category: "הסברה",
    priority: "high",
    estimatedMinutes: 25,
    defaultRole: "דוברות",
    steps: ["ניסוח הודעה קצרה ומאושרת", "פרסום באתר וברשתות העירייה", "העברת הנוסח למוקד הטלפוני"],
  },
  {
    id: "t10",
    title: "הפעלת מוקד מידע",
    description: "תגבור המוקד העירוני ומענה אחיד לפניות תושבים בזמן האירוע.",
    category: "הסברה",
    priority: "medium",
    estimatedMinutes: 20,
    defaultRole: "מוקד עירוני",
    steps: ["תגבור מענה במוקד 106", "הפצת שאלות ותשובות למוקדנים", "תיעוד פניות חריגות"],
  },
  {
    id: "t11",
    title: "בדיקת תשתיות",
    description: "בדיקה ראשונית של חשמל, מים וביוב באזור האירוע וגידור מפגעים.",
    category: "תשתיות",
    priority: "high",
    estimatedMinutes: 45,
    defaultRole: "מחלקת תשתיות",
    steps: ["בדיקת חשמל באזור", "בדיקת מים וביוב", "גידור מפגעים ודיווח"],
  },
  {
    id: "t12",
    title: "הספקת ציוד חירום",
    description: "הוצאת ציוד ממחסן החירום ושינוע שלו לנקודת האירוע או לנקודת הכינוס.",
    category: "לוגיסטיקה",
    priority: "medium",
    estimatedMinutes: 40,
    defaultRole: "מחסן חירום",
    steps: ["הוצאת ציוד לפי הרשימה", "שינוע לנקודה", "רישום הציוד שיצא"],
  },
  {
    id: "t13",
    title: "סיוע לקשישים ולרגישים",
    description: "איתור יזום של תושבים הזקוקים לעזרה בגזרת האירוע.",
    category: "אוכלוסייה",
    priority: "high",
    estimatedMinutes: 50,
    defaultRole: "שירותים חברתיים",
    steps: ["איתור נזקקים ידועים בגזרה", "יצירת קשר יזום", "פינוי או סיוע במקום לפי הצורך"],
  },
  {
    id: "t14",
    title: "תיעוד נזק ראשוני",
    description: "צילום ורישום של נזק גלוי, בלי להיכנס לזירה לפני אישור.",
    category: "פיקוד ושליטה",
    priority: "medium",
    estimatedMinutes: 30,
    defaultRole: "סייר עירוני",
    steps: ["צילום וציון מיקום", "רישום כתובות שנפגעו", "העברה לאגף הרלוונטי"],
  },
  {
    id: "t15",
    title: "סגירת אירוע",
    description: "וידוא שאין פעולות פתוחות, שחרור כוחות ורישום שעת סיום.",
    category: "פיקוד ושליטה",
    priority: "medium",
    estimatedMinutes: 20,
    defaultRole: "מפקד אירוע",
    steps: ["וידוא שכל הפעולות טופלו או הועברו", "שחרור כוחות וציוד", "עדכון הגורמים ורישום שעת סיום"],
  },
  {
    id: "t16",
    title: "תחקיר ראשוני",
    description: "איסוף ציר זמן ופערים סמוך לסיום האירוע, לפני שהפרטים נשכחים.",
    category: "פיקוד ושליטה",
    priority: "low",
    estimatedMinutes: 45,
    defaultRole: "רמ״ד חירום",
    steps: ["איסוף ציר זמן מהיומן", "רישום פערים שעלו", "המלצות לתיקון נהלים"],
  },
];

function stamp(base: Date, minutes: number): string {
  return new Date(base.getTime() + minutes * 60_000).toISOString();
}

function makeTemplate(seed: TemplateSeed, now: string): TaskTemplate {
  return {
    id: seed.id,
    title: seed.title,
    description: seed.description,
    category: seed.category,
    priority: seed.priority,
    estimatedMinutes: seed.estimatedMinutes,
    defaultRole: seed.defaultRole,
    steps: [...seed.steps],
    createdAt: now,
    updatedAt: now,
  };
}

function makeEvent(
  id: string,
  fields: Omit<OpsEvent, "id" | "actions" | "createdAt" | "updatedAt"> & { createdAt: string; updatedAt: string },
): OpsEvent {
  return { id, actions: [], ...fields };
}

function addAction(
  templates: TaskTemplate[],
  event: OpsEvent,
  templateId: string,
  now: string,
  nextId: () => string,
  tweak?: (action: EventAction) => void,
) {
  const template = templates.find((item) => item.id === templateId);
  if (!template) throw new Error(`missing template ${templateId}`);
  const action = snapshotTemplate(template, event.actions.length, now, nextId);
  tweak?.(action);
  event.actions.push(action);
}

function mark(
  action: EventAction,
  status: ActionStatus,
  when: string,
  extra?: Partial<Pick<EventAction, "assignee" | "notes" | "title" | "description">>,
) {
  if (extra?.title) action.title = extra.title;
  if (extra?.description) action.description = extra.description;
  if (extra?.assignee) action.assignee = extra.assignee;
  if (extra?.notes) action.notes = extra.notes;
  action.status = status;
  action.updatedAt = when;
  action.completedAt = status === "done" ? when : null;
  if (status === "done") action.steps.forEach((step) => {
    step.done = true;
  });
}

export function createSeed(base = new Date()): Db {
  let serial = 0;
  const nextId = () => {
    serial += 1;
    return `seed-a${serial}`;
  };
  const created = stamp(base, -7 * 24 * 60);
  const templates = TEMPLATES.map((item) => makeTemplate(item, created));

  const fire = makeEvent("e-fire", {
    title: "שריפת קוצים בשולי שכונת רננים",
    description: "דיווח על שריפת קוצים המתקרבת לקו הבתים ברחוב מיתר. רוח מערבית. אין נפגעים ידועים.",
    eventType: "חירום",
    status: "in_progress" satisfies EventStatus,
    severity: "high",
    location: "רחוב מיתר, שכונת רננים, ערד",
    commander: "יובל חדד",
    startedAt: stamp(base, -120),
    createdAt: stamp(base, -120),
    updatedAt: stamp(base, -18),
  });

  addAction(templates, fire, "t01", stamp(base, -118), nextId, (action) => mark(action, "done", stamp(base, -110)));
  addAction(templates, fire, "t02", stamp(base, -110), nextId, (action) => mark(action, "done", stamp(base, -95)));
  addAction(templates, fire, "t07", stamp(base, -100), nextId, (action) =>
    mark(action, "in_progress", stamp(base, -40), { assignee: "מאיה אברהם" }),
  );
  addAction(templates, fire, "t03", stamp(base, -98), nextId, (action) =>
    mark(action, "in_progress", stamp(base, -30), {
      assignee: "רועי שמש",
      description: "חסימת רחוב מיתר ורחוב שיר מצד שכונת רננים. הציר לכיבוי נשאר פתוח מכיוון כביש 31.",
      notes: "החסימה היא רק מכיוון השכונה. לא לחסום את ציר הכבאיות.",
    }),
  );
  addAction(templates, fire, "t09", stamp(base, -90), nextId, (action) => {
    action.title = "הודעה לתושבי רננים";
    action.description = "לבקש מתושבי רחוב מיתר ורחוב שיר לסגור חלונות ולהימנע מיציאה עד להודעה חדשה.";
  });
  addAction(templates, fire, "t13", stamp(base, -88), nextId);
  addAction(templates, fire, "t11", stamp(base, -80), nextId, (action) =>
    mark(action, "blocked", stamp(base, -18), {
      notes: "אין כניסה לזירה עד שכיבוי והצלה מאשרים. הבדיקה ממתינה לאישור.",
    }),
  );

  const hazmat = makeEvent("e-hazmat", {
    title: "חשד לחומר מסוכן בכביש 31",
    description: "נהג משאית דיווח על נזילה ממיתקן סמוך לאזור התעשייה. סוג החומר עדיין לא אושר.",
    eventType: "ביטחון",
    status: "open",
    severity: "critical",
    location: "כביש 31, סמוך לאזור התעשייה בערד",
    commander: "נועה ביטון",
    startedAt: stamp(base, -40),
    createdAt: stamp(base, -40),
    updatedAt: stamp(base, -35),
  });
  for (const templateId of ["t01", "t02", "t08", "t03", "t06", "t09"]) {
    addAction(templates, hazmat, templateId, stamp(base, -35), nextId);
  }

  const drill = makeEvent("e-drill", {
    title: "תרגיל הפסקת מים בשכונת אבישור",
    description: "תרגיל שולחן לבדיקת רשימת הפעולות בעת הפסקת מים ממושכת בשכונה.",
    eventType: "תרגיל",
    status: "completed",
    severity: "low",
    location: "שכונת אבישור, ערד",
    commander: "איתי מזרחי",
    startedAt: stamp(base, -2 * 24 * 60),
    createdAt: stamp(base, -2 * 24 * 60),
    updatedAt: stamp(base, -2 * 24 * 60 + 90),
  });
  for (const templateId of ["t02", "t09", "t12", "t05", "t15"]) {
    addAction(templates, drill, templateId, stamp(base, -2 * 24 * 60 + 10), nextId, (action) =>
      mark(action, "done", stamp(base, -2 * 24 * 60 + 80)),
    );
  }

  return { templates, events: [fire, hazmat, drill] };
}
