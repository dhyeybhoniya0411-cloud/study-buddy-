import { useState, useRef, useEffect, useCallback } from 'react'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import 'katex/dist/katex.min.css'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Markdown ──
function Md({text}) {
  return <div className="prose prose-sm prose-invert max-w-none [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-indigo-300 [&_h2]:mt-4 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-medium [&_h3]:text-indigo-400 [&_p]:text-[13px] [&_p]:leading-relaxed [&_p]:text-gray-300 [&_p]:mb-2 [&_li]:text-[13px] [&_li]:text-gray-300 [&_strong]:text-white [&_code]:text-pink-400 [&_code]:text-xs [&_code]:bg-white/5 [&_code]:px-1 [&_code]:rounded">
    <ReactMarkdown remarkPlugins={[remarkMath,remarkGfm]} rehypePlugins={[rehypeKatex]}>{text}</ReactMarkdown>
  </div>
}

// ── Camera ──
function CameraModal({onCapture,onClose}) {
  const vRef=useRef(null),cRef=useRef(null),[stream,setStream]=useState(null),[cap,setCap]=useState(null),[facing,setFacing]=useState('environment')
  const start=useCallback(async(f)=>{try{if(stream)stream.getTracks().forEach(t=>t.stop());const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:f,width:{ideal:1280}}});setStream(s);if(vRef.current)vRef.current.srcObject=s}catch{alert('Allow camera access')}},[stream])
  useEffect(()=>{start(facing);return()=>{if(stream)stream.getTracks().forEach(t=>t.stop())}},[])
  const capture=()=>{const v=vRef.current,c=cRef.current;if(!v||!c)return;c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0);setCap({b64:c.toDataURL('image/jpeg',0.8).split(',')[1],src:c.toDataURL('image/jpeg',0.8)})}
  const close=()=>{if(stream)stream.getTracks().forEach(t=>t.stop());onClose()}
  return <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={close}>
    <div className="bg-[#111118] rounded-2xl max-w-md w-full border border-[#222233]" onClick={e=>e.stopPropagation()}>
      <div className="p-4 border-b border-[#222233] flex justify-between items-center"><span className="text-sm font-semibold text-white">Scan question</span><button onClick={close} className="text-gray-500 hover:text-white text-sm">✕</button></div>
      <div className="p-4">{!cap?<><video ref={vRef} autoPlay playsInline muted className="w-full rounded-xl bg-black mb-3" style={{maxHeight:'240px',objectFit:'cover'}}/><div className="flex gap-2"><button onClick={()=>{const f=facing==='environment'?'user':'environment';setFacing(f);start(f)}} className="flex-1 py-2 rounded-lg bg-[#1A1A24] border border-[#222233] text-sm text-gray-400">Flip</button><button onClick={capture} className="flex-[3] py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium">Capture</button></div></>
        :<><img src={cap.src} className="w-full rounded-xl mb-3" style={{maxHeight:'240px',objectFit:'contain'}}/><div className="flex gap-2"><button onClick={()=>{setCap(null);start(facing)}} className="flex-1 py-2 rounded-lg bg-[#1A1A24] border border-[#222233] text-sm text-gray-400">Retake</button><button onClick={()=>{onCapture(cap.b64);if(stream)stream.getTracks().forEach(t=>t.stop())}} className="flex-[2] py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium">Use photo</button></div></>}</div>
      <canvas ref={cRef} className="hidden"/>
    </div>
  </div>
}

// ── Onboarding ──
function Onboarding({onComplete}) {
  const [step,setStep]=useState(0),[name,setName]=useState(''),[cls,setCls]=useState('10'),[goal,setGoal]=useState('board')
  const finish=()=>{if(!name.trim())return;onComplete({name:name.trim(),classNum:cls,goal})}
  return <div className="min-h-screen bg-[#08080D] flex items-center justify-center p-6">
    <div className="max-w-md w-full">
      {/* Progress */}
      <div className="flex gap-1 mb-8">{[0,1,2].map(i=><div key={i} className={`h-1 flex-1 rounded-full ${i<=step?'bg-indigo-500':'bg-[#222233]'}`}/>)}</div>

      {step===0&&<div className="animate-enter">
        <p className="text-xs text-indigo-400 font-medium tracking-widest uppercase mb-2">Welcome</p>
        <h1 className="text-2xl font-semibold text-white mb-1">What's your name?</h1>
        <p className="text-sm text-gray-500 mb-8">We'll personalize your learning experience</p>
        <input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&name.trim())setStep(1)}}
          placeholder="Enter your name" autoFocus className="w-full bg-[#111118] border border-[#222233] rounded-xl px-4 py-3 text-white text-base placeholder:text-gray-600 mb-4"/>
        <button onClick={()=>name.trim()&&setStep(1)} disabled={!name.trim()} className="w-full py-3 rounded-xl bg-indigo-600 text-white font-medium disabled:opacity-30">Continue</button>
      </div>}

      {step===1&&<div className="animate-enter">
        <p className="text-xs text-indigo-400 font-medium tracking-widest uppercase mb-2">Class</p>
        <h1 className="text-2xl font-semibold text-white mb-1">Which class are you in?</h1>
        <p className="text-sm text-gray-500 mb-8">We'll align content to your CBSE syllabus</p>
        <div className="grid grid-cols-4 gap-2 mb-6">{['6','7','8','9','10','11','12'].map(c=><button key={c} onClick={()=>setCls(c)} className={`py-3 rounded-xl text-sm font-medium border ${cls===c?'bg-indigo-600 border-indigo-500 text-white':'bg-[#111118] border-[#222233] text-gray-400 hover:border-indigo-500/50'}`}>Class {c}</button>)}</div>
        <button onClick={()=>setStep(2)} className="w-full py-3 rounded-xl bg-indigo-600 text-white font-medium">Continue</button>
      </div>}

      {step===2&&<div className="animate-enter">
        <p className="text-xs text-indigo-400 font-medium tracking-widest uppercase mb-2">Goal</p>
        <h1 className="text-2xl font-semibold text-white mb-1">What's your goal?</h1>
        <p className="text-sm text-gray-500 mb-8">We'll customize your study plan</p>
        <div className="space-y-2 mb-6">{[{id:'board',l:'Board Exam Preparation',d:'Focus on CBSE pattern & scoring'},{id:'competitive',l:'Competitive Exams (JEE/NEET)',d:'Advanced problem solving'},{id:'learn',l:'Just Learning',d:'Understand concepts at my own pace'}].map(g=><button key={g.id} onClick={()=>setGoal(g.id)} className={`w-full p-4 rounded-xl text-left border ${goal===g.id?'bg-indigo-600/10 border-indigo-500':'bg-[#111118] border-[#222233] hover:border-[#333355]'}`}><p className="text-sm font-medium text-white">{g.l}</p><p className="text-xs text-gray-500 mt-0.5">{g.d}</p></button>)}</div>
        <button onClick={finish} className="w-full py-3 rounded-xl bg-indigo-600 text-white font-medium">Start Learning →</button>
      </div>}
    </div>
  </div>
}

// ── Landing ──
function Landing({onStart}) {
  return <div className="min-h-screen bg-[#08080D] text-white">
    <div className="absolute inset-0 overflow-hidden pointer-events-none"><div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/[0.07] rounded-full blur-[150px]"/><div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-600/[0.05] rounded-full blur-[120px]"/></div>

    <nav className="relative z-10 max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
      <span className="text-lg font-semibold tracking-tight">Study Buddy</span>
      <button onClick={onStart} className="px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-gray-200">Get Started</button>
    </nav>

    <div className="relative z-10 max-w-3xl mx-auto px-6 pt-20 pb-32 text-center">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-400 mb-8">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse-soft"/>CBSE Classes 6-12
      </div>
      <h1 className="text-4xl sm:text-6xl font-semibold leading-[1.1] tracking-tight mb-6">
        The AI tutor that<br/><span className="text-indigo-400">actually knows you</span>
      </h1>
      <p className="text-base text-gray-400 max-w-lg mx-auto mb-10 leading-relaxed">
        Not just another Q&A bot. Study Buddy tracks your progress, finds your weak spots, and creates a personal study plan every day. With parent reports to show your improvement.
      </p>
      <div className="flex gap-3 justify-center">
        <button onClick={onStart} className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 shadow-lg shadow-indigo-600/20">Start for free →</button>
      </div>
    </div>

    <div className="relative z-10 max-w-5xl mx-auto px-6 pb-20">
      <div className="grid grid-cols-3 gap-4">{[
        {t:'Personal Study Plan',d:'AI creates a daily 45-min plan based on YOUR weak areas. Not generic — built for you.',i:'📋'},
        {t:'Parent Progress Report',d:'Weekly report parents can see: study time, weak topics, improvement trends.',i:'📊'},
        {t:'Mistake Analysis',d:'Scan your answer sheet. AI finds exactly where you went wrong and what to revise.',i:'📝'},
        {t:'Spaced Repetition',d:'"You learned this 3 days ago — time to revise." Science-backed revision schedule.',i:'🧠'},
        {t:'AI Video Lessons',d:'Animated visual lessons with narration. Like a tutor explaining on a whiteboard.',i:'🎬'},
        {t:'Quiz Battles',d:'Timed quiz challenges. Compete with yourself, beat your high score.',i:'⚔️'},
      ].map((f,i)=><div key={i} className="p-5 rounded-xl bg-[#111118] border border-[#222233] hover:border-[#333355]"><p className="text-xl mb-3">{f.i}</p><p className="text-sm font-medium text-white mb-1">{f.t}</p><p className="text-xs text-gray-500 leading-relaxed">{f.d}</p></div>)}</div>
    </div>

    <div className="border-t border-[#222233] py-6 text-center"><p className="text-xs text-gray-600">Study Buddy · Made in India · Free for every student</p></div>
  </div>
}

// ═══════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════
export default function App() {
  const [profile,setProfile]=useState(()=>{try{return JSON.parse(localStorage.getItem('sb_profile'))}catch{return null}})
  const [page,setPage]=useState(profile?'app':'landing')
  const [sec,setSec]=useState('plan')
  const [classNum,setClassNum]=useState(profile?.classNum||'10')
  const [subjects,setSubjects]=useState([]),[subject,setSubject]=useState('')
  const [chapters,setChapters]=useState([]),[chapter,setChapter]=useState('')
  const [deletedTopics,setDeletedTopics]=useState([]),[showDel,setShowDel]=useState(false)
  const [language,setLanguage]=useState('English')
  const [sidebar,setSidebar]=useState(false)
  const [showCam,setShowCam]=useState(false),[camTarget,setCamTarget]=useState('learn')
  const [newBadge,setNewBadge]=useState(null)

  // Learn
  const [q,setQ]=useState(''),[mode,setMode]=useState('explain'),[history,setHistory]=useState([]),[loading,setLoading]=useState(false),[listening,setListening]=useState(false)
  // Chat
  const [chatMsgs,setChatMsgs]=useState([]),[chatIn,setChatIn]=useState(''),[chatLoad,setChatLoad]=useState(false)
  // Check
  const [ckQ,setCkQ]=useState(''),[ckA,setCkA]=useState(''),[ckRes,setCkRes]=useState(null),[ckLoad,setCkLoad]=useState(false)
  // Battle
  const [btActive,setBtActive]=useState(false),[btQs,setBtQs]=useState([]),[btIdx,setBtIdx]=useState(0),[btScore,setBtScore]=useState(0),[btTimer,setBtTimer]=useState(60),[btDone,setBtDone]=useState(false),[btLoad,setBtLoad]=useState(false)
  // Lesson
  const [lsSlides,setLsSlides]=useState([]),[lsIdx,setLsIdx]=useState(0),[lsLoad,setLsLoad]=useState(false),[lsPlay,setLsPlay]=useState(false),[lsTopic,setLsTopic]=useState('')
  // Plan
  const [plan,setPlan]=useState(null),[planLoad,setPlanLoad]=useState(false),[planTasks,setPlanTasks]=useState({})

  const [mistakes,setMistakes]=useState(()=>{try{return JSON.parse(localStorage.getItem('sb_m')||'[]')}catch{return[]}})
  const [stats,setStats]=useState(()=>{try{const s=JSON.parse(localStorage.getItem('sb_s')||'{}');return{xp:s.xp||0,totalQ:s.totalQ||0,quizzes:s.quizzes||0,checks:s.checks||0,scans:s.scans||0,streak:s.streak||0,lastDate:s.lastDate||null,subjectsList:s.subjectsList||[],nightOwl:s.nightOwl||false,earlyBird:s.earlyBird||false,usedHindi:s.usedHindi||false,earnedBadges:s.earnedBadges||[],todayQ:s.todayQ||0,todayDate:s.todayDate||'',weeklyData:s.weeklyData||[0,0,0,0,0,0,0],battles:s.battles||0,perfectBattle:s.perfectBattle||false}}catch{return{xp:0,totalQ:0,quizzes:0,checks:0,scans:0,streak:0,lastDate:null,subjectsList:[],nightOwl:false,earlyBird:false,usedHindi:false,earnedBadges:[],todayQ:0,todayDate:'',weeklyData:[0,0,0,0,0,0,0],battles:0,perfectBattle:false}}})

  const btmRef=useRef(null),chatRef=useRef(null)
  const name=profile?.name||'Student'

  useEffect(()=>{axios.get(`${API}/curriculum/subjects/${classNum}`).then(r=>{setSubjects(r.data.subjects);setSubject(r.data.subjects[0]||'')}).catch(()=>{})},[classNum])
  useEffect(()=>{if(!subject)return;axios.get(`${API}/curriculum/chapters/${classNum}/${subject}`).then(r=>{setChapters(r.data.chapters);setChapter(r.data.chapters[0]||'');setDeletedTopics(r.data.deleted_topics||[])}).catch(()=>{})},[classNum,subject])
  useEffect(()=>{btmRef.current?.scrollIntoView({behavior:'smooth'})},[history])
  useEffect(()=>{chatRef.current?.scrollIntoView({behavior:'smooth'})},[chatMsgs])
  useEffect(()=>{localStorage.setItem('sb_m',JSON.stringify(mistakes))},[mistakes])
  useEffect(()=>{localStorage.setItem('sb_s',JSON.stringify(stats))},[stats])
  useEffect(()=>{if(profile)localStorage.setItem('sb_profile',JSON.stringify(profile))},[profile])

  // Timers
  useEffect(()=>{if(!btActive||btDone)return;if(btTimer<=0){setBtDone(true);return};const t=setTimeout(()=>setBtTimer(p=>p-1),1000);return()=>clearTimeout(t)},[btActive,btTimer,btDone])
  useEffect(()=>{if(!lsPlay||lsSlides.length===0)return;if(lsIdx>=lsSlides.length-1){setLsPlay(false);return};const s=lsSlides[lsIdx];speak(s?.content||s?.title||'');const t=setTimeout(()=>setLsIdx(p=>p+1),8000);return()=>clearTimeout(t)},[lsPlay,lsIdx,lsSlides])

  const BADGES=[
    {id:'f1',name:'First Step',emoji:'👣',check:s=>s.totalQ>=1},{id:'t10',name:'Curious',emoji:'🧠',check:s=>s.totalQ>=10},
    {id:'q1',name:'Quiz Pro',emoji:'🎯',check:s=>s.quizzes>=1},{id:'c1',name:'Self Checker',emoji:'✅',check:s=>s.checks>=1},
    {id:'s3',name:'3-Day Streak',emoji:'🔥',check:s=>s.streak>=3},{id:'s7',name:'7-Day Streak',emoji:'⚡',check:s=>s.streak>=7},
    {id:'no',name:'Night Owl',emoji:'🦉',check:s=>s.nightOwl},{id:'eb',name:'Early Bird',emoji:'🐦',check:s=>s.earlyBird},
    {id:'ar',name:'All Rounder',emoji:'🌟',check:s=>s.subjectsList?.length>=3},{id:'sc',name:'Scanner',emoji:'📸',check:s=>s.scans>=1},
    {id:'bt',name:'Warrior',emoji:'⚔️',check:s=>s.battles>=1},{id:'hi',name:'Desi Scholar',emoji:'🇮🇳',check:s=>s.usedHindi},
  ]
  const LEVELS=[{n:'Beginner',m:0},{n:'Learner',m:50},{n:'Explorer',m:150},{n:'Scholar',m:300},{n:'Expert',m:500},{n:'Master',m:800},{n:'Legend',m:1500}]
  const getLevel=xp=>{let l=LEVELS[0];for(const v of LEVELS)if(xp>=v.m)l=v;return l}
  const getNext=xp=>{for(const l of LEVELS)if(xp<l.m)return l;return null}

  const addXP=(type,extra=0)=>{
    const h=new Date().getHours(),today=new Date().toDateString(),dow=new Date().getDay()
    setStats(p=>{const isNew=p.todayDate!==today;const yd=p.lastDate&&(new Date(today)-new Date(p.lastDate))<=129600000;const subs=p.subjectsList.includes(subject)?p.subjectsList:[...p.subjectsList,subject];const w=[...p.weeklyData];w[dow]=(w[dow]||0)+1
    const u={...p,xp:p.xp+({question:10,quiz:15,check:20,chat:5,scan:15,battle:20}[type]||10)+extra+(isNew?25:0),totalQ:p.totalQ+(type==='question'||type==='scan'?1:0),quizzes:p.quizzes+(type==='quiz'?1:0),checks:p.checks+(type==='check'?1:0),scans:p.scans+(type==='scan'?1:0),battles:p.battles+(type==='battle'?1:0),streak:isNew?(yd?p.streak+1:1):p.streak,lastDate:today,subjectsList:subs,nightOwl:p.nightOwl||h>=22,earlyBird:p.earlyBird||h<7,usedHindi:p.usedHindi||language==='Hindi',todayQ:(isNew?0:p.todayQ)+1,todayDate:today,weeklyData:w}
    setTimeout(()=>{for(const b of BADGES){if(!u.earnedBadges.includes(b.id)&&b.check(u)){u.earnedBadges=[...u.earnedBadges,b.id];setNewBadge(b);setTimeout(()=>setNewBadge(null),3000);break}}setStats(x=>({...x,earnedBadges:u.earnedBadges}))},200);return u})
  }

  const speak=t=>{window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.rate=0.9;u.lang=language==='Hindi'?'hi-IN':'en-US';window.speechSynthesis.speak(u)}
  const listen=set=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR)return;const r=new SR();r.lang=language==='Hindi'?'hi-IN':'en-US';r.onstart=()=>setListening(true);r.onresult=e=>set(e.results[0][0].transcript);r.onend=()=>setListening(false);r.start()}

  const handleCam=async b64=>{setShowCam(false);if(camTarget==='learn'){setLoading(true);addXP('scan');try{const r=await axios.post(`${API}/scan`,{image_base64:b64,class_num:classNum,subject,chapter,mode,language,scan_type:'question'});setHistory(p=>[...p,{q:'📸 Scanned',a:r.data.answer,mode,yt:r.data.youtube_query}])}catch{setHistory(p=>[...p,{q:'📸',a:'Error processing',mode,yt:''}])};setLoading(false)}else{try{const r=await axios.post(`${API}/scan`,{image_base64:b64,class_num:classNum,subject,chapter,scan_type:'answer'});camTarget==='ckQ'?setCkQ(r.data.answer):setCkA(r.data.answer)}catch{}}}

  const askLearn=async()=>{if(!q.trim())return;const qq=q;setLoading(true);setQ('');addXP(mode==='quiz'?'quiz':'question');try{const r=await axios.post(`${API}/ask`,{question:qq,class_num:classNum,subject,chapter,mode,language});setHistory(p=>[...p,{q:qq,a:r.data.answer,mode,yt:r.data.youtube_query}])}catch{setHistory(p=>[...p,{q:qq,a:'Connection error.',mode,yt:''}])};setLoading(false)}
  const sendChat=async()=>{if(!chatIn.trim())return;const msg=chatIn;setChatIn('');setChatLoad(true);addXP('chat');const n=[...chatMsgs,{role:'user',text:msg}];setChatMsgs(n);try{const r=await axios.post(`${API}/chat`,{messages:n,class_num:classNum,subject,chapter,language});setChatMsgs([...n,{role:'ai',text:r.data.answer}])}catch{setChatMsgs([...n,{role:'ai',text:'Error'}])};setChatLoad(false)}
  const submitCheck=async()=>{if(!ckQ.trim()||!ckA.trim())return;setCkLoad(true);setCkRes(null);addXP('check');try{const r=await axios.post(`${API}/check-answer`,{question:ckQ,student_answer:ckA,class_num:classNum,subject,chapter,language});setCkRes(r.data);const m=r.data.analysis.match(/Score:\s*(\d+)/i);if(m&&parseInt(m[1])<7)setMistakes(p=>[{id:Date.now(),question:ckQ,studentAnswer:ckA,analysis:r.data.analysis,subject,chapter,classNum,date:new Date().toLocaleDateString(),practiced:false},...p])}catch{setCkRes({analysis:'Error'})};setCkLoad(false)}

  const startBattle=async()=>{setBtLoad(true);setBtDone(false);setBtScore(0);setBtIdx(0);setBtTimer(60);setBtQs([]);try{const r=await axios.post(`${API}/ask`,{question:`Generate 5 quick quiz questions on ${chapter}`,class_num:classNum,subject,chapter,mode:'quiz',language});const lines=r.data.answer.split('\n').filter(l=>l.trim());const qs=[];let cur=null;for(const l of lines){if(l.match(/^Q\d?[:.]/i)){cur={q:l.replace(/^Q\d?[:.]\s*/i,''),opts:[],ans:''};qs.push(cur)}else if(cur&&l.match(/^[A-D]\)/)){cur.opts.push(l)}else if(cur&&l.match(/^Answer/i)){cur.ans=l.match(/[A-D]/)?.[0]||'A'}};if(qs.length>=3){setBtQs(qs);setBtActive(true)}else alert('Try again')}catch{alert('Error')};setBtLoad(false)}
  const answerBt=l=>{const correct=btQs[btIdx]?.ans===l;if(correct)setBtScore(p=>p+1);if(btIdx+1>=btQs.length){setBtDone(true);addXP('battle',btScore*5)}else setBtIdx(p=>p+1)}

  const genLesson=async()=>{setLsLoad(true);setLsSlides([]);setLsIdx(0);setLsPlay(false);try{const r=await axios.post(`${API}/generate-lesson`,{class_num:classNum,subject,chapter,topic:lsTopic||chapter,language});if(r.data.slides?.length>0){setLsSlides(r.data.slides);addXP('question')}else alert('Try again')}catch{alert('Error')};setLsLoad(false)}
  const genPlan=async()=>{setPlanLoad(true);try{const r=await axios.post(`${API}/generate-plan`,{class_num:classNum,subject,chapter,student_name:name,weak_topics:mistakes.map(m=>m.subject).slice(0,5),mistakes_count:mistakes.length,streak:stats.streak,language});setPlan(r.data.plan);setPlanTasks({})}catch{alert('Error')};setPlanLoad(false)}

  const handleOnboard=p=>{setProfile(p);setClassNum(p.classNum);setPage('app')}

  if(page==='landing')return <Landing onStart={()=>setPage(profile?'app':'onboard')}/>
  if(page==='onboard')return <Onboarding onComplete={handleOnboard}/>

  const level=getLevel(stats.xp),next=getNext(stats.xp)
  const prog=next?((stats.xp-level.m)/(next.m-level.m))*100:100
  const MODES=[{id:'explain',l:'Explain'},{id:'quiz',l:'Quiz'},{id:'step-by-step',l:'Step by Step'},{id:'exam-prep',l:'Exam Prep'}]
  const NAV=[{id:'plan',l:'Today\'s Plan',i:'📋'},{id:'learn',l:'Learn',i:'📖'},{id:'lesson',l:'Video Lesson',i:'🎬'},{id:'chat',l:'Chat',i:'💬'},{id:'battle',l:'Quiz Battle',i:'⚔️'},{id:'check',l:'Check Answer',i:'📝'},{id:'progress',l:'Progress',i:'📊'},{id:'parent',l:'Parent Report',i:'👨‍👩‍👧'},{id:'mistakes',l:'Mistakes',i:'📓'}]
  const days=['S','M','T','W','T','F','S']
  const taskIcons={warmup:'🔄',learn:'📖',practice:'✍️',test:'🧪',review:'📋'}

  const inp="bg-[#111118] border border-[#222233] text-white rounded-lg px-3 py-2 text-sm placeholder:text-gray-600 w-full focus:border-indigo-500"
  const card="bg-[#111118] border border-[#222233] rounded-xl"
  const bub="bg-[#111118] border border-[#222233]"

  return <div className="min-h-screen bg-[#08080D] text-gray-200 flex">
    {showCam&&<CameraModal onCapture={handleCam} onClose={()=>setShowCam(false)}/>}
    {newBadge&&<div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#111118] border border-indigo-500/30 text-white px-5 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-enter"><span className="text-2xl">{newBadge.emoji}</span><div><p className="text-xs text-indigo-400 font-medium">Badge unlocked</p><p className="text-sm font-semibold">{newBadge.name}</p></div></div>}

    {/* Sidebar */}
    <aside className={`${sidebar?'translate-x-0':'-translate-x-full'} md:translate-x-0 fixed md:sticky top-0 left-0 h-screen w-56 bg-[#0D0D14] border-r border-[#1A1A24] z-40 flex flex-col`}>
      <div className="p-4 border-b border-[#1A1A24]">
        <p className="text-sm font-semibold text-white mb-0.5">Study Buddy</p>
        <p className="text-xs text-gray-600">Hi, {name}</p>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1"><div className="h-1 bg-[#222233] rounded-full"><div className="h-1 bg-indigo-500 rounded-full" style={{width:`${prog}%`}}/></div></div>
          <span className="text-[10px] text-gray-500">{stats.xp} XP</span>
        </div>
        <div className="flex gap-2 mt-2 text-[10px] text-gray-500">
          <span>{stats.streak}🔥</span><span>{level.n}</span><span>{stats.earnedBadges.length} badges</span>
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">{NAV.map(n=><button key={n.id} onClick={()=>{setSec(n.id);setSidebar(false)}} className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] ${sec===n.id?'bg-indigo-600/10 text-indigo-400 font-medium':'text-gray-500 hover:text-gray-300 hover:bg-[#111118]'}`}><span className="text-sm w-5 text-center">{n.i}</span>{n.l}{n.id==='mistakes'&&mistakes.length>0&&<span className="ml-auto text-[9px] bg-red-500/20 text-red-400 px-1.5 rounded">{mistakes.length}</span>}</button>)}</nav>
      <div className="p-2 border-t border-[#1A1A24]"><button onClick={()=>setPage('landing')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] text-gray-600 hover:text-gray-400">← Back</button></div>
    </aside>

    <button onClick={()=>setSidebar(!sidebar)} className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-[#111118] border border-[#222233] text-white text-sm">☰</button>
    {sidebar&&<div className="md:hidden fixed inset-0 bg-black/60 z-30" onClick={()=>setSidebar(false)}/>}

    <main className="flex-1 overflow-y-auto">
      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-[#08080D]/80 backdrop-blur-lg border-b border-[#1A1A24] px-6 py-2.5 flex gap-2 items-center">
        <select value={classNum} onChange={e=>setClassNum(e.target.value)} className={inp+" !w-auto !py-1.5"}>{['6','7','8','9','10','11','12'].map(c=><option key={c} value={c}>Class {c}</option>)}</select>
        <select value={subject} onChange={e=>setSubject(e.target.value)} className={inp+" !w-auto !py-1.5"}>{subjects.map(s=><option key={s} value={s}>{s}</option>)}</select>
        <select value={chapter} onChange={e=>setChapter(e.target.value)} className={inp+" flex-1 !py-1.5 text-xs"}>{chapters.map(c=><option key={c} value={c}>{c}</option>)}</select>
        <select value={language} onChange={e=>setLanguage(e.target.value)} className={inp+" !w-auto !py-1.5"}>{['English','Hindi','Hinglish'].map(l=><option key={l}>{l}</option>)}</select>
      </div>
      {deletedTopics.length>0&&<div className="px-6 py-1"><button onClick={()=>setShowDel(!showDel)} className="text-[10px] text-red-400/60 hover:text-red-400">{deletedTopics.length} deleted topics {showDel?'▲':'▼'}</button>{showDel&&<div className="mt-1 p-2 rounded-lg bg-red-500/5 border border-red-500/10 text-[11px] text-red-400/80">{deletedTopics.map((t,i)=><p key={i}>· {t}</p>)}</div>}</div>}

      <div className="max-w-2xl mx-auto px-6 py-6">

      {/* ═══ TODAY'S PLAN ═══ */}
      {sec==='plan'&&<div className="animate-enter">
        <div className="mb-6"><p className="text-xs text-indigo-400 font-medium tracking-widest uppercase mb-1">Today's Plan</p><h2 className="text-xl font-semibold">Good {new Date().getHours()<12?'morning':new Date().getHours()<17?'afternoon':'evening'}, {name}</h2></div>

        {!plan?<div className={card+' p-6 text-center'}>
          <p className="text-sm text-gray-400 mb-4">AI will create a personalized 45-minute study plan based on your weak areas and progress.</p>
          <button onClick={genPlan} disabled={planLoad} className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium disabled:opacity-40">{planLoad?'Creating your plan...':'Generate today\'s plan'}</button>
        </div>

        :<div className="space-y-4 animate-enter">
          <div className={card+' p-4'}><p className="text-sm text-gray-300 leading-relaxed">{plan.greeting}</p></div>
          <div className={card+' p-4'}><p className="text-[10px] text-indigo-400 uppercase tracking-wider mb-1">Focus</p><p className="text-base font-medium text-white">{plan.focus_topic}</p><p className="text-xs text-gray-500 mt-1">{plan.why}</p></div>

          <div className="space-y-2">{plan.tasks?.map((t,i)=><div key={i} className={`${card} p-4 flex items-start gap-3 ${planTasks[i]?'opacity-40':''}`}>
            <button onClick={()=>setPlanTasks(p=>({...p,[i]:!p[i]}))} className={`w-5 h-5 rounded border shrink-0 mt-0.5 flex items-center justify-center text-xs ${planTasks[i]?'bg-indigo-600 border-indigo-500 text-white':'border-[#333355]'}`}>{planTasks[i]&&'✓'}</button>
            <div className="flex-1"><div className="flex items-center gap-2 mb-0.5"><span className="text-sm">{taskIcons[t.type]||'📌'}</span><span className="text-xs text-gray-500">{t.time}</span></div><p className="text-sm text-gray-300">{t.task}</p></div>
          </div>)}</div>

          <div className={card+' p-4'}><p className="text-xs text-amber-400/70">💡 {plan.tip}</p></div>
          <div className={card+' p-4 border-indigo-500/20'}><p className="text-xs text-gray-400 italic">"{plan.motivation}"</p></div>
          <button onClick={genPlan} className="text-xs text-gray-600 hover:text-gray-400">Regenerate plan</button>
        </div>}
      </div>}

      {/* ═══ LEARN ═══ */}
      {sec==='learn'&&<div className="animate-enter">
        <div className="mb-4"><p className="text-xs text-indigo-400 font-medium tracking-widest uppercase mb-1">Learn</p><h2 className="text-xl font-semibold">Ask anything</h2></div>
        <div className={card+' p-4 mb-4'}>
          <div className="flex gap-1.5 mb-3">{MODES.map(m=><button key={m.id} onClick={()=>setMode(m.id)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium ${mode===m.id?'bg-indigo-600 text-white':'text-gray-500 hover:text-gray-300'}`}>{m.l}</button>)}</div>
          <div className="relative mb-3"><textarea value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();askLearn()}}} placeholder="Type or scan a question..." rows={2} className={inp+' resize-none pr-16'}/><div className="absolute right-2 top-2 flex gap-1"><button onClick={()=>{setCamTarget('learn');setShowCam(true)}} className="text-gray-600 hover:text-indigo-400 text-sm p-1">📸</button><button onClick={()=>listen(setQ)} className={`text-sm p-1 ${listening?'text-red-400':'text-gray-600 hover:text-indigo-400'}`}>🎤</button></div></div>
          <button onClick={askLearn} disabled={loading||!q.trim()} className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium disabled:opacity-30">{loading?'Thinking...':'Ask'}</button>
        </div>
        <div className="space-y-3">{history.map((h,i)=><div key={i} className="space-y-2">
          <div className="flex justify-end"><div className="bg-indigo-600 text-white rounded-xl rounded-br-sm px-3.5 py-2 max-w-[80%]"><p className="text-[13px]">{h.q}</p></div></div>
          <div className="flex justify-start"><div className={`${bub} rounded-xl rounded-bl-sm px-3.5 py-2.5 max-w-[80%]`}><Md text={h.a}/>{h.yt&&<button onClick={()=>window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(h.yt)}`,'_blank')} className="mt-2 text-xs text-red-400/60 hover:text-red-400">▶ Watch on YouTube</button>}</div></div>
        </div>)}{loading&&<div className="flex justify-start"><div className={`${bub} rounded-xl px-3.5 py-2.5`}><div className="flex gap-1"><span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"/><span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay:'150ms'}}/><span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay:'300ms'}}/></div></div></div>}<div ref={btmRef}/></div>
      </div>}

      {/* ═══ VIDEO LESSON ═══ */}
      {sec==='lesson'&&<div className="animate-enter">
        <div className="mb-4"><p className="text-xs text-indigo-400 font-medium tracking-widest uppercase mb-1">Video Lesson</p><h2 className="text-xl font-semibold">AI-generated visual lesson</h2></div>
        {lsSlides.length===0?<div className={card+' p-6 text-center'}><p className="text-sm text-gray-400 mb-4">AI creates an animated lesson with narration — instant, personalized.</p><input value={lsTopic} onChange={e=>setLsTopic(e.target.value)} placeholder="Topic (optional)" className={inp+' max-w-sm mx-auto mb-4'}/><br/><button onClick={genLesson} disabled={lsLoad} className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium disabled:opacity-40">{lsLoad?'Creating...':'Generate lesson'}</button></div>
        :<div><div className={card+' overflow-hidden mb-3'}><div className="h-0.5 bg-[#222233]"><div className="h-full bg-indigo-500" style={{width:`${((lsIdx+1)/lsSlides.length)*100}%`}}/></div>
          <div className="p-8 min-h-[280px] flex flex-col items-center justify-center text-center bg-gradient-to-br from-[#0D0D18] to-[#141428]">
          {(()=>{const s=lsSlides[lsIdx]||{};return<div className="animate-enter"><p className="text-3xl mb-3">{s.emoji||'📖'}</p><h3 className="text-lg font-semibold text-white mb-2">{s.title}</h3>{s.content&&<p className="text-sm text-gray-400 max-w-md leading-relaxed">{s.content}</p>}{s.explanation&&<p className="text-xs text-gray-500 mt-2">{s.explanation}</p>}{s.steps&&<div className="text-left max-w-sm mx-auto mt-3">{s.steps.map((st,i)=><p key={i} className="text-sm text-gray-400 mb-1">{i+1}. {st.replace(/^Step \d+:\s*/i,'')}</p>)}</div>}{s.points&&<div className="text-left max-w-sm mx-auto mt-3">{s.points.map((p,i)=><p key={i} className="text-sm text-gray-400 mb-1">✓ {p}</p>)}</div>}{s.question&&<div className="mt-3"><p className="text-sm text-gray-300 mb-2">{s.question}</p><details><summary className="text-xs text-indigo-400 cursor-pointer">Show answer</summary><p className="text-sm text-gray-400 mt-1">{s.answer}</p></details></div>}</div>})()}
          </div>
          <div className="px-4 py-2.5 flex items-center justify-between bg-[#0D0D14] border-t border-[#1A1A24]">
            <div className="flex items-center gap-1"><button onClick={()=>{setLsIdx(p=>Math.max(0,p-1));setLsPlay(false);window.speechSynthesis.cancel()}} disabled={lsIdx===0} className="p-1.5 rounded text-sm disabled:opacity-20 hover:bg-[#1A1A24]">⏮</button><button onClick={()=>{if(lsPlay){setLsPlay(false);window.speechSynthesis.cancel()}else setLsPlay(true)}} className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-medium">{lsPlay?'Pause':'Play'}</button><button onClick={()=>{setLsIdx(p=>Math.min(lsSlides.length-1,p+1));setLsPlay(false);window.speechSynthesis.cancel()}} disabled={lsIdx>=lsSlides.length-1} className="p-1.5 rounded text-sm disabled:opacity-20 hover:bg-[#1A1A24]">⏭</button></div>
            <span className="text-[10px] text-gray-600">{lsIdx+1}/{lsSlides.length}</span>
            <button onClick={()=>{setLsSlides([]);setLsIdx(0);setLsPlay(false);window.speechSynthesis.cancel()}} className="text-xs text-gray-600 hover:text-gray-400">Close</button>
          </div></div>
          <div className="flex gap-1">{lsSlides.map((s,i)=><button key={i} onClick={()=>{setLsIdx(i);setLsPlay(false)}} className={`w-8 h-6 rounded text-xs flex items-center justify-center ${i===lsIdx?'bg-indigo-600':'bg-[#1A1A24] opacity-40 hover:opacity-100'}`}>{s.emoji||'·'}</button>)}</div>
        </div>}
      </div>}

      {/* ═══ CHAT ═══ */}
      {sec==='chat'&&<div className="animate-enter">
        <div className="mb-4"><p className="text-xs text-indigo-400 font-medium tracking-widest uppercase mb-1">Chat</p><h2 className="text-xl font-semibold">Talk with your tutor</h2></div>
        <div className="space-y-2.5 mb-24">{chatMsgs.map((m,i)=><div key={i} className={`flex ${m.role==='user'?'justify-end':'justify-start'}`}><div className={`${m.role==='user'?'bg-indigo-600 text-white rounded-br-sm':'bg-[#111118] border border-[#222233] rounded-bl-sm'} rounded-xl px-3.5 py-2 max-w-[80%]`}>{m.role==='ai'?<Md text={m.text}/>:<p className="text-[13px]">{m.text}</p>}</div></div>)}{chatLoad&&<div className="flex justify-start"><div className={bub+' rounded-xl px-3.5 py-2'}><span className="text-xs text-gray-500">Typing...</span></div></div>}<div ref={chatRef}/></div>
        <div className="fixed bottom-0 right-0 left-56 bg-[#08080D]/90 backdrop-blur-lg border-t border-[#1A1A24] p-3"><div className="max-w-2xl mx-auto flex gap-2"><input value={chatIn} onChange={e=>setChatIn(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')sendChat()}} placeholder="Message..." className={inp+' pr-10'}/><button onClick={sendChat} disabled={chatLoad||!chatIn.trim()} className="px-4 rounded-lg bg-indigo-600 text-white text-sm font-medium disabled:opacity-30">Send</button></div></div>
      </div>}

      {/* ═══ BATTLE ═══ */}
      {sec==='battle'&&<div className="animate-enter">
        <div className="mb-4"><p className="text-xs text-indigo-400 font-medium tracking-widest uppercase mb-1">Quiz Battle</p><h2 className="text-xl font-semibold">Beat the clock</h2></div>
        {!btActive?<div className={card+' p-6 text-center'}><p className="text-sm text-gray-400 mb-4">5 questions. 60 seconds. How many can you get right?</p><button onClick={startBattle} disabled={btLoad} className="px-6 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium disabled:opacity-40">{btLoad?'Loading...':'Start battle'}</button></div>
        :btDone?<div className={card+' p-6 text-center animate-enter'}><p className="text-3xl font-semibold text-white mb-2">{btScore}/{btQs.length}</p><p className="text-sm text-gray-400 mb-4">{btScore===btQs.length?'Perfect!':btScore>=3?'Good job!':'Keep practicing'}</p><button onClick={()=>{setBtActive(false);setBtDone(false)}} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium">Try again</button></div>
        :<div className={card+' p-5 animate-enter'}><div className="flex justify-between mb-3"><span className="text-xs text-gray-500">Q{btIdx+1}/{btQs.length}</span><span className={`text-sm font-medium ${btTimer<=10?'text-red-400':'text-gray-400'}`}>{btTimer}s</span><span className="text-xs text-gray-500">Score: {btScore}</span></div><div className="h-0.5 bg-[#222233] rounded mb-4"><div className="h-full bg-indigo-500 rounded" style={{width:`${(btIdx/btQs.length)*100}%`}}/></div><p className="text-sm font-medium text-white mb-4">{btQs[btIdx]?.q}</p><div className="grid grid-cols-2 gap-2">{btQs[btIdx]?.opts.map((o,i)=>{const l=o.match(/^([A-D])\)/)?.[1]||'';return<button key={i} onClick={()=>answerBt(l)} className="p-3 rounded-lg text-sm text-left text-gray-300 bg-[#0D0D14] border border-[#222233] hover:border-indigo-500">{o}</button>})}</div></div>}
      </div>}

      {/* ═══ CHECK ═══ */}
      {sec==='check'&&<div className="animate-enter">
        <div className="mb-4"><p className="text-xs text-indigo-400 font-medium tracking-widest uppercase mb-1">Check Answer</p><h2 className="text-xl font-semibold">Find your mistakes</h2></div>
        <div className={card+' p-4 mb-4'}>
          <div className="relative mb-3"><textarea value={ckQ} onChange={e=>setCkQ(e.target.value)} placeholder="Paste the question..." rows={2} className={inp+' pr-10'}/><button onClick={()=>{setCamTarget('ckQ');setShowCam(true)}} className="absolute right-2 top-2 text-gray-600 hover:text-indigo-400 text-sm">📸</button></div>
          <div className="relative mb-3"><textarea value={ckA} onChange={e=>setCkA(e.target.value)} placeholder="Paste your answer..." rows={3} className={inp+' pr-10'}/><button onClick={()=>{setCamTarget('ckA');setShowCam(true)}} className="absolute right-2 top-2 text-gray-600 hover:text-indigo-400 text-sm">📸</button></div>
          <button onClick={submitCheck} disabled={ckLoad||!ckQ.trim()||!ckA.trim()} className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium disabled:opacity-30">{ckLoad?'Analyzing...':'Check my answer'}</button>
        </div>
        {ckRes&&<div className={card+' p-4 animate-enter'}><Md text={ckRes.analysis}/></div>}
      </div>}

      {/* ═══ PROGRESS ═══ */}
      {sec==='progress'&&<div className="animate-enter">
        <div className="mb-4"><p className="text-xs text-indigo-400 font-medium tracking-widest uppercase mb-1">Progress</p><h2 className="text-xl font-semibold">Your journey</h2></div>
        <div className="grid grid-cols-4 gap-3 mb-4">{[{v:stats.totalQ,l:'Questions'},{v:stats.streak,l:'Streak'},{v:stats.xp,l:'XP'},{v:stats.earnedBadges.length,l:'Badges'}].map(s=><div key={s.l} className={card+' p-3 text-center'}><p className="text-lg font-semibold text-white">{s.v}</p><p className="text-[10px] text-gray-500">{s.l}</p></div>)}</div>
        <div className={card+' p-4 mb-4'}><p className="text-xs text-gray-500 mb-3">Weekly</p><div className="flex items-end justify-between gap-1 h-20">{stats.weeklyData.map((v,i)=><div key={i} className="flex-1 flex flex-col items-center"><div className="w-full bg-indigo-500 rounded-t" style={{height:`${Math.max(v*8,2)}px`,maxHeight:'70px'}}/><p className="text-[9px] text-gray-600 mt-1">{days[i]}</p></div>)}</div></div>
        <div className={card+' p-4 mb-4'}><p className="text-xs text-gray-500 mb-3">Subjects</p><div className="flex flex-wrap gap-1.5">{stats.subjectsList.length?stats.subjectsList.map(s=><span key={s} className="text-xs px-2 py-1 rounded bg-indigo-500/10 text-indigo-400">{s}</span>):<span className="text-xs text-gray-600">None yet</span>}</div></div>
        <div className={card+' p-4'}><p className="text-xs text-gray-500 mb-3">Badges</p><div className="grid grid-cols-6 gap-2">{BADGES.map(b=>{const e=stats.earnedBadges.includes(b.id);return<div key={b.id} className={`text-center p-2 rounded-lg ${e?'':'opacity-15'}`} title={b.name}><p className="text-xl">{b.emoji}</p><p className="text-[8px] text-gray-500 mt-0.5">{b.name}</p></div>})}</div></div>
      </div>}

      {/* ═══ PARENT REPORT ═══ */}
      {sec==='parent'&&<div className="animate-enter">
        <div className="mb-4"><p className="text-xs text-indigo-400 font-medium tracking-widest uppercase mb-1">Parent Report</p><h2 className="text-xl font-semibold">{name}'s Learning Report</h2></div>

        <div className={card+' p-5 mb-4 border-indigo-500/20'}>
          <div className="flex items-center justify-between mb-4"><div><p className="text-base font-medium text-white">{name}</p><p className="text-xs text-gray-500">Class {classNum} · CBSE</p></div><div className="text-right"><p className="text-xs text-gray-500">Report generated</p><p className="text-xs text-gray-400">{new Date().toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</p></div></div>

          <div className="grid grid-cols-4 gap-3 mb-4">{[{v:stats.totalQ,l:'Questions Practiced',c:stats.totalQ>=10?'text-green-400':'text-amber-400'},{v:stats.streak+' days',l:'Study Streak',c:stats.streak>=3?'text-green-400':'text-amber-400'},{v:stats.xp,l:'Total XP Earned',c:'text-indigo-400'},{v:mistakes.length,l:'Mistakes to Fix',c:mistakes.length>5?'text-red-400':'text-green-400'}].map(s=><div key={s.l} className="bg-[#0D0D14] rounded-lg p-3 text-center"><p className={`text-lg font-semibold ${s.c}`}>{s.v}</p><p className="text-[9px] text-gray-500 mt-0.5">{s.l}</p></div>)}</div>

          <div className="mb-4"><p className="text-xs text-gray-500 mb-2">Subjects Studied</p>{stats.subjectsList.length?<div className="flex flex-wrap gap-1.5">{stats.subjectsList.map(s=><span key={s} className="text-xs px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-400">{s}</span>)}</div>:<p className="text-xs text-gray-600">Not started yet</p>}</div>

          <div className="mb-4"><p className="text-xs text-gray-500 mb-2">Weekly Study Activity</p><div className="flex items-end justify-between gap-1 h-16">{stats.weeklyData.map((v,i)=><div key={i} className="flex-1 flex flex-col items-center"><div className="w-full bg-indigo-500/80 rounded-t" style={{height:`${Math.max(v*6,2)}px`,maxHeight:'50px'}}/><p className="text-[8px] text-gray-600 mt-0.5">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i]}</p></div>)}</div></div>

          {mistakes.length>0&&<div><p className="text-xs text-gray-500 mb-2">Areas Needing Attention</p>{mistakes.slice(0,3).map((m,i)=><div key={i} className="bg-red-500/5 border border-red-500/10 rounded-lg p-2.5 mb-1.5"><p className="text-xs text-red-400/80">{m.subject} · {m.chapter}</p><p className="text-[11px] text-gray-400 mt-0.5">Q: {m.question.substring(0,80)}...</p></div>)}</div>}

          <div className="mt-4 pt-4 border-t border-[#222233]">
            <p className="text-xs text-gray-500 mb-1">Overall Assessment</p>
            <p className="text-sm text-gray-300">{stats.totalQ>=20&&stats.streak>=3?`${name} is showing excellent consistency and dedication. Keep it up!`:stats.totalQ>=5?`${name} has made a good start. Encourage daily practice to build a streak.`:`${name} is just getting started. The first step is the hardest — great that they've begun!`}</p>
          </div>
        </div>

        <p className="text-[10px] text-gray-600 text-center">Share this report with your parents to show them your progress</p>
      </div>}

      {/* ═══ MISTAKES ═══ */}
      {sec==='mistakes'&&<div className="animate-enter">
        <div className="flex justify-between items-start mb-4"><div><p className="text-xs text-indigo-400 font-medium tracking-widest uppercase mb-1">Mistakes</p><h2 className="text-xl font-semibold">Your weak spots</h2></div>{mistakes.length>0&&<button onClick={()=>{if(confirm('Clear all?'))setMistakes([])}} className="text-xs text-gray-600 hover:text-red-400">Clear</button>}</div>
        {mistakes.length===0?<div className={card+' p-6 text-center'}><p className="text-sm text-gray-400">No mistakes yet. Use "Check Answer" to find your weak spots.</p></div>
        :<div className="space-y-2">{mistakes.map(m=><div key={m.id} className={`${card} p-4 ${m.practiced?'opacity-40':''}`}>
          <div className="flex justify-between mb-2"><span className={`text-[10px] px-2 py-0.5 rounded ${m.practiced?'bg-green-500/10 text-green-400':'bg-red-500/10 text-red-400'}`}>{m.practiced?'Practiced':'Needs practice'}</span><button onClick={()=>setMistakes(p=>p.filter(x=>x.id!==m.id))} className="text-gray-600 hover:text-red-400 text-xs">✕</button></div>
          <p className="text-[13px] text-gray-300 mb-1">{m.question}</p>
          <details className="mb-2"><summary className="text-xs text-indigo-400 cursor-pointer">Show analysis</summary><div className="mt-2"><Md text={m.analysis}/></div></details>
          <div className="flex gap-2"><button onClick={()=>{setSec('learn');setQ(m.question);setMode('step-by-step')}} className="text-xs text-indigo-400 hover:text-indigo-300">Practice →</button><button onClick={()=>setMistakes(p=>p.map(x=>x.id===m.id?{...x,practiced:!x.practiced}:x))} className="text-xs text-gray-500 hover:text-green-400">{m.practiced?'Undo':'Mark done'}</button></div>
        </div>)}</div>}
      </div>}

      </div>
    </main>
  </div>
}
