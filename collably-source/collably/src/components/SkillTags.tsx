import { Badge } from "@/components/ui/badge";

export function SkillTags({ skills, variant = "secondary", hits = [] }: { skills: string[]; variant?: "secondary" | "outline"; hits?: string[] }) {
  if (!skills.length) return <span className="text-xs text-muted-foreground">None listed</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {skills.map((s) => (
        <Badge key={s} variant={hits.includes(s.toLowerCase()) ? "default" : variant}>{s}</Badge>
      ))}
    </div>
  );
}

export function Avatar({ name }: { name: string }) {
  const i = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
  return <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent font-display font-semibold text-accent-foreground">{i}</div>;
}
