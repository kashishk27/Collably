import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/api";
import { parseSkills } from "@/lib/match";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SkillTags } from "@/components/SkillTags";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Collably" }, { name: "description", content: "Edit your learner profile." }, { property: "og:title", content: "Profile — Collably" }, { property: "og:description", content: "Edit your learner profile." }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(meQuery),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: me } = useSuspenseQuery(meQuery);
  const qc = useQueryClient();
  const [f, setF] = useState({
    full_name: me.full_name,
    college: me.college,
    bio: me.bio,
    offered: me.skills_offered.join(", "),
    wanted: me.skills_wanted.join(", "),
  });
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("profiles").update({
      full_name: f.full_name.trim(),
      college: f.college.trim(),
      bio: f.bio.trim(),
      skills_offered: parseSkills(f.offered),
      skills_wanted: parseSkills(f.wanted),
    }).eq("id", me.id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Profile saved");
    qc.invalidateQueries();
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <form onSubmit={save} className="space-y-5 rounded-2xl border bg-card p-6">
        <h1 className="text-2xl font-bold">Your profile</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Full name</Label><Input required maxLength={80} value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>College / branch</Label><Input maxLength={120} value={f.college} onChange={(e) => setF({ ...f, college: e.target.value })} placeholder="e.g. IT, Mumbai University" /></div>
        </div>
        <div className="space-y-1.5"><Label>About you</Label><Textarea maxLength={500} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} /></div>
        <div className="space-y-1.5"><Label>Skills I can teach (comma separated)</Label><Input value={f.offered} onChange={(e) => setF({ ...f, offered: e.target.value })} placeholder="Java, SQL, DSA" /></div>
        <div className="space-y-1.5"><Label>Skills I want to learn (comma separated)</Label><Input value={f.wanted} onChange={(e) => setF({ ...f, wanted: e.target.value })} placeholder="React, UI Design" /></div>
        <Button type="submit" disabled={busy}>Save profile</Button>
      </form>
      <aside className="h-fit space-y-4 rounded-2xl bg-hero p-6 text-primary-foreground">
        <p className="text-xs uppercase opacity-80">Preview</p>
        <h2 className="text-xl font-semibold">{f.full_name || "Your name"}</h2>
        <p className="text-sm opacity-80">{f.college}</p>
        <div><p className="mb-1 text-xs opacity-80">Teaches</p><SkillTags skills={parseSkills(f.offered)} /></div>
        <div><p className="mb-1 text-xs opacity-80">Wants to learn</p><SkillTags skills={parseSkills(f.wanted)} /></div>
      </aside>
    </div>
  );
}
