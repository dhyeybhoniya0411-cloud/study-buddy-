import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import 'katex/dist/katex.min.css'
import { getClasses, getSubjects, getChapters, getDeletedTopics, getChapterBattleQuestions, apiAsk, apiChat, apiCheckAnswer, apiScan, apiGenerateLesson, apiGeneratePlan } from './api'
import { NTA_WEIGHTAGE_DATA, MOCK_TESTS_CATALOG } from './cbse_data'

// ── Markdown Formatter ──
function Md({ text }) {
  return (
    <div className="prose prose-sm max-w-none text-slate-800 [&_h2]:text-sm [&_h2]:font-bold [&_h2]:text-blue-900 [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:font-bold [&_h3]:text-blue-700 [&_p]:text-[13px] [&_p]:leading-relaxed [&_p]:text-slate-700 [&_p]:mb-2 [&_li]:text-[13px] [&_li]:text-slate-700 [&_strong]:text-blue-950 [&_strong]:font-semibold [&_code]:text-blue-600 [&_code]:bg-blue-50 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded">
      <ReactMarkdown remarkPlugins={[remarkMath, remarkGfm]} rehypePlugins={[rehypeKatex]}>{text}</ReactMarkdown>
    </div>
  )
}

// ── Mobile Camera Modal ──
function CameraModal({ onCapture, onClose }) {
  const vRef = useRef(null), cRef = useRef(null)
  const [stream, setStream] = useState(null), [cap, setCap] = useState(null), [facing, setFacing] = useState('environment')

  const start = useCallback(async (f) => {
    try {
      if (stream) stream.getTracks().forEach(t => t.stop())
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: f, width: { ideal: 1280 } } })
      setStream(s)
      if (vRef.current) vRef.current.srcObject = s
    } catch {
      alert('Camera access required. Please allow camera permission in your browser.')
    }
  }, [stream])

  useEffect(() => {
    start(facing)
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()) }
  }, [])

  const capture = () => {
    const v = vRef.current, c = cRef.current
    if (!v || !c) return
    c.width = v.videoWidth
    c.height = v.videoHeight
    c.getContext('2d').drawImage(v, 0, 0)
    setCap({ b64: c.toDataURL('image/jpeg', 0.8).split(',')[1], src: c.toDataURL('image/jpeg', 0.8) })
  }

  const close = () => {
    if (stream) stream.getTracks().forEach(t => t.stop())
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-200">
        <div className="p-4 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-lg">📸</span>
            <span className="text-sm font-bold">Snap Question / Answer</span>
          </div>
          <button onClick={close} className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">✕</button>
        </div>
        <div className="p-4">
          {!cap ? (
            <>
              <div className="relative rounded-2xl overflow-hidden bg-black mb-3 aspect-[4/3]">
                <video ref={vRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute inset-4 border-2 border-dashed border-white/60 rounded-xl pointer-events-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { const f = facing === 'environment' ? 'user' : 'environment'; setFacing(f); start(f) }} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold btn-press">🔄 Flip</button>
                <button onClick={capture} className="flex-[3] py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold btn-press shadow-md shadow-blue-500/30">📸 Take Photo</button>
              </div>
            </>
          ) : (
            <>
              <img src={cap.src} className="w-full rounded-2xl mb-3 aspect-[4/3] object-contain bg-slate-900" />
              <div className="flex gap-2">
                <button onClick={() => { setCap(null); start(facing) }} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold btn-press">🔄 Retake</button>
                <button onClick={() => { onCapture(cap.b64); if (stream) stream.getTracks().forEach(t => t.stop()) }} className="flex-[2] py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold btn-press shadow-md shadow-emerald-500/30">✅ Use Photo</button>
              </div>
            </>
          )}
        </div>
        <canvas ref={cRef} className="hidden" />
      </div>
    </div>
  )
}

// ── Onboarding Screen ──
function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0), [name, setName] = useState(''), [cls, setCls] = useState('10'), [goal, setGoal] = useState('board')
  const finish = () => { if (!name.trim()) return; onComplete({ name: name.trim(), classNum: cls, goal }) }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-5">
      <div className="max-w-sm w-full bg-white p-6 rounded-3xl shadow-xl border border-slate-100">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-blue-500/30">S</div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Study Buddy</h2>
            <p className="text-[11px] text-blue-600 font-semibold">ALLEN-Powered AI Tutor</p>
          </div>
        </div>

        <div className="flex gap-1.5 mb-6">
          {[0, 1, 2].map(i => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-blue-600' : 'bg-slate-200'}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="animate-slide-up">
            <h1 className="text-xl font-bold text-slate-900 mb-1">What is your name?</h1>
            <p className="text-xs text-slate-500 mb-5">Your AI tutor will customize your daily plan.</p>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && name.trim()) setStep(1) }}
              placeholder="e.g. Rahul Sharma"
              autoFocus
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 text-sm font-medium mb-4 focus:bg-white focus:border-blue-600 outline-none"
            />
            <button onClick={() => name.trim() && setStep(1)} disabled={!name.trim()} className="w-full py-3 rounded-2xl bg-blue-600 text-white text-sm font-bold shadow-md shadow-blue-500/25 disabled:opacity-40 btn-press">
              Continue →
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="animate-slide-up">
            <h1 className="text-xl font-bold text-slate-900 mb-1">Select your class</h1>
            <p className="text-xs text-slate-500 mb-4">Content will be aligned to your exact CBSE syllabus.</p>
            <div className="grid grid-cols-4 gap-2 mb-5">
              {['6', '7', '8', '9', '10', '11', '12'].map(c => (
                <button
                  key={c}
                  onClick={() => setCls(c)}
                  className={`py-3 rounded-2xl text-xs font-bold border transition-all btn-press ${cls === c ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/25' : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-blue-400'}`}
                >
                  Class {c}
                </button>
              ))}
            </div>
            <button onClick={() => setStep(2)} className="w-full py-3 rounded-2xl bg-blue-600 text-white text-sm font-bold shadow-md shadow-blue-500/25 btn-press">
              Continue →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-slide-up">
            <h1 className="text-xl font-bold text-slate-900 mb-1">Your learning goal</h1>
            <p className="text-xs text-slate-500 mb-4">We will tailor your practice difficulty.</p>
            <div className="space-y-2 mb-5">
              {[
                { id: 'board', t: '🎯 CBSE Board Exam Top Rank', d: 'Master step-by-step scoring & key terms' },
                { id: 'concept', t: '💡 Complete Concept Clarity', d: 'Clear fundamental doubts with zero fear' },
                { id: 'speed', t: '⚡ Fast Revision & Quiz Battles', d: 'Bite-sized revision before tests' }
              ].map(g => (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  className={`w-full p-3.5 rounded-2xl text-left border transition-all btn-press ${goal === g.id ? 'bg-blue-50 border-blue-600 shadow-sm' : 'bg-slate-50 border-slate-200'}`}
                >
                  <p className="text-xs font-bold text-slate-900">{g.t}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{g.d}</p>
                </button>
              ))}
            </div>
            <button onClick={finish} className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-blue-500/30 btn-press">
              Enter Study Buddy App 🚀
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Subscription & Paywall Modal (5-Day Trial Funnel) ──
function SubscriptionModal({
  isOpen,
  onClose,
  subscription,
  daysRemaining,
  isTrialExpired,
  reason,
  onSubscribe,
  onSimulateState
}) {
  const [selectedPlan, setSelectedPlan] = useState('quarterly')
  const [payMethod, setPayMethod] = useState('upi') // 'upi' | 'qr' | 'card'
  const [payStep, setPayStep] = useState('select') // 'select' | 'processing' | 'success'
  const [processMsg, setProcessMsg] = useState('')
  const [upiId, setUpiId] = useState('')
  const [qrTimer, setQrTimer] = useState(300)

  const plans = [
    {
      id: 'monthly',
      name: 'Monthly Pro (CBSE)',
      price: 149,
      origPrice: 399,
      duration: '1 Month',
      perDay: '₹4.9/day',
      tag: 'Basic',
      popular: false,
      desc: 'Unlimited 24/7 AI Doubt solving & 45-min daily study plan.'
    },
    {
      id: 'quarterly',
      name: 'Quarterly Board Pass',
      price: 399,
      origPrice: 1299,
      duration: '3 Months',
      perDay: '₹4.4/day (₹133/mo)',
      tag: '🔥 84% Choose This',
      popular: true,
      desc: 'Complete CBSE Board revision, Examiner answer keys & Chapter Weightage.'
    },
    {
      id: 'super_batch',
      name: 'JEE / NEET Super Batch + CBT Test Series',
      price: 999,
      origPrice: 4999,
      duration: 'Full Year',
      perDay: '₹2.7/day (₹83/mo)',
      tag: '🏆 NTA CBT TEST SERIES • 80% OFF',
      popular: false,
      desc: 'Full NTA JEE/NEET CBT Mock Tests, MathonGo Analytics & 10-Yr PYQ Weightage.'
    }
  ]

  const currentPlanObj = plans.find(p => p.id === selectedPlan) || plans[1]

  useEffect(() => {
    if (!isOpen || payMethod !== 'qr') return
    const t = setInterval(() => {
      setQrTimer(prev => (prev > 0 ? prev - 1 : 300))
    }, 1000)
    return () => clearInterval(t)
  }, [isOpen, payMethod])

  if (!isOpen) return null

  const handlePay = () => {
    setPayStep('processing')
    setProcessMsg('Initiating secure UPI transaction...')
    
    setTimeout(() => {
      setProcessMsg('Verifying with NPCI & Banking Gateway...')
    }, 900)

    setTimeout(() => {
      setProcessMsg('Confirming Study Buddy Pro Access...')
    }, 1800)

    setTimeout(() => {
      setPayStep('success')
      onSubscribe(currentPlanObj)
    }, 2600)
  }

  const formatTimer = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec < 10 ? '0' : ''}${sec}`
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-slide-up">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 text-white p-4 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center font-bold text-sm transition-all"
          >
            ✕
          </button>
          
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">👑</span>
            <span className="text-xs font-black tracking-wider uppercase bg-amber-400/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full">
              STUDY BUDDY PRO
            </span>
          </div>

          <h2 className="text-lg font-black text-white leading-tight">
            {isTrialExpired ? '5-Day Free Trial Ended' : 'Unlock Study Buddy Pro'}
          </h2>
          
          <p className="text-xs text-blue-200 mt-1">
            {reason ? reason : (isTrialExpired 
              ? 'Keep your 5-day habit alive & save your streak. Less than ₹5/day!'
              : `🎁 Free Trial: ${daysRemaining} day(s) left. Lock in 70% Early Bird Discount now!`)}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          
          {payStep === 'select' && (
            <>
              {/* Value Highlights */}
              <div className="bg-blue-50/80 border border-blue-100 rounded-2xl p-3">
                <p className="text-[11px] font-extrabold text-blue-950 uppercase tracking-wide mb-2">
                  What You Get with Pro:
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-600 font-bold">✓</span> Unlimited 24/7 AI Doubts
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-600 font-bold">✓</span> Board Answer Evaluator
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-600 font-bold">✓</span> 45-Min Daily Schedules
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-blue-600 font-bold">✓</span> WhatsApp Parent Report
                  </div>
                  <div className="flex items-center gap-1.5 text-amber-950 font-bold col-span-2 bg-amber-100/70 px-2 py-1 rounded-lg border border-amber-200">
                    <span className="text-amber-600 font-black">★</span> NTA JEE / NEET CBT Mock Tests (Super Batch)
                  </div>
                </div>
              </div>

              {/* Plans Selection */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Choose Your Subscription Plan
                </p>
                <div className="space-y-2.5">
                  {plans.map(p => {
                    const isSel = selectedPlan === p.id
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPlan(p.id)}
                        className={`cursor-pointer rounded-2xl p-3.5 border transition-all relative ${
                          isSel 
                            ? 'border-blue-600 bg-blue-50/60 shadow-md ring-2 ring-blue-600/20' 
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        {p.tag && (
                          <span className={`absolute -top-2.5 right-3 text-[10px] font-black px-2 py-0.5 rounded-full ${
                            p.popular ? 'bg-amber-500 text-white shadow-xs' : 'bg-blue-600 text-white'
                          }`}>
                            {p.tag}
                          </span>
                        )}

                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                isSel ? 'border-blue-600 bg-blue-600 text-white text-[10px]' : 'border-slate-300'
                              }`}>
                                {isSel ? '✓' : ''}
                              </span>
                              <h4 className="text-sm font-extrabold text-slate-900">{p.name}</h4>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1 ml-6">{p.desc}</p>
                            <p className="text-[10px] font-semibold text-emerald-700 mt-0.5 ml-6">
                              Only {p.perDay}
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-xs text-slate-400 line-through mr-1">₹{p.origPrice}</span>
                            <span className="text-base font-black text-slate-900">₹{p.price}</span>
                            <p className="text-[10px] text-slate-500 font-medium">/{p.duration}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Select Payment Method
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPayMethod('upi')}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
                      payMethod === 'upi' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    📱 UPI Apps
                  </button>
                  <button
                    onClick={() => setPayMethod('qr')}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
                      payMethod === 'qr' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    📷 Scan QR
                  </button>
                  <button
                    onClick={() => setPayMethod('card')}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
                      payMethod === 'card' ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    💳 Card / Net
                  </button>
                </div>
              </div>

              {/* Payment Method Details */}
              {payMethod === 'upi' && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2.5">
                  <p className="text-[11px] font-bold text-slate-700">Instant UPI Checkout:</p>
                  <div className="flex gap-2">
                    {['Google Pay', 'PhonePe', 'Paytm', 'BHIM'].map(app => (
                      <div key={app} className="flex-1 py-1.5 bg-white border border-slate-200 rounded-xl text-center text-[10px] font-extrabold text-slate-800 shadow-xs">
                        {app}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={upiId}
                      onChange={e => setUpiId(e.target.value)}
                      placeholder="e.g. mobile@okhdfcbank"
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={() => setUpiId('student@upi')}
                      className="text-[10px] font-bold text-blue-600 px-2 py-1 bg-blue-50 rounded-lg border border-blue-200"
                    >
                      Autofill
                    </button>
                  </div>
                </div>
              )}

              {payMethod === 'qr' && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col items-center text-center">
                  <div className="w-36 h-36 bg-white border-2 border-slate-800 rounded-xl p-2 mb-2 relative flex items-center justify-center shadow-inner">
                    <div className="w-full h-full bg-[radial-gradient(#1E293B_2px,transparent_2px)] [background-size:8px_8px] flex items-center justify-center relative">
                      <div className="w-10 h-10 bg-white rounded-lg border border-slate-300 flex items-center justify-center font-black text-blue-700 text-xs shadow-md">
                        ₹{currentPlanObj.price}
                      </div>
                      <div className="absolute top-1 left-1 w-5 h-5 border-2 border-slate-900 bg-white"></div>
                      <div className="absolute top-1 right-1 w-5 h-5 border-2 border-slate-900 bg-white"></div>
                      <div className="absolute bottom-1 left-1 w-5 h-5 border-2 border-slate-900 bg-white"></div>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-slate-800">Scan using any UPI App</p>
                  <p className="text-[10px] text-slate-500">Google Pay • PhonePe • Paytm • BHIM</p>
                  <span className="mt-1 text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                    QR expires in {formatTimer(qrTimer)}
                  </span>
                </div>
              )}

              {payMethod === 'card' && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
                  <input
                    type="text"
                    placeholder="Card Number (XXXX XXXX XXXX XXXX)"
                    defaultValue="4532 •••• •••• 8912"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="MM/YY"
                      defaultValue="08/28"
                      className="w-1/2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                    />
                    <input
                      type="password"
                      placeholder="CVV"
                      defaultValue="912"
                      className="w-1/2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Pay Action Button */}
              <button
                onClick={handlePay}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white font-black text-sm shadow-xl shadow-blue-500/25 btn-press flex items-center justify-center gap-2"
              >
                <span>Pay ₹{currentPlanObj.price} & Unlock Pro</span>
                <span>→</span>
              </button>

              <p className="text-center text-[10px] text-slate-400 font-medium">
                🔒 256-bit Encrypted Banking Gateway • Instant Unlock • Cancel Anytime
              </p>
            </>
          )}

          {payStep === 'processing' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 animate-slide-up">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Processing Payment</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">{processMsg}</p>
              </div>
              <p className="text-[11px] text-slate-400">Please do not press back or close the app.</p>
            </div>
          )}

          {payStep === 'success' && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4 animate-slide-up">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-3xl font-bold shadow-lg shadow-emerald-500/20">
                ✓
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  PAYMENT CONFIRMED
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-2">Welcome to Study Buddy PRO!</h3>
                <p className="text-xs text-slate-600 mt-1 max-w-xs">
                  Your <b>{currentPlanObj.name}</b> (₹{currentPlanObj.price}) is active. Unlimited doubts & CBSE examiner checking unlocked!
                </p>
              </div>

              <div className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-left space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Plan:</span>
                  <span className="font-bold text-slate-800">{currentPlanObj.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount Paid:</span>
                  <span className="font-bold text-emerald-700">₹{currentPlanObj.price}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Access:</span>
                  <span className="font-bold text-blue-700">100% Unlocked</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setPayStep('select')
                  onClose()
                }}
                className="w-full py-3.5 rounded-2xl bg-emerald-600 text-white font-black text-sm shadow-lg shadow-emerald-500/25 btn-press"
              >
                Start Studying Now 🚀
              </button>
            </div>
          )}

        </div>

        {/* Demo Simulation Bar for Hackathon / Judges / Testing */}
        <div className="bg-slate-100 border-t border-slate-200 p-2.5 flex items-center justify-between text-[10px]">
          <span className="font-extrabold text-slate-500">🧪 Demo Tester:</span>
          <div className="flex gap-1">
            <button
              onClick={() => onSimulateState('trial_active')}
              className="px-1.5 py-1 rounded bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"
            >
              Day 2/5
            </button>
            <button
              onClick={() => onSimulateState('trial_expired')}
              className="px-1.5 py-1 rounded bg-rose-50 border border-rose-300 font-bold text-rose-700 hover:bg-rose-100"
            >
              Expired 🔒
            </button>
            <button
              onClick={() => onSimulateState('pro_active')}
              className="px-1.5 py-1 rounded bg-blue-50 border border-blue-300 font-bold text-blue-800 hover:bg-blue-100"
            >
              Pro 👑
            </button>
            <button
              onClick={() => onSimulateState('super_batch')}
              className="px-1.5 py-1 rounded bg-amber-100 border border-amber-400 font-black text-amber-950 hover:bg-amber-200 shadow-xs"
            >
              Super Batch 🏆
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

// ═══════════════════════════════════════
// MAIN ALLEN-STYLE EDTECH APP
// ═══════════════════════════════════════
export default function App() {
  const [profile, setProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sb_profile')) } catch { return null }
  })
  const [activeTab, setActiveTab] = useState('home') // home | plan | doubt | battle | report
  const [classNum, setClassNum] = useState(profile?.classNum || '10')
  const [subjects, setSubjects] = useState([])
  const [subject, setSubject] = useState('')
  const [chapters, setChapters] = useState([])
  const [chapter, setChapter] = useState('')
  const [deletedTopics, setDeletedTopics] = useState([])
  const [showDel, setShowDel] = useState(false)
  const [language, setLanguage] = useState('English')
  const [showCam, setShowCam] = useState(false)
  const [camTarget, setCamTarget] = useState('question')

  // Doubt / Ask state
  const [q, setQ] = useState('')
  const [mode, setMode] = useState('explain')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)

  // Chat state
  const [chatMsgs, setChatMsgs] = useState([])
  const [chatIn, setChatIn] = useState('')
  const [chatLoad, setChatLoad] = useState(false)

  // Check Answer state
  const [ckQ, setCkQ] = useState('')
  const [ckA, setCkA] = useState('')
  const [ckRes, setCkRes] = useState(null)
  const [ckLoad, setCkLoad] = useState(false)

  // Quiz Battle state
  const [btActive, setBtActive] = useState(false)
  const [btQs, setBtQs] = useState([])
  const [btIdx, setBtIdx] = useState(0)
  const [btScore, setBtScore] = useState(0)
  const [btTimer, setBtTimer] = useState(60)
  const [btDone, setBtDone] = useState(false)
  const [btLoad, setBtLoad] = useState(false)

  // Video Lesson state
  const [lsSlides, setLsSlides] = useState([])
  const [lsIdx, setLsIdx] = useState(0)
  const [lsLoad, setLsLoad] = useState(false)
  const [lsPlay, setLsPlay] = useState(false)
  const [lsTopic, setLsTopic] = useState('')

  // Plan state
  const [plan, setPlan] = useState(null)
  const [planLoad, setPlanLoad] = useState(false)
  const [planTasks, setPlanTasks] = useState({})

  // Storage
  const [mistakes, setMistakes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sb_m') || '[]') } catch { return [] }
  })
  const [stats, setStats] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem('sb_s') || '{}')
      return {
        xp: s.xp || 120,
        totalQ: s.totalQ || 8,
        quizzes: s.quizzes || 2,
        checks: s.checks || 1,
        streak: s.streak || 4,
        subjectsList: s.subjectsList || ['Mathematics', 'Science'],
        todayQ: s.todayQ || 3
      }
    } catch {
      return { xp: 120, totalQ: 8, quizzes: 2, checks: 1, streak: 4, subjectsList: ['Mathematics', 'Science'], todayQ: 3 }
    }
  })

  // ── Subscription & 5-Day Free Trial State ──
  const [subscription, setSubscription] = useState(() => {
    try {
      const s = JSON.parse(localStorage.getItem('sb_sub') || '{}')
      if (s && s.startDate) return s
    } catch {}
    const init = {
      startDate: Date.now(),
      trialDays: 5,
      isPro: false,
      plan: null,
      planName: null,
      price: null,
      proExpires: null
    }
    try { localStorage.setItem('sb_sub', JSON.stringify(init)) } catch {}
    return init
  })
  const [showSubModal, setShowSubModal] = useState(false)
  const [subReason, setSubReason] = useState('')

  // Calculate 5-day trial status
  const daysPassed = Math.floor((Date.now() - (subscription?.startDate || Date.now())) / (1000 * 60 * 60 * 24))
  const daysRemaining = Math.max(0, 5 - daysPassed)
  const isTrialExpired = !subscription?.isPro && daysRemaining <= 0

  useEffect(() => {
    try {
      if (subscription) localStorage.setItem('sb_sub', JSON.stringify(subscription))
    } catch {}
  }, [subscription])

  const handleSubscribe = (p) => {
    const updated = {
      startDate: subscription?.startDate || Date.now(),
      trialDays: 5,
      isPro: true,
      plan: p.id,
      planName: p.name,
      price: p.price,
      proExpires: Date.now() + (p.id === 'quarterly' ? 90 : p.id === 'annual' ? 365 : 30) * 86400000
    }
    setSubscription(updated)
  }

  const handleSimulateState = (mode) => {
    if (mode === 'trial_active') {
      setSubscription({
        startDate: Date.now() - 2 * 86400000,
        trialDays: 5,
        isPro: false,
        plan: null,
        planName: null,
        price: null,
        proExpires: null
      })
    } else if (mode === 'trial_expired') {
      setSubscription({
        startDate: Date.now() - 6 * 86400000,
        trialDays: 5,
        isPro: false,
        plan: null,
        planName: null,
        price: null,
        proExpires: null
      })
    } else if (mode === 'pro_active') {
      setSubscription({
        startDate: Date.now() - 2 * 86400000,
        trialDays: 5,
        isPro: true,
        plan: 'quarterly',
        planName: 'Quarterly Board Pass',
        price: 399,
        proExpires: Date.now() + 90 * 86400000
      })
    } else if (mode === 'super_batch') {
      setSubscription({
        startDate: Date.now() - 2 * 86400000,
        trialDays: 5,
        isPro: true,
        plan: 'super_batch',
        planName: 'JEE / NEET Super Batch + CBT Test Series',
        price: 999,
        proExpires: Date.now() + 365 * 86400000
      })
    }
  }

  const isSuperBatchActive = subscription?.isPro && (subscription?.plan === 'super_batch' || subscription?.plan === 'annual')

  // ── Exam Goal, NTA Weightage & CBT Mock Test Series State ──
  const [examTrack, setExamTrack] = useState('JEE') // 'JEE' | 'NEET' | 'CBSE'
  const [weightageSub, setWeightageSub] = useState('Physics')
  const [practiceSubTab, setPracticeSubTab] = useState('tests') // 'tests' | 'weightage' | 'battle'
  const [testFilter, setTestFilter] = useState('All')
  
  // CBT Mock Test Simulator State
  const [activeMockTest, setActiveMockTest] = useState(null)
  const [testQIdx, setTestQIdx] = useState(0)
  const [testAnswers, setTestAnswers] = useState({})
  const [testReviews, setTestReviews] = useState({})
  const [testTimer, setTestTimer] = useState(180 * 60)
  const [testSubmitted, setTestSubmitted] = useState(false)
  const [testAnalytics, setTestAnalytics] = useState(null)

  // Test countdown timer
  useEffect(() => {
    if (!activeMockTest || testSubmitted) return
    if (testTimer <= 0) {
      handleSubmitTest()
      return
    }
    const t = setInterval(() => setTestTimer(p => p - 1), 1000)
    return () => clearInterval(t)
  }, [activeMockTest, testTimer, testSubmitted])

  const handleStartMockTest = (test) => {
    if (test.isSuperBatchOnly && !isSuperBatchActive && isTrialExpired) {
      setSubReason('🔒 Full NTA CBT Mock Test Series & MathonGo Analytics is an exclusive feature of the JEE / NEET Super Batch. Upgrade to access all All-India CBT tests!')
      setShowSubModal(true)
      return
    }
    setActiveMockTest(test)
    setTestQIdx(0)
    setTestAnswers({})
    setTestReviews({})
    setTestTimer(test.durationMinutes * 60)
    setTestSubmitted(false)
    setTestAnalytics(null)
  }

  const handleSubmitTest = () => {
    if (!activeMockTest) return
    setTestSubmitted(true)
    const qs = activeMockTest.questions
    let score = 0
    let correct = 0
    let wrong = 0
    let unattempted = 0
    let silly = 0
    let conceptual = 0

    const breakdown = qs.map((q, idx) => {
      const userAns = testAnswers[q.id]
      const isAnswered = userAns !== undefined && userAns !== ''
      const isCorrect = isAnswered && String(userAns).trim().toUpperCase() === String(q.ans).trim().toUpperCase()
      
      let markDelta = 0
      if (!isAnswered) {
        unattempted++
        markDelta = 0
      } else if (isCorrect) {
        correct++
        markDelta = 4
        score += 4
      } else {
        wrong++
        markDelta = -1
        score -= 1
        if (q.type === 'NUMERICAL' || q.difficulty === 'Easy') {
          silly++
        } else {
          conceptual++
        }
      }

      return {
        ...q,
        idx: idx + 1,
        userAns: isAnswered ? userAns : 'Unattempted',
        isCorrect,
        isAnswered,
        markDelta,
        status: isCorrect ? 'correct' : !isAnswered ? 'unattempted' : 'incorrect'
      }
    })

    const totalPossibleMarks = qs.length * 4
    const accuracy = correct + wrong > 0 ? Math.round((correct / (correct + wrong)) * 100) : 0
    
    // NTA Normalization Model for Predicted AIR & Percentile
    const pctScore = Math.max(0, (score / totalPossibleMarks) * 100)
    let predictedPercentile = (82 + (pctScore * 0.178)).toFixed(2)
    if (pctScore > 85) predictedPercentile = "99.45"
    if (pctScore < 30) predictedPercentile = (55 + pctScore * 0.7).toFixed(2)
    
    const predictedRank = Math.max(340, Math.round((100 - parseFloat(predictedPercentile)) * 11500))

    const analytics = {
      score,
      totalPossibleMarks,
      correct,
      wrong,
      unattempted,
      accuracy,
      silly,
      conceptual,
      predictedPercentile,
      predictedRank,
      timeSpentSeconds: (activeMockTest.durationMinutes * 60) - testTimer,
      breakdown
    }

    setTestAnalytics(analytics)
    addXP(Math.max(30, score * 5))
  }

  // Download Question Paper with Separate Answer Sheet & Detailed Solutions PDF
  const downloadTestPaperAndAnswerSheet = (test) => {
    if (!test) return
    const qList = (test.questions || []).map((q, i) => `
      <div style="margin-bottom:14px;page-break-inside:avoid;padding-bottom:10px;border-bottom:1px dashed #e2e8f0">
        <p style="font-weight:bold;margin:0 0 6px">Q${i+1}. [${q.section}] ${q.q} <span style="font-weight:normal;color:#64748b;font-size:11px">(${q.concept || ''})</span></p>
        ${q.options && q.options.length > 0 ? `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;font-size:12px;margin-left:12px">
            ${q.options.map(opt => `<div>${opt}</div>`).join('')}
          </div>
        ` : `<div style="font-size:12px;color:#64748b;margin-left:12px;font-style:italic">[Numerical Value Type Question]</div>`}
      </div>
    `).join('')

    const answerKeyRows = (test.questions || []).map((q, i) => `
      <tr style="border-bottom:1px solid #e2e8f0">
        <td style="padding:6px 10px;text-align:center;font-weight:bold">Q${i+1}</td>
        <td style="padding:6px 10px;text-align:center">${q.section}</td>
        <td style="padding:6px 10px;text-align:center;font-weight:bold;color:#1d4ed8;background:#eff6ff">${q.ans}</td>
        <td style="padding:6px 10px;font-size:12px">${q.concept || 'General'}</td>
      </tr>
    `).join('')

    const detailedSolutions = (test.questions || []).map((q, i) => `
      <div style="margin-bottom:12px;page-break-inside:avoid;padding:8px 12px;background:#f8fafc;border-radius:6px;border-left:3px solid #2563eb">
        <p style="font-weight:bold;margin:0 0 3px;font-size:12px">Q${i+1}. Correct Answer: <span style="color:#16a34a">${q.ans}</span></p>
        <p style="margin:0;font-size:12px;color:#334155">${q.explanation || 'Direct syllabus answer.'}</p>
      </div>
    `).join('')

    const html = `<!DOCTYPE html>
    <html>
      <head>
        <title>${test.title} - Question Paper & Separate Answer Sheet</title>
        <meta charset="utf-8"/>
        <style>
          @page { size: A4; margin: 16mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0f172a; line-height: 1.5; font-size: 13px; margin: 0; padding: 12px; }
          h1 { font-size: 18px; margin: 0 0 4px; color: #1e3a8a; }
          .badge { display: inline-block; background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; }
          .meta-box { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 16px; font-size: 12px; color: #475569; }
          .page-break { page-break-before: always; break-before: page; margin-top: 24px; padding-top: 16px; border-top: 3px double #94a3b8; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
          th { background: #f1f5f9; padding: 8px 10px; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #cbd5e1; text-align: center; }
          @media print { .no-print { display: none !important; } body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="no-print" style="background:#2563eb;color:white;padding:12px;border-radius:8px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
          <div>
            <b>Study Buddy Pro</b> — Complete Test Paper with Separate Answer Sheet & Solutions PDF
          </div>
          <button onclick="window.print()" style="background:white;color:#2563eb;border:none;padding:6px 14px;border-radius:6px;font-weight:bold;cursor:pointer">
            🖨️ Print / Save as PDF
          </button>
        </div>

        <!-- SECTION 1: QUESTION PAPER -->
        <div>
          <span class="badge">${test.exam} • OFFICIAL EXAMINATION</span>
          <h1 style="margin-top:6px">${test.title}</h1>
          <div class="meta-box">
            <span>⏱ Duration: ${test.durationMinutes} Minutes</span>
            <span>📊 Total Marks: ${test.totalMarks}</span>
            <span>Marking: ${test.markingScheme}</span>
          </div>

          <div style="margin-top:16px">
            ${qList}
          </div>
        </div>

        <!-- SECTION 2: SEPARATE OFFICIAL ANSWER SHEET & SOLUTIONS -->
        <div class="page-break">
          <div style="text-align:center;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #2563eb">
            <span class="badge" style="background:#dcfce7;color:#15803d;font-size:12px;padding:3px 12px">CONFIDENTIAL OFFICIAL ANSWER KEY</span>
            <h1 style="font-size:20px;margin-top:8px;color:#0f172a">${test.title}</h1>
            <p style="margin:2px 0 0;font-size:13px;color:#64748b">Separate Official Answer Key Sheet & Step-by-Step Solutions</p>
          </div>

          <h3 style="font-size:14px;margin:16px 0 6px;text-transform:uppercase;color:#1e3a8a">Section A: Answer Key Sheet</h3>
          <table>
            <thead>
              <tr>
                <th style="width:15%">Question #</th>
                <th style="width:25%">Subject</th>
                <th style="width:25%">Official Answer Key</th>
                <th style="width:35%">Concept Tested</th>
              </tr>
            </thead>
            <tbody>
              ${answerKeyRows}
            </tbody>
          </table>

          <h3 style="font-size:14px;margin:20px 0 8px;text-transform:uppercase;color:#1e3a8a">Section B: Step-by-Step Detailed Solutions</h3>
          ${detailedSolutions}

          <div style="text-align:center;margin-top:30px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8">
            Study Buddy Pro • CBSE / JEE / NEET Examination System • All Rights Reserved
          </div>
        </div>

        <script>
          setTimeout(() => { window.print(); }, 400);
        </script>
      </body>
    </html>`

    const w = window.open('', '_blank')
    if (w) {
      w.document.write(html)
      w.document.close()
    }
  }

  // Download Answer Sheet as printable PDF (opens print dialog)
  const downloadAnswerSheet = () => {
    if (!activeMockTest || !testAnalytics) return
    const t = activeMockTest, a = testAnalytics
    const rows = a.breakdown.map((item, i) => `
      <tr style="border-bottom:1px solid #e2e8f0">
        <td style="padding:6px 8px;text-align:center;font-weight:bold">Q${i+1}</td>
        <td style="padding:6px 8px;font-size:12px">${item.q.substring(0, 80)}${item.q.length > 80 ? '...' : ''}</td>
        <td style="padding:6px 8px;text-align:center;font-weight:bold;color:#059669">${item.ans}</td>
        <td style="padding:6px 8px;text-align:center;font-weight:bold;color:${item.isCorrect ? '#059669' : item.isAnswered ? '#dc2626' : '#94a3b8'}">${item.userAns}</td>
        <td style="padding:6px 8px;text-align:center;font-weight:bold;color:${item.markDelta > 0 ? '#059669' : item.markDelta < 0 ? '#dc2626' : '#64748b'}">${item.markDelta > 0 ? '+' : ''}${item.markDelta}</td>
      </tr>`).join('')
    const explanations = a.breakdown.map((item, i) => `
      <div style="margin-bottom:12px;page-break-inside:avoid">
        <p style="font-weight:bold;margin:0 0 4px">Q${i+1}. ${item.q}</p>
        <p style="margin:0 0 2px;font-size:12px"><b>Correct Answer:</b> ${item.ans} &nbsp; | &nbsp; <b>Your Answer:</b> ${item.userAns} &nbsp; | &nbsp; <b>Marks:</b> ${item.markDelta > 0 ? '+' : ''}${item.markDelta}</p>
        <p style="margin:0;font-size:12px;color:#475569"><b>Explanation:</b> ${item.explanation}</p>
      </div>`).join('')
    const html = `<!DOCTYPE html><html><head><title>Answer Sheet - ${t.title}</title>
      <style>body{font-family:Arial,sans-serif;padding:24px;color:#1e293b;font-size:13px}
      h1{font-size:18px;margin:0 0 4px}h2{font-size:14px;margin:16px 0 8px;border-bottom:2px solid #3b82f6;padding-bottom:4px}
      table{width:100%;border-collapse:collapse;margin-bottom:16px}th{background:#f1f5f9;padding:8px;text-align:center;font-size:11px;text-transform:uppercase}
      .summary{display:flex;gap:16px;margin:12px 0}.stat{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 16px;text-align:center}
      .stat b{display:block;font-size:18px}@media print{.no-print{display:none}}</style></head><body>
      <h1>${t.title}</h1>
      <p style="color:#64748b;margin:0 0 8px">Marking: ${t.markingScheme} &nbsp;|&nbsp; Duration: ${t.durationMinutes} mins &nbsp;|&nbsp; Total: ${t.totalMarks} marks</p>
      <div class="summary">
        <div class="stat"><b>${a.score}/${a.totalPossibleMarks}</b>Score</div>
        <div class="stat"><b>${a.accuracy}%</b>Accuracy</div>
        <div class="stat"><b>✓ ${a.correct}</b>Correct</div>
        <div class="stat"><b>✗ ${a.wrong}</b>Wrong</div>
        <div class="stat"><b>— ${a.unattempted}</b>Skipped</div>
      </div>
      <h2>Answer Key</h2>
      <table><thead><tr><th>Q#</th><th>Question</th><th>Key</th><th>Your Ans</th><th>Marks</th></tr></thead><tbody>${rows}</tbody></table>
      <h2 style="page-break-before:always">Detailed Solutions</h2>${explanations}
      <p style="text-align:center;color:#94a3b8;margin-top:24px;font-size:11px">Generated by Study Buddy Pro • ${new Date().toLocaleDateString()}</p>
      <script>window.print()</script></body></html>`
    const w = window.open('', '_blank')
    if (w) { w.document.write(html); w.document.close() }
  }

  const guardPro = (fn, reason) => {
    if (isTrialExpired) {
      setSubReason(reason || 'Your 5-Day Free Trial has ended. Subscribe to Pro to continue unlimited access.')
      setShowSubModal(true)
      return false
    }
    if (fn) fn()
    return true
  }

  const btmRef = useRef(null)
  const chatRef = useRef(null)
  const name = profile?.name || 'Student'

  // Load Curriculum
  useEffect(() => {
    const subs = getSubjects(classNum)
    setSubjects(subs)
    setSubject(subs[0] || '')
  }, [classNum])

  useEffect(() => {
    if (!subject) return
    const chaps = getChapters(classNum, subject)
    setChapters(chaps)
    setChapter(chaps[0] || '')
    setDeletedTopics(getDeletedTopics(classNum, subject))
  }, [classNum, subject])

  useEffect(() => { btmRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [history])
  useEffect(() => { chatRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMsgs])

  useEffect(() => {
    try { localStorage.setItem('sb_m', JSON.stringify(mistakes)) } catch (e) {}
  }, [mistakes])
  useEffect(() => {
    try { localStorage.setItem('sb_s', JSON.stringify(stats)) } catch (e) {}
  }, [stats])
  useEffect(() => {
    try { if (profile) localStorage.setItem('sb_profile', JSON.stringify(profile)) } catch (e) {}
  }, [profile])

  // Battle timer
  useEffect(() => {
    if (!btActive || btDone) return
    if (btTimer <= 0) { setBtDone(true); return }
    const t = setTimeout(() => setBtTimer(p => p - 1), 1000)
    return () => clearTimeout(t)
  }, [btActive, btTimer, btDone])

  // Video Lesson Auto-play
  useEffect(() => {
    if (!lsPlay || lsSlides.length === 0) return
    if (lsIdx >= lsSlides.length - 1) { setLsPlay(false); return }
    const s = lsSlides[lsIdx]
    speak(s?.content || s?.title || '')
    const t = setTimeout(() => setLsIdx(p => p + 1), 7000)
    return () => clearTimeout(t)
  }, [lsPlay, lsIdx, lsSlides])

  const speak = t => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
    try {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(t)
      u.rate = 0.95
      u.lang = language === 'Hindi' ? 'hi-IN' : 'en-US'
      window.speechSynthesis.speak(u)
    } catch (e) {}
  }

  const listen = setter => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Speech recognition is supported on Chrome & Edge.'); return }
    try {
      const r = new SR()
      r.lang = language === 'Hindi' ? 'hi-IN' : 'en-US'
      r.onstart = () => setListening(true)
      r.onresult = e => setter(e.results[0][0].transcript)
      r.onend = () => setListening(false)
      r.start()
    } catch (e) {}
  }

  const addXP = (amt) => {
    setStats(p => ({
      ...p,
      xp: p.xp + amt,
      totalQ: p.totalQ + 1,
      todayQ: p.todayQ + 1,
      subjectsList: p.subjectsList.includes(subject) ? p.subjectsList : [...p.subjectsList, subject]
    }))
  }

  const handleCamCapture = async b64 => {
    setShowCam(false)
    if (!guardPro(null, 'Your 5-Day Free Trial has ended. Subscribe to Pro to snap unlimited textbook questions.')) return
    if (camTarget === 'question') {
      setLoading(true)
      addXP(15)
      try {
        const data = await apiScan({ image_base64: b64, class_num: classNum, subject, chapter, mode, language, scan_type: 'question' })
        setHistory(p => [...p, { q: '📸 Scanned Textbook Question', a: data.answer, yt: data.youtube_query }])
        setActiveTab('doubt')
      } catch {
        setHistory(p => [...p, { q: '📸 Photo Question', a: 'Could not read image clearly. Please try again.' }])
      }
      setLoading(false)
    } else {
      try {
        const data = await apiScan({ image_base64: b64, class_num: classNum, subject, chapter, scan_type: 'answer' })
        camTarget === 'ckQ' ? setCkQ(data.answer) : setCkA(data.answer)
        setActiveTab('doubt')
      } catch {}
    }
  }

  const handleAsk = async () => {
    if (!guardPro(null, 'Your 5-Day Free Trial has ended. Subscribe to Pro to ask unlimited doubts 24/7.')) return
    if (!q.trim()) return
    const qq = q
    setLoading(true)
    setQ('')
    addXP(10)
    try {
      const data = await apiAsk({ question: qq, class_num: classNum, subject, chapter, mode, language })
      setHistory(p => [...p, { q: qq, a: data.answer, yt: data.youtube_query }])
    } catch {
      setHistory(p => [...p, { q: qq, a: 'Connection error. Please try again.' }])
    }
    setLoading(false)
  }

  const handleSendChat = async () => {
    if (!guardPro(null, 'Your 5-Day Free Trial has ended. Subscribe to Pro for interactive AI tutor conversations.')) return
    if (!chatIn.trim()) return
    const msg = chatIn
    setChatIn('')
    setChatLoad(true)
    addXP(5)
    const n = [...chatMsgs, { role: 'user', text: msg }]
    setChatMsgs(n)
    try {
      const data = await apiChat({ messages: n, class_num: classNum, subject, chapter, language })
      setChatMsgs([...n, { role: 'ai', text: data.answer }])
    } catch {
      setChatMsgs([...n, { role: 'ai', text: 'Sorry, I could not generate a response. Please try again.' }])
    }
    setChatLoad(false)
  }

  const handleCheckAnswer = async () => {
    if (!guardPro(null, 'Your 5-Day Free Trial has ended. Subscribe to Pro for CBSE Board Examiner Answer Evaluation.')) return
    if (!ckQ.trim() || !ckA.trim()) return
    setCkLoad(true)
    setCkRes(null)
    addXP(20)
    try {
      const data = await apiCheckAnswer({ question: ckQ, student_answer: ckA, class_num: classNum, subject, chapter, language })
      setCkRes(data)
      const scoreMatch = data.analysis.match(/Score:\s*(\d+)/i)
      if (scoreMatch && parseInt(scoreMatch[1]) < 8) {
        setMistakes(p => [{
          id: Date.now(),
          question: ckQ,
          studentAnswer: ckA,
          analysis: data.analysis,
          subject,
          chapter,
          score: scoreMatch[1],
          date: new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        }, ...p])
      }
    } catch {
      setCkRes({ analysis: 'Could not evaluate answer. Please try again.' })
    }
    setCkLoad(false)
  }

  const handleStartBattle = async () => {
    if (!guardPro(null, 'Your 5-Day Free Trial has ended. Subscribe to Pro to unlock unlimited speed quiz battles.')) return
    setBtLoad(true)
    setBtDone(false)
    setBtScore(0)
    setBtIdx(0)
    setBtTimer(60)
    setBtQs([])
    try {
      const data = await apiAsk({ question: `Generate 5 quick multiple choice questions on ${chapter}`, class_num: classNum, subject, chapter, mode: 'quiz', language })
      const lines = (data?.answer || '').split('\n').filter(l => l.trim())
      const qs = []
      let cur = null
      for (const l of lines) {
        if (l.match(/^Q\d?[:.]/i)) {
          cur = { q: l.replace(/^Q\d?[:.]\s*/i, ''), opts: [], ans: 'A' }
          qs.push(cur)
        } else if (cur && l.match(/^[A-D]\)/)) {
          cur.opts.push(l)
        } else if (cur && l.match(/^Answer/i)) {
          cur.ans = l.match(/[A-D]/)?.[0] || 'A'
        }
      }
      if (qs.length >= 3) {
        setBtQs(qs)
        setBtActive(true)
      } else {
        const fallbackQs = getChapterBattleQuestions(classNum, subject, chapter)
        setBtQs(fallbackQs)
        setBtActive(true)
      }
    } catch {
      const fallbackQs = getChapterBattleQuestions(classNum, subject, chapter)
      setBtQs(fallbackQs)
      setBtActive(true)
    }
    setBtLoad(false)
  }

  const handleAnswerBattle = (chosenLetter) => {
    const isCorrect = btQs[btIdx]?.ans === chosenLetter
    if (isCorrect) setBtScore(p => p + 1)
    if (btIdx + 1 >= btQs.length) {
      setBtDone(true)
      addXP(btScore * 10 + 20)
    } else {
      setBtIdx(p => p + 1)
    }
  }

  const handleGenLesson = async () => {
    if (!guardPro(null, 'Your 5-Day Free Trial has ended. Subscribe to Pro to unlock AI animated video lessons.')) return
    setLsLoad(true)
    setLsSlides([])
    setLsIdx(0)
    setLsPlay(false)
    try {
      const data = await apiGenerateLesson({ class_num: classNum, subject, chapter, topic: lsTopic || chapter, language })
      if (data.slides?.length > 0) {
        setLsSlides(data.slides)
        addXP(15)
      } else {
        alert('Could not build lesson slides. Please retry.')
      }
    } catch {
      alert('Error generating lesson.')
    }
    setLsLoad(false)
  }

  const handleGenPlan = async (overrideChapter) => {
    if (isTrialExpired) {
      setSubReason('Your 5-Day Free Trial has ended. Subscribe to Pro to generate personalized 45-min daily CBSE study routines.')
      setShowSubModal(true)
      return
    }
    setPlanLoad(true)
    const targetChapter = overrideChapter || chapter || chapters[0] || 'Core CBSE Chapters'
    const targetSubject = subject || subjects[0] || 'Mathematics'
    try {
      const data = await apiGeneratePlan({
        class_num: classNum,
        subject: targetSubject,
        chapter: targetChapter,
        student_name: name,
        weak_topics: mistakes.map(m => `${m.subject}: ${m.chapter}`).slice(0, 4),
        mistakes_count: mistakes.length,
        streak: stats.streak,
        language
      })
      if (data && data.plan) {
        setPlan(data.plan)
        setPlanTasks({})
      }
    } catch (e) {
      console.warn("Plan generation handled gracefully:", e)
    }
    setPlanLoad(false)
  }

  // Auto-generate plan when user enters Routine tab
  useEffect(() => {
    if (activeTab === 'plan' && !plan && !planLoad && !isTrialExpired) {
      handleGenPlan()
    }
  }, [activeTab, chapter, isTrialExpired])

  const shareParentWhatsApp = () => {
    const text = `📊 *Study Buddy - ${name}'s CBSE Learning Report* 🎓
• Class: ${classNum} CBSE
• Study Streak: ${stats.streak} Days 🔥
• Questions Mastered: ${stats.totalQ}
• Accuracy: ${Math.min(95, Math.round((stats.totalQ / (stats.totalQ + mistakes.length || 1)) * 100))}%
• Weak Areas: ${mistakes.length ? mistakes.slice(0, 2).map(m => m.subject).join(', ') : 'None! Doing great!'}
Report verified by Study Buddy AI.`
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank')
  }

  if (!profile) return <Onboarding onComplete={p => { setProfile(p); setClassNum(p.classNum) }} />

  // Subject icon mappings
  const subjectIcons = {
    'Mathematics': '📐',
    'Science': '🔬',
    'Social Science': '🌍',
    'English': '📖',
    'Physics': '⚡',
    'Chemistry': '🧪',
    'Biology': '🧬'
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex justify-center selection:bg-blue-100">
      {showCam && <CameraModal onCapture={handleCamCapture} onClose={() => setShowCam(false)} />}
      
      {/* ── SUBSCRIPTION / PAYWALL MODAL (5-Day Trial Funnel) ── */}
      <SubscriptionModal
        isOpen={showSubModal}
        onClose={() => setShowSubModal(false)}
        subscription={subscription}
        daysRemaining={daysRemaining}
        isTrialExpired={isTrialExpired}
        reason={subReason}
        onSubscribe={handleSubscribe}
        onSimulateState={handleSimulateState}
      />

      {/* Mobile App Device Shell (clean Allen app interface) */}
      <div className="w-full max-w-md bg-[#F8FAFC] min-h-screen flex flex-col shadow-2xl relative border-x border-slate-200">
        
        {/* ── TOP APP BAR (Hidden during full CBT exam) ── */}
        {!activeMockTest && (
          <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 pt-3 pb-3 shadow-xs">
            <div className="flex items-center justify-between">
              {/* Left: Avatar + Greeting */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs shadow-xs">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 leading-none">Hi, {name}</span>
                    <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded-md border border-blue-200/60">
                      Class {classNum}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium mt-0.5">CBSE 2026-27</p>
                </div>
              </div>

              {/* Right: VIP Badge + Streak + Language Toggle */}
              <div className="flex items-center gap-1.5">
                {subscription?.isPro ? (
                  <button
                    onClick={() => { setSubReason(''); setShowSubModal(true) }}
                    className="flex items-center gap-1 bg-amber-400 text-slate-900 px-2 py-1 rounded-lg text-[10px] font-black shadow-xs btn-press"
                    title="Study Buddy PRO Active"
                  >
                    <span>👑</span>
                    <span>PRO</span>
                  </button>
                ) : isTrialExpired ? (
                  <button
                    onClick={() => { setSubReason('Your 5-Day Free Trial has ended. Subscribe to Pro to continue unlimited access.'); setShowSubModal(true) }}
                    className="flex items-center gap-1 bg-rose-600 text-white px-2 py-1 rounded-lg text-[10px] font-black animate-pulse shadow-xs btn-press"
                    title="5-Day Trial Expired • Tap to Unlock"
                  >
                    <span>🔒</span>
                    <span>Expired</span>
                  </button>
                ) : (
                  <button
                    onClick={() => { setSubReason(''); setShowSubModal(true) }}
                    className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-lg text-[10px] font-bold btn-press"
                    title="5-Day Free Trial Active"
                  >
                    <span>👑</span>
                    <span>{daysRemaining}d Left</span>
                  </button>
                )}

                <div className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-lg text-[11px] font-bold">
                  <span>🔥</span>
                  <span>{stats.streak}d</span>
                </div>
                <select
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  className="text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 rounded-lg px-1.5 py-1 outline-none"
                >
                  <option value="English">EN</option>
                  <option value="Hindi">हिंदी</option>
                  <option value="Hinglish">Hinglish</option>
                </select>
              </div>
            </div>

            {/* Subject Pills */}
            <div className="flex gap-1.5 overflow-x-auto mt-2.5 pb-1 no-scrollbar">
              {subjects.map(s => (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all btn-press ${subject === s ? 'bg-blue-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200'}`}
                >
                  <span>{subjectIcons[s] || '📚'}</span>
                  <span>{s}</span>
                </button>
              ))}
            </div>

            {/* Active Chapter Selector — Plain, Simple with Clear Upper Margin */}
            <div className="mt-3 pt-2.5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-1 text-[11px] text-slate-500 font-medium">
                <span>Current Chapter</span>
                {deletedTopics.length > 0 && (
                  <button
                    onClick={() => setShowDel(!showDel)}
                    className="text-[10px] font-bold text-rose-600 hover:text-rose-700"
                  >
                    🚫 {deletedTopics.length} Deleted {showDel ? '▲' : '▼'}
                  </button>
                )}
              </div>
              <select
                value={chapter}
                onChange={e => setChapter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium rounded-xl px-3 py-2 outline-none focus:border-blue-500 transition-all truncate"
              >
                {chapters.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {showDel && deletedTopics.length > 0 && (
              <div className="mt-2 p-2 bg-rose-50 border border-rose-200/70 rounded-xl text-[10px] text-rose-800 animate-slide-up">
                <p className="font-bold mb-1">CBSE 2026-27 Deleted Topics (Do not study for boards):</p>
                <div className="space-y-0.5">
                  {deletedTopics.map((t, i) => <p key={i}>• {t}</p>)}
                </div>
              </div>
            )}
          </header>
        )}

        {/* ── TAB CONTENT ── */}
        <main className="flex-1 p-4 pb-28 overflow-y-auto">

          {/* ════ TAB 1: 🏠 HOME (Allen App Dashboard) ════ */}
          {activeTab === 'home' && (
            <div className="space-y-4 animate-slide-up">
              
              {/* 5-Day Free Trial Status Banner */}
              {isTrialExpired ? (
                <div className="allen-card p-4 border-2 border-rose-300 bg-gradient-to-br from-rose-50 via-amber-50 to-orange-50 shadow-md">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center text-xl shrink-0 shadow-sm">
                      🔒
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-rose-200 text-rose-800 px-2 py-0.5 rounded-full border border-rose-300">
                          5-Day Free Trial Ended
                        </span>
                        <span className="text-[11px] font-black text-rose-600">Save {stats.streak}d Streak 🔥</span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 leading-snug">
                        Unlock Unlimited AI Doubts & Examiner Reviews
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        CBSE Board exams are nearing. Don't break your study habit. Get 24/7 AI tutor access for <b>less than ₹4.5/day (₹399 / 3 months)</b>.
                      </p>
                      <button
                        onClick={() => { setSubReason('Unlock 100% features with Study Buddy Pro'); setShowSubModal(true) }}
                        className="mt-3 w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white text-xs font-black shadow-md btn-press flex items-center justify-center gap-1.5"
                      >
                        <span>👑 Unlock Study Buddy Pro (70% OFF)</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : !subscription?.isPro ? (
                <div className="allen-card p-3 border-amber-200 bg-gradient-to-r from-amber-50/90 to-yellow-50/90 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center text-base font-black shadow-xs">
                      🎁
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-900">
                        5-Day Free Pass: <span className="text-amber-700 font-extrabold">{daysRemaining} Day(s) Left</span>
                      </p>
                      <p className="text-[10px] text-slate-600 font-medium">
                        Lock in 70% Early Bird CBSE Board Pass (₹133/mo)
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setSubReason(''); setShowSubModal(true) }}
                    className="text-[11px] font-black bg-amber-600 text-white px-2.5 py-1.5 rounded-xl shadow-xs btn-press"
                  >
                    Upgrade
                  </button>
                </div>
              ) : null}

              {/* Daily Target Progress Banner */}
              <div className="allen-card-gradient p-4 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-bold tracking-wide uppercase opacity-90">Daily Board Target</span>
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-extrabold">{stats.todayQ}/5 Solved</span>
                  </div>
                  <h3 className="text-lg font-black leading-tight mb-2">Keep your streak alive!</h3>
                  <div className="w-full bg-black/20 rounded-full h-2 overflow-hidden mb-3">
                    <div className="bg-amber-400 h-full rounded-full transition-all" style={{ width: `${Math.min(100, (stats.todayQ / 5) * 100)}%` }} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] opacity-80">⚡ {stats.xp} Total XP Earned</span>
                    <button
                      onClick={() => guardPro(() => setActiveTab('plan'), 'Unlock 45-Min Daily Study Schedules with Pro.')}
                      className="text-xs bg-white text-blue-700 font-bold px-3 py-1.5 rounded-xl shadow-xs btn-press"
                    >
                      Today's Routine →
                    </button>
                  </div>
                </div>
              </div>

              {/* Quick Actions Grid (4 Allen-style Action Buttons) */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Quick AI Tools</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => guardPro(() => { setCamTarget('question'); setShowCam(true) }, 'Unlock Unlimited Camera Doubt Solving with Pro.')}
                    className="allen-card p-3.5 text-left border-blue-100 hover:border-blue-400 transition-all btn-press flex items-start gap-3"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0">📸</div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Snap Doubt</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Photo of textbook Q</p>
                    </div>
                  </button>

                  <button
                    onClick={() => guardPro(() => setActiveTab('battle'), 'Unlock 60s Speed Quiz Battles with Pro.')}
                    className="allen-card p-3.5 text-left border-amber-100 hover:border-amber-400 transition-all btn-press flex items-start gap-3"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl shrink-0">⚔️</div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Quiz Battle</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">60s speed test</p>
                    </div>
                  </button>

                  <button
                    onClick={() => guardPro(() => setActiveTab('doubt'), 'Unlock CBSE Examiner Answer Evaluation with Pro.')}
                    className="allen-card p-3.5 text-left border-emerald-100 hover:border-emerald-400 transition-all btn-press flex items-start gap-3"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0">📝</div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Check Answer</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Find lost board marks</p>
                    </div>
                  </button>

                  <button
                    onClick={() => guardPro(() => { setActiveTab('battle'); setLsTopic(chapter) }, 'Unlock AI Animated Video Lessons with Pro.')}
                    className="allen-card p-3.5 text-left border-purple-100 hover:border-purple-400 transition-all btn-press flex items-start gap-3"
                  >
                    <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl shrink-0">🎬</div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Video Lesson</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">AI animated slides</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Active Chapter Card */}
              <div className="allen-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wide">Current Topic</span>
                  <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md">{subject}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mb-1">{chapter}</h4>
                <p className="text-xs text-slate-500 mb-3">Ask any doubt or practice step-by-step questions on this chapter.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setQ(`Explain the most important board exam concept of ${chapter}`); setActiveTab('doubt') }}
                    className="flex-1 py-2 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs btn-press"
                  >
                    💡 Core Concepts
                  </button>
                  <button
                    onClick={() => { setQ(`Give 3 high-mark exam questions with solutions on ${chapter}`); setActiveTab('doubt') }}
                    className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs btn-press shadow-xs"
                  >
                    🎯 Exam Questions
                  </button>
                </div>
              </div>

              {/* Weak Concepts Card (Mistakes tracker) */}
              {mistakes.length > 0 && (
                <div className="allen-card p-4 border-rose-200 bg-rose-50/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-rose-700">⚠️ {mistakes.length} Weak Area(s) Detected</span>
                    <button onClick={() => setActiveTab('report')} className="text-[11px] text-rose-600 font-bold">View all →</button>
                  </div>
                  <p className="text-xs text-slate-700 mb-2">
                    Latest error: <b>{mistakes[0].subject}</b> ({mistakes[0].chapter})
                  </p>
                  <button
                    onClick={() => { setQ(mistakes[0].question); setMode('step-by-step'); setActiveTab('doubt') }}
                    className="w-full py-2 rounded-xl bg-rose-600 text-white font-bold text-xs btn-press shadow-xs"
                  >
                    🔄 Re-Practice Weak Question
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ════ TAB 2: 📅 PLAN (45-Min Routine) ════ */}
          {activeTab === 'plan' && (
            <div className="space-y-3.5 animate-slide-up">
              <div className="flex justify-between items-center mb-1">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">45-Minute Daily Plan</h3>
                  <p className="text-xs text-slate-500">Personalized for {name} ({chapter})</p>
                </div>
                <button onClick={() => isTrialExpired ? setShowSubModal(true) : handleGenPlan()} disabled={planLoad} className="text-xs bg-blue-50 text-blue-700 font-bold px-3 py-1.5 rounded-xl border border-blue-200 btn-press">
                  {planLoad ? 'Generating...' : '🔄 Refresh'}
                </button>
              </div>

              {isTrialExpired ? (
                <div className="allen-card p-6 text-center border-2 border-rose-200 bg-rose-50/40 space-y-3">
                  <div className="w-14 h-14 mx-auto rounded-3xl bg-rose-600 text-white flex items-center justify-center text-2xl shadow-md">
                    🔒
                  </div>
                  <h4 className="text-sm font-black text-slate-900">45-Minute Daily Routine Locked</h4>
                  <p className="text-xs text-slate-600 max-w-xs mx-auto">
                    Your 5-Day Free Trial has ended. Subscribe to Study Buddy Pro to generate daily adaptive timetables and maintain your <b>{stats.streak}-day streak</b>!
                  </p>
                  <button
                    onClick={() => { setSubReason('Unlock unlimited 45-min daily study plans with Pro'); setShowSubModal(true) }}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white text-xs font-black shadow-lg shadow-blue-500/25 btn-press"
                  >
                    👑 Unlock Pro Pass for ₹4.4/day (70% OFF)
                  </button>
                </div>
              ) : !plan ? (
                <div className="allen-card p-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-2xl mx-auto mb-3">📅</div>
                  <h4 className="text-sm font-bold text-slate-900 mb-1">Build Today's Routine</h4>
                  <p className="text-xs text-slate-500 mb-4">AI will scan your weak topics and build a focused 45-min study plan for CBSE success.</p>
                  <button onClick={handleGenPlan} disabled={planLoad} className="w-full py-3 rounded-2xl bg-blue-600 text-white text-xs font-bold btn-press shadow-md shadow-blue-500/20">
                    {planLoad ? 'Analyzing your progress...' : '⚡ Generate My Plan'}
                  </button>
                </div>
              ) : (
                <>
                  <div className="allen-card p-3.5 bg-blue-50/70 border-blue-200">
                    <p className="text-xs text-blue-900 font-medium">{plan.greeting}</p>
                    <p className="text-[11px] text-blue-700 font-bold mt-1">🎯 Focus: {plan.focus_topic}</p>
                  </div>

                  <div className="space-y-2">
                    {plan.tasks?.map((t, i) => (
                      <div
                        key={i}
                        onClick={() => setPlanTasks(p => ({ ...p, [i]: !p[i] }))}
                        className={`allen-card p-3 flex items-start gap-3 cursor-pointer transition-all btn-press ${planTasks[i] ? 'bg-slate-50 opacity-50 border-slate-200' : 'hover:border-blue-300'}`}
                      >
                        <div className={`w-5 h-5 rounded-lg border flex items-center justify-center text-xs font-bold mt-0.5 ${planTasks[i] ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'}`}>
                          {planTasks[i] && '✓'}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-0.5">
                            <span className="text-xs font-bold text-slate-900">{t.task}</span>
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded">{t.time}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 capitalize">{t.type} session</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="allen-card p-3 bg-amber-50/70 border-amber-200">
                    <p className="text-xs text-amber-900 font-medium">💡 <b>Daily Tip:</b> {plan.tip}</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ════ TAB 3: 📸 DOUBT AI & CHECK ANSWER ════ */}
          {activeTab === 'doubt' && (
            <div className="space-y-3 animate-slide-up">
              {/* Mode Switcher */}
              <div className="grid grid-cols-4 gap-1.5 bg-slate-200/80 p-1 rounded-2xl">
                {[
                  { id: 'explain', l: '💡 Explain' },
                  { id: 'step-by-step', l: '📝 Steps' },
                  { id: 'exam-prep', l: '🎯 Exam' },
                  { id: 'quiz', l: '❓ Quiz' }
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`py-1.5 rounded-xl text-xs font-bold transition-all ${mode === m.id ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'}`}
                  >
                    {m.l}
                  </button>
                ))}
              </div>

              {/* Doubt Input Box */}
              <div className="allen-card p-3.5 shadow-sm">
                <div className="relative mb-2.5">
                  <textarea
                    value={q}
                    onChange={e => setQ(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk() } }}
                    placeholder="Type doubt, speak 🎤, or snap photo 📸..."
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 outline-none focus:bg-white focus:border-blue-500 pr-16"
                  />
                  <div className="absolute right-2 top-2 flex items-center gap-1">
                    <button
                      onClick={() => { setCamTarget('question'); setShowCam(true) }}
                      className="p-1 rounded-lg text-slate-400 hover:text-blue-600 text-sm"
                      title="Camera"
                    >
                      📸
                    </button>
                    <button
                      onClick={() => listen(setQ)}
                      className={`p-1 rounded-lg text-sm ${listening ? 'text-rose-600 animate-pulse' : 'text-slate-400 hover:text-blue-600'}`}
                      title="Voice Input"
                    >
                      🎤
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleAsk}
                    disabled={loading || !q.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold btn-press shadow-xs disabled:opacity-40"
                  >
                    {loading ? 'AI Solving...' : 'Ask Doubt →'}
                  </button>
                  <button
                    onClick={() => { setCamTarget('question'); setShowCam(true) }}
                    className="py-2.5 px-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs btn-press"
                  >
                    Scan Textbook
                  </button>
                </div>
              </div>

              {/* Section: Diagnostic Answer Checker Accordion */}
              <div className="allen-card p-3.5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-slate-900">📝 Check Written Answer (Find Lost Marks)</span>
                </div>
                <div className="space-y-2 mb-2">
                  <input
                    value={ckQ}
                    onChange={e => setCkQ(e.target.value)}
                    placeholder="Paste Question (or scan)..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                  <textarea
                    value={ckA}
                    onChange={e => setCkA(e.target.value)}
                    placeholder="Paste or write your answer here..."
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCheckAnswer}
                    disabled={ckLoad || !ckQ.trim() || !ckA.trim()}
                    className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold btn-press shadow-xs disabled:opacity-40"
                  >
                    {ckLoad ? 'Evaluating like CBSE Examiner...' : 'Evaluate My Answer'}
                  </button>
                  <button
                    onClick={() => { setCamTarget('ckA'); setShowCam(true) }}
                    className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold btn-press"
                  >
                    📸 Scan Sheet
                  </button>
                </div>
                {ckRes && (
                  <div className="mt-3 p-3 bg-emerald-50/60 border border-emerald-200 rounded-2xl animate-slide-up">
                    <Md text={ckRes.analysis} />
                  </div>
                )}
              </div>

              {/* Solutions / History Feed */}
              <div className="space-y-3">
                {history.map((h, i) => (
                  <div key={i} className="allen-card p-3.5 shadow-xs space-y-2 animate-slide-up">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-[11px] font-bold text-blue-700">Q: {h.q}</span>
                      <button onClick={() => speak(h.a)} className="text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 font-bold">🔊 Read</button>
                    </div>
                    <Md text={h.a} />
                    {h.yt && (
                      <button
                        onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(h.yt)}`, '_blank')}
                        className="w-full mt-2 py-1.5 rounded-xl bg-rose-50 text-rose-700 font-bold text-xs flex items-center justify-center gap-1.5 border border-rose-200 btn-press"
                      >
                        <span>▶</span> <span>Watch Video Explanation on YouTube</span>
                      </button>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="allen-card p-4 text-center">
                    <span className="text-xs text-blue-600 font-bold animate-pulse">⏳ Tutor is preparing explanation...</span>
                  </div>
                )}
                <div ref={btmRef} />
              </div>
            </div>
          )}

          {/* ════ TAB 4: ⚔️ NTA MOCK TESTS & PRACTICE (ALLEN & MATHONGO STYLE) ════ */}
          {activeTab === 'battle' && (
            <div className="space-y-3.5 animate-slide-up">

              {/* ── 1. ACTIVE CBT TEST SIMULATOR ── */}
              {activeMockTest && !testSubmitted && (
                <div className="space-y-3 animate-slide-up">
                  {/* CBT Exam Header */}
                  <div className="allen-card p-3.5 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white shadow-md">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded-full">
                        {activeMockTest.exam} CBT SIMULATOR
                      </span>
                      <span className="text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-400/30 px-2 py-0.5 rounded-full animate-pulse">
                        ⏱️ {Math.floor(testTimer / 60)}m {testTimer % 60 < 10 ? '0' : ''}{testTimer % 60}s
                      </span>
                    </div>
                    <h3 className="text-xs font-bold text-white truncate">{activeMockTest.title}</h3>
                    <p className="text-[10px] text-slate-300 mt-0.5">Marking: {activeMockTest.markingScheme}</p>
                  </div>

                  {/* Section Switcher */}
                  <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                    {activeMockTest.sections.map(sec => (
                      <span key={sec} className="px-3 py-1 rounded-xl text-xs font-bold bg-white border border-slate-200 text-slate-700 shadow-xs">
                        {sec}
                      </span>
                    ))}
                  </div>

                  {/* Question Box */}
                  {(() => {
                    const q = activeMockTest.questions[testQIdx] || activeMockTest.questions[0]
                    const currentAns = testAnswers[q.id]
                    const isMarkedReview = testReviews[q.id]

                    return (
                      <div className="allen-card p-4 border-slate-200 shadow-sm space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                          <div>
                            <span className="text-xs font-black text-blue-700">Question {testQIdx + 1} of {activeMockTest.questions.length}</span>
                            <span className="text-[10px] text-slate-500 ml-2 font-medium">({q.section})</span>
                          </div>
                          <span className="text-[10px] font-extrabold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
                            {q.type} • +4 / -1
                          </span>
                        </div>

                        <p className="text-xs font-bold text-slate-900 leading-relaxed">{q.q}</p>

                        {/* Options / Input */}
                        {q.type === 'MCQ' ? (
                          <div className="space-y-2 pt-1">
                            {q.options.map((opt, i) => {
                              const letter = opt.match(/^([A-D])\)/)?.[1] || ''
                              const isSelected = currentAns === letter
                              return (
                                <button
                                  key={i}
                                  onClick={() => setTestAnswers(p => ({ ...p, [q.id]: letter }))}
                                  className={`w-full p-3 rounded-xl border text-xs font-medium text-left transition-all btn-press flex items-center justify-between ${
                                    isSelected 
                                      ? 'border-blue-600 bg-blue-50/80 text-blue-900 font-bold shadow-xs' 
                                      : 'border-slate-200 bg-slate-50/60 text-slate-800 hover:border-slate-300'
                                  }`}
                                >
                                  <span>{opt}</span>
                                  <span className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                                    isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                                  }`}>
                                    {isSelected ? '✓' : ''}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="pt-2">
                            <label className="text-[11px] font-bold text-slate-600 mb-1 block">Enter Numerical Value (Integer / Decimals):</label>
                            <input
                              type="text"
                              value={currentAns || ''}
                              onChange={e => setTestAnswers(p => ({ ...p, [q.id]: e.target.value }))}
                              placeholder="e.g. 25"
                              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 text-sm font-bold text-slate-900 outline-none focus:border-blue-600 focus:bg-white"
                            />
                          </div>
                        )}

                        {/* Question Action Buttons */}
                        <div className="flex gap-2 pt-2 border-t border-slate-100">
                          <button
                            onClick={() => setTestReviews(p => ({ ...p, [q.id]: !p[q.id] }))}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                              isMarkedReview ? 'bg-purple-100 border-purple-300 text-purple-800' : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            {isMarkedReview ? '★ Marked' : '☆ Mark Review'}
                          </button>
                          <button
                            onClick={() => setTestAnswers(p => { const copy = { ...p }; delete copy[q.id]; return copy })}
                            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-xs font-bold"
                          >
                            Clear
                          </button>
                        </div>

                        {/* Question Navigation */}
                        <div className="flex justify-between items-center pt-2">
                          <button
                            onClick={() => setTestQIdx(p => Math.max(0, p - 1))}
                            disabled={testQIdx === 0}
                            className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold disabled:opacity-30"
                          >
                            ← Previous
                          </button>
                          <button
                            onClick={() => {
                              if (testQIdx + 1 < activeMockTest.questions.length) {
                                setTestQIdx(p => p + 1)
                              } else {
                                if (confirm('Submit this test and generate your MathonGo All-India Scorecard?')) {
                                  handleSubmitTest()
                                }
                              }
                            }}
                            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-black shadow-xs btn-press"
                          >
                            {testQIdx + 1 < activeMockTest.questions.length ? 'Save & Next →' : 'Submit Test 🚀'}
                          </button>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Question Palette (like NTA / Allen CBT) */}
                  <div className="allen-card p-3.5 bg-slate-50 border-slate-200">
                    <p className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-2">Question Palette</p>
                    <div className="grid grid-cols-5 gap-2">
                      {activeMockTest.questions.map((q, idx) => {
                        const isAns = testAnswers[q.id] !== undefined && testAnswers[q.id] !== ''
                        const isRev = testReviews[q.id]
                        const isCur = testQIdx === idx

                        let badgeColor = 'bg-white text-slate-700 border-slate-300'
                        if (isRev) badgeColor = 'bg-purple-600 text-white border-purple-600 font-bold'
                        else if (isAns) badgeColor = 'bg-emerald-600 text-white border-emerald-600 font-bold'
                        else if (testQIdx > idx) badgeColor = 'bg-rose-100 text-rose-700 border-rose-300'

                        return (
                          <button
                            key={q.id}
                            onClick={() => setTestQIdx(idx)}
                            className={`py-2 rounded-xl text-xs font-bold border transition-all ${badgeColor} ${isCur ? 'ring-2 ring-blue-600 ring-offset-1' : ''}`}
                          >
                            {idx + 1}
                          </button>
                        )
                      })}
                    </div>

                    <button
                      onClick={() => {
                        if (confirm('Are you ready to submit your exam?')) handleSubmitTest()
                      }}
                      className="mt-3 w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-black shadow-sm btn-press"
                    >
                      Submit Exam Now 📊
                    </button>
                  </div>
                </div>
              )}

              {/* ── 2. MATHONGO / ALLEN POST-TEST PERFORMANCE SCORECARD ── */}
              {activeMockTest && testSubmitted && testAnalytics && (
                <div className="space-y-3.5 animate-slide-up">
                  {/* Executive Score & AIR Banner */}
                  <div className="allen-card-gradient p-4 relative overflow-hidden shadow-lg">
                    <div className="relative z-10">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                          {activeMockTest.exam} OFFICIAL SCORECARD
                        </span>
                        <span className="text-xs font-extrabold bg-amber-400 text-slate-900 px-2.5 py-0.5 rounded-full">
                          🎯 {testAnalytics.predictedPercentile} %ile
                        </span>
                      </div>

                      <div className="my-2">
                        <p className="text-xs opacity-80">Predicted All-India Rank (AIR)</p>
                        <h2 className="text-2xl font-black text-white">AIR {testAnalytics.predictedRank.toLocaleString()}</h2>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-black/20 p-2.5 rounded-xl text-center text-xs mt-2">
                        <div>
                          <p className="text-[10px] opacity-75">Score</p>
                          <p className="font-black text-base">{testAnalytics.score} / {testAnalytics.totalPossibleMarks}</p>
                        </div>
                        <div>
                          <p className="text-[10px] opacity-75">Accuracy</p>
                          <p className="font-black text-base text-emerald-300">{testAnalytics.accuracy}%</p>
                        </div>
                        <div>
                          <p className="text-[10px] opacity-75">Avg Time</p>
                          <p className="font-black text-base text-amber-300">
                            {Math.round(testAnalytics.timeSpentSeconds / (activeMockTest.questions.length || 1))}s / Q
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* MathonGo Mistake Classifier */}
                  <div className="allen-card p-4 border-slate-200">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2.5">
                      MathonGo Error Breakdown
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <p className="text-emerald-800 font-extrabold">🟢 Correct (+4)</p>
                        <p className="text-lg font-black text-emerald-700 mt-1">{testAnalytics.correct} Qs</p>
                        <p className="text-[10px] text-emerald-600">+{testAnalytics.correct * 4} Marks gained</p>
                      </div>
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-amber-800 font-extrabold">🟡 Silly Mistakes (-1)</p>
                        <p className="text-lg font-black text-amber-700 mt-1">{testAnalytics.silly} Qs</p>
                        <p className="text-[10px] text-amber-600">Calculation errors</p>
                      </div>
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl">
                        <p className="text-rose-800 font-extrabold">🔴 Conceptual Gaps (-1)</p>
                        <p className="text-lg font-black text-rose-700 mt-1">{testAnalytics.conceptual} Qs</p>
                        <p className="text-[10px] text-rose-600">Re-read NCERT theory</p>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <p className="text-slate-700 font-extrabold">⚪ Unattempted</p>
                        <p className="text-lg font-black text-slate-800 mt-1">{testAnalytics.unattempted} Qs</p>
                        <p className="text-[10px] text-slate-500">Zero penalty (0)</p>
                      </div>
                    </div>
                  </div>

                  {/* Question-by-Question Solution Review */}
                  <div className="space-y-2">
                    <p className="text-xs font-black text-slate-600 uppercase tracking-wider">Detailed Solutions & Lost Marks</p>
                    {testAnalytics.breakdown.map((item, idx) => (
                      <div key={item.id} className="allen-card p-3.5 border-slate-200 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                            item.status === 'correct' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : item.status === 'incorrect' 
                              ? 'bg-rose-100 text-rose-800' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            Q{idx + 1} • {item.status.toUpperCase()} ({item.markDelta > 0 ? `+${item.markDelta}` : item.markDelta})
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold">{item.concept}</span>
                        </div>

                        <p className="text-xs font-bold text-slate-900">{item.q}</p>

                        <div className="p-2.5 bg-slate-50 rounded-xl text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Your Answer:</span>
                            <span className={`font-bold ${item.isCorrect ? 'text-emerald-700' : 'text-rose-700'}`}>{item.userAns}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Official Correct Answer:</span>
                            <span className="font-bold text-emerald-700">{item.ans}</span>
                          </div>
                        </div>

                        <details className="text-xs text-slate-600">
                          <summary className="cursor-pointer font-bold text-blue-600">View Step-by-Step Explanation</summary>
                          <div className="mt-1.5 p-2 bg-blue-50/60 rounded-xl text-slate-800 leading-relaxed">
                            <p>{item.explanation}</p>
                          </div>
                        </details>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={downloadAnswerSheet}
                      className="flex-1 py-3 rounded-2xl bg-white text-blue-700 text-xs font-bold border border-blue-200 btn-press"
                    >
                      📄 Answer Sheet PDF
                    </button>
                    <button
                      onClick={() => { setActiveMockTest(null); setTestSubmitted(false); setTestAnalytics(null) }}
                      className="flex-1 py-3 rounded-2xl bg-blue-600 text-white text-xs font-bold shadow-md btn-press"
                    >
                      ← Back to Tests
                    </button>
                  </div>
                </div>
              )}

              {/* ── 3. TEST CATALOG, WEIGHTAGE & SPEED BATTLE (When No Test Active) ── */}
              {!activeMockTest && (
                <>
                  {/* Top 3-Way Navigation */}
                  <div className="grid grid-cols-3 gap-1.5 bg-slate-200/80 p-1 rounded-2xl">
                    <button
                      onClick={() => setPracticeSubTab('tests')}
                      className={`py-2 rounded-xl text-xs font-extrabold transition-all btn-press ${
                        practiceSubTab === 'tests' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      📝 NTA Tests
                    </button>
                    <button
                      onClick={() => setPracticeSubTab('weightage')}
                      className={`py-2 rounded-xl text-xs font-extrabold transition-all btn-press ${
                        practiceSubTab === 'weightage' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      🎯 Weightage
                    </button>
                    <button
                      onClick={() => setPracticeSubTab('battle')}
                      className={`py-2 rounded-xl text-xs font-extrabold transition-all btn-press ${
                        practiceSubTab === 'battle' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                      }`}
                    >
                      ⚔️ Quiz Battle
                    </button>
                  </div>

                  {/* SUB-VIEW A: 📝 MOCK TESTS */}
                  {practiceSubTab === 'tests' && (
                    <div className="space-y-3 animate-slide-up">
                      <h3 className="text-sm font-bold text-slate-900">Mock Test Series</h3>

                      {/* Exam Filter Pills */}
                      <div className="flex gap-1.5">
                        {['All', 'JEE Main', 'NEET UG', 'CBSE Board'].map(f => (
                          <button
                            key={f}
                            onClick={() => setTestFilter(f)}
                            className={`px-3 py-1 rounded-lg text-[11px] font-semibold border ${
                              testFilter === f ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'
                            }`}
                          >
                            {f === 'All' ? 'All' : f.split(' ')[0]}
                          </button>
                        ))}
                      </div>

                      {/* Test Cards */}
                      <div className="space-y-2">
                        {MOCK_TESTS_CATALOG
                          .filter(t => testFilter === 'All' || t.exam === testFilter)
                          .map(t => (
                          <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-3 hover:border-blue-300 transition-all">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{t.exam}</span>
                              {t.isSuperBatchOnly ? (
                                <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">👑 Pro</span>
                              ) : (
                                <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded">Free</span>
                              )}
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 mb-1">{t.title}</h4>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-2">
                              <span>⏱ {t.durationMinutes}m</span>
                              <span>•</span>
                              <span>{t.totalMarks} marks</span>
                              <span>•</span>
                              <span>{t.questionsCount} Qs</span>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleStartMockTest(t)}
                                className={`flex-1 py-2 rounded-lg text-xs font-bold btn-press ${
                                  t.isSuperBatchOnly && !isSuperBatchActive && isTrialExpired
                                    ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                    : 'bg-blue-600 text-white'
                                }`}
                              >
                                {t.isSuperBatchOnly && !isSuperBatchActive && isTrialExpired ? '🔒 Unlock' : 'Start Test →'}
                              </button>
                              <button
                                onClick={() => downloadTestPaperAndAnswerSheet(t)}
                                className="py-2 px-3 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 btn-press shrink-0 flex items-center gap-1"
                                title="Download Question Paper with Separate Answer Sheet PDF"
                              >
                                <span>📄</span>
                                <span>PDF + Key</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SUB-VIEW B: 🎯 NTA CHAPTER WEIGHTAGE */}
                  {practiceSubTab === 'weightage' && (
                    <div className="space-y-3 animate-slide-up">
                      {/* Exam Selector */}
                      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                        {['JEE', 'NEET', 'CBSE'].map(ex => (
                          <button
                            key={ex}
                            onClick={() => {
                              setExamTrack(ex)
                              setWeightageSub(ex === 'NEET' ? 'Biology' : ex === 'CBSE' ? 'Class 10' : 'Physics')
                            }}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              examTrack === ex ? 'bg-blue-600 text-white' : 'text-slate-500'
                            }`}
                          >
                            {ex === 'CBSE' ? 'Boards' : ex}
                          </button>
                        ))}
                      </div>

                      {/* Subject Pills */}
                      <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                        {Object.keys(NTA_WEIGHTAGE_DATA[examTrack] || {}).map(subName => (
                          <button
                            key={subName}
                            onClick={() => setWeightageSub(subName)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 border ${
                              weightageSub === subName ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'
                            }`}
                          >
                            {subName}
                          </button>
                        ))}
                      </div>

                      {/* Chapter List — Clean & Simple */}
                      <div className="space-y-1.5">
                        {(NTA_WEIGHTAGE_DATA[examTrack]?.[weightageSub] || []).map((ch, idx) => (
                          <div key={idx} className="bg-white rounded-xl border border-slate-200 p-3">
                            {/* Row 1: Chapter name + weightage */}
                            <div className="flex justify-between items-start gap-2 mb-1">
                              <h4 className="text-xs font-bold text-slate-900 leading-snug flex-1">{ch.chapter}</h4>
                              <span className="text-[10px] font-bold text-rose-600 whitespace-nowrap">{ch.weightage}</span>
                            </div>

                            {/* Row 2: Priority + NTA frequency */}
                            <div className="flex items-center gap-2 text-[10px] mb-1.5">
                              <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">{ch.priority}</span>
                              {ch.avgQuestions && <span className="text-blue-600 font-medium">{ch.avgQuestions}</span>}
                            </div>

                            {/* Trend */}
                            <p className="text-[11px] text-slate-500 leading-relaxed mb-1.5">
                              <span className="font-semibold text-slate-600">Trend:</span> {ch.trend}
                            </p>

                            {/* Top PYQ Topics */}
                            {ch.topTopics && (
                              <div className="flex flex-wrap gap-1">
                                {ch.topTopics.map((top, i) => (
                                  <span key={i} className="text-[10px] text-slate-600 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
                                    {top}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SUB-VIEW C: ⚔️ SPEED QUIZ BATTLE & VIDEO LESSONS */}
                  {practiceSubTab === 'battle' && (
                    <div className="space-y-3.5 animate-slide-up">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setBtActive(false)}
                          className="flex-1 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs"
                        >
                          ⚔️ 60s Quiz Battle
                        </button>
                        <button
                          onClick={() => handleGenLesson()}
                          className="flex-1 py-2 rounded-xl bg-white text-slate-700 font-bold text-xs border border-slate-200"
                        >
                          🎬 AI Video Lesson
                        </button>
                      </div>

                      {/* Quiz Battle Arena */}
                      {!btActive ? (
                        <div className="allen-card p-5 text-center">
                          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center text-3xl mx-auto mb-2.5">⚔️</div>
                          <h3 className="text-base font-extrabold text-slate-900 mb-1">60-Second Speed Battle</h3>
                          <p className="text-xs text-slate-500 mb-4">Topic: <b>{chapter}</b>. 5 MCQs against the clock. Boost your accuracy under pressure!</p>
                          <button
                            onClick={handleStartBattle}
                            disabled={btLoad}
                            className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-extrabold shadow-md shadow-orange-500/25 btn-press"
                          >
                            {btLoad ? 'Preparing Questions...' : '🚀 Start Battle (+30 XP)'}
                          </button>
                        </div>
                      ) : btDone ? (
                        <div className="allen-card p-5 text-center animate-slide-up">
                          <p className="text-3xl mb-1">{btScore >= 4 ? '🏆' : btScore >= 2 ? '⭐' : '📝'}</p>
                          <h4 className="text-base font-extrabold text-slate-900">Battle Complete!</h4>
                          <p className="text-2xl font-black text-blue-600 my-1">{btScore} / {btQs.length}</p>
                          <p className="text-xs text-slate-500 mb-4">{btScore === btQs.length ? 'Outstanding! 100% Accuracy.' : 'Great effort! Review missed questions.'}</p>
                          <button
                            onClick={() => { setBtActive(false); setBtDone(false) }}
                            className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold btn-press shadow-xs"
                          >
                            Play Again
                          </button>
                        </div>
                      ) : (
                        <div className="allen-card p-4 animate-slide-up">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-slate-500">Q {btIdx + 1} / {btQs.length}</span>
                            <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${btTimer <= 15 ? 'bg-rose-100 text-rose-700 animate-pulse' : 'bg-amber-100 text-amber-800'}`}>
                              ⏱️ {btTimer}s
                            </span>
                            <span className="text-xs font-bold text-blue-600">Score: {btScore}</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-3">
                            <div className="bg-blue-600 h-full transition-all" style={{ width: `${((btIdx + 1) / btQs.length) * 100}%` }} />
                          </div>
                          <p className="text-xs font-bold text-slate-900 mb-3">{btQs[btIdx]?.q}</p>
                          <div className="space-y-1.5">
                            {btQs[btIdx]?.opts.map((o, i) => {
                              const letter = o.match(/^([A-D])\)/)?.[1] || ''
                              return (
                                <button
                                  key={i}
                                  onClick={() => handleAnswerBattle(letter)}
                                  className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium text-left hover:border-blue-500 btn-press"
                                >
                                  {o}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Video Lesson */}
                      {lsSlides.length > 0 && (
                        <div className="allen-card overflow-hidden shadow-md animate-slide-up">
                          <div className="h-1 bg-slate-100">
                            <div className="h-full bg-blue-600 transition-all" style={{ width: `${((lsIdx + 1) / lsSlides.length) * 100}%` }} />
                          </div>
                          <div className="p-6 bg-gradient-to-br from-blue-900 to-indigo-950 text-white min-h-[220px] flex flex-col justify-center text-center">
                            {(() => {
                              const s = lsSlides[lsIdx] || {}
                              return (
                                <div>
                                  <p className="text-3xl mb-2">{s.emoji || '📖'}</p>
                                  <h4 className="text-sm font-black mb-1 text-blue-200">{s.title}</h4>
                                  {s.content && <p className="text-xs text-slate-200 leading-relaxed">{s.content}</p>}
                                  {s.explanation && <p className="text-[11px] text-blue-300 mt-1">{s.explanation}</p>}
                                </div>
                              )
                            })()}
                          </div>
                          <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <button onClick={() => { setLsIdx(p => Math.max(0, p - 1)); setLsPlay(false); window?.speechSynthesis?.cancel?.() }} disabled={lsIdx === 0} className="p-1.5 rounded-lg bg-slate-100 text-xs disabled:opacity-30">⏮</button>
                              <button onClick={() => { if (lsPlay) { setLsPlay(false); window?.speechSynthesis?.cancel?.() } else setLsPlay(true) }} className="px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold shadow-xs">
                                {lsPlay ? 'Pause' : '▶ Play'}
                              </button>
                              <button onClick={() => { setLsIdx(p => Math.min(lsSlides.length - 1, p + 1)); setLsPlay(false); window?.speechSynthesis?.cancel?.() }} disabled={lsIdx >= lsSlides.length - 1} className="p-1.5 rounded-lg bg-slate-100 text-xs disabled:opacity-30">⏭</button>
                            </div>
                            <span className="text-[11px] font-bold text-slate-500">{lsIdx + 1} / {lsSlides.length}</span>
                            <button onClick={() => { setLsSlides([]); window?.speechSynthesis?.cancel?.() }} className="text-xs text-slate-400 font-bold hover:text-slate-600">Close</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

            </div>
          )}

          {/* ════ TAB 5: 📊 REPORT (Allen-Style Parent Analytics) ════ */}
          {activeTab === 'report' && (
            <div className="space-y-3.5 animate-slide-up">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Academic Scorecard</h3>
                  <p className="text-xs text-slate-500">Official Report for Parents</p>
                </div>
                <button
                  onClick={shareParentWhatsApp}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs btn-press"
                >
                  <span>📲</span> <span>WhatsApp Report</span>
                </button>
              </div>

              {/* Top KPI Grid */}
              <div className="grid grid-cols-3 gap-2">
                <div className="allen-card p-3 text-center">
                  <p className="text-xs text-slate-500 font-medium">Questions</p>
                  <p className="text-lg font-black text-blue-700">{stats.totalQ}</p>
                  <p className="text-[9px] text-emerald-600 font-bold">↑ Active</p>
                </div>
                <div className="allen-card p-3 text-center">
                  <p className="text-xs text-slate-500 font-medium">Streak</p>
                  <p className="text-lg font-black text-amber-600">{stats.streak}d</p>
                  <p className="text-[9px] text-amber-600 font-bold">🔥 On Fire</p>
                </div>
                <div className="allen-card p-3 text-center">
                  <p className="text-xs text-slate-500 font-medium">Accuracy</p>
                  <p className="text-lg font-black text-emerald-600">
                    {Math.min(96, Math.round((stats.totalQ / (stats.totalQ + mistakes.length || 1)) * 100))}%
                  </p>
                  <p className="text-[9px] text-slate-400 font-medium">CBSE Index</p>
                </div>
              </div>

              {/* Assessment Narrative for Parents */}
              <div className="allen-card p-4 border-blue-200 bg-blue-50/50">
                <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider mb-1">AI Examiner's Remarks</h4>
                <p className="text-xs text-slate-700 leading-relaxed">
                  <b>{name}</b> is maintaining a {stats.streak}-day consistent practice routine in Class {classNum}. 
                  {mistakes.length === 0 
                    ? ' Conceptual grasp across explored chapters is exemplary.' 
                    : ` Attention is required on ${mistakes.length} identified weak question(s). Re-testing is scheduled.`}
                </p>
              </div>

              {/* Mistakes Log */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Detailed Error Analysis ({mistakes.length})</p>
                {mistakes.length === 0 ? (
                  <div className="allen-card p-4 text-center text-xs text-slate-500">
                    No persistent mistakes recorded! Good job.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {mistakes.map(m => (
                      <div key={m.id} className="allen-card p-3 border-slate-200">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold bg-rose-50 text-rose-700 px-2 py-0.5 rounded">
                            {m.subject} • Score: {m.score || '5'}/10
                          </span>
                          <span className="text-[10px] text-slate-400">{m.date}</span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 mb-1">{m.question}</p>
                        <details className="text-[11px] text-slate-600">
                          <summary className="cursor-pointer font-bold text-blue-600">Examiner Analysis & Lost Marks</summary>
                          <div className="mt-1.5 p-2 bg-slate-50 rounded-xl">
                            <Md text={m.analysis} />
                          </div>
                        </details>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pro Membership & Subscription Status for Parents */}
              <div className="allen-card p-4 border-amber-300 bg-gradient-to-br from-amber-50/60 to-yellow-50/40">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">👑</span>
                    <div>
                      <h4 className="text-xs font-black text-slate-900">
                        {subscription?.isPro ? 'Study Buddy PRO Active' : '5-Day Free Trial Membership'}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium">
                        {subscription?.isPro ? `Plan: ${subscription.planName || 'Quarterly Board Pass'}` : `${daysRemaining} day(s) remaining in free trial`}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${subscription?.isPro ? 'bg-amber-500 text-white shadow-xs' : 'bg-blue-600 text-white'}`}>
                    {subscription?.isPro ? 'PRO ACTIVE' : 'TRIAL'}
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 space-y-1 mb-3">
                  <p className="flex items-center gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span> 
                    <b>24/7 AI Doubt Solving:</b> {subscription?.isPro ? 'Unlimited' : '5/day free'}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span> 
                    <b>CBSE Examiner Answer Key Checking:</b> {subscription?.isPro ? 'Unlimited' : 'Trial'}
                  </p>
                  <p className="flex items-center gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span> 
                    <b>Parent WhatsApp Progress Alerts:</b> Enabled
                  </p>
                </div>

                <button
                  onClick={() => setShowSubModal(true)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-700 text-white text-xs font-black shadow-md shadow-blue-500/20 btn-press flex items-center justify-center gap-1.5"
                >
                  <span>{subscription?.isPro ? '👑 Manage Pro Pass' : '👑 Upgrade to Pro (₹4.4/day • 70% OFF)'}</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          )}

        </main>

        {/* ── ALLEN-STYLE BOTTOM NAVIGATION BAR ── */}
        <nav className="fixed bottom-0 max-w-md w-full bg-white border-t border-slate-200/90 z-40 bottom-nav-safe shadow-lg flex items-center justify-around py-1.5 px-2">
          {[
            { id: 'home', l: 'Home', i: '🏠' },
            { id: 'plan', l: 'Routine', i: '📅' },
            { id: 'doubt', l: 'Doubt AI', i: '📸' },
            { id: 'battle', l: 'Practice', i: '⚔️' },
            { id: 'report', l: 'Report', i: '📊' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl transition-all btn-press ${activeTab === tab.id ? 'text-blue-700 font-extrabold' : 'text-slate-400 font-medium'}`}
            >
              <span className="text-lg leading-none mb-0.5">{tab.i}</span>
              <span className="text-[10px]">{tab.l}</span>
              {tab.id === 'report' && mistakes.length > 0 && (
                <span className="absolute top-1 right-3 w-2 h-2 bg-rose-500 rounded-full" />
              )}
            </button>
          ))}
        </nav>

      </div>
    </div>
  )
}
