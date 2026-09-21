import { getClasses, getSubjects, getChapters, getDeletedTopics } from './cbse_data'
import { callGeminiDirect, callGeminiVisionDirect } from './geminiService'

const API_BASE = import.meta.env.VITE_API_URL || ''

export { getClasses, getSubjects, getChapters, getDeletedTopics }

export async function apiAsk({ question, class_num, subject, chapter, mode, language }) {
  // Try backend first if available
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, class_num, subject, chapter, mode, language })
      })
      if (res.ok) return await res.json()
    } catch (e) {
      console.warn('Backend unavailable, falling back to direct Gemini API', e)
    }
  }

  // Fallback: Direct Gemini
  let langInstruction = ""
  if (language === "Hindi") langInstruction = "Reply in Hindi (Devanagari script)."
  else if (language === "Hinglish") langInstruction = "Reply in Hinglish (Hindi written in Roman script)."

  const cbse = `CBSE Class ${class_num}, ${subject}, Chapter: ${chapter}`
  let prompt = ""

  if (mode === "quiz") {
    prompt = `You are a CBSE tutor for ${cbse}.
Generate a 3-question multiple choice quiz on this topic: ${question}.
Format each question with:
- Question text
- 4 options: A), B), C), D)
- Answer and brief explanation (hidden or at bottom)
Keep it strictly aligned with latest CBSE Class ${class_num} syllabus.
${langInstruction}`
  } else if (mode === "step-by-step") {
    prompt = `You are a CBSE tutor for ${cbse}.
Solve this problem step by step:
${question}
Show each step clearly with number, formula used, calculation, and final answer with units.
Keep it strictly aligned with latest CBSE Class ${class_num} syllabus.
${langInstruction}`
  } else if (mode === "exam-prep") {
    prompt = `You are an expert CBSE board exam prep coach for ${cbse}.
Create a complete exam-oriented revision guide for: ${question}
Include:
1. 📌 Core Definitions & Concepts
2. ⚡ Important Formulas / Laws / Rules
3. ⚠️ Common Student Mistakes (where marks are lost)
4. 🎯 3 High-Probability Board Exam Questions with Model Answers
Keep it strictly aligned with latest CBSE Class ${class_num} syllabus.
${langInstruction}`
  } else {
    prompt = `You are a friendly, encouraging CBSE tutor for ${cbse}.
A student asks: "${question}"
Explain clearly and simply for a Class ${class_num} student.
Use analogies, bullet points, and real-life examples.
Keep under 200 words.
${langInstruction}`
  }

  const answer = await callGeminiDirect(prompt)
  const ytQuery = `Class ${class_num} CBSE ${subject} ${chapter} ${question}`
  return { answer, youtube_query: ytQuery }
}

export async function apiChat({ messages, class_num, subject, chapter, language }) {
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, class_num, subject, chapter, language })
      })
      if (res.ok) return await res.json()
    } catch (e) {
      console.warn('Backend unavailable, using direct Gemini', e)
    }
  }

  let lang = ""
  if (language === "Hindi") lang = "Reply in Hindi."
  else if (language === "Hinglish") lang = "Reply in Hinglish."

  const historyText = messages.map(m => `${m.role === 'user' ? 'Student' : 'Tutor'}: ${m.text}`).join('\n')
  const prompt = `You are a helpful CBSE Class ${class_num} tutor for ${subject} (${chapter}).
Conversation so far:
${historyText}
Provide the next friendly, helpful response as the Tutor. Keep it encouraging and concise. ${lang}`

  const answer = await callGeminiDirect(prompt)
  return { answer }
}

export async function apiCheckAnswer({ question, student_answer, class_num, subject, chapter, language }) {
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/check-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, student_answer, class_num, subject, chapter, language })
      })
      if (res.ok) return await res.json()
    } catch (e) {
      console.warn('Backend unavailable, using direct Gemini', e)
    }
  }

  let lang = ""
  if (language === "Hindi") lang = "Reply in Hindi."
  else if (language === "Hinglish") lang = "Reply in Hinglish."

  const prompt = `You are an expert CBSE examiner for Class ${class_num} ${subject}, Chapter: ${chapter}.

Evaluate this student answer:
Question: "${question}"
Student's Answer: "${student_answer}"
${lang}

Provide a structured evaluation in this exact format:
## 📊 Score: [X/10]

## ✅ What Was Correct
- [list what the student got right]

## ❌ Mistakes & Conceptual Gaps
- [identify specific errors, wrong formulas, or missing keywords]

## 📝 Ideal Model Answer
[Write the correct, complete answer that would earn full marks in CBSE board exam]

## 🎯 Topics to Revise
- [specific topics the student needs to practice]

Be honest but encouraging.`

  const analysis = await callGeminiDirect(prompt)
  return { analysis, question, student_answer, chapter, subject, class_num }
}

export async function apiScan({ image_base64, class_num, subject, chapter, mode = "explain", language = "English", scan_type = "question" }) {
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64, class_num, subject, chapter, mode, language, scan_type })
      })
      if (res.ok) return await res.json()
    } catch (e) {
      console.warn('Backend unavailable, using direct Gemini Vision', e)
    }
  }

  let lang = ""
  if (language === "Hindi") lang = "Reply in Hindi (Devanagari)."
  else if (language === "Hinglish") lang = "Reply in Hinglish."

  const cbse = `CBSE Class ${class_num}, ${subject}, ${chapter}`
  let prompt = ""

  if (scan_type === "answer") {
    prompt = `Extract the text EXACTLY as written from this image of a handwritten or printed student answer. Return only the extracted text.`
  } else if (mode === "quiz") {
    prompt = `Look at this textbook question. Extract it, then generate 3 MCQ quiz questions for ${cbse}. ${lang}`
  } else if (mode === "step-by-step") {
    prompt = `Look at this math/science problem. Extract it, then solve it step by step for a ${cbse} student. ${lang}`
  } else {
    prompt = `Look at this textbook question. Extract it, then explain the answer clearly for a ${cbse} student with simple examples. ${lang}`
  }

  const answer = await callGeminiVisionDirect(image_base64, prompt)
  const ytQuery = `Class ${class_num} CBSE ${subject} ${chapter}`
  return { answer, youtube_query: ytQuery }
}

export async function apiGenerateLesson({ class_num, subject, chapter, topic = "", language = "English" }) {
  const targetTopic = topic || chapter || "Core Concepts"
  const safeChapter = chapter || "Current Chapter"
  const safeSubject = subject || "CBSE Syllabus"

  const fallbackSlides = [
    { slide: 1, type: "title", title: targetTopic, subtitle: safeChapter, emoji: "📚" },
    { slide: 2, type: "concept", title: `What is ${targetTopic}?`, content: `In CBSE Class ${class_num} ${safeSubject}, ${targetTopic} is a foundational concept frequently tested in board examinations. Focus on the core definition and basic laws.`, emoji: "💡" },
    { slide: 3, type: "example", title: "Real-World Application", content: `You encounter ${targetTopic} in daily physical phenomena and real-world engineering. Understanding this application makes solving numericals intuitive.`, emoji: "🌍" },
    { slide: 4, type: "formula", title: "Key Formula / Law", content: "Recall the standard formula and state all standard SI units clearly.", explanation: "Board examiners award 1 mark just for writing the correct formula and units.", emoji: "📝" },
    { slide: 5, type: "steps", title: "Standard Problem-Solving Steps", steps: ["1. Write down all given values with SI units", "2. State the governing CBSE formula clearly", "3. Substitute values and compute carefully", "4. Box your final answer with proper units"], emoji: "📋" },
    { slide: 6, type: "practice", title: "Quick Self-Test", question: `Can you state the primary definition and formula for ${targetTopic}?`, answer: "Check your textbook notes or ask Doubt AI for immediate step-by-step verification.", emoji: "✍️" },
    { slide: 7, type: "funfact", title: "Examiner Tip", content: "Over 65% of students lose marks due to calculation slips in step 2. Always double-check substitutions!", emoji: "💡" },
    { slide: 8, type: "summary", title: "Key Takeaways", points: ["Memorize core definitions", "Remember step-by-step presentation", "Practice 3 numericals daily"], emoji: "⭐" }
  ]

  try {
    let lang = ""
    if (language === "Hindi") lang = "Reply in Hindi (Devanagari)."
    else if (language === "Hinglish") lang = "Reply in Hinglish."

    const prompt = `You are a CBSE Class ${class_num} ${safeSubject} teacher creating a visual lesson on: ${targetTopic}
Chapter: ${safeChapter}
${lang}

Create exactly 8 slides for a video lesson. Return ONLY a valid JSON array:
[
  {"slide": 1, "type": "title", "title": "${targetTopic}", "subtitle": "${safeChapter}", "emoji": "📚"},
  {"slide": 2, "type": "concept", "title": "What is ${targetTopic}?", "content": "Simple 2-line definition", "emoji": "💡"},
  {"slide": 3, "type": "example", "title": "Real World Example", "content": "Relatable daily life example", "emoji": "🌍"},
  {"slide": 4, "type": "formula", "title": "Key Formula / Law", "content": "The main formula or rule", "explanation": "What each term means", "emoji": "📝"},
  {"slide": 5, "type": "steps", "title": "How to Solve", "steps": ["Step 1: Given values", "Step 2: Apply formula", "Step 3: Calculate", "Step 4: Final units"], "emoji": "📋"},
  {"slide": 6, "type": "practice", "title": "Quick Practice", "question": "Try this practice problem", "answer": "Detailed solution", "emoji": "✍️"},
  {"slide": 7, "type": "funfact", "title": "Did You Know?", "content": "A fascinating real-world fact", "emoji": "💡"},
  {"slide": 8, "type": "summary", "title": "Key Takeaways", "points": ["Remember the core definition", "Keep formulas handy", "Practice sample problems"], "emoji": "⭐"}
]
Return ONLY raw JSON.`

    const raw = await callGeminiDirect(prompt)
    if (raw) {
      let clean = raw.trim()
      const jsonStart = clean.indexOf('[')
      const jsonEnd = clean.lastIndexOf(']')
      if (jsonStart !== -1 && jsonEnd !== -1) {
        clean = clean.substring(jsonStart, jsonEnd + 1)
        const parsed = JSON.parse(clean)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return { slides: parsed, topic: targetTopic }
        }
      }
    }
  } catch (e) {
    console.warn("Using fallback lesson slides:", e)
  }

  return { slides: fallbackSlides, topic: targetTopic }
}

export async function apiGeneratePlan({ class_num, subject, chapter, student_name = "Student", weak_topics = [], mistakes_count = 0, streak = 0, language = "English" }) {
  const safeChapter = chapter || "Important CBSE Topics"
  const safeSubject = subject || "Core Subjects"
  const safeName = student_name || "Student"

  const fallbackPlan = {
    greeting: `Great job, ${safeName}! Here is your personalized 45-minute CBSE revision plan for ${safeChapter}.`,
    focus_topic: safeChapter,
    why: `Mastering ${safeChapter} in ${safeSubject} ensures you secure full marks in 3-mark and 5-mark board questions.`,
    tasks: [
      { time: "5 min", task: `Formula Warmup: Write down all key formulas & definitions of ${safeChapter} from memory`, type: "warmup" },
      { time: "15 min", task: `Core Revision: Deeply review the 2 hardest concepts and derivations in ${safeChapter}`, type: "learn" },
      { time: "15 min", task: `Active Practice: Solve 4 standard CBSE previous-year questions step by step`, type: "practice" },
      { time: "5 min", task: `Quick Self-Quiz: Test yourself on 3 speed MCQs without checking notes`, type: "test" },
      { time: "5 min", task: `Mistake Log: Note down any step where you hesitated in your Mistakes Notebook`, type: "review" }
    ],
    tip: "Active retrieval from memory is 300% more effective than passively re-reading textbook pages.",
    motivation: "Consistency of 45 focused minutes today puts you in the top 5% of CBSE board rankers!"
  }

  try {
    const weak = weak_topics.length ? weak_topics.join(", ") : "General revision"
    const prompt = `You are an expert CBSE teacher creating a daily 45-minute study plan for ${safeName} (Class ${class_num}).
Subject: ${safeSubject}
Chapter: ${safeChapter}
Weak areas: ${weak}
Mistakes made: ${mistakes_count}
Streak: ${streak} days

Return a JSON object:
{
  "greeting": "Friendly personal greeting for ${safeName}",
  "focus_topic": "${safeChapter}",
  "why": "Why this topic is crucial for CBSE exams",
  "tasks": [
    {"time": "5 min", "task": "Warmup task", "type": "warmup"},
    {"time": "15 min", "task": "Core concept learning task", "type": "learn"},
    {"time": "15 min", "task": "Active practice numericals/questions", "type": "practice"},
    {"time": "5 min", "task": "Quick quiz test", "type": "test"},
    {"time": "5 min", "task": "Mistake log and formula review", "type": "review"}
  ],
  "tip": "One actionable study tip",
  "motivation": "Short motivational quote"
}
ONLY return the JSON object, no other text.`

    const raw = await callGeminiDirect(prompt)
    if (raw) {
      let clean = raw.trim()
      const jsonStart = clean.indexOf('{')
      const jsonEnd = clean.lastIndexOf('}')
      if (jsonStart !== -1 && jsonEnd !== -1) {
        clean = clean.substring(jsonStart, jsonEnd + 1)
        const parsed = JSON.parse(clean)
        if (parsed && Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
          return { plan: parsed }
        }
      }
    }
  } catch (err) {
    console.warn("AI plan error, returning tailored fallback plan:", err)
  }

  return { plan: fallbackPlan }
}
