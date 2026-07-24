import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const ProblemInput = z.object({
  subject: z.string().nullable().optional(),
  question_text: z.string().min(1),
  choices: z.array(z.string()).nullable().optional(),
  correct_answer: z.string().min(1),
  my_answer: z.string().min(1),
  my_solution: z.string().nullable().optional(),
  explanation: z.string().nullable().optional(),
  image_url: z.string().nullable().optional(),
  confidence: z.number().int().min(1).max(5),
  time_spent_sec: z.number().int().min(0),
});

export const createProblem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ProblemInput.parse(d))
  .handler(async ({ data, context }) => {
    const is_correct = data.my_answer.trim().toLowerCase() === data.correct_answer.trim().toLowerCase();
    const { data: row, error } = await context.supabase
      .from("problems")
      .insert({
        user_id: context.userId,
        subject: data.subject ?? null,
        question_text: data.question_text,
        choices: data.choices ?? null,
        correct_answer: data.correct_answer,
        my_answer: data.my_answer,
        my_solution: data.my_solution ?? null,
        explanation: data.explanation ?? null,
        image_url: data.image_url ?? null,
        confidence: data.confidence,
        time_spent_sec: data.time_spent_sec,
        is_correct,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const listProblems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("problems")
      .select("id, subject, question_text, confidence, time_spent_sec, is_correct, created_at, analyses(pattern)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getProblem = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: problem, error } = await context.supabase
      .from("problems")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    const { data: analysis } = await context.supabase
      .from("analyses")
      .select("*")
      .eq("problem_id", data.id)
      .maybeSingle();
    let signedImage: string | null = null;
    if (problem.image_url) {
      const { data: s } = await context.supabase.storage.from("problem-images").createSignedUrl(problem.image_url, 3600);
      signedImage = s?.signedUrl ?? null;
    }
    return { problem, analysis, signedImage };
  });

export const getInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: problems } = await context.supabase
      .from("problems")
      .select("confidence, time_spent_sec, is_correct, created_at");
    const { data: analyses } = await context.supabase
      .from("analyses")
      .select("pattern");
    return { problems: problems ?? [], analyses: analyses ?? [] };
  });
