/**
 * js/ai-agent.js
 * ─────────────────────────────────────────────────────────────
 * AI integration layer.  Supports three backends — pick one by
 * setting ACTIVE_PROVIDER below.
 *
 * HOW TO CONFIGURE
 * ─────────────────
 * 1. Choose a provider: "gemini" | "groq" | "openai"
 * 2. Paste your API key into the matching constant below.
 * 3. (Optional) Change MODEL if needed.
 *
 * All functions return plain JavaScript objects parsed from the
 * AI's strict-JSON response.  If the API key is missing or the
 * request fails, every function returns a safe fallback object
 * so the UI stays fully functional in offline / demo mode.
 * ─────────────────────────────────────────────────────────────
 */

/* ═══════════════════════════════════════════
   ① CONFIGURATION  — Edit this section only
═══════════════════════════════════════════ */

// Choose one provider: "gemini" | "groq" | "openai"
export const ACTIVE_PROVIDER = 'gemini';

const CONFIG = {
  gemini: {
    apiKey:   'YOUR_GEMINI_API_KEY',   // ← paste Gemini key here
    model:    'gemini-2.0-flash',
    endpoint: (key, model) =>
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
  },
  groq: {
    apiKey:   'YOUR_GROQ_API_KEY',     // ← paste Groq key here
    model:    'llama3-8b-8192',
    endpoint: () => 'https://api.groq.com/openai/v1/chat/completions',
  },
  openai: {
    apiKey:   'YOUR_OPENAI_API_KEY',   // ← paste OpenAI key here
    model:    'gpt-4o-mini',
    endpoint: () => 'https://api.openai.com/v1/chat/completions',
  },
};

/* ═══════════════════════════════════════════
   Internal helpers
═══════════════════════════════════════════ */

function getConfig() {
  return CONFIG[ACTIVE_PROVIDER];
}

function isKeyConfigured() {
  const key = getConfig().apiKey;
  return key && !key.startsWith('YOUR_');
}

/**
 * Send a single prompt to the configured AI backend.
 * The system prompt always instructs the model to reply with
 * strict JSON (no markdown code fences).
 *
 * @param {string} userPrompt
 * @returns {Promise<string>} Raw text response from the model.
 */
async function callAI(userPrompt) {
  const cfg = getConfig();

  if (ACTIVE_PROVIDER === 'gemini') {
    const body = {
      contents: [{ parts: [{ text: userPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    };
    const res = await fetch(cfg.endpoint(cfg.apiKey, cfg.model), {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  }

  // groq & openai share the OpenAI-compatible chat-completions format
  const body = {
    model:    cfg.model,
    messages: [
      {
        role:    'system',
        content: 'You are a productivity assistant. Always reply with valid JSON only — no markdown fences, no extra text.',
      },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.7,
  };
  const res = await fetch(cfg.endpoint(), {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${ACTIVE_PROVIDER} HTTP ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '{}';
}

/**
 * Safely parse a JSON string.  Strips accidental markdown fences if present.
 * @param {string} raw
 * @returns {any}
 */
function safeParseJSON(raw) {
  const cleaned = raw.trim().replace(/^```json?\s*/i, '').replace(/```\s*$/i, '');
  return JSON.parse(cleaned);
}

/* ═══════════════════════════════════════════
   ② PUBLIC API — used by app.js
═══════════════════════════════════════════ */

/**
 * Feature A — Priority & Time Estimator
 * Analyse a new task title and return recommended priority + time.
 *
 * @param {string} taskText
 * @returns {Promise<{ priority: string, timeEst: number, reason: string }>}
 */
export async function estimatePriorityAndTime(taskText) {
  const fallback = { priority: 'Medium', timeEst: 30, reason: 'Estimasi default (AI tidak aktif).' };
  if (!isKeyConfigured()) return fallback;

  const prompt = `
Analisis tugas berikut dan kembalikan JSON dengan format persis seperti ini:
{
  "priority": "High" | "Medium" | "Low",
  "timeEst": <integer menit>,
  "reason": "<1 kalimat alasan singkat dalam Bahasa Indonesia>"
}

Tugas: "${taskText}"
`;

  try {
    const raw = await callAI(prompt);
    const parsed = safeParseJSON(raw);
    return {
      priority: parsed.priority ?? fallback.priority,
      timeEst:  Number(parsed.timeEst) || fallback.timeEst,
      reason:   parsed.reason ?? fallback.reason,
    };
  } catch (e) {
    console.warn('[ai-agent] estimatePriorityAndTime error:', e.message);
    return fallback;
  }
}

/**
 * Feature B — Smart Task Breakdown
 * Break a large task into 3–5 actionable sub-tasks.
 *
 * @param {string} taskText
 * @returns {Promise<Array<{ id: string, text: string, done: boolean }>>}
 */
export async function breakDownTask(taskText) {
  const fallback = [
    { id: crypto.randomUUID(), text: 'Riset dan kumpulkan referensi', done: false },
    { id: crypto.randomUUID(), text: 'Buat kerangka / rencana kerja', done: false },
    { id: crypto.randomUUID(), text: 'Kerjakan bagian utama', done: false },
    { id: crypto.randomUUID(), text: 'Review dan perbaiki', done: false },
  ];
  if (!isKeyConfigured()) return fallback;

  const prompt = `
Pecah tugas besar berikut menjadi 3–5 sub-tugas yang konkret dan dapat dikerjakan.
Kembalikan JSON array persis seperti ini (tanpa properti tambahan):
[
  { "text": "<sub-tugas 1>" },
  { "text": "<sub-tugas 2>" }
]

Tugas: "${taskText}"
`;

  try {
    const raw = await callAI(prompt);
    const parsed = safeParseJSON(raw);
    if (!Array.isArray(parsed)) throw new Error('Expected array');
    return parsed.slice(0, 5).map(item => ({
      id:   crypto.randomUUID(),
      text: String(item.text ?? item),
      done: false,
    }));
  } catch (e) {
    console.warn('[ai-agent] breakDownTask error:', e.message);
    return fallback;
  }
}

/**
 * Feature C — Context-Aware Action Helper (AI Assist / Draft)
 * Generate a short draft/template/outline to help complete a task.
 *
 * @param {string} taskText
 * @param {string} category
 * @returns {Promise<{ title: string, steps: string[], tips: string }>}
 */
export async function generateDraft(taskText, category) {
  const fallback = {
    title: 'Panduan Pengerjaan',
    steps: [
      'Pahami tujuan tugas secara menyeluruh.',
      'Kumpulkan semua bahan dan sumber daya yang dibutuhkan.',
      'Bagi pekerjaan menjadi bagian-bagian kecil.',
      'Kerjakan satu bagian dalam satu waktu.',
      'Lakukan review sebelum menyerahkan hasil akhir.',
    ],
    tips: 'Tetap fokus dan hindari multitasking.',
  };
  if (!isKeyConfigured()) return fallback;

  const prompt = `
Buat draf/outline singkat untuk menyelesaikan tugas berikut dalam kategori "${category}".
Kembalikan JSON persis seperti ini:
{
  "title": "<judul panduan>",
  "steps": ["<langkah 1>", "<langkah 2>", "<langkah 3>"],
  "tips": "<1 tips singkat>"
}

Tugas: "${taskText}"
`;

  try {
    const raw = await callAI(prompt);
    const parsed = safeParseJSON(raw);
    return {
      title: parsed.title ?? fallback.title,
      steps: Array.isArray(parsed.steps) ? parsed.steps : fallback.steps,
      tips:  parsed.tips ?? fallback.tips,
    };
  } catch (e) {
    console.warn('[ai-agent] generateDraft error:', e.message);
    return fallback;
  }
}

/**
 * Feature D — Daily Productivity Coach
 * Analyse today's task list and return a productivity report.
 *
 * @param {Array<Object>} tasks  Full tasks array from storage.
 * @returns {Promise<{ score: number, summary: string, strengths: string[], improvements: string[], motivation: string }>}
 */
export async function getDailyCoachReport(tasks) {
  const total     = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pct       = total ? Math.round((completed / total) * 100) : 0;

  const fallback = {
    score:        pct,
    summary:      `Kamu telah menyelesaikan ${completed} dari ${total} tugas hari ini (${pct}%).`,
    strengths:    ['Berhasil mencatat semua tugas.'],
    improvements: ['Coba selesaikan tugas prioritas tinggi lebih awal.'],
    motivation:   'Setiap langkah kecil membawa kamu lebih dekat ke tujuan besar! 💪',
  };
  if (!isKeyConfigured()) return fallback;

  const taskSummary = tasks.map(t =>
    `- [${t.completed ? 'DONE' : 'TODO'}] ${t.text} (${t.category}, Priority: ${t.priority ?? 'unset'})`
  ).join('\n');

  const prompt = `
Kamu adalah Productivity Coach. Analisis daftar tugas berikut dan buat laporan produktivitas harian.
Kembalikan JSON persis seperti ini:
{
  "score": <integer 0–100>,
  "summary": "<ringkasan singkat 1–2 kalimat dalam Bahasa Indonesia>",
  "strengths": ["<hal positif 1>", "<hal positif 2>"],
  "improvements": ["<saran perbaikan 1>", "<saran perbaikan 2>"],
  "motivation": "<1 kalimat motivasi>"
}

Daftar tugas:
${taskSummary}
`;

  try {
    const raw = await callAI(prompt);
    const parsed = safeParseJSON(raw);
    return {
      score:        Number(parsed.score) || pct,
      summary:      parsed.summary      ?? fallback.summary,
      strengths:    Array.isArray(parsed.strengths)    ? parsed.strengths    : fallback.strengths,
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements : fallback.improvements,
      motivation:   parsed.motivation   ?? fallback.motivation,
    };
  } catch (e) {
    console.warn('[ai-agent] getDailyCoachReport error:', e.message);
    return fallback;
  }
}
