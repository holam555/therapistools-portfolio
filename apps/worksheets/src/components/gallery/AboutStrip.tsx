import { Stethoscope } from 'lucide-react';

export default function AboutStrip() {
  return (
    <section
      id="about"
      className="relative rounded-2xl bg-card border border-border shadow-paper px-5 sm:px-8 pt-7 pb-6 max-w-4xl mx-auto"
    >
      {/* A note card taped to the desk, not a SaaS banner. */}
      <span aria-hidden className="washi-tape" />
      <p className="font-display font-bold text-foreground flex items-center gap-2">
        <Stethoscope className="w-4 h-4 text-primary shrink-0" aria-hidden="true" />
        Designed around real pediatric OT practice
      </p>
      <div className="dotted-divider my-3" aria-hidden="true" />
      <p className="text-sm text-muted-foreground leading-relaxed">
        Every worksheet is designed around real clinical goals: visual perception, handwriting, and
        scissor skills. Print a template as-is in seconds, or customize every detail (shapes,
        difficulty, fonts, and more) to fit the child in front of you.
      </p>
    </section>
  );
}
