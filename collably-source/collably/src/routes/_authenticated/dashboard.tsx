import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { meQuery, requestsQuery, roomsQuery, avg } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Collably" }, { name: "description", content: "Your Collably overview." }, { property: "og:title", content: "Dashboard — Collably" }, { property: "og:description", content: "Your Collably overview." }] }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(meQuery), context.queryClient.ensureQueryData(requestsQuery), context.queryClient.ensureQueryData(roomsQuery)]),
  component: Dashboard,
});

function Dashboard() {
  const { data: me } = useSuspenseQuery(meQuery);
  const { data: reqs } = useSuspenseQuery(requestsQuery);
  const { data: rooms } = useSuspenseQuery(roomsQuery);
  const pending = reqs.filter((r) => r.receiver_id === me.id && r.status === "pending").length;
  const incomplete = !me.full_name || !me.skills_offered.length || !me.skills_wanted.length;

  const stats = [
    { label: "Skills you teach", value: me.skills_offered.length },
    { label: "Pending requests", value: pending },
    { label: "Collab rooms", value: rooms.length },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Hi {me.full_name.split(" ")[0] || "there"} 👋</h1>
        <p className="text-muted-foreground">Here's what's happening with your learning partnerships.</p>
      </div>
      {incomplete && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-highlight bg-highlight/15 p-5">
          <p className="font-medium">Complete your profile with skills to get matched.</p>
          <Button asChild><Link to="/profile">Complete profile</Link></Button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border bg-card p-6">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-2 font-display text-4xl font-bold text-primary">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your rooms</h2>
          <Button variant="outline" size="sm" asChild><Link to="/discover">Find more partners</Link></Button>
        </div>
        {rooms.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rooms yet. Connect with a match to open one.</p>
        ) : (
          <div className="space-y-3">
            {rooms.map((r) => (
              <Link key={r.id} to="/rooms/$roomId" params={{ roomId: r.id }} className="block rounded-xl border p-4 hover:bg-muted">
                <div className="flex justify-between text-sm"><span className="font-medium">{r.name}</span><span>{avg(r.goals.map((g) => g.progress))}%</span></div>
                <Progress className="mt-2" value={avg(r.goals.map((g) => g.progress))} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
