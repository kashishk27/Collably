import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { meQuery, requestsQuery } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, SkillTags } from "@/components/SkillTags";

export const Route = createFileRoute("/_authenticated/requests")({
  head: () => ({ meta: [{ title: "Requests — Collably" }, { name: "description", content: "Manage connection requests." }, { property: "og:title", content: "Requests — Collably" }, { property: "og:description", content: "Manage connection requests." }] }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(meQuery), context.queryClient.ensureQueryData(requestsQuery)]),
  component: Requests,
});

function Requests() {
  const { data: me } = useSuspenseQuery(meQuery);
  const { data: reqs } = useSuspenseQuery(requestsQuery);
  const qc = useQueryClient();
  const incoming = reqs.filter((r) => r.receiver_id === me.id);
  const outgoing = reqs.filter((r) => r.sender_id === me.id);

  async function respond(id: string, status: "accepted" | "rejected") {
    const { error } = await supabase.from("connection_requests").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success(status === "accepted" ? "Accepted! A collab room was created." : "Request declined");
    qc.invalidateQueries();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section>
        <h1 className="mb-4 text-2xl font-bold">Incoming</h1>
        <div className="space-y-3">
          {incoming.length === 0 && <p className="text-sm text-muted-foreground">No incoming requests.</p>}
          {incoming.map((r) => (
            <div key={r.id} className="rounded-2xl border bg-card p-5">
              <div className="flex items-center gap-3">
                <Avatar name={r.sender.full_name} />
                <div className="flex-1"><p className="font-semibold">{r.sender.full_name}</p><p className="text-xs text-muted-foreground">{r.message}</p></div>
                <Badge variant="outline" className="capitalize">{r.status}</Badge>
              </div>
              <div className="mt-3"><SkillTags skills={r.sender.skills_offered} /></div>
              {r.status === "pending" && (
                <div className="mt-4 flex gap-2">
                  <Button onClick={() => respond(r.id, "accepted")}>Accept</Button>
                  <Button variant="outline" onClick={() => respond(r.id, "rejected")}>Decline</Button>
                </div>
              )}
              {r.status === "accepted" && <Button variant="link" className="mt-2 px-0" asChild><Link to="/rooms">Go to collab rooms →</Link></Button>}
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2 className="mb-4 text-2xl font-bold">Sent</h2>
        <div className="space-y-3">
          {outgoing.length === 0 && <p className="text-sm text-muted-foreground">You haven't sent any requests.</p>}
          {outgoing.map((r) => (
            <div key={r.id} className="flex items-center gap-3 rounded-2xl border bg-card p-5">
              <Avatar name={r.receiver.full_name} />
              <p className="flex-1 font-semibold">{r.receiver.full_name}</p>
              <Badge variant={r.status === "accepted" ? "default" : "outline"} className="capitalize">{r.status}</Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
