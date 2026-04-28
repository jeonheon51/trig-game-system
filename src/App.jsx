import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, XCircle, MousePointerClick, Info, RefreshCw, Eye, EyeOff, 
  PartyPopper, ArrowRight, Calculator, Move, Activity, Search, Users, 
  GraduationCap, LogOut, Clock, BarChart3
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, onSnapshot, query, orderBy } from 'firebase/firestore';

// ==========================================
// Firebase 初始化
// ==========================================
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'trig-game-app';

// ==========================================
// 共用元件與輔助函數 (Shared Components) 
// ==========================================
const RadicalWrapper = ({ children, colorClass = "", strokeWidth = 3 }) => {
  const yEnd = strokeWidth / 2;
  return (
    <span className={`inline-flex items-stretch align-middle font-serif ${colorClass}`}>
      <span className="w-[0.9em] relative shrink-0">
        <svg className="absolute bottom-0 right-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 20 24">
          <path d={`M 2 15 L 6 15 L 12 24 L 20 ${yEnd}`} fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </span>
      <span className="px-[0.3em] flex items-center justify-center" style={{ borderTopWidth: `${strokeWidth}px`, borderTopStyle: 'solid', borderColor: 'currentColor', paddingTop: '0.1em' }}>
        {children}
      </span>
    </span>
  );
};

const formatValue = (val) => {
  if (val === null || val === undefined || val === '') return '';
  const strVal = String(val);
  if (strVal.startsWith('-√')) {
    return (
      <span className="inline-flex items-center gap-[1px]">
        <span>-</span><RadicalWrapper strokeWidth={2.5}>{strVal.slice(2)}</RadicalWrapper>
      </span>
    );
  } else if (strVal.startsWith('√')) {
    return <RadicalWrapper strokeWidth={2.5}>{strVal.slice(1)}</RadicalWrapper>;
  } else if (['x', 'y', 'r'].includes(strVal)) {
    return <span className="italic font-serif font-medium">{strVal}</span>;
  }
  return strVal;
};

// 自動跳轉下一個空格的邏輯
const handleSlotAdvance = (activeSlot, newAns, setActiveSlot) => {
  if (activeSlot === 'sinNum' && newAns.sinDen === null) setActiveSlot('sinDen');
  else if (activeSlot === 'sinDen' && newAns.cosNum === null) setActiveSlot('cosNum');
  else if (activeSlot === 'cosNum' && newAns.cosDen === null) setActiveSlot('cosDen');
  else if (activeSlot === 'cosDen' && newAns.sinNum === null) setActiveSlot('sinNum');
  else if (newAns.sinNum === null) setActiveSlot('sinNum');
  else if (newAns.sinDen === null) setActiveSlot('sinDen');
  else if (newAns.cosNum === null) setActiveSlot('cosNum');
  else if (newAns.cosDen === null) setActiveSlot('cosDen');
};

const FractionInput = ({ funcName, thetaStr, num, den, activeSlot, setActiveSlot, colorTheme }) => {
  const isSin = funcName === 'sin';
  const colorClass = colorTheme || (isSin ? 'blue' : 'indigo');
  const borderFocus = `border-${colorClass}-500`;
  const bgFocus = `bg-${colorClass}-50`;
  const textFocus = `text-${colorClass}-700`;

  return (
    <div className="flex items-center gap-4 w-full justify-center">
      <span className="text-3xl font-serif italic text-slate-800 whitespace-nowrap w-32 text-right">{funcName} {thetaStr} =</span>
      <div className="flex flex-col items-center gap-1">
        <button onClick={() => setActiveSlot(`${funcName}Num`)} className={`w-14 h-12 rounded border-2 flex items-center justify-center text-xl font-bold transition-all ${activeSlot === `${funcName}Num` ? `${borderFocus} ${bgFocus} ${textFocus} scale-105` : 'border-slate-300 bg-white'}`}>
          {formatValue(num)}
        </button>
        <div className="w-16 h-[3px] bg-slate-800"></div>
        <button onClick={() => setActiveSlot(`${funcName}Den`)} className={`w-14 h-12 rounded border-2 flex items-center justify-center text-xl font-bold transition-all ${activeSlot === `${funcName}Den` ? `${borderFocus} ${bgFocus} ${textFocus} scale-105` : 'border-slate-300 bg-white'}`}>
          {formatValue(den)}
        </button>
      </div>
    </div>
  );
};

const CoordinateSystem = ({ children, originX = 160, originY = 160, gridSize = 320, scale = 40, showGrid = true }) => {
  const gridLines = [];
  if (showGrid) {
    for (let i = 0; originX + i * scale <= gridSize; i++) gridLines.push(<line key={`v-p-${i}`} x1={originX + i * scale} y1="0" x2={originX + i * scale} y2={gridSize} />);
    for (let i = 1; originX - i * scale >= 0; i++) gridLines.push(<line key={`v-n-${i}`} x1={originX - i * scale} y1="0" x2={originX - i * scale} y2={gridSize} />);
    for (let i = 0; originY - i * scale >= 0; i++) gridLines.push(<line key={`h-p-${i}`} x1="0" y1={originY - i * scale} x2={gridSize} y2={originY - i * scale} />);
    for (let i = 1; originY + i * scale <= gridSize; i++) gridLines.push(<line key={`h-n-${i}`} x1="0" y1={originY + i * scale} x2={gridSize} y2={originY + i * scale} />);
  }

  return (
    <div className="relative border border-slate-100 rounded-xl bg-slate-50 overflow-hidden shadow-inner select-none">
      <svg width={gridSize} height={gridSize} viewBox={`0 0 ${gridSize} ${gridSize}`} className="block">
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#334155" /></marker>
          <marker id="angle-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0,1 L8,4 L0,7 z" fill="#ea580c" /></marker>
        </defs>
        {showGrid && <g stroke="#e9ecef" strokeWidth="1" className="transition-all duration-500">{gridLines}</g>}
        <line x1="10" y1={originY} x2={gridSize - 10} y2={originY} stroke="#334155" strokeWidth="2" markerEnd="url(#arrow)" />
        <line x1={originX} y1={gridSize - 10} x2={originX} y2="10" stroke="#334155" strokeWidth="2" markerEnd="url(#arrow)" />
        <text x={gridSize - 20} y={originY - 10} className="text-sm fill-slate-700 font-bold">x</text>
        <text x={originX - 20} y="20" className="text-sm fill-slate-700 font-bold">y</text>
        
        {/* 原點 O */}
        <circle cx={originX} cy={originY} r="5" fill="#ef4444" className="pointer-events-none" />
        <text x={originX - 18} y={originY + 22} className="text-base fill-slate-800 font-bold pointer-events-none">O</text>
        {children}
      </svg>
    </div>
  );
};


// ==========================================
// 關卡內容元件 (Levels 1 - 8)
// ==========================================

// 關卡 1: 銳角回顧
const Level1 = ({ onComplete, onMistake }) => {
  const [ans, setAns] = useState({ sinNum: null, sinDen: null, cosNum: null, cosDen: null });
  const [activeSlot, setActiveSlot] = useState('sinNum');
  const [feedback, setFeedback] = useState(null);

  const handleNumClick = (val) => {
    setFeedback(null);
    setAns(prev => {
      const next = { ...prev, [activeSlot]: val };
      handleSlotAdvance(activeSlot, next, setActiveSlot);
      return next;
    });
  };

  const check = () => {
    if (ans.sinNum === null || ans.sinDen === null || ans.cosNum === null || ans.cosDen === null) return alert("請填寫完整的分子與分母哦！");
    if (ans.sinNum === 4 && ans.sinDen === 5 && ans.cosNum === 3 && ans.cosDen === 5) {
      setFeedback('correct');
    } else {
      setFeedback('incorrect');
      onMistake();
    }
  };

  const rad = Math.atan2(4, 3);
  const midX = 40 + 120 / 2, midY = 280 - 160 / 2;
  const offsetX = -Math.sin(rad) * 25, offsetY = -Math.cos(rad) * 25;

  return (
    <div className="grid md:grid-cols-2 gap-8 w-full animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col items-center">
        <h2 className="text-lg font-semibold mb-4 w-full text-left">觀察圖中的直角三角形：</h2>
        <CoordinateSystem originX={40} originY={280} scale={40}>
          <polygon points="40,280 160,120 160,280" fill="rgba(59, 130, 246, 0.15)" />
          <polyline points="150,280 150,270 160,270" fill="none" stroke="#2563eb" strokeWidth="1.5" />
          <path d="M 75 280 A 35 35 0 0 0 61 252" fill="none" stroke="#ea580c" strokeWidth="2.5" />
          <text x="75" y="265" className="text-lg fill-orange-600 font-serif font-bold italic">θ</text>
          
          <g onClick={() => handleNumClick(3)} className="cursor-pointer group">
            <line x1="40" y1="280" x2="160" y2="280" stroke="#2563eb" strokeWidth="2.5" className="group-hover:stroke-blue-500 group-hover:stroke-[4px]" />
            <text x="100" y="300" className="text-base font-semibold group-hover:fill-blue-600" textAnchor="middle">3</text>
          </g>
          <g onClick={() => handleNumClick(4)} className="cursor-pointer group">
            <line x1="160" y1="280" x2="160" y2="120" stroke="#2563eb" strokeWidth="2.5" className="group-hover:stroke-blue-500 group-hover:stroke-[4px]" />
            <text x="175" y="200" className="text-base font-semibold group-hover:fill-blue-600" dominantBaseline="middle">4</text>
          </g>
          <g onClick={() => handleNumClick(5)} className="cursor-pointer group">
            <line x1="40" y1="280" x2="160" y2="120" stroke="#2563eb" strokeWidth="2.5" className="group-hover:stroke-blue-500 group-hover:stroke-[4px]" />
            <text x={midX + offsetX} y={midY + offsetY} textAnchor="middle" dominantBaseline="middle" className="text-base font-bold fill-blue-700 group-hover:fill-blue-500 transition-all">5</text>
          </g>
          <g className="pointer-events-none">
            <circle cx="160" cy="120" r="5" fill="#ef4444" />
            <text x="170" y="115" className="text-sm fill-slate-800 font-semibold">B(3,4)</text>
            <circle cx="160" cy="280" r="5" fill="#ef4444" />
            <text x="170" y="300" className="text-sm fill-slate-800 font-semibold">C(3,0)</text>
          </g>
        </CoordinateSystem>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col justify-center">
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-2 text-slate-800">點擊左圖的邊長來輸入：</h2>
          <p className="text-slate-600">回想一下銳角三角比，sin θ 與 cos θ 分別代表哪兩邊的比值？</p>
        </div>
        <div className="flex flex-col gap-6 mb-8 bg-slate-50 p-6 rounded-xl border border-slate-100">
          <FractionInput funcName="sin" thetaStr="θ" num={ans.sinNum} den={ans.sinDen} activeSlot={activeSlot} setActiveSlot={setActiveSlot} />
          <FractionInput funcName="cos" thetaStr="θ" num={ans.cosNum} den={ans.cosDen} activeSlot={activeSlot} setActiveSlot={setActiveSlot} />
        </div>
        <div className="mt-auto">
          {feedback === 'correct' ? (
            <div className="w-full flex flex-col items-center animate-in fade-in">
              <div className="text-green-600 font-bold mb-4 flex items-center gap-2"><CheckCircle2/> 答對了！太棒了！</div>
              <button onClick={onComplete} className="w-full py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl flex justify-center gap-2">進入下一關 <ArrowRight/></button>
            </div>
          ) : (
            <button onClick={check} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md">送出答案</button>
          )}
          {feedback === 'incorrect' && <div className="text-red-500 font-bold mt-2 text-center flex justify-center gap-2"><XCircle/> 提示：sin 是對邊/斜邊，cos 是鄰邊/斜邊喔！</div>}
        </div>
      </div>
    </div>
  );
};

// 關卡 2: 坐標與三角比
const Level2 = ({ onComplete, onMistake }) => {
  const [successCount, setSuccessCount] = useState(0);
  const tris = [{ x: 3, y: 4, r: 5 }, { x: 8, y: 15, r: 17 }, { x: 5, y: 12, r: 13 }];
  const [triData, setTriData] = useState(tris[0]);
  const [ans, setAns] = useState({ sinNum: null, sinDen: null, cosNum: null, cosDen: null });
  const [activeSlot, setActiveSlot] = useState('sinNum');
  const [feedback, setFeedback] = useState(null);

  const handleNumClick = (val) => {
    setFeedback(null);
    setAns(prev => {
      const next = { ...prev, [activeSlot]: val };
      handleSlotAdvance(activeSlot, next, setActiveSlot);
      return next;
    });
  };

  const check = () => {
    if (ans.sinNum === null || ans.sinDen === null || ans.cosNum === null || ans.cosDen === null) return alert("請填滿！");
    if (ans.sinNum === triData.y && ans.sinDen === triData.r && ans.cosNum === triData.x && ans.cosDen === triData.r) {
      setFeedback('correct');
    } else {
      setFeedback('incorrect');
      onMistake();
    }
  };

  const nextQ = () => {
    setSuccessCount(c => c + 1);
    setTriData(tris[successCount + 1]);
    setAns({ sinNum: null, sinDen: null, cosNum: null, cosDen: null });
    setFeedback(null);
    setActiveSlot('sinNum');
  };

  const scale = 180 / Math.max(triData.x, triData.y);
  const px = triData.x * scale, py = triData.y * scale;
  const rad = Math.atan2(triData.y, triData.x);
  const midX = 40 + px / 2, midY = 280 - py / 2;
  const offsetX = -Math.sin(rad) * 25, offsetY = -Math.cos(rad) * 25;

  const arcRadius = 35;
  const arcEndX = 40 + arcRadius * Math.cos(rad);
  const arcEndY = 280 - arcRadius * Math.sin(rad);
  const arcPath = `M ${40 + arcRadius} 280 A ${arcRadius} ${arcRadius} 0 0 0 ${arcEndX} ${arcEndY}`;
  const thetaTextX = 40 + 48 * Math.cos(rad / 2) - 5;
  const thetaTextY = 280 - 48 * Math.sin(rad / 2) + 6;

  return (
    <div className="grid md:grid-cols-2 gap-8 w-full animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col items-center">
        <CoordinateSystem originX={40} originY={280} scale={scale}>
          <polygon points={`40,280 ${40+px},${280-py} ${40+px},280`} fill="rgba(59, 130, 246, 0.15)" />
          <line x1="40" y1="280" x2={40+px} y2={280-py} stroke="#2563eb" strokeWidth="2.5" />
          
          <path d={arcPath} fill="none" stroke="#ea580c" strokeWidth="2.5" className="transition-all duration-500" />
          <text x={thetaTextX} y={thetaTextY} className="text-lg fill-orange-600 font-serif font-bold italic transition-all duration-500">θ</text>

          <circle cx={40+px} cy={280-py} r="5" fill="#ef4444" />
          <text x={40+px+10} y={280-py-10} className="text-lg">
            B(<tspan className="font-bold fill-blue-600 cursor-pointer" onClick={()=>handleNumClick(triData.x)}>{triData.x}</tspan>, 
            <tspan className="font-bold fill-blue-600 cursor-pointer" onClick={()=>handleNumClick(triData.y)}>{triData.y}</tspan>)
          </text>
          <foreignObject x={midX + offsetX - 40} y={midY + offsetY - 20} width="80" height="40" className="overflow-visible">
            <div className="w-full h-full flex items-center justify-center font-bold text-lg text-blue-600 cursor-pointer" onClick={()=>handleNumClick(triData.r)}>{triData.r}</div>
          </foreignObject>
        </CoordinateSystem>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col justify-center">
        <div className="mb-6 bg-blue-50 p-4 rounded-lg">這次拿掉了邊長，請直接點擊 B 點坐標與斜邊來填寫三角比。</div>
        <div className="flex flex-col gap-6 mb-8 bg-slate-50 p-4 rounded-xl border">
          <FractionInput funcName="sin" thetaStr="θ" num={ans.sinNum} den={ans.sinDen} activeSlot={activeSlot} setActiveSlot={setActiveSlot} />
          <FractionInput funcName="cos" thetaStr="θ" num={ans.cosNum} den={ans.cosDen} activeSlot={activeSlot} setActiveSlot={setActiveSlot} />
        </div>
        <div className="mt-auto">
          {feedback === 'correct' ? (
            successCount < 2 ? 
              <button onClick={nextQ} className="w-full py-3 bg-green-500 text-white font-bold rounded-xl flex justify-center gap-2"><RefreshCw/> 換個數字練習 ({successCount+1}/3)</button> :
              <button onClick={onComplete} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl flex justify-center gap-2">進入下一關 <ArrowRight/></button>
          ) : (
            <button onClick={check} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl">送出答案</button>
          )}
          {feedback === 'incorrect' && <div className="text-red-500 font-bold mt-2 text-center">sin對應y，cos對應x喔！</div>}
        </div>
      </div>
    </div>
  );
};

// 關卡 3: 自己算斜邊
const Level3 = ({ onComplete, onMistake }) => {
  const [successCount, setSuccessCount] = useState(0);
  const tris = [{ x: 3, y: 4, rSq: 25, r: 5 }, { x: 1, y: 1, rSq: 2, r: '√2' }, { x: 1, y: 2, rSq: 5, r: '√5' }];
  const [triData, setTriData] = useState(tris[0]);
  const [step, setStep] = useState(1);
  const [rInput, setRInput] = useState('');
  const [ans, setAns] = useState({ sinNum: null, sinDen: null, cosNum: null, cosDen: null });
  const [activeSlot, setActiveSlot] = useState('sinNum');
  const [feedback, setFeedback] = useState(null);

  const handleNumClick = (val) => {
    if (step !== 2) return;
    setFeedback(null);
    setAns(prev => {
      const next = { ...prev, [activeSlot]: val };
      handleSlotAdvance(activeSlot, next, setActiveSlot);
      return next;
    });
  };

  const checkR = () => {
    if (parseInt(rInput) === triData.rSq) {
      setFeedback('r_correct');
      setTimeout(() => { setStep(2); setFeedback(null); }, 1500);
    } else { setFeedback('r_incorrect'); onMistake(); }
  };

  const checkTrig = () => {
    if (ans.sinNum === triData.y && ans.sinDen === triData.r && ans.cosNum === triData.x && ans.cosDen === triData.r) {
      setFeedback('correct');
    } else { setFeedback('incorrect'); onMistake(); }
  };

  const nextQ = () => {
    setSuccessCount(c => c + 1); setTriData(tris[successCount + 1]);
    setStep(1); setRInput(''); setAns({ sinNum: null, sinDen: null, cosNum: null, cosDen: null }); setFeedback(null); setActiveSlot('sinNum');
  };

  const scale = 180 / Math.max(triData.x, triData.y);
  const px = triData.x * scale, py = triData.y * scale;
  const rad = Math.atan2(triData.y, triData.x);
  const midX = 40 + px / 2, midY = 280 - py / 2;
  const offsetX = -Math.sin(rad) * 25, offsetY = -Math.cos(rad) * 25;

  const arcRadius = 35;
  const arcEndX = 40 + arcRadius * Math.cos(rad);
  const arcEndY = 280 - arcRadius * Math.sin(rad);
  const arcPath = `M ${40 + arcRadius} 280 A ${arcRadius} ${arcRadius} 0 0 0 ${arcEndX} ${arcEndY}`;
  const thetaTextX = 40 + 48 * Math.cos(rad / 2) - 5;
  const thetaTextY = 280 - 48 * Math.sin(rad / 2) + 6;

  return (
    <div className="grid md:grid-cols-2 gap-8 w-full animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col items-center">
        <CoordinateSystem originX={40} originY={280} scale={scale}>
          <polygon points={`40,280 ${40+px},${280-py} ${40+px},280`} fill="rgba(59, 130, 246, 0.15)" />
          <line x1="40" y1="280" x2={40+px} y2={280-py} stroke="#2563eb" strokeWidth="2.5" />
          
          <path d={arcPath} fill="none" stroke="#ea580c" strokeWidth="2.5" className="transition-all duration-500" />
          <text x={thetaTextX} y={thetaTextY} className="text-lg fill-orange-600 font-serif font-bold italic transition-all duration-500">θ</text>

          <circle cx={40+px} cy={280-py} r="5" fill="#ef4444" />
          <text x={40+px+10} y={280-py-10} className="text-lg">
            B(<tspan className={`font-bold fill-blue-600 transition-colors ${step === 2 ? 'pointer-events-auto cursor-pointer hover:fill-orange-500 underline decoration-2 underline-offset-4' : ''}`} onClick={()=>handleNumClick(triData.x)}>{triData.x}</tspan>, 
            <tspan className={`font-bold fill-blue-600 transition-colors ${step === 2 ? 'pointer-events-auto cursor-pointer hover:fill-orange-500 underline decoration-2 underline-offset-4' : ''}`} onClick={()=>handleNumClick(triData.y)}>{triData.y}</tspan>)
          </text>
          {step === 1 ? (
             <text x={midX + offsetX} y={midY + offsetY} textAnchor="middle" dominantBaseline="middle" className="font-bold fill-orange-500 text-2xl">?</text>
          ) : (
             <foreignObject x={midX + offsetX - 40} y={midY + offsetY - 20} width="80" height="40" className="overflow-visible">
               <div className="w-full h-full flex items-center justify-center font-bold text-lg text-blue-600 cursor-pointer" onClick={()=>handleNumClick(triData.r)}>{formatValue(triData.r)}</div>
             </foreignObject>
          )}
        </CoordinateSystem>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col justify-center">
        {step === 1 ? (
          <div className="flex flex-col gap-6 animate-in fade-in">
            <h2 className="text-xl font-bold"><Calculator className="inline w-5 h-5"/> Step 1: 先算斜邊 r</h2>
            <div className="flex items-center gap-2 text-2xl font-serif justify-center">
               <span className="italic">r</span> = <RadicalWrapper strokeWidth={3}>{triData.x}²+{triData.y}²</RadicalWrapper> = 
               <RadicalWrapper colorClass="text-teal-600" strokeWidth={3}>
                  <input type="number" value={rInput} onChange={e=>setRInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&checkR()} className="w-16 text-center text-teal-700 bg-transparent border-b-2 border-teal-300 outline-none" />
               </RadicalWrapper>
            </div>
            <button onClick={checkR} className="py-3 bg-teal-600 text-white font-bold rounded-xl mt-4">確認斜邊</button>
            {feedback === 'r_correct' && <div className="text-green-600 font-bold text-center">斜邊解鎖！</div>}
            {feedback === 'r_incorrect' && <div className="text-red-500 font-bold text-center">加法算錯囉！</div>}
          </div>
        ) : (
          <div className="flex flex-col gap-6 animate-in slide-in-from-right-4">
             <h2 className="text-xl font-bold"><MousePointerClick className="inline w-5 h-5"/> Step 2: 填入三角比</h2>
             <div className="flex flex-col gap-6 bg-slate-50 p-4 rounded-xl border">
              <FractionInput funcName="sin" thetaStr="θ" num={ans.sinNum} den={ans.sinDen} activeSlot={activeSlot} setActiveSlot={setActiveSlot} />
              <FractionInput funcName="cos" thetaStr="θ" num={ans.cosNum} den={ans.cosDen} activeSlot={activeSlot} setActiveSlot={setActiveSlot} />
             </div>
             {feedback === 'correct' ? (
                successCount < 2 ? 
                <button onClick={nextQ} className="w-full py-3 bg-green-500 text-white font-bold rounded-xl flex justify-center gap-2"><RefreshCw/> 下一題 ({successCount+1}/3)</button> :
                <button onClick={onComplete} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl flex justify-center gap-2">拆除鷹架 <ArrowRight/></button>
             ) : (
                <button onClick={checkTrig} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl">送出答案</button>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

// 關卡 4: 拆除鷹架
const Level4 = ({ onComplete, onMistake }) => {
  const [successCount, setSuccessCount] = useState(0);
  const tris = [{ x: 5, y: 12, r: 13 }, { x: 8, y: 15, r: 17 }, { isSymbolic: true, x: 'x', y: 'y', r: 'r' }];
  const [triData, setTriData] = useState(tris[0]);
  const [ans, setAns] = useState({ sinNum: null, sinDen: null, cosNum: null, cosDen: null });
  const [activeSlot, setActiveSlot] = useState('sinNum');
  const [feedback, setFeedback] = useState(null);
  const [showScaffold, setShowScaffold] = useState(false);

  const handleNumClick = (val) => {
    setFeedback(null);
    setAns(prev => {
      const next = { ...prev, [activeSlot]: val };
      handleSlotAdvance(activeSlot, next, setActiveSlot);
      return next;
    });
  };

  const check = () => {
    if (ans.sinNum === triData.y && ans.sinDen === triData.r && ans.cosNum === triData.x && ans.cosDen === triData.r) {
      setFeedback('correct');
    } else { setFeedback('incorrect'); onMistake(); }
  };

  const nextQ = () => {
    setSuccessCount(c => c + 1); setTriData(tris[successCount + 1]);
    setAns({ sinNum: null, sinDen: null, cosNum: null, cosDen: null }); setFeedback(null); setActiveSlot('sinNum'); setShowScaffold(false);
  };

  const drawX = triData.isSymbolic ? 4 : triData.x;
  const drawY = triData.isSymbolic ? 3 : triData.y;
  const scale = 180 / Math.max(drawX, drawY);
  const px = drawX * scale, py = drawY * scale;
  const rad = Math.atan2(drawY, drawX);
  const midX = 40 + px / 2, midY = 280 - py / 2;
  const offsetX = -Math.sin(rad) * 25, offsetY = -Math.cos(rad) * 25;

  const arcRadius = 35;
  const arcEndX = 40 + arcRadius * Math.cos(rad);
  const arcEndY = 280 - arcRadius * Math.sin(rad);
  const arcPath = `M ${40 + arcRadius} 280 A ${arcRadius} ${arcRadius} 0 0 0 ${arcEndX} ${arcEndY}`;
  const thetaTextX = 40 + 48 * Math.cos(rad / 2) - 5;
  const thetaTextY = 280 - 48 * Math.sin(rad / 2) + 6;

  return (
    <div className="grid md:grid-cols-2 gap-8 w-full animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col items-center">
        <CoordinateSystem originX={40} originY={280} scale={scale}>
          <g className={`transition-opacity duration-500 ${showScaffold ? 'opacity-100' : 'opacity-0'}`}>
            <polyline points={`40,280 ${40+px},280 ${40+px},${280-py}`} fill="none" stroke="#64748b" strokeWidth="2.5" strokeDasharray="6,6" />
          </g>
          <line x1="40" y1="280" x2={40+px} y2={280-py} stroke="#2563eb" strokeWidth="2.5" />
          
          <path d={arcPath} fill="none" stroke="#ea580c" strokeWidth="2.5" className="transition-all duration-500" />
          <text x={thetaTextX} y={thetaTextY} className="text-lg fill-orange-600 font-serif font-bold italic transition-all duration-500">θ</text>

          <circle cx={40+px} cy={280-py} r="5" fill="#ef4444" />
          {/* 在 SVG <text> 中不可以使用包含 HTML 的 formatValue，直接渲染字串即可保持正確 */}
          <text x={40+px+10} y={280-py-10} className="text-lg">
            P(<tspan className={`font-bold fill-blue-600 cursor-pointer ${triData.isSymbolic ? 'italic font-serif' : ''}`} onClick={()=>handleNumClick(triData.x)}>{triData.x}</tspan>, 
            <tspan className={`font-bold fill-blue-600 cursor-pointer ${triData.isSymbolic ? 'italic font-serif' : ''}`} onClick={()=>handleNumClick(triData.y)}>{triData.y}</tspan>)
          </text>
          <foreignObject x={midX + offsetX - 40} y={midY + offsetY - 20} width="80" height="40" className="overflow-visible">
            <div className={`w-full h-full flex items-center justify-center font-bold text-lg text-blue-600 cursor-pointer ${triData.isSymbolic ? 'italic font-serif' : ''}`} onClick={()=>handleNumClick(triData.r)}>{formatValue(triData.r)}</div>
          </foreignObject>
        </CoordinateSystem>
        <button onClick={() => setShowScaffold(!showScaffold)} className="mt-4 border-2 p-2 rounded-lg text-purple-600 font-bold hover:bg-purple-50">{showScaffold?'隱藏三角形':'秀給我看直角三角形'}</button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col justify-center">
         <div className="mb-6 bg-purple-50 p-4 rounded-lg">{triData.isSymbolic ? '最終挑戰：請點擊代數符號作答！' : '直角三角形被隱藏了！請依賴坐標。'}</div>
         <div className="flex flex-col gap-6 mb-8 bg-slate-50 p-4 rounded-xl border">
          <FractionInput funcName="sin" thetaStr="θ" num={ans.sinNum} den={ans.sinDen} activeSlot={activeSlot} setActiveSlot={setActiveSlot} />
          <FractionInput funcName="cos" thetaStr="θ" num={ans.cosNum} den={ans.cosDen} activeSlot={activeSlot} setActiveSlot={setActiveSlot} />
         </div>
         {feedback === 'correct' ? (
            successCount < 2 ? 
            <button onClick={nextQ} className="w-full py-3 bg-green-500 text-white font-bold rounded-xl flex justify-center gap-2"><RefreshCw/> 繼續練習 ({successCount+1}/3)</button> :
            <button onClick={onComplete} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl flex justify-center gap-2">進入第二象限 <ArrowRight/></button>
         ) : (
            <button onClick={check} className="w-full py-3 bg-purple-600 text-white font-bold rounded-xl">送出答案</button>
         )}
      </div>
    </div>
  );
};

// 關卡 5: 動態坐標與極限
const Level5 = ({ onComplete, onMistake }) => {
  const [angle, setAngle] = useState(53); 
  const [isDragging, setIsDragging] = useState(false);
  const svgRef = useRef(null);
  const [part, setPart] = useState(1); 
  const [ansSin, setAnsSin] = useState({ p0x: '', p0y: '', sin0: '', p90x: '', p90y: '', sin90: '' });
  const [ansCos, setAnsCos] = useState({ p0x: '', p0y: '', cos0: '', p90x: '', p90y: '', cos90: '' });
  const [feedback, setFeedback] = useState(null);

  const updateAngle = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left - 40; 
    const y = 280 - ((e.clientY || (e.touches && e.touches[0].clientY)) - rect.top); 
    let roundedAngle = Math.round(Math.atan2(y, x) * (180 / Math.PI));
    if (roundedAngle > 89) roundedAngle = 89;
    if (roundedAngle < 1) roundedAngle = 1;
    setAngle(roundedAngle);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', updateAngle);
      window.addEventListener('pointerup', () => setIsDragging(false));
    }
    return () => { window.removeEventListener('pointermove', updateAngle); window.removeEventListener('pointerup', () => setIsDragging(false)); };
  }, [isDragging]);

  const check = () => {
    if (part === 1) {
      if (ansSin.p0x==='5' && ansSin.p0y==='0' && ansSin.sin0==='0' && ansSin.p90x==='0' && ansSin.p90y==='5' && ansSin.sin90==='1') {
        setFeedback('correct'); setAnsCos(p => ({...p, p0x:'5', p0y:'0', p90x:'0', p90y:'5'}));
        setTimeout(() => { setPart(2); setFeedback(null); }, 2000);
      } else { setFeedback('incorrect'); onMistake(); }
    } else if (part === 2) {
      if (ansCos.cos0==='1' && ansCos.cos90==='0') {
        setFeedback('correct'); setTimeout(() => { setPart(3); setFeedback(null); }, 2000);
      } else { setFeedback('incorrect'); onMistake(); }
    }
  };

  const r = 5, rad = angle * (Math.PI / 180);
  const mathX = r * Math.cos(rad), mathY = r * Math.sin(rad);
  const px = mathX * (240/5), py = mathY * (240/5);
  const midX = 40 + px / 2, midY = 280 - py / 2;
  const offsetX = -Math.sin(rad) * 25, offsetY = -Math.cos(rad) * 25;

  const arcRadius = 35;
  const arcEndX = 40 + arcRadius * Math.cos(rad);
  const arcEndY = 280 - arcRadius * Math.sin(rad);
  const arcPath = `M ${40 + arcRadius} 280 A ${arcRadius} ${arcRadius} 0 0 0 ${arcEndX} ${arcEndY}`;
  const thetaTextX = 40 + 48 * Math.cos(rad / 2) - 15;
  const thetaTextY = 280 - 48 * Math.sin(rad / 2) + 6;

  const renderInput = (stateObj, setter, field, colorClass, isReadOnly) => (
    <input type="text" value={stateObj[field]} readOnly={isReadOnly} onChange={e=>!isReadOnly&&setter({...stateObj, [field]: e.target.value})} className={`w-12 h-8 text-center font-bold border-2 rounded outline-none ${colorClass} ${isReadOnly?'bg-slate-100 opacity-80':'bg-white'}`} />
  );

  return (
    <div className="grid md:grid-cols-2 gap-8 w-full animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col items-center">
        <h2 className="text-lg font-semibold mb-4 w-full">請在畫布上拖曳 P 點：</h2>
        <div className="relative border border-slate-100 rounded-xl bg-slate-50 overflow-hidden shadow-inner cursor-pointer" onPointerDown={e => {setIsDragging(true); updateAngle(e);}} style={{ touchAction: 'none' }}>
          <svg ref={svgRef} width="320" height="320" viewBox="0 0 320 320" className="block">
            <g stroke="#e9ecef" strokeWidth="1">
              {[...Array(7)].map((_,i) => <line key={`v-${i}`} x1={40+i*48} y1="20" x2={40+i*48} y2="300" />)}
              {[...Array(7)].map((_,i) => <line key={`h-${i}`} x1="20" y1={280-i*48} x2="300" y2={280-i*48} />)}
            </g>
            <path d="M 280 280 A 240 240 0 0 0 40 40" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="5,5" />
            <line x1="0" y1="280" x2="300" y2="280" stroke="#334155" strokeWidth="2" markerEnd="url(#arrow)" />
            <line x1="40" y1="320" x2="40" y2="20" stroke="#334155" strokeWidth="2" markerEnd="url(#arrow)" />
            
            <circle cx="40" cy="280" r="5" fill="#ef4444" className="pointer-events-none" />
            <text x="22" y="302" className="text-base fill-slate-800 font-bold pointer-events-none">O</text>

            <line x1="40" y1="280" x2={40+px} y2={280-py} stroke="#2563eb" strokeWidth="3" />
            
            <path d={arcPath} fill="none" stroke="#ea580c" strokeWidth="2.5" />
            <text x={thetaTextX} y={thetaTextY} className="text-base fill-orange-600 font-bold">θ={angle}°</text>

            <text x={midX + offsetX} y={midY + offsetY} textAnchor="middle" dominantBaseline="middle" className="text-lg font-bold fill-slate-700 pointer-events-none">r=5</text>
            <line x1={40+px} y1={280-py} x2={40+px} y2={280} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.6" />
            <line x1={40+px} y1={280-py} x2={40} y2={280-py} stroke="#2563eb" strokeWidth="1.5" strokeDasharray="4,4" opacity="0.6" />
            <circle cx={40+px} cy={280-py} r="15" fill="#fbcfe8" opacity="0.5" className={isDragging ? 'scale-125' : 'animate-pulse'} />
            <circle cx={40+px} cy={280-py} r="6" fill="#ec4899" />
            <text x={40+px+12} y={280-py-12} className="text-lg font-bold"><tspan fill="#1e293b">P(</tspan><tspan fill="#2563eb">{mathX.toFixed(3)}</tspan><tspan fill="#1e293b">,</tspan><tspan fill="#ef4444">{mathY.toFixed(3)}</tspan><tspan fill="#1e293b">)</tspan></text>
            <defs>
               <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="#334155" /></marker>
            </defs>
          </svg>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col justify-center">
         {part === 1 && (
            <div className="flex flex-col gap-4 animate-in fade-in">
              <div className="text-3xl text-center font-serif italic mb-4">sin {angle}° = <span className="text-red-500 font-bold">{mathY.toFixed(3)}</span> / 5</div>
              <div className="bg-red-50 p-3 rounded-lg border border-red-100">1. 當 θ=0°，P({renderInput(ansSin, setAnsSin, 'p0x', 'border-slate-300')}, {renderInput(ansSin, setAnsSin, 'p0y', 'border-red-300 text-red-600')})</div>
              <div className="bg-red-50 p-3 rounded-lg border border-red-100">2. 推測 sin 0° = {renderInput(ansSin, setAnsSin, 'sin0', 'border-red-300 text-red-600')}</div>
              <div className="bg-red-50 p-3 rounded-lg border border-red-100">3. 當 θ=90°，P({renderInput(ansSin, setAnsSin, 'p90x', 'border-slate-300')}, {renderInput(ansSin, setAnsSin, 'p90y', 'border-red-300 text-red-600')})</div>
              <div className="bg-red-50 p-3 rounded-lg border border-red-100">4. 推測 sin 90° = {renderInput(ansSin, setAnsSin, 'sin90', 'border-red-300 text-red-600')}</div>
              <button onClick={check} className="py-3 bg-red-500 text-white font-bold rounded-xl mt-2">驗證推測</button>
            </div>
         )}
         {part === 2 && (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-right-4">
              <div className="text-3xl text-center font-serif italic mb-4">cos {angle}° = <span className="text-blue-600 font-bold">{mathX.toFixed(3)}</span> / 5</div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 opacity-80">1. 已知 P({renderInput(ansCos, setAnsCos, 'p0x', 'text-blue-600', true)}, {renderInput(ansCos, setAnsCos, 'p0y', '', true)})</div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">2. 推測 cos 0° = {renderInput(ansCos, setAnsCos, 'cos0', 'border-blue-300 text-blue-600')}</div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 opacity-80">3. 已知 P({renderInput(ansCos, setAnsCos, 'p90x', 'text-blue-600', true)}, {renderInput(ansCos, setAnsCos, 'p90y', '', true)})</div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">4. 推測 cos 90° = {renderInput(ansCos, setAnsCos, 'cos90', 'border-blue-300 text-blue-600')}</div>
              <button onClick={check} className="py-3 bg-blue-600 text-white font-bold rounded-xl mt-2">驗證推測</button>
            </div>
         )}
         {part === 3 && (
            <div className="flex flex-col items-center justify-center text-center animate-in zoom-in">
              <PartyPopper className="w-16 h-16 text-yellow-500 mb-6" />
              <h2 className="text-2xl font-bold mb-4">太棒了！親手定義 0° 和 90°！</h2>
              <button onClick={onComplete} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl mt-4">前往各個象限</button>
            </div>
         )}
      </div>
    </div>
  );
};

// 關卡 6: 各個象限
const Level6 = ({ onComplete, onMistake }) => {
  const [successCount, setSuccessCount] = useState(0);
  const qTris = [ { x: -3, y: 4, r: 5 }, { x: -4, y: -3, r: 5 }, { x: 5, y: -12, r: 13 } ];
  const [triData, setTriData] = useState(qTris[0]);
  const [ans, setAns] = useState({ sinNum: null, sinDen: null, cosNum: null, cosDen: null });
  const [activeSlot, setActiveSlot] = useState('sinNum');
  const [feedback, setFeedback] = useState(null);

  const handleNumClick = (val) => {
    setFeedback(null);
    setAns(prev => {
      const next = { ...prev, [activeSlot]: val };
      handleSlotAdvance(activeSlot, next, setActiveSlot);
      return next;
    });
  };

  const check = () => {
    if (ans.sinNum === triData.y && ans.sinDen === triData.r && ans.cosNum === triData.x && ans.cosDen === triData.r) {
      setFeedback('correct');
    } else { setFeedback('incorrect'); onMistake(); }
  };

  const nextQ = () => {
    setSuccessCount(c => c + 1); setTriData(qTris[successCount + 1]);
    setAns({ sinNum: null, sinDen: null, cosNum: null, cosDen: null }); setFeedback(null); setActiveSlot('sinNum');
  };

  const scale = 100 / Math.max(Math.abs(triData.x), Math.abs(triData.y));
  const px = triData.x * scale, py = triData.y * scale;
  
  // 計算完整的圓弧角度 (0 ~ 360)
  let mathAngle = Math.atan2(triData.y, triData.x);
  if (mathAngle < 0) mathAngle += 2 * Math.PI;
  const midX = 160 + px / 2, midY = 160 - py / 2;
  
  // 修正：依據不同象限動態決定斜邊數值的推移方向，使其永遠向外
  const signMultiplier = (triData.x * triData.y >= 0) ? -1 : 1;
  const offsetX = signMultiplier * Math.sin(mathAngle) * 30;
  const offsetY = signMultiplier * Math.cos(mathAngle) * 30;

  // 修正：動態決定 P 點標示的位置與對齊方式，避免在第三、四象限時擋住坐標點
  const pLabelOffsetX = triData.x > 0 ? 10 : -10;
  const pLabelOffsetY = triData.y > 0 ? -10 : 25;
  const pTextAnchor = triData.x > 0 ? "start" : "end";

  const arcRadius = 35;
  const arcEndX = 160 + arcRadius * Math.cos(mathAngle);
  const arcEndY = 160 - arcRadius * Math.sin(mathAngle);
  const largeArcFlag = mathAngle > Math.PI ? 1 : 0;
  const arcPath = `M ${160 + arcRadius} 160 A ${arcRadius} ${arcRadius} 0 ${largeArcFlag} 0 ${arcEndX} ${arcEndY}`;
  const thetaTextX = 160 + 50 * Math.cos(mathAngle / 2) - 5;
  const thetaTextY = 160 - 50 * Math.sin(mathAngle / 2) + 5;

  return (
    <div className="grid md:grid-cols-2 gap-8 w-full animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col items-center">
        <CoordinateSystem originX={160} originY={160} scale={scale}>
           <line x1={160} y1={160} x2={160+px} y2={160-py} stroke="#2563eb" strokeWidth="2.5" />
           
           {/* 有向角弧線與箭頭 */}
           <path d={arcPath} fill="none" stroke="#ea580c" strokeWidth="2.5" markerEnd="url(#angle-arrow)" className="transition-all duration-500" />
           <text x={thetaTextX} y={thetaTextY} className="text-lg fill-orange-600 font-serif font-bold italic transition-all duration-500">θ</text>

           <circle cx={160+px} cy={160-py} r="5" fill="#ef4444" />
           <text x={160+px+pLabelOffsetX} y={160-py+pLabelOffsetY} textAnchor={pTextAnchor} className="text-lg">
             P(<tspan className="font-bold fill-blue-600 cursor-pointer hover:fill-orange-500" onClick={()=>handleNumClick(triData.x)}>{triData.x}</tspan>, 
             <tspan className="font-bold fill-blue-600 cursor-pointer hover:fill-orange-500" onClick={()=>handleNumClick(triData.y)}>{triData.y}</tspan>)
           </text>
           <foreignObject x={midX + offsetX - 40} y={midY + offsetY - 20} width="80" height="40" className="overflow-visible">
             <div className="w-full h-full flex items-center justify-center font-bold text-lg text-blue-600 cursor-pointer hover:text-orange-500 transition-colors" onClick={()=>handleNumClick(triData.r)}>{triData.r}</div>
           </foreignObject>
        </CoordinateSystem>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col justify-center">
         <div className="mb-6 bg-emerald-50 p-4 rounded-lg">注意坐標的負號！請勇敢填入。</div>
         <div className="flex flex-col gap-6 mb-8 bg-slate-50 p-4 rounded-xl border">
          <FractionInput funcName="sin" thetaStr="θ" num={ans.sinNum} den={ans.sinDen} activeSlot={activeSlot} setActiveSlot={setActiveSlot} />
          <FractionInput funcName="cos" thetaStr="θ" num={ans.cosNum} den={ans.cosDen} activeSlot={activeSlot} setActiveSlot={setActiveSlot} />
         </div>
         {feedback === 'correct' ? (
            successCount < 2 ? 
            <button onClick={nextQ} className="w-full py-3 bg-green-500 text-white font-bold rounded-xl"><RefreshCw className="inline"/> 下一個象限 ({successCount+1}/3)</button> :
            <button onClick={onComplete} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl">前往正負號偵探 <ArrowRight className="inline"/></button>
         ) : (
            <button onClick={check} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl">送出答案</button>
         )}
      </div>
    </div>
  );
};

// 關卡 7: 正負號偵探
const Level7 = ({ onComplete, onMistake }) => {
  const challenges = [
    { cond: [{f:'sin θ',s:'>',v:'0'}, {f:'cos θ',s:'<',v:'0'}], ans: 2 },
    { cond: [{f:'sin θ',s:'<',v:'0'}, {f:'cos θ',s:'>',v:'0'}], ans: 4 },
    { cond: [{f:'tan θ',s:'>',v:'0'}, {f:'sin θ',s:'<',v:'0'}], ans: 3 }
  ];
  const [successCount, setSuccessCount] = useState(0);
  const [chal, setChal] = useState(challenges[0]);
  const [feedback, setFeedback] = useState(null);

  const handleQClick = (q) => {
    if (feedback === 'correct') return;
    if (q === chal.ans) { setFeedback('correct'); }
    else { setFeedback('incorrect'); onMistake(); }
  };

  const nextQ = () => {
    if (successCount < 2) {
      setSuccessCount(c => c + 1); setChal(challenges[successCount + 1]); setFeedback(null);
    } else { onComplete(); }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8 w-full animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col items-center">
         <h2 className="text-lg font-semibold mb-4 w-full">點擊符合條件的象限：</h2>
         <div className="relative border border-slate-200 rounded-xl bg-slate-50 overflow-hidden shadow-inner cursor-pointer select-none">
            <svg width="320" height="320" viewBox="0 0 320 320">
               <line x1="10" y1="160" x2="310" y2="160" stroke="#334155" strokeWidth="2.5" />
               <line x1="160" y1="310" x2="160" y2="10" stroke="#334155" strokeWidth="2.5" />
               {[ {id:1, x:160, y:0, n:"I"}, {id:2, x:0, y:0, n:"II"}, {id:3, x:0, y:160, n:"III"}, {id:4, x:160, y:160, n:"IV"} ].map(q => (
                 <g key={q.id} onClick={() => handleQClick(q.id)} className="hover:opacity-50 transition-opacity">
                   <rect x={q.x} y={q.y} width="160" height="160" fill="transparent" />
                   <text x={q.x+80} y={q.y+80} className="text-6xl font-serif font-bold fill-amber-500/20" textAnchor="middle" dominantBaseline="middle">{q.n}</text>
                 </g>
               ))}
               <circle cx="160" cy="160" r="5" fill="#ef4444" className="pointer-events-none" />
               <text x="142" y="182" className="text-base fill-slate-800 font-bold pointer-events-none">O</text>
            </svg>
         </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col justify-center">
         <div className="text-slate-500 font-semibold mb-4 text-center text-lg">條件</div>
         <div className="flex flex-col gap-3 mb-8">
            {chal.cond.map((c, i) => (
              <div key={i} className="bg-slate-50 p-4 text-2xl font-serif font-bold text-center border rounded-lg shadow-sm">
                 <span className="italic">{c.f}</span> <span className="text-amber-500">{c.s}</span> {c.v}
              </div>
            ))}
         </div>
         {feedback === 'correct' ? (
           successCount < 2 ? 
             <button onClick={nextQ} className="w-full flex justify-center items-center gap-2 py-3 bg-amber-500 text-white font-bold rounded-xl"><ArrowRight className="w-5 h-5"/> 下一個任務 ({successCount+1}/3)</button> :
             <button onClick={onComplete} className="w-full flex justify-center items-center gap-2 py-3 bg-blue-600 text-white font-bold rounded-xl">前往最終計算 <ArrowRight className="w-5 h-5"/></button>
         ) : feedback === 'incorrect' ? (
           <div className="text-red-500 font-bold text-center">象限錯誤，請想清楚 x, y 的正負號再點擊喔！</div>
         ) : <div className="text-center text-slate-400 font-bold">等待點擊...</div>}
      </div>
    </div>
  );
};

// 關卡 8: 特殊廣義角的計算
const challenges8 = [
  { angle: 150, refAngle: 30, r: 2, x: '-√3', y: 1, sinNum: 1, sinDen: 2, cosNum: '-√3', cosDen: 2 },
  { angle: 225, refAngle: 45, r: '√2', x: -1, y: -1, sinNum: -1, sinDen: '√2', cosNum: -1, cosDen: '√2' },
  { angle: 300, refAngle: 60, r: 2, x: 1, y: '-√3', sinNum: '-√3', sinDen: 2, cosNum: 1, cosDen: 2 },
  { angle: 120, refAngle: 60, r: 2, x: -1, y: '√3', sinNum: '√3', sinDen: 2, cosNum: -1, cosDen: 2 },
  { angle: 210, refAngle: 30, r: 2, x: '-√3', y: -1, sinNum: -1, sinDen: 2, cosNum: '-√3', cosDen: 2 },
  { angle: 315, refAngle: 45, r: '√2', x: 1, y: -1, sinNum: -1, sinDen: '√2', cosNum: 1, cosDen: '√2' }
];

const Level8 = ({ onComplete, onMistake }) => {
  const [successCount, setSuccessCount] = useState(0);
  const [challenge, setChallenge] = useState(challenges8[0]);
  const [step, setStep] = useState(1);
  const [ans, setAns] = useState({ refAngle: '', px: null, py: null, sinNum: null, sinDen: null, cosNum: null, cosDen: null });
  const [activeSlot, setActiveSlot] = useState(null);
  const [showScaffold, setShowScaffold] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const handleKeypadClick = (val) => {
    if (!activeSlot) return;
    setAns(prev => {
      const next = { ...prev, [activeSlot]: val };
      if (step === 2) {
         if (activeSlot === 'px' && next.py === null) setActiveSlot('py');
         else if (activeSlot === 'py' && next.px === null) setActiveSlot('px');
      } else if (step === 3) {
         handleSlotAdvance(activeSlot, next, setActiveSlot);
      }
      return next;
    });
    setFeedback(null);
  };

  const check = () => {
    if (step === 1) {
      if (parseInt(ans.refAngle) === challenge.refAngle) {
        setFeedback('correct');
        setTimeout(() => { setStep(2); setFeedback(null); setActiveSlot('px'); setShowScaffold(true); }, 1500);
      } else { setFeedback('incorrect'); onMistake(); }
    } else if (step === 2) {
      if (String(ans.px) === String(challenge.x) && String(ans.py) === String(challenge.y)) {
        setFeedback('correct');
        setTimeout(() => { setStep(3); setFeedback(null); setActiveSlot('sinNum'); }, 1500);
      } else { setFeedback('incorrect'); onMistake(); }
    } else if (step === 3) {
      if (String(ans.sinNum) === String(challenge.sinNum) && String(ans.sinDen) === String(challenge.sinDen) &&
          String(ans.cosNum) === String(challenge.cosNum) && String(ans.cosDen) === String(challenge.cosDen)) {
        setFeedback('correct');
      } else { setFeedback('incorrect'); onMistake(); }
    }
  };

  const nextQ = () => {
    setSuccessCount(c => c + 1);
    setChallenge(challenges8[successCount + 1]);
    setStep(1);
    setAns({ refAngle: '', px: null, py: null, sinNum: null, sinDen: null, cosNum: null, cosDen: null });
    setActiveSlot(null);
    setShowScaffold(false);
    setFeedback(null);
  };

  const A = { x: 160, y: 160 }; 
  const drawR = 100;
  const rad = challenge.angle * (Math.PI / 180);
  const P = { x: A.x + drawR * Math.cos(rad), y: A.y - drawR * Math.sin(rad) }; 
  const midX = A.x + drawR * Math.cos(rad) / 2;
  const midY = A.y - drawR * Math.sin(rad) / 2;
  
  // 修正：依據不同象限動態決定斜邊數值的推移方向，避免重疊於坐標軸上
  const signMultiplier = (Math.cos(rad) * Math.sin(rad) >= 0) ? -1 : 1;
  const offsetX = signMultiplier * Math.sin(rad) * 35;
  const offsetY = signMultiplier * Math.cos(rad) * 35;
  
  // 修正：動態決定 P 點標示的位置
  const pLabelOffsetX = Math.cos(rad) > 0 ? 15 : -15;
  const pLabelOffsetY = Math.sin(rad) > 0 ? -10 : 25;
  const pTextAnchor = Math.cos(rad) > 0 ? "start" : "end";

  const arcPath = `M ${A.x + 40} ${A.y} A 40 40 0 0 0 ${A.x + 40 * Math.cos(rad)} ${A.y - 40 * Math.sin(rad)}`;

  return (
    <div className="grid md:grid-cols-2 gap-8 w-full animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col items-center">
        <h2 className="text-lg font-semibold mb-4 w-full">計算廣義角三角比：</h2>
        <CoordinateSystem originX={160} originY={160} scale={50}>
           <g className={`transition-opacity duration-500 ${showScaffold ? 'opacity-100' : 'opacity-0'}`}>
              <polygon points={`${A.x},${A.y} ${P.x},${A.y} ${P.x},${P.y}`} fill="rgba(99, 102, 241, 0.1)" />
              <polyline points={`${A.x},${A.y} ${P.x},${A.y} ${P.x},${P.y}`} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeDasharray="6,6" />
              <text x={A.x - 25} y={A.y - 5} className="text-sm fill-indigo-600 font-bold">{challenge.refAngle}°</text>
           </g>
           <line x1={A.x} y1={A.y} x2={P.x} y2={P.y} stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
           <path d={arcPath} fill="none" stroke="#ea580c" strokeWidth="2.5" markerEnd="url(#angle-arrow)" />
           <text x={120} y={110} className="text-lg fill-orange-600 font-serif font-bold italic">{challenge.angle}°</text>
           <circle cx={P.x} cy={P.y} r="5" fill="#ef4444" />
           <text x={P.x + pLabelOffsetX} y={P.y + pLabelOffsetY} textAnchor={pTextAnchor} className="text-lg font-bold fill-slate-800">
             P{step === 3 ? `(${challenge.x}, ${challenge.y})` : ''}
           </text>
           <foreignObject x={midX + offsetX - 40} y={midY + offsetY - 20} width="80" height="40" className="overflow-visible pointer-events-none">
             <div className="w-full h-full flex items-center justify-center font-bold text-lg text-blue-600">
               {formatValue(challenge.r)}
             </div>
           </foreignObject>
        </CoordinateSystem>
        <button onClick={() => setShowScaffold(!showScaffold)} className="mt-4 w-full py-2 border-2 rounded-lg text-indigo-600 font-bold hover:bg-indigo-50">
          {showScaffold ? '隱藏參考角' : '顯示參考角'}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col justify-center">
        {step === 1 && (
          <div className="flex flex-col gap-4 animate-in fade-in">
            <h3 className="text-xl font-bold">Step 1: 找出參考角</h3>
            <div className="flex items-center gap-3">
              <input type="number" value={ans.refAngle} onChange={e => setAns({...ans, refAngle: e.target.value})} className="w-20 h-12 text-center text-xl font-bold border-2 rounded" placeholder="?" /> °
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="flex flex-col gap-4 animate-in slide-in-from-right-4">
            <h3 className="text-xl font-bold">Step 2: 推導 P 點坐標</h3>
            <p>已知 r = 2，參考角 30°。請點下方鍵盤填入 (x, y)</p>
            <div className="flex items-center gap-2 text-2xl font-bold">
              P (
              <button onClick={() => setActiveSlot('px')} className={`w-16 h-12 border-2 rounded ${activeSlot==='px'?'border-indigo-500 bg-indigo-50':''}`}>{formatValue(ans.px)}</button>,
              <button onClick={() => setActiveSlot('py')} className={`w-16 h-12 border-2 rounded ${activeSlot==='py'?'border-indigo-500 bg-indigo-50':''}`}>{formatValue(ans.py)}</button> )
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="flex flex-col gap-4 animate-in slide-in-from-right-4">
            <h3 className="text-xl font-bold">Step 3: 寫出三角比</h3>
            <div className="bg-slate-50 p-4 rounded-xl border flex flex-col gap-4">
               <FractionInput funcName="sin" thetaStr={`${challenge.angle}°`} num={ans.sinNum} den={ans.sinDen} activeSlot={activeSlot} setActiveSlot={setActiveSlot} />
               <FractionInput funcName="cos" thetaStr={`${challenge.angle}°`} num={ans.cosNum} den={ans.cosDen} activeSlot={activeSlot} setActiveSlot={setActiveSlot} />
            </div>
          </div>
        )}

        {step > 1 && (
          <div className="grid grid-cols-4 gap-2 mt-6">
            {[1, 2, '√2', '√3', -1, -2, '-√2', '-√3'].map((val, idx) => (
              <button key={idx} onClick={() => handleKeypadClick(val)} className="h-10 border-2 rounded font-bold hover:bg-slate-100">{formatValue(val)}</button>
            ))}
          </div>
        )}

        <div className="mt-auto pt-6">
          {feedback === 'correct' && step === 3 ? (
             successCount < 2 ? 
             <button onClick={nextQ} className="w-full py-3 bg-green-500 text-white font-bold rounded-xl flex justify-center items-center gap-2 animate-in zoom-in"><RefreshCw className="w-5 h-5"/> 換個角度挑戰 ({successCount+1}/3)</button> :
             <button onClick={onComplete} className="w-full py-3 bg-green-500 text-white font-bold rounded-xl flex justify-center items-center gap-2 animate-in zoom-in"><PartyPopper className="w-5 h-5"/> 完成所有挑戰！</button>
          ) : feedback === 'correct' ? (
             <div className="text-green-600 font-bold text-center">正確！</div> 
          ) : (
             <button onClick={check} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700">確認答案</button>
          )}
          {feedback === 'incorrect' && <div className="text-red-500 font-bold text-center mt-2">有點錯誤喔，再檢查一下！</div>}
        </div>
      </div>
    </div>
  );
};

const levelsMap = {
  1: Level1,
  2: Level2,
  3: Level3,
  4: Level4,
  5: Level5,
  6: Level6,
  7: Level7,
  8: Level8
};

const LEVEL_TITLES = [
  "銳角三角比的回顧", "坐標與三角比", "自己算斜邊", "拆除鷹架", 
  "動態坐標極限推測", "走訪各個象限", "正負號偵探", "特殊廣義角的計算"
];


// ==========================================
// 主應用程式 (Router & State Management)
// ==========================================
export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'student' or 'teacher'
  
  const [studentInfo, setStudentInfo] = useState({ classId: '', seat: '', name: '' });
  const [currentLevel, setCurrentLevel] = useState(1);
  const [levelStartTime, setLevelStartTime] = useState(0);
  
  const [teacherPin, setTeacherPin] = useState('');
  const [studentsData, setStudentsData] = useState([]);
  const [filterClass, setFilterClass] = useState('all');

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || role !== 'teacher' && role !== 'dashboard') return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'trigStudents'), orderBy('classId'));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudentsData(data);
    }, (err) => console.error(err));
    return () => unsub();
  }, [user, role]);

  const handleStudentLogin = async (e) => {
    e.preventDefault();
    if (!user || !studentInfo.classId || !studentInfo.seat || !studentInfo.name) return;
    
    const docId = `${studentInfo.classId}_${studentInfo.seat}`;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'trigStudents', docId);
    
    await setDoc(docRef, {
      ...studentInfo,
      lastLogin: Date.now(),
      currentLevel: currentLevel,
    }, { merge: true });

    setRole('student_playing');
    setLevelStartTime(Date.now());
  };

  const handleLevelComplete = async () => {
    try {
      const timeSpent = Math.round((Date.now() - levelStartTime) / 1000);
      const docId = `${studentInfo.classId}_${studentInfo.seat}`;
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'trigStudents', docId);
      
      await setDoc(docRef, {
        currentLevel: currentLevel + 1,
        [`level_${currentLevel}`]: {
          completed: true,
          timeSpent: timeSpent,
          timestamp: Date.now()
        }
      }, { merge: true });
    } catch (e) {
      console.warn("Firestore 同步中斷，但仍允許學生推進", e);
    } finally {
      if (currentLevel < 8) {
        setCurrentLevel(prev => prev + 1);
        setLevelStartTime(Date.now());
      } else {
        setRole('student_finished');
      }
    }
  };

  const handleLevelMistake = async () => {
    const docId = `${studentInfo.classId}_${studentInfo.seat}`;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'trigStudents', docId);
    setDoc(docRef, {
      [`level_${currentLevel}_mistakes`]: (Math.random() || 0) 
    }, { merge: true }).catch(()=> {});
  };


  // ================= 渲染畫面 =================

  if (!user) return <div className="min-h-screen flex items-center justify-center">載入中...</div>;

  if (!role) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-3xl shadow-xl max-w-lg w-full text-center">
          <GraduationCap className="w-20 h-20 text-blue-600 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-slate-800 mb-8">廣義角三角比學習系統</h1>
          <div className="flex flex-col gap-4">
            <button onClick={() => setRole('student_login')} className="py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition flex items-center justify-center gap-2 text-lg">
              <Users className="w-6 h-6" /> 我是學生
            </button>
            <button onClick={() => setRole('teacher_login')} className="py-4 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition flex items-center justify-center gap-2 text-lg">
              <BarChart3 className="w-6 h-6" /> 我是老師 (查看後台)
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (role === 'student_login') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <form onSubmit={handleStudentLogin} className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full">
          <h2 className="text-2xl font-bold text-slate-800 mb-6 text-center">學生登入</h2>
          <div className="flex flex-col gap-4 mb-8">
            <div>
              <label className="block text-slate-600 font-bold mb-2">選擇班級</label>
              <select required value={studentInfo.classId} onChange={e => setStudentInfo({...studentInfo, classId: e.target.value})} className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none">
                <option value="">請選擇班級</option>
                <option value="101">101 班</option>
                <option value="102">102 班</option>
                <option value="106">106 班</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-2">座號</label>
              <input required type="number" min="1" max="50" value={studentInfo.seat} onChange={e => setStudentInfo({...studentInfo, seat: e.target.value})} className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none" placeholder="例：15" />
            </div>
            <div>
              <label className="block text-slate-600 font-bold mb-2">姓名</label>
              <input required type="text" value={studentInfo.name} onChange={e => setStudentInfo({...studentInfo, name: e.target.value})} className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none" placeholder="輸入真實姓名" />
            </div>
          </div>
          <button type="submit" className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition text-lg flex justify-center items-center gap-2">開始挑戰 <ArrowRight className="w-5 h-5" /></button>
          <button type="button" onClick={() => setRole(null)} className="w-full mt-4 py-2 text-slate-500 font-semibold hover:text-slate-800 transition">返回</button>
        </form>
      </div>
    );
  }

  if (role === 'student_playing') {
    const CurrentLevelComponent = levelsMap[currentLevel] || Level1;
    
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col items-center pb-10">
        <div className="w-full bg-white shadow-sm p-4 flex justify-between items-center mb-6">
          <div className="font-bold text-slate-600 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" /> {studentInfo.classId}班 {studentInfo.seat}號 {studentInfo.name}
          </div>
          <div className="flex gap-2">
            {[1,2,3,4,5,6,7,8].map(l => (
              <div key={l} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${l < currentLevel ? 'bg-green-500 text-white' : l === currentLevel ? 'bg-blue-600 text-white ring-4 ring-blue-200' : 'bg-slate-200 text-slate-400'}`}>
                {l}
              </div>
            ))}
          </div>
        </div>
        
        <div className="max-w-4xl w-full px-6 mb-6 text-center">
          <div className="inline-block bg-blue-100 text-blue-800 px-4 py-1 rounded-full text-sm font-semibold tracking-wider mb-2">
            第 {currentLevel} 關：{LEVEL_TITLES[currentLevel - 1]}
          </div>
        </div>

        <div className="w-full max-w-5xl px-4 flex justify-center">
           <CurrentLevelComponent key={`level-${currentLevel}`} onComplete={handleLevelComplete} onMistake={handleLevelMistake} />
        </div>
      </div>
    );
  }

  if (role === 'student_finished') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <PartyPopper className="w-24 h-24 text-yellow-500 mb-6 animate-bounce" />
        <h1 className="text-4xl font-bold text-slate-800 mb-4">恭喜通關全系列挑戰！</h1>
        <p className="text-xl text-slate-600 mb-8">你已經徹底征服廣義角三角比了，{studentInfo.name}！</p>
        <button onClick={() => setRole(null)} className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md">返回首頁</button>
      </div>
    );
  }

  if (role === 'teacher_login') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">教師後台登入</h2>
          <input type="password" value={teacherPin} onChange={e => setTeacherPin(e.target.value)} className="w-full p-3 border-2 border-slate-200 rounded-xl mb-6 text-center text-2xl tracking-widest outline-none focus:border-blue-500" placeholder="輸入密碼" />
          <button onClick={() => { if(teacherPin === '1234') setRole('dashboard'); else alert('密碼錯誤 (測試版密碼為 1234)'); }} className="w-full py-4 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition">進入儀表板</button>
          <button onClick={() => setRole(null)} className="w-full mt-4 py-2 text-slate-500 font-semibold hover:text-slate-800 transition">返回</button>
        </div>
      </div>
    );
  }

  if (role === 'dashboard') {
    const filteredStudents = filterClass === 'all' ? studentsData : studentsData.filter(s => s.classId === filterClass);

    return (
      <div className="min-h-screen bg-slate-100 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-indigo-600" />
              學習進度儀表板
            </h1>
            <div className="flex gap-4">
              <select value={filterClass} onChange={e => setFilterClass(e.target.value)} className="p-2 border-2 border-slate-200 rounded-lg outline-none font-semibold text-slate-700 focus:border-indigo-500">
                <option value="all">全校總覽</option>
                <option value="101">101 班</option>
                <option value="102">102 班</option>
                <option value="106">106 班</option>
              </select>
              <button onClick={() => setRole(null)} className="px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 flex items-center gap-2"><LogOut className="w-4 h-4"/> 登出</button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 font-bold text-slate-600">班級</th>
                  <th className="p-4 font-bold text-slate-600">座號</th>
                  <th className="p-4 font-bold text-slate-600">姓名</th>
                  <th className="p-4 font-bold text-slate-600">目前進度</th>
                  {[1,2,3,4,5,6,7,8].map(l => (
                    <th key={l} className="p-4 font-bold text-slate-600 text-center">L{l} 耗時</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr><td colSpan="12" className="p-8 text-center text-slate-500">尚無學生數據</td></tr>
                ) : (
                  filteredStudents.map(student => (
                    <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-semibold text-slate-700">{student.classId}</td>
                      <td className="p-4 font-semibold text-slate-700">{student.seat}</td>
                      <td className="p-4 font-bold text-blue-700">{student.name}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${student.currentLevel > 8 ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {student.currentLevel > 8 ? '已全破' : `第 ${student.currentLevel} 關`}
                        </span>
                      </td>
                      {[1,2,3,4,5,6,7,8].map(l => {
                        const lvlData = student[`level_${l}`];
                        return (
                          <td key={l} className="p-4 text-center">
                            {lvlData ? (
                              <div className="flex flex-col items-center">
                                <span className="text-green-600 font-bold flex items-center text-sm gap-1"><CheckCircle2 className="w-4 h-4"/> {lvlData.timeSpent}s</span>
                              </div>
                            ) : student.currentLevel === l ? (
                              <span className="text-amber-500 font-bold flex items-center justify-center text-sm gap-1 animate-pulse"><Clock className="w-4 h-4"/> 進行中</span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    );
  }

  return null;
}