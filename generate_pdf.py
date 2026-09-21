import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "Study Buddy — Market Differentiation & Strategic Value Proposition")
            self.setStrokeColor(colors.HexColor("#e2e8f0"))
            self.setLineWidth(0.5)
            self.line(54, 742, 612 - 54, 742)
            
        # Footer
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(612 - 54, 36, page_str)
        self.drawString(54, 36, "Confidential — For Hackathon Judging, Investors & Strategic Planning")
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(54, 48, 612 - 54, 48)
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )
    
    styles = getSampleStyleSheet()
    
    # Custom styles
    primary_color = colors.HexColor("#1e1b4b")  # Dark indigo
    accent_color = colors.HexColor("#4f46e5")   # Indigo
    text_dark = colors.HexColor("#0f172a")      # Slate 900
    text_muted = colors.HexColor("#475569")     # Slate 600
    bg_light = colors.HexColor("#f8fafc")       # Slate 50
    border_color = colors.HexColor("#cbd5e1")   # Slate 300
    
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=primary_color,
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=accent_color,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Heading1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=primary_color,
        spaceBefore=12,
        spaceAfter=6
    )

    h2_style = ParagraphStyle(
        'Heading2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=accent_color,
        spaceBefore=8,
        spaceAfter=4
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=text_dark,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'Bullet',
        parent=body_style,
        leftIndent=14,
        firstLineIndent=-10,
        spaceAfter=4
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
        alignment=1
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10.5,
        textColor=text_dark
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=table_cell_style,
        fontName='Helvetica-Bold',
        textColor=accent_color
    )

    callout_style = ParagraphStyle(
        'Callout',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#312e81")
    )

    elements = []

    # Title Header Block
    elements.append(Paragraph("STUDY BUDDY — STRATEGIC BLUEPRINT", subtitle_style))
    elements.append(Paragraph("Product Positioning, Problem Analysis & Market Differentiation", title_style))
    elements.append(Paragraph("<b>Target Market:</b> Indian K-12 (CBSE Classes 6–12)  |  <b>Domain:</b> EdTech / Autonomous AI Tutoring", body_style))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=accent_color, spaceAfter=14))

    # Executive Summary / Core Mission
    summary_html = (
        "<b>Executive Summary:</b> Current EdTech giants (Byju's, PhysicsWallah, Unacademy) focus on long, passive "
        "video consumption, while generic AI tools (ChatGPT, Gemini) lack curriculum grounding and active pedagogical feedback. "
        "<b>Study Buddy</b> bridges this critical divide: a specialized, CBSE-native personal AI tutor that diagnoses where "
        "students lose marks on handwritten work, provides adaptive daily study plans, and delivers transparent, weekly progress "
        "reports directly to parents."
    )
    callout_data = [[Paragraph(summary_html, callout_style)]]
    callout_table = Table(callout_data, colWidths=[504])
    callout_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#eef2ff")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#c7d2fe")),
        ('PADDING', (0,0), (-1,-1), 10),
        ('ROUNDEDCORNERS', [4, 4, 4, 4])
    ]))
    elements.append(callout_table)
    elements.append(Spacer(1, 14))

    # SECTION 1: THE REAL PROBLEMS IN THE MARKET
    elements.append(Paragraph("1. The 4 Fundamental Problems in Indian EdTech", h1_style))
    
    problems = [
        ("1. The 'Passive Learning' & False Confidence Trap", 
         "Students watch 45-minute YouTube lectures and feel they have mastered a topic. However, in board exams, they freeze because passive watching creates illusory mastery. True mastery requires immediate, active problem-solving and immediate feedback."),
        ("2. The 'Homework Cheating' Dilemma (Doubt Apps)", 
         "Apps like Doubtnut, Brainly, and Photomath encourage pure answer copying. They scan an equation and spit out the final answer key. The student copies it for school homework without understanding the core conceptual breakdown."),
        ("3. The CBSE Syllabus & Deleted Topics Confusion", 
         "CBSE regularly rationalizes content (deleting 20-30% of textbook chapters). Generic AI engines (ChatGPT, Google Gemini) hallucinate out-of-syllabus topics or college-level methods for an 8th or 10th-grade child, creating severe anxiety right before exams."),
        ("4. The 'Parent Blindspot' & Friction", 
         "Parents invest ₹20,000 to ₹50,000 annually in coaching classes but remain completely blind to their child's day-to-day conceptual weaknesses until report card day. They have no transparent, objective data on whether their child is truly progressing.")
    ]

    for title, desc in problems:
        elements.append(Paragraph(f"<b>• {title}:</b> {desc}", bullet_style))
    
    elements.append(Spacer(1, 10))

    # SECTION 2: COMPETITIVE COMPARISON MATRIX
    elements.append(Paragraph("2. Comprehensive Market Comparison Matrix", h1_style))
    elements.append(Paragraph("A side-by-side evaluation of Study Buddy against incumbent market players:", body_style))

    headers = [
        Paragraph("Dimension / Capability", table_header_style),
        Paragraph("Generic AI<br/>(ChatGPT / Gemini)", table_header_style),
        Paragraph("Video Giants<br/>(Byju's / PW)", table_header_style),
        Paragraph("Doubt Solvers<br/>(Doubtnut / Photomath)", table_header_style),
        Paragraph("Study Buddy<br/>(Your Product)", table_header_style)
    ]

    data = [headers]

    rows = [
        ("Curriculum Alignment", 
         "Generic global data; unaware of CBSE constraints", 
         "Broad syllabus; slow to reflect deleted topics", 
         "Database lookup; no pedagogical framing", 
         "100% CBSE Classes 6-12 native with deleted-topic guardrails"),
        
        ("Learning Methodology", 
         "Text prompts; conversational; passive reading", 
         "Passive 45-60 min video watching; high drop-off", 
         "Direct solution dumping (encourages cheating)", 
         "Active retrieval: Explain, Quiz, Step-by-Step, Exam-Prep"),
        
        ("Handwritten Answer Evaluation", 
         "Text transcription only; no board mark rubric", 
         "None (requires human doubt clearing with long delay)", 
         "None (only evaluates question, not student's work)", 
         "Board examiner grading: pinpoints exact lost marks & step errors"),

        ("Personalized Daily Routine", 
         "None (blank input paralysis)", 
         "Rigid batch schedule; one-size-fits-all", 
         "None (strictly on-demand Q&A)", 
         "Automated 45-min adaptive plan focused on weak spots"),

        ("Student Engagement & Gamification", 
         "None (monochrome text interface)", 
         "Badges inside closed ecosystems", 
         "None", 
         "60-sec timed Quiz Battles, XP levels, streaks, audio narration"),

        ("Parent Accountability & Visibility", 
         "Zero parent tools", 
         "Generic attendance notifications; rarely read", 
         "Zero parent visibility", 
         "Dedicated Parent Dashboard: weak topics, questions solved, trends")
    ]

    for dim, g_ai, vid, dbt, sb in rows:
        data.append([
            Paragraph(f"<b>{dim}</b>", table_cell_style),
            Paragraph(g_ai, table_cell_style),
            Paragraph(vid, table_cell_style),
            Paragraph(dbt, table_cell_style),
            Paragraph(f"<b>{sb}</b>", table_cell_bold)
        ])

    col_widths = [95, 95, 100, 100, 114]
    comp_table = Table(data, colWidths=col_widths, repeatRows=1)
    comp_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, border_color),
        ('BACKGROUND', (4,1), (4,-1), colors.HexColor("#f5f3ff")),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    
    elements.append(comp_table)
    elements.append(Spacer(1, 14))

    # SECTION 3: THE 5 STRATEGIC DIFFERENTIATORS
    elements.append(Paragraph("3. The 5 Strategic Differentiators (Why Users & Parents Pay)", h1_style))

    differentiators = [
        ("Differentiator 1: Diagnostic Answer Checking vs. Answer Cheating",
         "While legacy apps merely give answers, Study Buddy scans the <i>student's handwritten answer sheet</i>. "
         "Acting as a strict CBSE board evaluator, it highlights missing key terms, calculation missteps, and formula errors, "
         "awarding a realistic score out of 10 and saving weak points directly to the 'Mistakes Notebook'."),
        
        ("Differentiator 2: Overcoming 'Blank Prompt Paralysis' with Adaptive Plans",
         "When an 8th grader opens ChatGPT, they do not know what to ask. Study Buddy eliminates choice fatigue by generating "
         "an adaptive 45-minute daily study plan based on previous errors: 5 min warmup, 15 min concept dive, 15 min numerical practice, "
         "and 10 min quiz verification."),

        ("Differentiator 3: Real-Time CBSE Syllabus & Deleted Topics Guardrail",
         "The app has built-in awareness of the official rationalized CBSE syllabus for 2026-27. It actively warns students "
         "and filters out deleted chapters and sub-topics, saving hundreds of hours of wasted study time before exams."),

        ("Differentiator 4: The Parent Report — The Primary Monetization Driver",
         "Students do not own credit cards; parents make the purchasing decisions. Parents will not pay for a chatbot, but they "
         "eagerly pay for peace of mind. Study Buddy's dedicated Parent Report highlights study streaks, topics mastered vs. struggling, "
         "and an objective growth summary, justifying a recurring subscription."),

        ("Differentiator 5: High-Retention Micro-Learning (Video Lessons & Battles)",
         "To prevent tab-switching and boredom, the app provides instant, 8-slide animated visual lessons with automated speech narration, "
         "alongside high-intensity 60-second Quiz Battles that turn rote revision into a dopamine-rich game.")
    ]

    for title, text in differentiators:
        elements.append(Paragraph(f"<b>{title}</b>", h2_style))
        elements.append(Paragraph(text, body_style))

    elements.append(Spacer(1, 12))

    # SECTION 4: BUSINESS MODEL & PITCH
    elements.append(Paragraph("4. Business Model & Hackathon Pitch Summary", h1_style))
    
    biz_html = (
        "<b>Market Value:</b> India's K-12 coaching market exceeds $15B, yet 85% of tier-2 and tier-3 students lack access to "
        "personalized 1-on-1 tutoring. Private tutors cost ₹2,000 to ₹5,000/month.<br/><br/>"
        "<b>Monetization Proposition:</b><br/>"
        "• <b>Freemium Tier:</b> Free daily concept explanations, syllabus exploration, and basic quiz practice.<br/>"
        "• <b>Study Buddy Pro (₹299–₹499/month):</b> Unlimited handwritten mistake scanning, deep diagnostic examiner evaluations, "
        "daily personalized study plans, and automated weekly WhatsApp reports for parents.<br/><br/>"
        "<b>The One-Sentence Pitch:</b><br/>"
        "<i>'PhysicsWallah and Byju\\'s teach through 45-minute passive videos; ChatGPT gives generic text answers. "
        "Study Buddy is an active, CBSE-aligned personal AI tutor that diagnoses where students lose marks on paper, "
        "gamifies daily revision, and gives parents transparent proof of their child\\'s academic growth.'</i>"
    )
    
    biz_table = Table([[Paragraph(biz_html, body_style)]], colWidths=[504])
    biz_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg_light),
        ('BOX', (0,0), (-1,-1), 1, border_color),
        ('PADDING', (0,0), (-1,-1), 10),
        ('ROUNDEDCORNERS', [4, 4, 4, 4])
    ]))
    elements.append(biz_table)

    # Build Document
    doc.build(elements, canvasmaker=NumberedCanvas)
    print(f"PDF successfully generated at: {filename}")

if __name__ == "__main__":
    out_path = "/Users/dhyeybhoniya/Documents/study-buddy/Study_Buddy_Competitive_Advantage.pdf"
    build_pdf(out_path)
