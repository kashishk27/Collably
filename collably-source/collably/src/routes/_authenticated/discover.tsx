import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { meQuery, profilesQuery, requestsQuery } from "@/lib/api";
import { matchScore } from "@/lib/match";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, SkillTags } from "@/components/SkillTags";

export const Route = createFileRoute("/_authenticated/discover")({
  head: () => ({ meta: [{ title: "Find matches — Collably" }, { name: "description", content: "Recommended learning partners." }, { property: "og:title", content: "Find matches — Collably" }, { property: "og:description", content: "Recommended learning partners." }] }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(meQuery), context.queryClient.ensureQueryData(profilesQuery), context.queryClient.ensureQueryData(requestsQuery)]),
  component: Discover,
});

function Discover() {
  const { data: me } = useSuspenseQuery(meQuery);
  const { data: others } = useSuspenseQuery(profilesQuery);
  const { data: reqs } = useSuspenseQuery(requestsQuery);
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const ranked = useMemo(
    () =>
      others
        .map((p) => ({ p, ...matchScore(me, p) }))
        .filter(({ p }) => !q || [p.full_name, ...p.skills_offered].join(" ").toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => b.score - a.score),
    [others, me, q],
  );

  const statusWith = (id: string) => reqs.find((r) => (r.sender_id === id && r.receiver_id === me.id) || (r.receiver_id === id && r.sender_id === me.id));

  async function send(id: string) {
    const { error } = await supabase.from("connection_requests").insert({ sender_id: me.id, receiver_id: id, message: "Let's exchange skills!" });
    if (error) { toast.error(error.message); return; }
    toast.success("Request sent");
    qc.invalidateQueries({ queryKey: ["requests"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Recommended matches</h1>
          <p className="text-muted-foreground">Ranked by how well you can teach each other.</p>
        </div>
        <Input className="max-w-xs" placeholder="Search name or skill" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {ranked.length === 0 && <p className="text-muted-foreground">No learners found yet. Invite classmates to join!</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {ranked.map(({ p, score, theyTeachMe, iTeachThem }) => {
          const r = statusWith(p.id);
          return (
            <div key={p.id} className="rounded-2xl border bg-card p-5">
              <div className="flex items-start gap-3">
                <Avatar name={p.full_name} />
                <div className="flex-1">
                  <h3 className="font-semibold">{p.full_name || "Unnamed learner"}</h3>
                  <p className="text-xs text-muted-foreground">{p.college}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-bold text-primary">{score}%</p>
                  <p className="text-xs text-muted-foreground">match</p>
                </div>
              </div>
              {p.bio && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{p.bio}</p>}
              <div className="mt-4 space-y-2 text-sm">
                <div><p className="mb-1 text-xs text-muted-foreground">Teaches</p><SkillTags skills={p.skills_offered} hits={theyTeachMe} /></div>
                <div><p className="mb-1 text-xs text-muted-foreground">Wants to learn</p><SkillTags skills={p.skills_wanted} variant="outline" hits={iTeachThem} /></div>
              </div>
              <div className="mt-4">
                {r ? (
                  <Button variant="secondary" disabled className="w-full capitalize">{r.status === "pending" ? "Request pending" : r.status}</Button>
                ) : (
                  <Button className="w-full" onClick={() => send(p.id)}>Send request</Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
