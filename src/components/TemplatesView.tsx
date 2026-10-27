import { priorityRank } from "@/lib/constants";
import { demo } from "@/lib/seed";
import { categoryOrder, templateUsageCount } from "@/lib/stats";
import { formatMinutes } from "@/lib/time";
import { PageIntro, PriorityPill } from "@/components/ui";

export function TemplatesView() {
  const groups = categoryOrder(demo.templates);

  return (
    <div>
      <PageIntro
        kicker="מאגר"
        title="משימות מוכנות מראש"
        text="אלה המשימות לדוגמה. בתצוגה הזו אי אפשר לערוך אותן. פעולה שמופיעה באירוע היא עותק, והנוסח שלה יכול להיות שונה מהמשימה כאן."
      />
      <div className="space-y-8">
        {groups.map((category) => {
          const items = demo.templates
            .filter((template) => template.category === category)
            .sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || a.title.localeCompare(b.title, "he"));
          return (
            <section key={category}>
              <h2 className="mb-3 text-sm font-medium text-ink-500">{category}</h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {items.map((template) => {
                  const usage = templateUsageCount(demo.events, template.id);
                  return (
                    <article key={template.id} className="rounded-3xl bg-white p-4 shadow-card ring-1 ring-sand-200">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-semibold leading-snug">{template.title}</h3>
                        <PriorityPill value={template.priority} />
                      </div>
                      {template.description ? <p className="mt-2 text-sm leading-6 text-ink-700">{template.description}</p> : null}
                      <p className="mt-3 text-xs text-ink-500">
                        {template.defaultRole || "ללא תפקיד מוצע"}
                        {" · "}
                        {formatMinutes(template.estimatedMinutes)}
                        {template.steps.length ? ` · ${template.steps.length} שלבים` : ""}
                      </p>
                      <p className="mt-1 text-xs text-ink-500">
                        {usage === 0
                          ? "לא מופיעה באירוע לדוגמה"
                          : usage === 1
                            ? "מופיעה באירוע אחד, כעותק נפרד"
                            : `מופיעה ב־${usage} אירועים, כעותקים נפרדים`}
                      </p>
                      {template.steps.length > 0 ? (
                        <ol className="mt-3 list-decimal space-y-1 ps-5 text-sm text-ink-700">
                          {template.steps.map((step) => (
                            <li key={step}>{step}</li>
                          ))}
                        </ol>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
