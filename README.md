# Study Buddy — AI Personal Tutor for CBSE Students

An AI-powered personal tutor that tracks progress, finds weak spots, and creates daily study plans. Built for Indian students (Classes 6-12, CBSE).

## Features
- **Personal Study Plan** — AI creates daily plans based on your weak areas
- **Parent Report** — Progress tracking that parents can review
- **Mistake Analysis** — Scan answers, get error analysis, auto-save to practice
- **AI Video Lessons** — Animated visual lessons with narration
- **Quiz Battles** — Timed challenges to test your knowledge
- **Camera Scan** — Point at textbook, get instant answers
- **Hindi & Hinglish** — Full language support

## Tech Stack
- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: FastAPI + Python
- **AI**: Google Gemini API (gemini-3.7-flash)

## Setup

### Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export GEMINI_API_KEY="your-api-key"
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Made with ❤️ in India
