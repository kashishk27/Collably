import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Star, Trash2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { meQuery, roomQuery, avg } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar } from "@/components/SkillTags";

export const Route = createFileRoute("/_authenticated/rooms/$roomId")({
  head: () => ({ meta: [{ title: "Collab room — Collably" }, { name: "description", content: "Shared space, goals and progress." }, { property: "og:title", content: "Collab room — Collably" }, { property: "og:description", content: "Shared space, goals and progress." }] }),
  loader: ({ context, params }) => Promise.all([context.queryClient.ensureQueryData(meQuery), context.queryClient.ensureQueryData(roomQuery(params.roomId))]),
  component: Room,
});

type Period = "daily" | "weekly" | "monthly";

function Room() {
  const { roomId } = Route.useParams();
  const { data: me } = useSuspenseQuery(meQuery);
  const { data } = useSuspenseQuery(roomQuery(roomId));
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["room", roomId] }).then(() => qc.invalidateQueries({ queryKey: ["rooms"] }));
  const { room, posts, goals, evals } = data;
  const partner = room.member_a === me.id ? room.b : room.a;
  const nameOf = (id: string) => (id === me.id ? "You" : partner.full_name);

  const [post, setPost] = useState({ content: "", link: "" });
  const [goal, setGoal] = useState<{ title: string; period: Period }>({ title: "", period: "daily" });
  const [ev, setEv] = useState({ rating: 5, feedback: "" });

  async function run(p: PromiseLike<{ error: { message: string } | null }>, ok: string) {
    const { error } = await p;
    if (error) { toast.error(error.message); return false; }
    toast.success(ok);
    refresh();
    return true;
  }

  const mine = goals.filter((g) => g.owner_id === me.id);
  const theirs = goals.filter((g) => g.owner_id !== me.id);
  const theirRatings = evals.filter((e) => e.evaluatee_id === partner.id).map((e) => e.rating);
  const myRatings = evals.filter((e) => e.evaluatee_id === me.id).map((e) => e.rating);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-hero p-6 text-primary-foreground">
        <Avatar name={partner.full_name} />
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{room.name}</h1>
          <p className="text-sm opacity-80">Collab room with {partner.full_name}</p>
        </div>
        <div className="grid grid-cols-2 gap-6 text-center">
          <div><p className="font-display text-2xl font-bold">{avg(mine.map((g) => g.progress))}%</p><p className="text-xs opacity-80">Your progress</p></div>
          <div><p className="font-display text-2xl font-bold">{avg(theirs.map((g) => g.progress))}%</p><p className="text-xs opacity-80">Partner progress</p></div>
        </div>
      </div>

      <Tabs defaultValue="space">
        <TabsList>
          <TabsTrigger value="space">Shared space</TabsTrigger>
          <TabsTrigger value="goals">Goals & progress</TabsTrigger>
          <TabsTrigger value="eval">Evaluate</TabsTrigger>
        </TabsList>

        <TabsContent value="space" className="space-y-4">
          <form
            className="space-y-3 rounded-2xl border bg-card p-5"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!post.content.trim()) return;
              const link = post.link.trim();
              if (link && !/^https?:\/\//i.test(link)) { toast.error("Link must start with http:// or https://"); return; }
              if (await run(supabase.from("room_posts").insert({ room_id: roomId, author_id: me.id, content: post.content.trim().slice(0, 2000), link: link || null }), "Shared"))
                setPost({ content: "", link: "" });
            }}
          >
            <Textarea placeholder="Share notes, a resource, or what you learned today…" value={post.content} onChange={(e) => setPost({ ...post, content: e.target.value })} />
            <div className="flex gap-2">
              <Input placeholder="Optional link (https://…)" value={post.link} onChange={(e) => setPost({ ...post, link: e.target.value })} />
              <Button type="submit">Share</Button>
            </div>
          </form>
          {posts.length === 0 && <p className="text-sm text-muted-foreground">Nothing shared yet.</p>}
          {posts.map((p) => (
            <div key={p.id} className="rounded-2xl border bg-card p-5">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{nameOf(p.author_id)}</span>
                <span className="flex items-center gap-2">
                  {new Date(p.created_at).toLocaleString()}
                  {p.author_id === me.id && (
                    <button aria-label="Delete" onClick={() => run(supabase.from("room_posts").delete().eq("id", p.id), "Deleted")}><Trash2 className="h-4 w-4" /></button>
                  )}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm">{p.content}</p>
              {p.link && (
                <a href={p.link} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-primary underline">
                  {p.link} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="goals" className="space-y-6">
          <form
            className="flex flex-wrap gap-2 rounded-2xl border bg-card p-5"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!goal.title.trim()) return;
              if (await run(supabase.from("goals").insert({ room_id: roomId, owner_id: me.id, title: goal.title.trim().slice(0, 200), period: goal.period }), "Goal added"))
                setGoal({ ...goal, title: "" });
            }}
          >
            <Input className="min-w-60 flex-1" placeholder="New goal, e.g. Finish Java OOP chapter" value={goal.title} onChange={(e) => setGoal({ ...goal, title: e.target.value })} />
            <Select value={goal.period} onValueChange={(v) => setGoal({ ...goal, period: v as Period })}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">Add goal</Button>
          </form>
          <div className="grid gap-6 md:grid-cols-2">
            {[{ title: "Your goals", list: mine, editable: true }, { title: `${partner.full_name}'s goals`, list: theirs, editable: false }].map((col) => (
              <div key={col.title}>
                <h3 className="mb-3 font-semibold">{col.title}</h3>
                {(["daily", "weekly", "monthly"] as Period[]).map((per) => {
                  const items = col.list.filter((g) => g.period === per);
                  if (!items.length) return null;
                  return (
                    <div key={per} className="mb-4">
                      <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">{per}</p>
                      <div className="space-y-2">
                        {items.map((g) => (
                          <div key={g.id} className="rounded-xl border bg-card p-4">
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <span className={g.progress === 100 ? "line-through text-muted-foreground" : "font-medium"}>{g.title}</span>
                              <span className="flex items-center gap-2">
                                <span className="font-semibold text-primary">{g.progress}%</span>
                                {col.editable && <button aria-label="Delete goal" onClick={() => run(supabase.from("goals").delete().eq("id", g.id), "Goal removed")}><Trash2 className="h-4 w-4 text-muted-foreground" /></button>}
                              </span>
                            </div>
                            {col.editable ? (
                              <Slider className="mt-3" defaultValue={[g.progress]} max={100} step={10} onValueCommit={(v) => run(supabase.from("goals").update({ progress: v[0] ?? 0 }).eq("id", g.id), "Progress updated")} />
                            ) : (
                              <Progress className="mt-3" value={g.progress} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {col.list.length === 0 && <p className="text-sm text-muted-foreground">No goals yet.</p>}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="eval" className="grid gap-6 md:grid-cols-2">
          <form
            className="space-y-4 rounded-2xl border bg-card p-5"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await run(supabase.from("evaluations").insert({ room_id: roomId, evaluator_id: me.id, evaluatee_id: partner.id, rating: ev.rating, feedback: ev.feedback.trim().slice(0, 1000) }), "Evaluation submitted"))
                setEv({ rating: 5, feedback: "" });
            }}
          >
            <h3 className="font-semibold">Evaluate {partner.full_name}</h3>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button type="button" key={n} aria-label={`${n} stars`} onClick={() => setEv({ ...ev, rating: n })}>
                  <Star className={n <= ev.rating ? "h-7 w-7 fill-highlight text-highlight" : "h-7 w-7 text-border"} />
                </button>
              ))}
            </div>
            <Textarea placeholder="How was their teaching, consistency, communication?" value={ev.feedback} onChange={(e) => setEv({ ...ev, feedback: e.target.value })} />
            <Button type="submit">Submit evaluation</Button>
            <p className="text-xs text-muted-foreground">Average rating you gave: {theirRatings.length ? (theirRatings.reduce((a, b) => a + b, 0) / theirRatings.length).toFixed(1) : "—"}</p>
          </form>
          <div className="space-y-3">
            <h3 className="font-semibold">Feedback history · you received {myRatings.length ? (myRatings.reduce((a, b) => a + b, 0) / myRatings.length).toFixed(1) : "—"}★</h3>
            {evals.length === 0 && <p className="text-sm text-muted-foreground">No evaluations yet.</p>}
            {evals.map((e) => (
              <div key={e.id} className="rounded-xl border bg-card p-4 text-sm">
                <div className="flex justify-between"><span className="font-medium">{nameOf(e.evaluator_id)} → {nameOf(e.evaluatee_id)}</span><span className="text-highlight-foreground">{"★".repeat(e.rating)}</span></div>
                {e.feedback && <p className="mt-1 text-muted-foreground">{e.feedback}</p>}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
