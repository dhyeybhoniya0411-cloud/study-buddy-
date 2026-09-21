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
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/generate-lesson`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_num, subject, chapter, topic, language })
      })
      if (res.ok) return await res.json()
    } catch (e) {
      console.warn('Backend unavailable, using direct Gemini', e)
    }
  }

  const targetTopic = topic || chapter
  let lang = ""
  if (language === "Hindi") lang = "Reply in Hindi (Devanagari)."
  else if (language === "Hinglish") lang = "Reply in Hinglish."

  const prompt = `You are a CBSE Class ${class_num} ${subject} teacher creating a visual lesson on: ${targetTopic}
Chapter: ${chapter}
${lang}

Create exactly 8 slides for a video lesson. Return ONLY a valid JSON array:
[
  {"slide": 1, "type": "title", "title": "${targetTopic}", "subtitle": "${chapter}", "emoji": "📚"},
  {"slide": 2, "type": "concept", "title": "What is ${targetTopic}?", "content": "Simple 2-line definition", "emoji": "💡", "highlight": "Key concept"},
  {"slide": 3, "type": "example", "title": "Real World Example", "content": "Relatable daily life example", "emoji": "🌍"},
  {"slide": 4, "type": "formula", "title": "Key Formula / Law", "content": "The main formula or rule", "explanation": "What each term means", "emoji": "📝"},
  {"slide": 5, "type": "steps", "title": "How to Solve", "steps": ["Step 1: Identify given values", "Step 2: Apply formula", "Step 3: Calculate", "Step 4: State final units"], "emoji": "📋"},
  {"slide": 6, "type": "practice", "title": "Quick Practice", "question": "Try this practice problem", "answer": "Detailed solution", "emoji": "✍️"},
  {"slide": 7, "type": "funfact", "title": "Did You Know?", "content": "A fascinating real-world fact", "emoji": "🤯"},
  {"slide": 8, "type": "summary", "title": "Key Takeaways", "points": ["Remember the core definition", "Keep formulas handy", "Review key terms", "Practice sample problems"], "emoji": "⭐"}
]
Return ONLY raw JSON.`

  const raw = await callGeminiDirect(prompt)
  try {
    let clean = raw.trim()
    if (clean.startsWith("```")) {
      clean = clean.split("\n", 2)[1] || clean
      if (clean.endsWith("```")) clean = clean.slice(0, -3)
      const jsonStart = clean.indexOf('[')
      const jsonEnd = clean.lastIndexOf(']')
      if (jsonStart !== -1 && jsonEnd !== -1) {
        clean = clean.substring(jsonStart, jsonEnd + 1)
      }
    }
    const slides = JSON.parse(clean)
    return { slides, topic: targetTopic }
  } catch (e) {
    return {
      slides: [
        { slide: 1, type: "title", title: targetTopic, subtitle: chapter, emoji: "📚" },
        { slide: 2, type: "concept", title: "Lesson Overview", content: raw.slice(0, 400), emoji: "💡" },
        { slide: 3, type: "summary", title: "Summary", points: ["Review this chapter carefully", "Focus on key definitions"], emoji: "⭐" }
      ],
      topic: targetTopic
    }
  }
}

export async function apiGeneratePlan({ class_num, subject, chapter, student_name = "Student", weak_topics = [], mistakes_count = 0, streak = 0, language = "English" }) {
  if (API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/generate-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_num, subject, chapter, student_name, weak_topics, mistakes_count, streak, language })
      })
      if (res.ok) return await res.json()
    } catch (e) {
      console.warn('Backend unavailable, using direct Gemini', e)
    }
  }

  const weak = weak_topics.length ? weak_topics.join(", ") : "General revision"
  const prompt = `You are a personal CBSE tutor creating today's study plan for ${student_name} (Class ${class_num}).
Current chapter: ${chapter} (${subject})
Weak areas: ${weak}
Mistakes made: ${mistakes_count}
Study streak: ${streak} days

Create a focused 45-minute study plan. Return ONLY valid JSON:
{
  "greeting": "Hi ${student_name}! Let's conquer ${chapter} today.",
  "focus_topic": "${chapter}",
  "why": "Mastering this chapter boosts your CBSE confidence and exam score.",
  "tasks": [
    {"time": "5 min", "task": "Quick formula & definition warmup", "type": "warmup"},
    {"time": "15 min", "task": "Deep dive into core concepts", "type": "learn"},
    {"time": "15 min", "task": "Solve 3-4 practice numericals/questions", "type": "practice"},
    {"time": "5 min", "task": "Self-assessment quiz", "type": "test"},
    {"time": "5 min", "task": "Note down doubts and key formulas", "type": "review"}
  ],
  "tip": "Active recall beats passive reading every single time.",
  "motivation": "Small daily efforts compound into board exam excellence!"
}
Return ONLY valid JSON.`

  const raw = await callGeminiDirect(prompt)
  try {
    let clean = raw.trim()
    const jsonStart = clean.indexOf('{')
    const jsonEnd = clean.lastIndexOf('}')
    if (jsonStart !== -1 && jsonEnd !== -1) {
      clean = clean.substring(jsonStart, jsonEnd + 1)
    }
    const plan = JSON.parse(clean)
    return { plan }
  } catch (e) {
    return {
      plan: {
        greeting: `Hi ${student_name}! Ready to master ${chapter}?`,
        focus_topic: chapter,
        why: "Key chapter for your upcoming exams.",
        tasks: [
          { time: "10 min", task: "Review definitions and formulas", type: "warmup" },
          { time: "20 min", task: "Work through textbook examples", type: "learn" },
          { time: "15 min", task: "Solve 5 practice problems", type: "practice" }
        ],
        tip: "Write formulas by hand on a reference sheet.",
        motivation: "You've got this! Step by step."
      }
    }
  }
}
