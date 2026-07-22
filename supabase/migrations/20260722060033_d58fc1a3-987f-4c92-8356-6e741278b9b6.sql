
CREATE TYPE public.mistake_pattern AS ENUM (
  'overconfidence','misreading','time_pressure','lost_path','calc_mistake','no_knowledge'
);

CREATE TABLE public.problems (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  subject TEXT,
  question_text TEXT NOT NULL,
  choices JSONB,
  correct_answer TEXT NOT NULL,
  my_answer TEXT NOT NULL,
  my_solution TEXT,
  explanation TEXT,
  image_url TEXT,
  confidence SMALLINT NOT NULL CHECK (confidence BETWEEN 1 AND 5),
  time_spent_sec INTEGER NOT NULL DEFAULT 0,
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.problems TO authenticated;
GRANT ALL ON public.problems TO service_role;
ALTER TABLE public.problems ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own problems" ON public.problems FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  problem_id UUID NOT NULL REFERENCES public.problems ON DELETE CASCADE UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  pattern public.mistake_pattern NOT NULL,
  reason TEXT NOT NULL,
  short_card JSONB NOT NULL,
  long_report JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analyses TO authenticated;
GRANT ALL ON public.analyses TO service_role;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own analyses" ON public.analyses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX problems_user_created_idx ON public.problems(user_id, created_at DESC);
