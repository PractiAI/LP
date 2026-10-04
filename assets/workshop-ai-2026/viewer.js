'use strict';
(() => {
 const viewer=document.getElementById('viewer');
 if(!viewer)return;
 const data=JSON.parse(document.getElementById('deck-data').textContent);
 const stage=document.getElementById('deck-stage'),img=document.getElementById('slide-image');
 const prev=document.getElementById('slide-prev'),next=document.getElementById('slide-next'),select=document.getElementById('slide-select');
 const position=document.getElementById('slide-position'),status=document.getElementById('slide-status');
 const thumbnails=[...document.querySelectorAll('[data-frame]')];
 let current=0,request=0,ready=Promise.resolve();
 const hashFor=s=>'#'+s.n+(s.step>1?'.'+s.step:'');
 function show(index,updateHash=true){
  current=Math.max(0,Math.min(data.length-1,index));
  const s=data[current],ticket=++request;
  prev.disabled=current===0;next.disabled=current===data.length-1;select.value=String(s.n);
  position.textContent='שקף '+s.n+' מתוך 26'+(s.steps>1?' · שלב '+s.step+' מתוך '+s.steps:'');
  if(updateHash)history.replaceState(null,'',hashFor(s));
  const separate=document.getElementById('standalone-link');if(separate)separate.hash=hashFor(s);
  thumbnails.forEach((t,i)=>{t.classList.toggle('active',i===current);t.setAttribute('aria-current',String(i===current));});
  status.hidden=true;stage.setAttribute('aria-busy','true');
  const image=new Image();image.src=s.src;
  ready=image.decode().then(()=>{
   if(ticket!==request)return;
   img.src=s.src;img.alt=s.title+(s.steps>1?' · שלב '+s.step+' מתוך '+s.steps:'');
   stage.dataset.slide=String(s.n);stage.dataset.step=String(s.step);stage.setAttribute('aria-busy','false');
   const following=data[current+1];if(following){const preload=new Image();preload.src=following.src;}
  }).catch(()=>{if(ticket!==request)return;stage.setAttribute('aria-busy','false');status.hidden=false;status.textContent='השקף לא נטען. נסו שוב או בחרו שקף אחר.';});
  return ready;
 }
 function jump(n){const i=data.findIndex(s=>s.n===Number(n));if(i>=0)return show(i);}
 function fromHash(){const match=location.hash.match(/^#(\d+)(?:\.(\d+))?$/);if(!match)return false;const i=data.findIndex(s=>s.n===Number(match[1])&&s.step===Number(match[2]||1));if(i<0)return false;show(i,false);return true;}
 prev.addEventListener('click',()=>show(current-1));next.addEventListener('click',()=>show(current+1));
 select.addEventListener('change',()=>jump(select.value));
 thumbnails.forEach(b=>b.addEventListener('click',()=>show(Number(b.dataset.frame))));
 document.querySelectorAll('a[data-slide]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();jump(a.dataset.slide);viewer.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}));
 const full=document.getElementById('deck-fullscreen');
 async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else if(viewer.requestFullscreen)await viewer.requestFullscreen();else {const a=document.getElementById('standalone-link');if(a)window.open(a.href,'_blank','noopener');}}catch{status.hidden=false;status.textContent='הדפדפן אינו מאפשר מסך מלא כרגע. אפשר לפתוח את המצגת בחלון נפרד.';}}
 full.addEventListener('click',fullscreen);
 document.addEventListener('fullscreenchange',()=>{full.querySelector('span').textContent=document.fullscreenElement?'יציאה ממסך מלא':'מסך מלא';full.setAttribute('aria-pressed',String(!!document.fullscreenElement));});
 document.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||e.target.closest('input,select,textarea,[contenteditable="true"]'))return;
  const r=stage.getBoundingClientRect();if(!document.fullscreenElement&&(r.bottom<0||r.top>innerHeight))return;
  if(e.key==='ArrowLeft'||e.key==='PageDown'){e.preventDefault();show(current+1);}
  else if(e.key==='ArrowRight'||e.key==='PageUp'){e.preventDefault();show(current-1);}
  else if(e.key.toLowerCase()==='f'){e.preventDefault();fullscreen();}
 });
 let touch=null;
 stage.addEventListener('touchstart',e=>{touch={x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY};},{passive:true});
 stage.addEventListener('touchend',e=>{if(!touch)return;const dx=e.changedTouches[0].clientX-touch.x,dy=e.changedTouches[0].clientY-touch.y;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)show(current+(dx>0?1:-1));touch=null;},{passive:true});
 addEventListener('hashchange',fromHash);
 window.workshopDeck={show,jump,get current(){return current},get total(){return data.length},get ready(){return ready}};
 select.disabled=false;
 if(!fromHash()){const n=new URLSearchParams(location.search).get('slide');const i=data.findIndex(s=>s.n===Number(n));show(i<0?0:i,false);}
})();
