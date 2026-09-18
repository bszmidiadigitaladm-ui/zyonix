import type { LegalDocument } from "@/lib/legal/content";
import { LEGAL_LAST_UPDATED } from "@/lib/legal/content";

export function LegalDocumentView({ doc, locale }: { doc: LegalDocument; locale: string }) {
  const updated = new Date(`${LEGAL_LAST_UPDATED}T00:00:00Z`).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <article>
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{doc.title}</h1>
      <p className="mt-2 text-sm text-muted">
        {doc.updatedLabel}: {updated}
      </p>
      <p className="mt-6 text-sm leading-relaxed text-foreground/90">{doc.intro}</p>

      {doc.sections.map((section) => (
        <section key={section.heading} className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">{section.heading}</h2>
          {section.paragraphs?.map((p) => (
            <p key={p} className="mb-3 text-sm leading-relaxed text-foreground/90">
              {p}
            </p>
          ))}
          {section.bullets && (
            <ul className="ml-5 list-disc space-y-2 text-sm leading-relaxed text-foreground/90 marker:text-accent">
              {section.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </article>
  );
}
