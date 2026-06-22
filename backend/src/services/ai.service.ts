import { generateObject } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { z } from "zod";

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
const mistral = createMistral({ apiKey: process.env.MISTRAL_API_KEY });

const TaskAnalysisSchema = z.object({
  difficultyScore: z.number().int().min(1).max(5),
  difficultyReason: z.string(),
  estimatedHours: z.number().positive(),
  minimumPrice: z.number().positive(),
  suggestedPrice: z.number().positive(),
  maxRevisions: z.number().int().min(1).max(4),
  warnings: z.array(z.string()),
});

const ScopeGuardSchema = z.object({
  isNewScope: z.boolean(),
  reason: z.string(),
});

export type TaskAnalysisResult = z.infer<typeof TaskAnalysisSchema>;

export interface TaskAnalysisInput {
  category: string;
  description: string;
  pageCount?: number;
  deadline: string;
  hoursUntilDeadline: number;
}

export async function analyzeTask(input: TaskAnalysisInput): Promise<TaskAnalysisResult> {
  const prompt = `
Kamu adalah sistem analisis tugas akademik dan profesional Indonesia.
Analisis tugas berikut dan berikan estimasi yang realistis.

TUGAS:
- Kategori: ${input.category}
- Deskripsi: ${input.description}
- Jumlah halaman/soal: ${input.pageCount ?? "tidak disebutkan"}
- Deadline: ${input.deadline} (${input.hoursUntilDeadline} jam dari sekarang)

PANDUAN HARGA:
- Harga minimum = kesulitan × estimasi_jam × Rp 25.000
- Tugas < 2 jam: minimum Rp 25.000
- Difficulty 1-2: mudah, bisa dikerjakan mahasiswa baru
- Difficulty 3: sedang, butuh keahlian spesifik
- Difficulty 4-5: sulit, butuh expertise mendalam
`.trim();

  try {
    const { object } = await generateObject({
      model: groq("llama-3.3-70b-versatile"),
      schema: TaskAnalysisSchema,
      prompt,
    });
    return object;
  } catch {
    // Fallback ke Mistral jika Groq gagal/rate limit
    const { object } = await generateObject({
      model: mistral("mistral-small-latest"),
      schema: TaskAnalysisSchema,
      prompt,
    });
    return object;
  }
}

export async function checkScope(
  message: string,
  originalDescription: string
): Promise<z.infer<typeof ScopeGuardSchema>> {
  const prompt = `
Bandingkan pesan chat ini dengan deskripsi order asli.
Apakah pesan mengandung permintaan BARU yang tidak ada di deskripsi asli?

DESKRIPSI ASLI: ${originalDescription}
PESAN BARU: ${message}

Jawab true jika ada permintaan baru di luar scope awal.
`.trim();

  try {
    const { object } = await generateObject({
      model: groq("llama-3.3-70b-versatile"),
      schema: ScopeGuardSchema,
      prompt,
    });
    return object;
  } catch {
    const { object } = await generateObject({
      model: mistral("mistral-small-latest"),
      schema: ScopeGuardSchema,
      prompt,
    });
    return object;
  }
}
