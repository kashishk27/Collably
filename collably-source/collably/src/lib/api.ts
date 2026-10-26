import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export async function myId() {
  const { data } = await supabase.auth.getUser();
  return data.user!.id;
}

const must = <T,>(r: { data: T | null; error: { message: string } | null }): NonNullable<T> => {
  if (r.error) throw new Error(r.error.message);
  return r.data as NonNullable<T>;
};

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: async (): Promise<Profile> => must<Profile>(await supabase.from("profiles").select("*").eq("id", await myId()).single()),
});

export const profilesQuery = queryOptions({
  queryKey: ["profiles"],
  queryFn: async () => must(await supabase.from("profiles").select("*").neq("id", await myId())),
});

export const requestsQuery = queryOptions({
  queryKey: ["requests"],
  queryFn: async () =>
    must(
      await supabase
        .from("connection_requests")
        .select("*, sender:profiles!connection_requests_sender_id_fkey(*), receiver:profiles!connection_requests_receiver_id_fkey(*)")
        .order("created_at", { ascending: false }),
    ),
});

export const roomsQuery = queryOptions({
  queryKey: ["rooms"],
  queryFn: async () =>
    must(
      await supabase
        .from("collab_rooms")
        .select("*, a:profiles!collab_rooms_member_a_fkey(*), b:profiles!collab_rooms_member_b_fkey(*), goals(progress)")
        .order("created_at", { ascending: false }),
    ),
});

export const roomQuery = (id: string) =>
  queryOptions({
    queryKey: ["room", id],
    queryFn: async () => {
      const [room, posts, goals, evals] = await Promise.all([
        supabase.from("collab_rooms").select("*, a:profiles!collab_rooms_member_a_fkey(*), b:profiles!collab_rooms_member_b_fkey(*)").eq("id", id).single(),
        supabase.from("room_posts").select("*").eq("room_id", id).order("created_at", { ascending: false }),
        supabase.from("goals").select("*").eq("room_id", id).order("created_at"),
        supabase.from("evaluations").select("*").eq("room_id", id).order("created_at", { ascending: false }),
      ]);
      return { room: must(room), posts: must(posts), goals: must(goals), evals: must(evals) };
    },
  });

export const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
export const initials = (n: string) => n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";
