// Throwaway interaction prototype, using plugin wheel artwork and geometry.
import { wheelPoint, layoutBodyPositions } from './geometry';
import { annularSector } from './arcPath';
import { longitudeToSvgAngle } from './angles';
import { bodySymbols } from './body-symbols';
import { zodiacGlyphPaths } from './zodiac-glyphs';
import { WHEEL_THEMES, contrastInk } from './theme';
const signs = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const names = ['SUN','MOON','MERCURY','VENUS','MARS','JUPITER','SATURN','URANUS','NEPTUNE','PLUTO','CHIRON','CERES','NORTH_NODE','SOUTH_NODE','EARTH'];
const positions = [72,192,75,78,252,12,282,45,345,315,25,110,160,340,252];
const references: Record<string,string> = {
 Sun:'In astrology, the Sun represents identity, vitality, and self-expression.',
 Gemini:'Gemini is associated with curiosity, communication, and exploring different perspectives.',
 Trine:'A trine represents an easy-flowing connection between two bodies.',
 Square:'A square represents tension between two bodies.',
 Opposition:'An opposition represents a relationship between bodies on opposite sides of the chart.',
 Sextile:'A sextile represents a supportive connection between two bodies.',
 ASC:'The ascendant marks the eastern horizon in a chart.',
 MC:'The midheaven marks a point associated with public life and direction.',
 DSC:'The descendant marks the western horizon and is associated with partnership.',
 IC:'The IC is associated with roots, home, and private life.'
};
type Item = {id:string; name:string; kind:string; longitude?:number; body?:string; pair?:string[]; type?:string; index?:number};
type State = {selected:string|null; choices:string[]; scenario:string; expanded:boolean; category:string};
const initial: State = {selected:null, choices:[], scenario:'initial', expanded:false, category:'Body'};
// Pure transition model. Reselecting toggles off; changing inputs clears stale selection.
const reduce = (s: State, a: {type:string; value?:string; choices?:string[]}): State => {
 if(a.type==='select') return {...s,selected:s.selected===a.value?null:a.value!, choices:[],expanded:false};
 if(a.type==='clear') return {...s,selected:null,choices:[],expanded:false};
 if(a.type==='choices') return {...s,choices:a.choices!};
 if(a.type==='scenario') return {...initial, scenario:a.value!};
 if(a.type==='category') return {...s,category:a.value!};
 if(a.type==='expand') return {...s,expanded:!s.expanded};
 return s;
};
let state = initial;
let opener = '';
const $ = (id:string) => document.getElementById(id)!;
const p = (l:number,r:number) => wheelPoint(l,r,0);
const bodies = () => layoutBodyPositions(names.map((name,i) => ({name,longitude:(positions[i]+(state.scenario==='edited'?41:0)+(state.scenario==='crowded' && i<6 ? 73-positions[i]+i*1.3:0)+360)%360})));
const aspects = () => [
 {id:'aspect-sun-moon',name:'Sun trine Moon',kind:'Aspect',pair:['SUN','MOON'],type:'Trine'},
 {id:'aspect-sun-mars',name:'Sun opposition Mars',kind:'Aspect',pair:['SUN','MARS'],type:'Opposition'},
 {id:'aspect-moon-jupiter',name:'Moon opposition Jupiter',kind:'Aspect',pair:['MOON','JUPITER'],type:'Opposition'},
 {id:'aspect-jupiter-saturn',name:'Jupiter square Saturn',kind:'Aspect',pair:['JUPITER','SATURN'],type:'Square'},
 {id:'aspect-venus-neptune',name:'Venus square Neptune',kind:'Aspect',pair:['VENUS','NEPTUNE'],type:'Square'},
 {id:'aspect-mars-saturn',name:'Mars sextile Saturn',kind:'Aspect',pair:['MARS','SATURN'],type:'Sextile'}
] as Item[];
const items = (): Item[] => [
 ...bodies().map(b=>({id:'body-'+b.name,name:bodySymbols[b.name].name,kind:'Body',body:b.name,longitude:b.longitude})),
 ...signs.map((name,index)=>({id:'sign-'+index,name,kind:'Sign',index})),
 ...signs.map((_,index)=>({id:'house-'+index,name:'House '+(index+1),kind:'House',index})),
 ...[0,270,180,90].map((longitude,index)=>({id:'angle-'+index,name:['ASC','MC','DSC','IC'][index],kind:'Angle',longitude})),
 ...aspects()
];
const active = () => items().find(i=>i.id===state.selected);
const attrs = (i:Item) => `id="wheel-${i.id}" data-item="${i.id}" role="button" tabindex="0" aria-label="${i.name}, ${i.kind.toLowerCase()}" aria-pressed="${i.id===state.selected}"`;
const glyph = (path:string,x:number,y:number,ink='#222') => `<svg x="${x-12}" y="${y-12}" width="24" height="24" viewBox="0 0 100 100" aria-hidden="true"><path d="${path}" fill="${ink}" fill-rule="evenodd"/></svg>`;
const wheel = () => {
 const all=items(), bs=bodies(), selected=active();
 const lineData=aspects().map(a=>({...a,a:p(bs.find(b=>b.name===a.pair![0])!.longitude,104), b:p(bs.find(b=>b.name===a.pair![1])!.longitude,104)}));
 return `<svg id="wheel" viewBox="-20 -20 640 640" role="group" aria-label="Interactive chart. Use the named list below for precise selection.">
 <circle cx="300" cy="300" r="273" fill="white" stroke="#ccc"/>
 ${[231,133,108].map(r=>`<circle cx="300" cy="300" r="${r}" fill="${r===108?'#fff':'#fafafa'}" stroke="#ddd"/>`).join('')}
 ${all.filter(i=>i.kind==='House').map(i=>{const start=i.index!*30; const q=p(start+15,118),a=p(start,133),b=p(start,231);return `<path ${attrs(i)} d="${annularSector(108,231,longitudeToSvgAngle(start+30,0),longitudeToSvgAngle(start,0))}" transform="translate(300 300)" fill="${state.selected===i.id?'#e6e5f4':'transparent'}"/><line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#ccc" pointer-events="none"/><text x="${q.x}" y="${q.y}" text-anchor="middle" dominant-baseline="middle" pointer-events="none" font-size="13">${i.index!+1}</text>`}).join('')}
 ${lineData.map(a=>{const related=selected?.kind!=='Body'||a.pair!.includes(selected.body!);return `<g ${attrs(a)}><line class="aspect" x1="${a.a.x}" y1="${a.a.y}" x2="${a.b.x}" y2="${a.b.y}" stroke="${['Square','Opposition'].includes(a.type!)?'#c22':'#25c'}" stroke-width="${state.selected===a.id?4:1.6}" opacity="${related?0.8:0.12}"/><line data-aspect-hit="true" x1="${a.a.x}" y1="${a.a.y}" x2="${a.b.x}" y2="${a.b.y}" stroke="transparent" stroke-width="18"/></g>`}).join('')}
 ${all.filter(i=>i.kind==='Sign').map(i=>{const start=i.index!*30,q=p(start+15,253),fill=WHEEL_THEMES.traditional.signFills![i.name];return `<g ${attrs(i)}><path d="${annularSector(231,273,longitudeToSvgAngle(start+30,0),longitudeToSvgAngle(start,0))}" transform="translate(300 300)" fill="${fill}"/>${glyph(zodiacGlyphPaths[i.index!],q.x,q.y,contrastInk(fill))}</g>`}).join('')}
 ${bs.map(b=>{const i=all.find(i=>i.body===b.name)!,q=p(b.labelLongitude!,188),tip=p(b.longitude,230);return `<g ${attrs(i)}><line x1="${tip.x}" y1="${tip.y}" x2="${q.x}" y2="${q.y}" stroke="#777" stroke-width=".8"/><circle cx="${tip.x}" cy="${tip.y}" r="2" fill="#222"/><circle cx="${q.x}" cy="${q.y}" r="22" fill="transparent"/><circle cx="${q.x}" cy="${q.y}" r="16" fill="#fafafa"/>${glyph(bodySymbols[b.name].path,q.x,q.y)}</g>`}).join('')}
 ${all.filter(i=>i.kind==='Angle').map(i=>{const q=p(i.longitude!,293);return `<g ${attrs(i)}><rect x="${q.x-20}" y="${q.y-20}" width="40" height="40" fill="transparent"/><text x="${q.x}" y="${q.y}" text-anchor="middle" dominant-baseline="middle" font-size="12">${i.name}</text></g>`}).join('')}
 </svg>`;
};
const reference = (i:Item) => references[i.name] || (i.kind==='House' ? (i.index===6?'The seventh house concerns partnerships and how people relate one to one.':'This demo leaves the other house reference entries for the content port.') : 'Select Sun, Gemini, an angle, or an aspect to preview representative reference copy.');
const facts = (i:Item) => {
 if(i.kind==='Body') return `<dl><dt>Sign</dt><dd>${signs[Math.floor(i.longitude!/30)]}</dd><dt>Degree</dt><dd>${(i.longitude!%30).toFixed(1)}°</dd><dt>House</dt><dd>${Math.floor(i.longitude!/30)+1}</dd><dt>Motion</dt><dd>${i.body==='SATURN'?'Retrograde':'Direct'}</dd></dl>`;
 if(i.kind==='Aspect') return `<p>${i.pair!.map(n=>bodySymbols[n].name).join(' · ')} · ${i.type}</p><p>${references[i.type!]}</p>`;
 if(i.kind==='House') {const occupants=items().filter(b=>b.kind==='Body'&&Math.floor(b.longitude!/30)===i.index).map(b=>b.name); const rulers=['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars (traditional), Pluto (modern)','Jupiter','Saturn','Saturn (traditional), Uranus (modern)','Jupiter (traditional), Neptune (modern)']; return `<h3>In this chart</h3><p>Occupants: ${occupants.join(', ')||'None'}</p><p>Ruler: ${rulers[i.index!]}</p>`;}
 return '';
};
const render = () => {
 const i=active();
 ($('category') as HTMLSelectElement).value=state.category;
 ($('scenario') as HTMLSelectElement).value=state.scenario;
 $('drawing').innerHTML=wheel();
 $('panel').hidden=!i&&!state.choices.length;
 $('panel').classList.toggle('expanded',state.expanded);
 $('details').innerHTML=state.choices.length ? `<h2 id="detail-title" tabindex="-1">Choose an aspect</h2><p>Several lines meet here.</p>${state.choices.map(id=>{const a=items().find(i=>i.id===id)!;return `<button data-choice="${id}">${a.name}</button>`}).join('')}` : i ? `<p class="eyebrow">${i.kind}</p><h2 id="detail-title" tabindex="-1">${i.name}</h2>${i.kind==='Aspect'?'':`<p>${reference(i)}</p>`}${facts(i)}<hr><p class="context">Tropical zodiac · Equal houses</p>` : '';
 $('expand').textContent=state.expanded?'Show less':'Expand details';
 $('list').innerHTML=items().filter(i=>i.kind===state.category).map(i=>`<button id="list-${i.id}" data-item="${i.id}" aria-pressed="${i.id===state.selected}">${i.name}</button>`).join('');
 $('state').textContent=`${state.scenario==='initial'?'Initial-input fixture':state.scenario==='edited'?'Edited-input fixture':'Crowded-body fixture'} · ${i?i.kind+': '+i.name:'No selection'} · ${state.choices.length?'Choosing between '+state.choices.length+' aspects':state.expanded?'Expanded details':'Compact details'}`;
 $('instruction').textContent=i?.kind==='Body'?'Unrelated aspects are dimmed. Choose another target to replace this selection.':'Choose a body, sign, house, angle, or aspect. Use the named list for small or crowded targets.';
};
const dispatch = (a:Parameters<typeof reduce>[1],focus?:string) => {const focused=document.activeElement?.id;state=reduce(state,a);render();if(focus)$(focus)?.focus();else if(focused)document.getElementById(focused)?.focus();};
const clear = () => dispatch({type:'clear'},opener);
const selectItem = (id:string,origin:string,keyboard:boolean) => {opener=origin;dispatch({type:'select',value:id});if(keyboard&&state.selected)$('detail-title').focus();};
const distance = (q:{x:number;y:number},a:{x:number;y:number},b:{x:number;y:number}) => {const dx=b.x-a.x,dy=b.y-a.y;const t=Math.max(0,Math.min(1,((q.x-a.x)*dx+(q.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(q.x-a.x-t*dx,q.y-a.y-t*dy);};
document.addEventListener('click',e=>{
 const target=e.target as Element,button=target.closest<HTMLElement>('[data-item]'),choice=target.closest<HTMLElement>('[data-choice]');
 if(choice){dispatch({type:'select',value:choice.dataset.choice},'detail-title');return;}
 if(button){
  if(button.closest('svg') && button.dataset.item!.startsWith('aspect-') && e.detail!==0){
   const svg=$('wheel') as unknown as SVGSVGElement,rect=svg.getBoundingClientRect(),q={x:(e.clientX-rect.left)*640/rect.width-20,y:(e.clientY-rect.top)*640/rect.height-20};
   const bs=bodies(),near=aspects().filter(a=>distance(q,p(bs.find(b=>b.name===a.pair![0])!.longitude,104),p(bs.find(b=>b.name===a.pair![1])!.longitude,104))<11);
   if(near.length>1){opener=button.id;dispatch({type:'choices',choices:near.map(a=>a.id)},'detail-title');return;}
  }
  selectItem(button.dataset.item!,button.id,e.detail===0);return;
 }
 if(target.closest('#wheel'))clear();
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){e.preventDefault();clear();}
 const target=(e.target as Element).closest<HTMLElement>('g[data-item],path[data-item]');
 if(target&&(e.key==='Enter'||e.key===' ')){e.preventDefault();selectItem(target.dataset.item!,target.id,true);}
});
$('close').addEventListener('click',clear);
$('expand').addEventListener('click',()=>dispatch({type:'expand'}));
$('scenario').addEventListener('change',e=>dispatch({type:'scenario',value:(e.target as HTMLSelectElement).value}));
$('category').addEventListener('change',e=>dispatch({type:'category',value:(e.target as HTMLSelectElement).value}));
render();

// Guided scenarios reset to a known state; each step remains a real action.
const walks = [
 {name:'Body and aspect',intro:'Watch unrelated lines dim, then replace the body selection with an aspect.',steps:[{label:'1. Select Sun',action:{type:'select',value:'body-SUN'}},{label:'2. Select Sun–Moon trine',action:{type:'select',value:'aspect-sun-moon'}},{label:'3. Clear selection',action:{type:'clear'}}]},
 {name:'Crossing lines',intro:'Two opposition lines cross at the center. Choose the precise relationship.',steps:[{label:'1. Open crossing chooser',action:{type:'choices',choices:['aspect-sun-mars','aspect-moon-jupiter']}},{label:'2. Choose Moon–Jupiter',action:{type:'select',value:'aspect-moon-jupiter'}},{label:'3. Clear selection',action:{type:'clear'}}]},
 {name:'Changing chart inputs',intro:'A selected object should not keep showing facts from the previous chart.',steps:[{label:'1. Select Sun',action:{type:'select',value:'body-SUN'}},{label:'2. Simulate edited birth inputs',action:{type:'scenario',value:'edited'}},{label:'3. Select Sun in updated fixture',action:{type:'select',value:'body-SUN'}}]}
];
const showWalk = (index:number) => {
 dispatch({type:'scenario',value:'initial'});
 $('walk-tabs').innerHTML=walks.map((w,i)=>`<button data-walk="${i}" aria-pressed="${i===index}">${w.name}</button>`).join(' ');
 $('walk-steps').innerHTML=`<p>${walks[index].intro}</p>`+walks[index].steps.map((step,i)=>`<button data-step="${i}" data-guide="${index}">${step.label}</button>`).join(' ');
};
document.addEventListener('click',e=>{
 const target=e.target as HTMLElement,walk=target.closest<HTMLElement>('[data-walk]'),step=target.closest<HTMLElement>('[data-step]');
 if(walk)showWalk(Number(walk.dataset.walk));
 if(step){opener='walk-tabs';dispatch(walks[Number(step.dataset.guide)].steps[Number(step.dataset.step)].action);}
});
showWalk(0);
