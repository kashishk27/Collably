import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { meQuery, roomsQuery, avg } from "@/lib/api";
import { Progress } from "@/components/ui/progress";
import { Avatar } from "@/components/SkillTags";

export const Route = createFileRoute("/_authenticated/rooms/")({
  head: () => ({ meta: [{ title: "Collab rooms — Collably" }, { name: "description", content: "Your shared learning spaces." }, { property: "og:title", content: "Collab rooms — Collably" }, { property: "og:description", content: "Your shared learning spaces." }] }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(meQuery), context.queryClient.ensureQueryData(roomsQuery)]),
  component: Rooms,
});

function Rooms() {
  const { data: me } = useSuspenseQuery(meQuery);
  const { data: rooms } = useSuspenseQuery(roomsQuery);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Collab rooms</h1>
      {rooms.length === 0 && <p className="text-muted-foreground">Accept or get a request accepted to open your first room.</p>}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rooms.map((r) => {
          const partner = r.member_a === me.id ? r.b : r.a;
          const p = avg(r.goals.map((g) => g.progress));
          return (
            <Link key={r.id} to="/rooms/$roomId" params={{ roomId: r.id }} className="rounded-2xl border bg-card p-5 transition hover:shadow-soft">
              <div className="flex items-center gap-3">
                <Avatar name={partner.full_name} />
                <div><p className="font-semibold">{r.name}</p><p className="text-xs text-muted-foreground">with {partner.full_name}</p></div>
              </div>
              <div className="mt-4 flex justify-between text-xs text-muted-foreground"><span>{r.goals.length} goals</span><span>{p}%</span></div>
              <Progress className="mt-1" value={p} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
