import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { UserRound, Handshake, Sparkles, LayoutGrid, Target } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Collably — Learn together, grow together" },
      { name: "description", content: "Collably matches learners who can teach each other, then gives them a shared room to set goals and track progress." },
      { property: "og:title", content: "Collably — Learn together, grow together" },
      { property: "og:description", content: "Peer skill exchange with smart matching, collab rooms and goal tracking." },
    ],
  }),
  component: Index,
});

const features = [
  { icon: UserRound, title: "Build your profile", text: "List the skills you can teach and the ones you want to learn." },
  { icon: Sparkles, title: "Smart matching", text: "Our engine ranks learners by how well you can help each other." },
  { icon: Handshake, title: "Requests", text: "Send a request, accept one, and you're partners." },
  { icon: LayoutGrid, title: "Collab rooms", text: "A shared space for notes, links and resources." },
  { icon: Target, title: "Goals & progress", text: "Daily, weekly and monthly goals with peer evaluation." },
];

function Index() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="font-display text-xl font-bold text-primary">Collably</span>
        <div className="flex gap-2">
          <Button variant="ghost" asChild><Link to="/auth">Sign in</Link></Button>
          <Button asChild><Link to="/auth" search={{ mode: "signup" }}>Get started</Link></Button>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-10">
        <div className="rounded-3xl bg-hero px-8 py-20 text-primary-foreground shadow-soft md:px-16">
          <p className="mb-4 inline-block rounded-full bg-highlight px-3 py-1 text-xs font-semibold text-highlight-foreground">
            Mutual growth partnerships
          </p>
          <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
            Teach what you know. Learn what you don't.
          </h1>
          <p className="mt-5 max-w-xl text-lg opacity-90">
            Collably connects learners with complementary skills and gives every pair a room to plan, share and track progress together.
          </p>
          <Button size="lg" variant="secondary" className="mt-8" asChild>
            <Link to="/auth" search={{ mode: "signup" }}>Create your profile</Link>
          </Button>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-5">
        {features.map((f, i) => (
          <div key={f.title} className="rounded-2xl border bg-card p-6">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <f.icon className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground">0{i + 1}</p>
            <h3 className="mt-1 font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
