import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import 'katex/dist/katex.min.css'
import { getClasses, getSubjects, getChapters, getDeletedTopics, apiAsk, apiChat, apiCheckAnswer, apiScan, apiGenerateLesson, apiGeneratePlan } from './api'

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
      name: 'Monthly Pro',
      price: 149,
      origPrice: 399,
      duration: '1 Month',
      perDay: '₹4.9/day',
      tag: 'Flexible',
      popular: false,
      desc: 'Ideal for monthly unit tests & doubt clearing.'
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
      desc: 'Complete coverage for CBSE Board revision & Term exams.'
    },
    {
      id: 'annual',
      name: 'Annual Topper Pass',
      price: 999,
      origPrice: 3999,
      duration: '1 Year',
      perDay: '₹2.7/day (₹83/mo)',
      tag: 'Save 75%',
      popular: false,
      desc: 'Full academic year syllabus, question bank & parent reports.'
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
          <div className="flex gap-1.5">
            <button
              onClick={() => onSimulateState('trial_active')}
              className="px-2 py-1 rounded bg-white border border-slate-300 font-bold text-slate-700 hover:bg-slate-50"
            >
              Day 2/5 (Trial)
            </button>
            <button
              onClick={() => onSimulateState('trial_expired')}
              className="px-2 py-1 rounded bg-rose-50 border border-rose-300 font-bold text-rose-700 hover:bg-rose-100"
            >
              Day 5 Expired 🔒
            </button>
            <button
              onClick={() => onSimulateState('pro_active')}
              className="px-2 py-1 rounded bg-amber-50 border border-amber-300 font-bold text-amber-800 hover:bg-amber-100"
            >
              Pro Active 👑
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
    }
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
      const lines = data.answer.split('\n').filter(l => l.trim())
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
        alert('Could not format battle questions. Please tap again!')
      }
    } catch {
      alert('Error connecting to quiz server.')
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
        
        {/* ── ALLEN-STYLE TOP APP BAR ── */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200/80 px-4 py-3 shadow-xs">
          <div className="flex items-center justify-between">
            {/* Left: Avatar + Greeting */}
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-700 to-blue-500 text-white font-extrabold flex items-center justify-center text-sm shadow-sm">
                {name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 leading-none">Hi, {name}</span>
                  <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded-md border border-blue-200/60">
                    Class {classNum}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 font-medium mt-0.5">CBSE 2026-27 Prep</p>
              </div>
            </div>

            {/* Right: VIP Badge + Streak + Language Toggle */}
            <div className="flex items-center gap-1.5">
              {subscription?.isPro ? (
                <button
                  onClick={() => { setSubReason(''); setShowSubModal(true) }}
                  className="flex items-center gap-1 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 border border-amber-300 px-2 py-1 rounded-xl text-[10px] font-black shadow-xs btn-press"
                  title="Study Buddy PRO Active"
                >
                  <span>👑</span>
                  <span>PRO</span>
                </button>
              ) : isTrialExpired ? (
                <button
                  onClick={() => { setSubReason('Your 5-Day Free Trial has ended. Subscribe to Pro to continue unlimited access.'); setShowSubModal(true) }}
                  className="flex items-center gap-1 bg-rose-600 text-white px-2 py-1 rounded-xl text-[10px] font-black animate-pulse shadow-xs btn-press"
                  title="5-Day Trial Expired • Tap to Unlock"
                >
                  <span>🔒</span>
                  <span>Expired</span>
                </button>
              ) : (
                <button
                  onClick={() => { setSubReason(''); setShowSubModal(true) }}
                  className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-1 rounded-xl text-[10px] font-extrabold btn-press"
                  title="5-Day Free Trial Active"
                >
                  <span>👑</span>
                  <span>{daysRemaining}d Left</span>
                </button>
              )}

              <div className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 rounded-xl text-xs font-extrabold">
                <span>🔥</span>
                <span>{stats.streak}d</span>
              </div>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 rounded-xl px-1.5 py-1 outline-none"
              >
                <option value="English">EN</option>
                <option value="Hindi">हिंदी</option>
                <option value="Hinglish">Hinglish</option>
              </select>
            </div>
          </div>

          {/* Subject Pills (horizontal scroll like Allen Digital) */}
          <div className="flex gap-2 overflow-x-auto mt-2.5 pb-1 no-scrollbar">
            {subjects.map(s => (
              <button
                key={s}
                onClick={() => setSubject(s)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all btn-press ${subject === s ? 'bg-blue-600 text-white shadow-xs shadow-blue-500/30' : 'bg-white text-slate-600 border border-slate-200'}`}
              >
                <span>{subjectIcons[s] || '📚'}</span>
                <span>{s}</span>
              </button>
            ))}
          </div>

          {/* Active Chapter Selector */}
          <div className="mt-2 flex items-center gap-2">
            <select
              value={chapter}
              onChange={e => setChapter(e.target.value)}
              className="flex-1 bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl px-2.5 py-1.5 outline-none truncate"
            >
              {chapters.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {deletedTopics.length > 0 && (
              <button
                onClick={() => setShowDel(!showDel)}
                className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-1.5 rounded-xl shrink-0"
              >
                🚫 {deletedTopics.length} Deleted {showDel ? '▲' : '▼'}
              </button>
            )}
          </div>
          {showDel && deletedTopics.length > 0 && (
            <div className="mt-1.5 p-2 bg-rose-50/80 border border-rose-200 rounded-xl text-[10px] text-rose-800 animate-slide-up">
              <p className="font-bold mb-1">CBSE 2026-27 Deleted Topics (Do not study for boards):</p>
              {deletedTopics.map((t, i) => <p key={i}>• {t}</p>)}
            </div>
          )}
        </header>

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

          {/* ════ TAB 4: ⚔️ BATTLE & VIDEO LESSONS ════ */}
          {activeTab === 'battle' && (
            <div className="space-y-3.5 animate-slide-up">
              {/* Top Sub-switcher */}
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

              {/* Video Lesson Generator Component */}
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
                          {s.steps && (
                            <div className="text-left text-xs space-y-1 mt-2">
                              {s.steps.map((st, i) => <p key={i} className="text-slate-200">• {st}</p>)}
                            </div>
                          )}
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
