'use strict';
(() => {
 const q=document.getElementById('prompt-search'),source=document.getElementById('source-filter'),category=document.getElementById('category-filter');
 const cards=[...document.querySelectorAll('.prompt-card')],initialOpen=new Map(cards.map(c=>[c,c.open]));
 const norm=s=>s.normalize('NFKD').replace(/[\u0591-\u05c7]/g,'').toLocaleLowerCase('he').replace(/[׳״'".,:;!?־–—]/g,' ').replace(/\s+/g,' ').trim();
 const index=cards.map(el=>({el,text:norm(el.textContent)}));
 function filter(){const terms=norm(q.value).split(' ').filter(Boolean);let count=0;index.forEach(({el,text})=>{let match=terms.every(t=>text.includes(t))&&(source.value==='all'||el.dataset.source===source.value)&&(category.value==='all'||el.dataset.category===category.value);el.hidden=!match;if(match)count++;if(terms.length)el.open=match;else el.open=initialOpen.get(el)});document.getElementById('result-count').textContent=count+' תרגילים ותבניות';document.getElementById('empty-results').hidden=count!==0;document.getElementById('clear-filters').hidden=!q.value&&source.value==='all'&&category.value==='all';document.querySelectorAll('[data-library-section]').forEach(section=>section.hidden=![...section.querySelectorAll('.prompt-card')].some(c=>!c.hidden));}
 q.addEventListener('input',filter);source.addEventListener('change',filter);category.addEventListener('change',filter);
 document.getElementById('clear-filters').addEventListener('click',()=>{q.value='';source.value='all';category.value='all';filter();q.focus()});
 document.querySelectorAll('a[href="#from-deck"],a[href="#more-prompts"]').forEach(a=>a.addEventListener('click',()=>{q.value='';source.value='all';category.value='all';filter()}));
 let toastTimer;
 function announce(message){const el=document.getElementById('copy-status');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3000)}
 async function copyText(text){if(navigator.clipboard&&window.isSecureContext){try{await navigator.clipboard.writeText(text);return true}catch{}}
 const active=document.activeElement,area=document.createElement('textarea');area.value=text;area.readOnly=true;area.style.cssText='position:fixed;left:-9999px;top:0;';document.body.appendChild(area);area.select();let ok=false;try{ok=document.execCommand('copy')}catch{}area.remove();active?.focus({preventScroll:true});return ok;
 }
 document.querySelectorAll('[data-copy]').forEach(button=>button.addEventListener('click',async()=>{const target=document.getElementById(button.dataset.copy),ok=await copyText(target.textContent);if(ok){button.classList.add('copied');button.querySelector('span').textContent='הועתק';announce('הפרומפט הועתק. השלימו את השדות לפני השימוש.');setTimeout(()=>{button.classList.remove('copied');button.querySelector('span').textContent='העתקה'},2200)}else{const range=document.createRange();range.selectNodeContents(target);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);announce('הטקסט סומן. העתיקו אותו באמצעות תפריט ההעתקה או Ctrl+C.')}}));
})();
