CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  college text NOT NULL DEFAULT '',
  skills_offered text[] NOT NULL DEFAULT '{}',
  skills_wanted text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.connection_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sender_id, receiver_id),
  CHECK (sender_id <> receiver_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connection_requests TO authenticated;
GRANT ALL ON public.connection_requests TO service_role;
ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "see own requests" ON public.connection_requests FOR SELECT TO authenticated USING (auth.uid() IN (sender_id, receiver_id));
CREATE POLICY "send request" ON public.connection_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id AND status = 'pending');
CREATE POLICY "receiver responds" ON public.connection_requests FOR UPDATE TO authenticated USING (auth.uid() = receiver_id);
CREATE POLICY "sender cancels" ON public.connection_requests FOR DELETE TO authenticated USING (auth.uid() = sender_id AND status = 'pending');

CREATE TABLE public.collab_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid UNIQUE REFERENCES public.connection_requests(id) ON DELETE SET NULL,
  name text NOT NULL DEFAULT 'Collab Room',
  member_a uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_b uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.collab_rooms TO authenticated;
GRANT ALL ON public.collab_rooms TO service_role;
ALTER TABLE public.collab_rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members see room" ON public.collab_rooms FOR SELECT TO authenticated USING (auth.uid() IN (member_a, member_b));
CREATE POLICY "members rename room" ON public.collab_rooms FOR UPDATE TO authenticated USING (auth.uid() IN (member_a, member_b));

CREATE OR REPLACE FUNCTION public.is_room_member(_room uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.collab_rooms WHERE id = _room AND auth.uid() IN (member_a, member_b));
$$;

CREATE OR REPLACE FUNCTION public.create_room_on_accept() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status <> 'accepted' THEN
    INSERT INTO public.collab_rooms (request_id, member_a, member_b, name)
    VALUES (NEW.id, NEW.sender_id, NEW.receiver_id,
      (SELECT split_part(full_name,' ',1) FROM profiles WHERE id = NEW.sender_id) || ' & ' ||
      (SELECT split_part(full_name,' ',1) FROM profiles WHERE id = NEW.receiver_id))
    ON CONFLICT (request_id) DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_request_accepted AFTER UPDATE ON public.connection_requests FOR EACH ROW EXECUTE FUNCTION public.create_room_on_accept();

CREATE TABLE public.room_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.collab_rooms(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.room_posts TO authenticated;
GRANT ALL ON public.room_posts TO service_role;
ALTER TABLE public.room_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read posts" ON public.room_posts FOR SELECT TO authenticated USING (public.is_room_member(room_id));
CREATE POLICY "members add posts" ON public.room_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id AND public.is_room_member(room_id));
CREATE POLICY "authors delete posts" ON public.room_posts FOR DELETE TO authenticated USING (auth.uid() = author_id);

CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.collab_rooms(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  period text NOT NULL CHECK (period IN ('daily','weekly','monthly')),
  progress int NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read goals" ON public.goals FOR SELECT TO authenticated USING (public.is_room_member(room_id));
CREATE POLICY "own goals insert" ON public.goals FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id AND public.is_room_member(room_id));
CREATE POLICY "own goals update" ON public.goals FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "own goals delete" ON public.goals FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TABLE public.evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.collab_rooms(id) ON DELETE CASCADE,
  evaluator_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  evaluatee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (evaluator_id <> evaluatee_id)
);
GRANT SELECT, INSERT ON public.evaluations TO authenticated;
GRANT ALL ON public.evaluations TO service_role;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read evals" ON public.evaluations FOR SELECT TO authenticated USING (public.is_room_member(room_id));
CREATE POLICY "members evaluate" ON public.evaluations FOR INSERT TO authenticated WITH CHECK (auth.uid() = evaluator_id AND public.is_room_member(room_id));