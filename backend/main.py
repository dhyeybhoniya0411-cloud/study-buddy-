from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types
from typing import Optional
import base64
import os
from dotenv import load_dotenv
from cbse_data import CBSE_CURRICULUM, get_classes, get_subjects, get_chapters, get_deleted_topics

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# =============================================
# API KEY — reads from env variable / .env file
# =============================================
API_KEY = os.environ.get("GEMINI_API_KEY", "")
client = genai.Client(api_key=API_KEY)
# =============================================

MODELS = ["gemini-3.7-flash", "gemini-3.6-flash"]

def call_gemini(prompt):
    """Try multiple models with fallback"""
    for model_name in MODELS:
        try:
            response = client.models.generate_content(model=model_name, contents=prompt)
            return response.text
        except Exception as e:
            error_msg = str(e)
            if "503" in error_msg or "UNAVAILABLE" in error_msg or "404" in error_msg:
                continue
            else:
                return f"❌ Error: {error_msg}"
    return "⏳ AI is busy right now. Please wait 30 seconds and try again!"

def call_gemini_chat(history_messages):
    """Multi-turn chat using Gemini"""
    for model_name in MODELS:
        try:
            response = client.models.generate_content(model=model_name, contents=history_messages)
            return response.text
        except Exception as e:
            error_msg = str(e)
            if "503" in error_msg or "UNAVAILABLE" in error_msg or "404" in error_msg:
                continue
            else:
                return f"❌ Error: {error_msg}"
    return "⏳ AI is busy right now. Please try again!"

def youtube_query(subject, grade, question):
    return f"CBSE Class {grade} {subject} {question.strip()[:60]} explained"

# ── CBSE Curriculum Endpoints ──

@app.get("/curriculum/classes")
async def list_classes():
    return {"classes": get_classes()}

@app.get("/curriculum/subjects/{class_num}")
async def list_subjects(class_num: str):
    return {"subjects": get_subjects(class_num)}

@app.get("/curriculum/chapters/{class_num}/{subject}")
async def list_chapters(class_num: str, subject: str):
    return {
        "chapters": get_chapters(class_num, subject),
        "deleted_topics": get_deleted_topics(class_num, subject)
    }

# ── Learn Endpoint (updated for CBSE) ──

class LearnRequest(BaseModel):
    question: str
    class_num: str
    subject: str
    chapter: str
    mode: str
    language: str = "English"

@app.post("/ask")
async def ask_question(req: LearnRequest):
    lang = ""
    if req.language == "Hindi":
        lang = "IMPORTANT: Reply entirely in Hindi (Devanagari script). Use simple Hindi."
    elif req.language == "Hinglish":
        lang = "IMPORTANT: Reply in Hinglish (Hindi + English mix in Roman script)."

    cbse_context = f"CBSE Class {req.class_num}, Subject: {req.subject}, Chapter: {req.chapter}"

    if req.mode == "quiz":
        prompt = f"""You are a CBSE tutor. Context: {cbse_context}
Topic: {req.question}
{lang}

Generate 3 MCQ quiz questions aligned to this CBSE chapter for Class {req.class_num}.
Format:
Q1: [question]
A) B) C) D)
Answer: [letter]
Explanation: [one line]

Q2: ...
Q3: ...
Keep language appropriate for Class {req.class_num}."""

    elif req.mode == "step-by-step":
        prompt = f"""You are a CBSE math/science tutor. Context: {cbse_context}
{lang}
Problem: {req.question}

Solve step by step:
Step 1: [what and why]
Step 2: [next step]
...
Final Answer: [answer]

Show ALL work. Explain each step for a Class {req.class_num} student."""

    elif req.mode == "exam-prep":
        prompt = f"""You are a CBSE exam preparation expert. Context: {cbse_context}
Topic: {req.question}
{lang}

Create an exam prep guide for Class {req.class_num}:

📋 KEY CONCEPTS (5 most important points)
1. ...

📝 IMPORTANT FORMULAS/RULES
- ...

⚠️ COMMON MISTAKES in CBSE exams
- ...

🎯 EXPECTED QUESTIONS (2 short + 1 long answer, CBSE pattern)
- ...

💡 LAST-MINUTE TIPS
- ..."""

    else:
        prompt = f"""You are a friendly CBSE tutor for Class {req.class_num}.
Context: {cbse_context}
Question: {req.question}
{lang}

Explain clearly for a Class {req.class_num} CBSE student:
- Simple language
- One real-world example
- Under 200 words
- End encouragingly"""

    answer = call_gemini(prompt)
    return {
        "answer": answer,
        "youtube_query": youtube_query(req.subject, req.class_num, req.question)
    }

# ── Chat Endpoint (multi-turn conversation) ──

class ChatRequest(BaseModel):
    messages: list  # [{"role": "user", "text": "..."}, {"role": "ai", "text": "..."}]
    class_num: str
    subject: str
    chapter: str
    language: str = "English"

@app.post("/chat")
async def chat(req: ChatRequest):
    lang = ""
    if req.language == "Hindi":
        lang = "Reply in Hindi (Devanagari)."
    elif req.language == "Hinglish":
        lang = "Reply in Hinglish."

    system_context = f"""You are Study Buddy, a friendly CBSE tutor for Class {req.class_num} {req.subject} ({req.chapter}).
{lang}
Rules:
- Be patient, encouraging, and conversational
- Use simple language for Class {req.class_num}
- Give examples from daily life
- If the student seems confused, try explaining differently
- Keep answers concise (under 150 words)
- Remember the full conversation context"""

    # Build conversation for Gemini
    contents = [system_context]
    for msg in req.messages:
        if msg["role"] == "user":
            contents.append(f"Student: {msg['text']}")
        else:
            contents.append(f"Tutor: {msg['text']}")

    answer = call_gemini("\n".join(contents))
    return {"answer": answer}

# ── Check Answer Endpoint (mistake analysis) ──

class CheckAnswerRequest(BaseModel):
    question: str
    student_answer: str
    class_num: str
    subject: str
    chapter: str
    language: str = "English"

@app.post("/check-answer")
async def check_answer(req: CheckAnswerRequest):
    lang = ""
    if req.language == "Hindi":
        lang = "Reply in Hindi (Devanagari)."
    elif req.language == "Hinglish":
        lang = "Reply in Hinglish."

    prompt = f"""You are a CBSE examiner for Class {req.class_num} {req.subject} ({req.chapter}).
{lang}

Question: {req.question}
Student's Answer: {req.student_answer}

Analyze this answer carefully. Respond in this exact format:

## 📊 Score: [X/10]

## ✅ What's Correct
- [list correct parts]

## ❌ Mistakes Found
- [list each mistake clearly]
- [explain WHY it's wrong]

## 📝 Correct Answer
[write the complete correct answer]

## 🎯 Topics to Revise
- [specific topics the student needs to practice]

## 💡 Tips
- [tips to avoid these mistakes in CBSE exam]

Be honest but encouraging. A Class {req.class_num} student is reading this."""

    answer = call_gemini(prompt)

    # Extract topics to revise for the notebook
    return {
        "analysis": answer,
        "question": req.question,
        "student_answer": req.student_answer,
        "chapter": req.chapter,
        "subject": req.subject,
        "class_num": req.class_num
    }

# ── Scan Image Endpoint (Camera) ──

class ScanRequest(BaseModel):
    image_base64: str  # base64 encoded image from camera
    class_num: str
    subject: str
    chapter: str
    mode: str = "explain"  # what to do after reading: explain, quiz, step-by-step, exam-prep
    language: str = "English"
    scan_type: str = "question"  # "question" = extract & answer, "answer" = extract student's written answer

@app.post("/scan")
async def scan_image(req: ScanRequest):
    lang = ""
    if req.language == "Hindi":
        lang = "Reply in Hindi (Devanagari)."
    elif req.language == "Hinglish":
        lang = "Reply in Hinglish."

    # Decode base64 image
    try:
        image_data = base64.b64decode(req.image_base64)
    except Exception:
        return {"error": "Invalid image data", "extracted_text": "", "answer": ""}

    cbse = f"CBSE Class {req.class_num}, {req.subject}, {req.chapter}"

    if req.scan_type == "answer":
        # Just extract the text from handwritten/printed answer
        prompt = f"""Look at this image carefully. It contains a student's handwritten or printed answer.
Extract the text EXACTLY as written. Return only the extracted text, nothing else."""
    elif req.mode == "quiz":
        prompt = f"""Look at this image. It contains a question from a textbook or worksheet.
First, extract the question text. Then generate 3 MCQ quiz questions related to this topic for {cbse}. {lang}"""
    elif req.mode == "step-by-step":
        prompt = f"""Look at this image. It contains a math/science problem.
First, extract the problem. Then solve it step by step for a {cbse} student. Show all work. {lang}"""
    elif req.mode == "exam-prep":
        prompt = f"""Look at this image. It contains a topic or question.
First, extract the text. Then create a CBSE exam prep guide for {cbse} on this topic. {lang}"""
    else:
        prompt = f"""Look at this image. It contains a question from a textbook or worksheet.
First, extract the question text. Then explain the answer clearly for a {cbse} student.
Use simple language, give a real example, keep under 200 words. {lang}"""

    for model_name in MODELS:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=[
                    types.Part.from_bytes(data=image_data, mime_type="image/jpeg"),
                    prompt
                ]
            )
            return {
                "answer": response.text,
                "youtube_query": youtube_query(req.subject, req.class_num, req.chapter)
            }
        except Exception as e:
            error_msg = str(e)
            if "503" in error_msg or "UNAVAILABLE" in error_msg or "404" in error_msg:
                continue
            else:
                return {"answer": f"❌ Error reading image: {error_msg}", "youtube_query": ""}

    return {"answer": "⏳ AI is busy. Try again in 30 seconds.", "youtube_query": ""}

# ── AI Video Lesson Generator ──

class LessonRequest(BaseModel):
    class_num: str
    subject: str
    chapter: str
    topic: str = ""
    language: str = "English"

@app.post("/generate-lesson")
async def generate_lesson(req: LessonRequest):
    lang = ""
    if req.language == "Hindi":
        lang = "Reply in Hindi (Devanagari)."
    elif req.language == "Hinglish":
        lang = "Reply in Hinglish."

    topic = req.topic if req.topic else req.chapter
    prompt = f"""You are a CBSE Class {req.class_num} {req.subject} teacher creating a visual lesson on: {topic}
Chapter: {req.chapter}
{lang}

Create exactly 8 slides for a video lesson. Each slide MUST follow this JSON format exactly:

[
  {{"slide": 1, "type": "title", "title": "Lesson title", "subtitle": "Chapter name", "emoji": "📚"}},
  {{"slide": 2, "type": "concept", "title": "What is [topic]?", "content": "Simple 2-line definition", "emoji": "💡", "highlight": "key term to highlight"}},
  {{"slide": 3, "type": "example", "title": "Real World Example", "content": "A relatable daily-life example for a Class {req.class_num} student", "emoji": "🌍"}},
  {{"slide": 4, "type": "formula", "title": "Key Formula", "content": "The main formula or rule", "explanation": "What each part means", "emoji": "📝"}},
  {{"slide": 5, "type": "steps", "title": "How to Solve", "steps": ["Step 1: ...", "Step 2: ...", "Step 3: ...", "Step 4: ..."], "emoji": "📋"}},
  {{"slide": 6, "type": "practice", "title": "Quick Practice", "question": "A practice question", "answer": "The answer with short explanation", "emoji": "✍️"}},
  {{"slide": 7, "type": "funfact", "title": "Fun Fact!", "content": "An interesting/surprising fact related to this topic", "emoji": "🤯"}},
  {{"slide": 8, "type": "summary", "title": "Key Takeaways", "points": ["Point 1", "Point 2", "Point 3", "Point 4"], "emoji": "⭐"}}
]

IMPORTANT: Return ONLY valid JSON array. No markdown, no explanation, no code blocks. Just the raw JSON array."""

    answer = call_gemini(prompt)

    # Try to parse JSON from the response
    import json
    try:
        # Clean up the response - remove markdown code blocks if present
        cleaned = answer.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]  # remove first line
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

        slides = json.loads(cleaned)
        return {"slides": slides, "topic": topic}
    except json.JSONDecodeError:
        # Fallback: create basic slides from text
        return {"slides": [
            {"slide": 1, "type": "title", "title": topic, "subtitle": req.chapter, "emoji": "📚"},
            {"slide": 2, "type": "concept", "title": "Lesson", "content": answer[:500], "emoji": "💡"},
            {"slide": 3, "type": "summary", "title": "Summary", "points": ["Review the chapter for more details"], "emoji": "⭐"},
        ], "topic": topic}

# ── Smart Study Plan Generator ──

class PlanRequest(BaseModel):
    class_num: str
    subject: str
    chapter: str
    student_name: str = "Student"
    weak_topics: list = []
    mistakes_count: int = 0
    streak: int = 0
    language: str = "English"

@app.post("/generate-plan")
async def generate_plan(req: PlanRequest):
    lang = ""
    if req.language == "Hindi":
        lang = "Reply in Hindi."
    elif req.language == "Hinglish":
        lang = "Reply in Hinglish."

    weak = ", ".join(req.weak_topics[:5]) if req.weak_topics else "None identified yet"

    prompt = f"""You are a personal CBSE tutor creating today's study plan for {req.student_name} (Class {req.class_num}).
Current chapter: {req.chapter} ({req.subject})
Weak areas: {weak}
Mistakes made: {req.mistakes_count}
Study streak: {req.streak} days
{lang}

Create a focused 45-minute study plan. Return ONLY valid JSON:

{{
  "greeting": "A personal encouraging message for {req.student_name}",
  "focus_topic": "The ONE topic to focus on today",
  "why": "Why this topic matters (1 sentence)",
  "tasks": [
    {{"time": "5 min", "task": "Quick revision task", "type": "warmup"}},
    {{"time": "15 min", "task": "Main learning task", "type": "learn"}},
    {{"time": "10 min", "task": "Practice task", "type": "practice"}},
    {{"time": "10 min", "task": "Quiz/test task", "type": "test"}},
    {{"time": "5 min", "task": "Revision/summary task", "type": "review"}}
  ],
  "tip": "One study tip for today",
  "motivation": "A motivational quote or message"
}}

IMPORTANT: Return ONLY valid JSON. No markdown."""

    answer = call_gemini(prompt)
    import json
    try:
        cleaned = answer.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1]
            if cleaned.endswith("```"): cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
        plan = json.loads(cleaned)
        return {"plan": plan}
    except:
        return {"plan": {
            "greeting": f"Hi {req.student_name}! Let's study {req.chapter} today.",
            "focus_topic": req.chapter,
            "why": "This is important for your CBSE exam.",
            "tasks": [
                {"time": "10 min", "task": "Read the chapter once", "type": "warmup"},
                {"time": "15 min", "task": "Note down key concepts", "type": "learn"},
                {"time": "15 min", "task": "Solve 5 practice problems", "type": "practice"},
                {"time": "5 min", "task": "Quick self-test", "type": "test"},
            ],
            "tip": "Take short breaks between tasks!",
            "motivation": "Every expert was once a beginner. Keep going!"
        }}

# ── Health Check ──

@app.get("/health")
async def health():
    return {"status": "ok", "message": "Study Buddy backend is running!"}