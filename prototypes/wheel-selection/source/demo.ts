import { fitHouse } from './fit-bodies';
import trueWhole from './true-whole.json';
import truePlacidus from './true-placidus.json';
// Throwaway interaction prototype, using plugin wheel artwork and geometry.
import { wheelPoint } from './geometry';
import { annularSector } from './arcPath';
import { longitudeToSvgAngle } from './angles';
import { bodySymbols } from './body-symbols';
import { zodiacGlyphPaths } from './zodiac-glyphs';
import { WHEEL_THEMES, contrastInk } from './theme';
const signs = ['Aries','Taurus','Gemini','Cancer','Leo','Virgo','Libra','Scorpio','Sagittarius','Capricorn','Aquarius','Pisces'];
const names = ['SUN','MOON','MERCURY','VENUS','MARS','JUPITER','SATURN','URANUS','NEPTUNE','PLUTO','CHIRON','CERES','NORTH_NODE','SOUTH_NODE','EARTH'];
const positions = [72,192,75,78,252,12,282,45,345,315,25,110,160,340,252];
let chartMode=new URLSearchParams(location.search).get('chart')||'true-whole';
const snapshot=()=>chartMode==='true-whole'?trueWhole:chartMode==='true-placidus'?truePlacidus:null;
const constellationStarts=[0,19.7286,56.5875,86.0412,103.19,141.6065,191.32,210.1972,223.4245,235.7818,269.2677,294.8435,318.0103];
const constellationNames=[...signs.slice(0,8),'Ophiuchus',...signs.slice(8)];
const signSectors=()=> (snapshot()?constellationNames:signs).map((name,index)=>({name,start:snapshot()?constellationStarts[index]:index*30,width:snapshot()?(constellationStarts[index+1]??360)-constellationStarts[index]:30}));
const cuspSectors=()=> (snapshot()?.cusps||signs.map((_,i)=>i*30)).map((start,index,all)=>({start,width:((all[(index+1)%12]-start)+360)%360,index}));
const houseIndex=(longitude:number)=>cuspSectors().find(h=>(longitude-h.start+360)%360<h.width)!.index;
const signName=(longitude:number)=>signSectors().find(h=>(longitude-h.start+360)%360<h.width)!.name;
const chartContext=()=>snapshot()?`True Sky · Constellation-sized signs · ${chartMode==='true-whole'?'Whole-sign':'Placidus'} houses · Ophiuchus on`:'Tropical zodiac · Equal houses';
const references: Record<string,string> = {
 Sun:'In astrology, the Sun represents identity, vitality, and self-expression.',
 Gemini:'Gemini is associated with curiosity, communication, and exploring different perspectives.',
 Conjunction:'A conjunction brings two bodies close together in the chart.',
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
const p = (l:number,r:number) => wheelPoint(l,r,snapshot()?.bodies.find(b=>b.name==='ASCENDANT_SYMBOL')!.longitude||0);
const bodies = () => names.map((name,i) => {
 const base=snapshot()?.bodies.find(b=>b.name===name)!.longitude??positions[i];
 if(state.scenario==='triangle'||state.scenario==='overflow'){
  const target=state.scenario==='triangle'?cuspSectors().reduce((a,b)=>Math.abs(a.width-30)<Math.abs(b.width-30)?a:b):cuspSectors().reduce((a,b)=>a.width<b.width?a:b);
  const count=state.scenario==='triangle'?3:10;
  const destination=i<count?target:cuspSectors()[(target.index+1+(i-count)%11)%12];
  return {name,longitude:(destination.start+destination.width/2+(i<count?(i-(count-1)/2)*.4:0)+360)%360};
 }

 const narrow=cuspSectors().reduce((a,b)=>a.width<b.width?a:b);
 const crowded=snapshot()?(narrow.start+narrow.width/2-2.5+i)%360:73+i*1.3;
 return {name,longitude:((state.scenario==='crowded'&&i<6?crowded:base)+(state.scenario==='edited'?41:0)+360)%360};
});
const derivedAspects=()=>bodies().flatMap((a,i)=>bodies().slice(i+1).flatMap(b=>{
 const d=Math.abs(a.longitude-b.longitude),sep=Math.min(d,360-d);
 const match=([['Conjunction',0,10],['Sextile',60,6],['Square',90,8],['Trine',120,8],['Opposition',180,10]] as const).find(([,angle,orb])=>Math.abs(sep-angle)<=orb);
 return match?[{id:`aspect-${a.name}-${b.name}`,name:`${bodySymbols[a.name].name} ${match[0].toLowerCase()} ${bodySymbols[b.name].name}`,kind:'Aspect',pair:[a.name,b.name],type:match[0]}]:[];
}));
const aspects = ():Item[] => snapshot()?derivedAspects():[
 {id:'aspect-sun-moon',name:'Sun trine Moon',kind:'Aspect',pair:['SUN','MOON'],type:'Trine'},
 {id:'aspect-sun-mars',name:'Sun opposition Mars',kind:'Aspect',pair:['SUN','MARS'],type:'Opposition'},
 {id:'aspect-moon-jupiter',name:'Moon opposition Jupiter',kind:'Aspect',pair:['MOON','JUPITER'],type:'Opposition'},
 {id:'aspect-jupiter-saturn',name:'Jupiter square Saturn',kind:'Aspect',pair:['JUPITER','SATURN'],type:'Square'},
 {id:'aspect-venus-neptune',name:'Venus square Neptune',kind:'Aspect',pair:['VENUS','NEPTUNE'],type:'Square'},
 {id:'aspect-mars-saturn',name:'Mars sextile Saturn',kind:'Aspect',pair:['MARS','SATURN'],type:'Sextile'}
] as Item[];
const items = (): Item[] => [
 ...bodies().map(b=>({id:'body-'+b.name,name:bodySymbols[b.name].name,kind:'Body',body:b.name,longitude:b.longitude})),
 ...signSectors().map((sector,index)=>({id:'sign-'+index,name:sector.name,kind:'Sign',index})),
 ...signs.map((_,index)=>({id:'house-'+index,name:'House '+(index+1),kind:'House',index})),
 ...[0,270,180,90].map((longitude,index)=>({id:'angle-'+index,name:['ASC','MC','DSC','IC'][index],kind:'Angle',longitude:snapshot()?.bodies.find(b=>b.name===['ASCENDANT_SYMBOL','MIDHEAVEN','DESCENDANT','IMUM_COELI'][index])!.longitude??longitude})),
 ...aspects()
];
const active = () => items().find(i=>i.id===state.selected);
const attrs = (i:Item) => `id="wheel-${i.id}" data-item="${i.id}" role="button" tabindex="0" aria-label="${i.name}, ${i.kind.toLowerCase()}" aria-pressed="${i.id===state.selected}"`;
const glyph = (path:string,x:number,y:number,ink='#222') => `<svg x="${x-12}" y="${y-12}" width="24" height="24" viewBox="0 0 100 100" aria-hidden="true"><path d="${path}" fill="${ink}" fill-rule="evenodd"/></svg>`;
// Fit all bodies in each house before creating a fallback group.
const bodyLayouts=()=>cuspSectors().flatMap(sector=>{
 const members=bodies().filter(b=>houseIndex(b.longitude)===sector.index);
 const fitted=fitHouse(members,sector);
 return fitted?fitted.map(placement=>({group:[placement.body],placement})):members.length?[{group:members,placement:null}]:[];
});
const clusters=()=>bodyLayouts().map(layout=>layout.group);
type Picker = {ids:string[]; aspectIds:string[]; mode:'bodies'|'aspects'; body:string|null; relation:string|null};
let picker:Picker|null=null;
// Owner selected A; B/C remain available as archived comparison variants.
let variant = new URLSearchParams(location.search).get('variant') || 'A';
if(!['A','B','C'].includes(variant))variant='A';
let spotlight=0, sheetHeight=40, zoom=false;
const bodyName=(name:string)=>bodySymbols[name].name;
const miniGlyph=(name:string)=>`<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${bodySymbols[name].path}" fill="currentColor" fill-rule="evenodd"/></svg>`;
const openPicker=(ids:string[],mode:'bodies'|'aspects'='bodies',aspectIds:string[]=[])=>{
 picker={ids,mode,aspectIds,body:null,relation:null};spotlight=0;sheetHeight=40;state={...state,selected:null,choices:[]};render();$('detail-title').focus({preventScroll:true});
};
const availableAspects=()=>aspects().filter(a=>!picker?.aspectIds.length||picker.aspectIds.includes(a.id));
const pickerContent=()=>{
 if(!picker)return '';
 const scope=picker;
 const options= !scope.body ? scope.ids.map(id=>({id,label:bodyName(id),note:scope.mode==='aspects'?'Explore its connections':`${signName(bodies().find(b=>b.name===id)!.longitude)} · House ${houseIndex(bodies().find(b=>b.name===id)!.longitude)+1}`,glyph:id}))
 : !scope.relation ? [...new Set(availableAspects().filter(a=>a.pair!.includes(scope.body!)).map(a=>a.type!))].map(type=>({id:type,label:type,note:references[type],glyph:scope.body!}))
 : availableAspects().filter(a=>a.pair!.includes(scope.body!)&&a.type===scope.relation).map(a=>({id:a.id,label:bodyName(a.pair!.find(n=>n!==scope.body)!),note:`${bodyName(scope.body!)} · ${scope.relation}`,glyph:a.pair!.find(n=>n!==scope.body)!}));
 const signNames=[...new Set(scope.ids.map(id=>signName(bodies().find(b=>b.name===id)!.longitude)))];
 const groupTitle=signNames.length===1?`Bodies in ${signNames[0]}`:'Grouped bodies';
 const heading=!scope.body?(scope.mode==='bodies'?groupTitle:'Explore connections'):!scope.relation?`${bodyName(scope.body)} connections`:`${bodyName(scope.body)} · ${scope.relation}`;
 const buttons=options.map((o,i)=>`<button class="picker-option" data-pick="${o.id}" ${variant==='C'&&i!==spotlight?'hidden':''}>${miniGlyph(o.glyph)}<span><strong>${o.label}</strong><small>${o.note}</small></span><span aria-hidden="true">${scope.mode==='aspects'?'›':'↗'}</span></button>`).join('');
 return `${scope.body?`<nav class="breadcrumbs" aria-label="Picker path"><button data-picker-back="root">${scope.mode==='bodies'?'Group':'Bodies'}</button>${scope.body?`<span>›</span><button data-picker-back="body">${bodyName(scope.body)}</button>`:''}${scope.relation?`<span>› ${scope.relation}</span>`:''}</nav>`:''}<h2 id="detail-title" tabindex="-1">${heading}</h2>${scope.body?`<p>${!scope.relation?'Choose a relationship.':'Choose the other body.'}</p>`:''}${variant==='C'&&options.length?`<div class="card-navigation"><button data-card="-1" aria-label="Previous choice">←</button><span>${spotlight+1} of ${options.length}</span><button data-card="1" data-count="${options.length}" aria-label="Next choice">→</button></div>`:''}<div class="picker picker-${variant}">${buttons||'<p>No connections in this fixture.</p>'}</div>`;
};
const wheel = () => {
 const all=items(), bs=bodies(), selected=active();
 const lineData=aspects().map(a=>({...a,a:p(bs.find(b=>b.name===a.pair![0])!.longitude,104), b:p(bs.find(b=>b.name===a.pair![1])!.longitude,104)}));
 return `<svg id="wheel" viewBox="-20 -20 640 640" role="group" aria-label="Interactive chart. Use the named list below for precise selection.">
 <circle cx="300" cy="300" r="273" fill="white" stroke="#ccc"/>
 ${[231,133,108].map(r=>`<circle cx="300" cy="300" r="${r}" fill="${r===108?'#fff':'#fafafa'}" stroke="#ddd"/>`).join('')}
 ${all.filter(i=>i.kind==='House').map(i=>{const sector=cuspSectors()[i.index!],start=sector.start; const q=p(start+sector.width/2,118),a=p(start,133),b=p(start,231);return `<path ${attrs(i)} d="${annularSector(108,231,longitudeToSvgAngle(start+sector.width,snapshot()?.bodies.find(b=>b.name==='ASCENDANT_SYMBOL')!.longitude||0),longitudeToSvgAngle(start,snapshot()?.bodies.find(b=>b.name==='ASCENDANT_SYMBOL')!.longitude||0))}" transform="translate(300 300)" fill="${state.selected===i.id?'#e6e5f4':'transparent'}"/><line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#ccc" pointer-events="none"/><text x="${q.x}" y="${q.y}" text-anchor="middle" dominant-baseline="middle" pointer-events="none" font-size="13">${i.index!+1}</text>`}).join('')}
 ${lineData.map(a=>{const related=selected?.kind!=='Body'||a.pair!.includes(selected.body!);return `<g ${attrs(a)}><line class="aspect" x1="${a.a.x}" y1="${a.a.y}" x2="${a.b.x}" y2="${a.b.y}" stroke="${['Square','Opposition'].includes(a.type!)?'#c22':'#25c'}" stroke-width="${state.selected===a.id?4:1.6}" opacity="${related?0.8:0.12}"/><line data-aspect-hit="true" x1="${a.a.x}" y1="${a.a.y}" x2="${a.b.x}" y2="${a.b.y}" stroke="transparent" stroke-width="18"/></g>`}).join('')}
 ${all.filter(i=>i.kind==='Sign').map(i=>{const sector=signSectors()[i.index!],start=sector.start,q=p(start+sector.width/2,253),fill=WHEEL_THEMES.traditional.signFills![i.name];return `<g ${attrs(i)}><path d="${annularSector(231,273,longitudeToSvgAngle(start+sector.width,snapshot()?.bodies.find(b=>b.name==='ASCENDANT_SYMBOL')!.longitude||0),longitudeToSvgAngle(start,snapshot()?.bodies.find(b=>b.name==='ASCENDANT_SYMBOL')!.longitude||0))}" transform="translate(300 300)" fill="${fill}"/>${glyph(i.name==='Ophiuchus'?'M20 15H30V65Q50 95 70 65V15H80V65Q50 115 20 65ZM8 40Q30 65 50 40T92 40V50Q70 25 50 50T8 50Z':zodiacGlyphPaths[signs.indexOf(i.name)],q.x,q.y,contrastInk(fill))}</g>`}).join('')}
 ${bodyLayouts().map(({group,placement})=>{
 const groupHouse=cuspSectors()[houseIndex(group[0].longitude)];
 const longitude=groupHouse.start+group.reduce((sum,b)=>sum+(b.longitude-groupHouse.start+360)%360,0)/group.length;
 // Whole target, badge, and focus stroke fit inside a conservative circle.
 // Reserve eight SVG units from each cusp; clamp only the visual anchor.
 const radius=184,clearance=8,sector=cuspSectors()[houseIndex(group[0].longitude)];
 const compact=sector.width<30;
 const targetRadius=compact?Math.min(18,Math.max(4,radius*Math.sin(sector.width/2*Math.PI/180)-clearance)):Math.hypot(26,26);
 const extent=targetRadius;
 const inset=Math.asin((extent+clearance)/radius)*180/Math.PI;
 const houseStart=sector.start;
 const anchor=Math.max(houseStart+inset,Math.min(houseStart+sector.width-inset,houseStart+(longitude-houseStart+360)%360));
 const q=placement?p(placement.longitude,placement.radius):p(anchor,radius);
 if(placement){const b=group[0],i=all.find(i=>i.body===b.name)!,tip=p(b.longitude,230);return `<g ${attrs(i)} data-layout-house="${sector.index}" data-label-longitude="${placement!.longitude}" data-label-radius="${placement!.radius}" data-label-x="${q.x}" data-label-y="${q.y}"><line x1="${tip.x}" y1="${tip.y}" x2="${q.x}" y2="${q.y}" stroke="#777"/><circle cx="${q.x}" cy="${q.y}" r="22" fill="transparent"/><circle cx="${q.x}" cy="${q.y}" r="16" fill="#fafafa"/>${glyph(bodySymbols[b.name].path,q.x,q.y)}</g>`;}
 const leaders=group.map(b=>{const tip=p(b.longitude,230);return `<line class="group-leader" x1="${tip.x}" y1="${tip.y}" x2="${q.x}" y2="${q.y}" stroke="#999" stroke-width=".8" pointer-events="none"/>`}).join('');
 return `<g id="folder-${group[0].name}" data-folder="${group.map(b=>b.name).join(',')}" data-anchor="${anchor}" data-house-start="${houseStart}" data-house-width="${sector.width}" data-compact="${compact}" data-extent="${extent}" role="button" tabindex="0" aria-label="Grouped bodies: ${group.map(b=>bodyName(b.name)).join(', ')}">${leaders}${compact?`<circle class="compact-plate" cx="${q.x}" cy="${q.y}" r="${extent}" fill="#e7e3ee" stroke="#6e617f"/><text x="${q.x}" y="${q.y}" font-size="12" text-anchor="middle" dominant-baseline="middle">${group.length}</text>`:`<rect class="group-plate" x="${q.x-25}" y="${q.y-25}" width="50" height="50" rx="12" fill="#e7e3ee" stroke="#6e617f"/>${group.slice(0,4).map((b,j)=>`<g transform="translate(${q.x+(j%2?9:-9)} ${q.y+(j>1?12:-3)}) scale(.52)">${glyph(bodySymbols[b.name].path,0,0)}</g>`).join('')}<circle class="group-count" cx="${q.x+17}" cy="${q.y-17}" r="9" fill="#65517d"/><text x="${q.x+17}" y="${q.y-17}" fill="white" font-size="10" text-anchor="middle" dominant-baseline="middle">${group.length}</text>`}</g>`;
 }).join('')}
 ${all.filter(i=>i.kind==='Angle').map(i=>{const q=p(i.longitude!,293);return `<g ${attrs(i)}><rect x="${q.x-20}" y="${q.y-20}" width="40" height="40" fill="transparent"/><text x="${q.x}" y="${q.y}" text-anchor="middle" dominant-baseline="middle" font-size="12">${i.name}</text></g>`}).join('')}
 </svg>`;
};
const reference = (i:Item) => references[i.name] || (i.kind==='House' ? (i.index===6?'The seventh house concerns partnerships and how people relate one to one.':'This demo leaves the other house reference entries for the content port.') : 'Select Sun, Gemini, an angle, or an aspect to preview representative reference copy.');
const facts = (i:Item) => {
 if(i.kind==='Body') return `<dl><dt>Sign</dt><dd>${signName(i.longitude!)}</dd><dt>Degree</dt><dd>${((i.longitude!-signSectors().find(s=>s.name===signName(i.longitude!))!.start+360)%360).toFixed(1)}°</dd><dt>House</dt><dd>${houseIndex(i.longitude!)+1}</dd><dt>Motion</dt><dd>${(snapshot()?.bodies.find(b=>b.name===i.body)?.speed??(i.body==='SATURN'?-1:1))<0?'Retrograde':'Direct'}</dd></dl>`;
 if(i.kind==='Aspect') return `<p>${i.pair!.map(n=>bodySymbols[n].name).join(' · ')} · ${i.type}</p><p>${references[i.type!]}</p>`;
 if(i.kind==='House') {const occupants=items().filter(b=>b.kind==='Body'&&houseIndex(b.longitude!)===i.index).map(b=>b.name); const rulers=['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars (traditional), Pluto (modern)','Jupiter','Saturn','Saturn (traditional), Uranus (modern)','Jupiter (traditional), Neptune (modern)']; return `<h3>In this chart</h3><p>Occupants: ${occupants.join(', ')||'None'}</p><p>Ruler: ${rulers[signs.indexOf(signName(cuspSectors()[i.index!].start))]||'No established ruler'}</p>`;}
 return '';
};
const render = () => {
 const i=active();
 $('concept-switcher').hidden=!new URLSearchParams(location.search).has('variant');
 ($('chart-mode') as HTMLSelectElement).value=chartMode;
 $('provenance').textContent=snapshot()?`${chartContext()}. Captured library fixture: ${snapshot()!.input.utc}, latitude ${snapshot()!.input.latitude}, longitude ${snapshot()!.input.longitude}. ${state.scenario==='initial'?'Captured chart positions and cusps.':'Stress fixture: body positions deliberately perturbed; cusps retained.'} ${chartMode==='true-whole'?'Twelve whole-sign houses merge Ophiuchus into Scorpio.':''}`:'Synthetic equal-sector interaction fixture.';
 const pan=$('drawing').scrollLeft;
 ($('category') as HTMLSelectElement).value=state.category;
 ($('scenario') as HTMLSelectElement).value=state.scenario;
 $('drawing').innerHTML=wheel();
 $('drawing').classList.toggle('zoomed',zoom);$('drawing').scrollLeft=pan;
 $('zoom').textContent=zoom?'Show whole wheel':'Zoom · half wheel';$('zoom').setAttribute('aria-pressed',String(zoom));
 $('variant-name').textContent=({A:'A · Folder tiles',B:'B · Guided list',C:'C · Spotlight cards'} as Record<string,string>)[variant];
 $('panel').hidden=sheetHeight===0||(!i&&!state.choices.length&&!picker);
 $('panel').style.setProperty('--sheet-height',sheetHeight+'dvh');
 $('resize-handle').setAttribute('aria-valuenow',String(sheetHeight));
 $('resize-handle').setAttribute('aria-valuetext',sheetHeight+'% of screen');
 $('panel').classList.toggle('expanded',state.expanded);
 $('details').innerHTML=picker?pickerContent():state.choices.length ? `<h2 id="detail-title" tabindex="-1">Choose an aspect</h2><p>Several lines meet here.</p>${state.choices.map(id=>{const a=items().find(i=>i.id===id)!;return `<button data-choice="${id}">${a.name}</button>`}).join('')}` : i ? `<p class="eyebrow">${i.kind}</p><h2 id="detail-title" tabindex="-1">${i.name}</h2>${i.kind==='Aspect'?'':`<p>${reference(i)}</p>`}${facts(i)}${i.kind==='Body'?`<button data-connections="${i.body}">Explore ${i.name}’s connections ›</button>`:''}<hr><p class="context">${chartContext()}</p>` : '';
 $('expand').textContent=sheetHeight>=70?'Show less':'Expand details';
 $('list').innerHTML=items().filter(i=>i.kind===state.category).map(i=>`<button id="list-${i.id}" data-item="${i.id}" aria-pressed="${i.id===state.selected}">${i.name}</button>`).join('');
 $('state').textContent=`${state.scenario==='initial'?'Initial-input fixture':state.scenario==='edited'?'Edited-input fixture':'Crowded-body fixture'} · ${i?i.kind+': '+i.name:'No selection'} · ${state.choices.length?'Choosing between '+state.choices.length+' aspects':state.expanded?'Expanded details':'Compact details'}`;
 $('instruction').textContent=i?.kind==='Body'?'Unrelated aspects are dimmed. Choose another target to replace this selection.':'Choose a body, sign, house, angle, or aspect. Use the named list for small or crowded targets.';
};
const dispatch = (a:Parameters<typeof reduce>[1],focus?:string) => {const focused=document.activeElement?.id;state=reduce(state,a);render();if(focus)$(focus)?.focus();else if(focused)document.getElementById(focused)?.focus();};
const clear = () => {picker=null;sheetHeight=0;dispatch({type:'clear'},opener);};
const selectItem = (id:string,origin:string,keyboard:boolean) => {picker=null;sheetHeight=40;opener=origin;dispatch({type:'select',value:id});if(keyboard&&state.selected)$('detail-title').focus();};
const distance = (q:{x:number;y:number},a:{x:number;y:number},b:{x:number;y:number}) => {const dx=b.x-a.x,dy=b.y-a.y;const t=Math.max(0,Math.min(1,((q.x-a.x)*dx+(q.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(q.x-a.x-t*dx,q.y-a.y-t*dy);};
document.addEventListener('click',e=>{
 if(suppressClick){suppressClick=false;return;}
 const target=e.target as Element,button=target.closest<HTMLElement>('[data-item]'),choice=target.closest<HTMLElement>('[data-choice]');
 const folder=target.closest<HTMLElement>('[data-folder]'),pick=target.closest<HTMLElement>('[data-pick]'),back=target.closest<HTMLElement>('[data-picker-back]'),card=target.closest<HTMLElement>('[data-card]'),connections=target.closest<HTMLElement>('[data-connections]');
 if(folder){opener=folder.id;openPicker(folder.dataset.folder!.split(','));return;}
 if(connections){const id=connections.dataset.connections!;openPicker([id], 'aspects');picker={...picker!,body:id};render();return;}
 if(back&&picker){picker=back.dataset.pickerBack==='root'?{...picker,body:null,relation:null}:{...picker,relation:null};spotlight=0;render();$('detail-title').focus({preventScroll:true});return;}
 if(card){const count=$('details').querySelectorAll('[data-pick]').length;spotlight=(spotlight+Number(card.dataset.card)+count)%count;render();return;}
 if(pick&&picker){const id=pick.dataset.pick!;if(picker.mode==='bodies'){selectItem('body-'+id,opener,true);}else if(!picker.body){picker={...picker,body:id};spotlight=0;render();$('detail-title').focus({preventScroll:true});}else if(!picker.relation){picker={...picker,relation:id};spotlight=0;render();$('detail-title').focus({preventScroll:true});}else selectItem(id,opener,true);return;}
 if(choice){dispatch({type:'select',value:choice.dataset.choice},'detail-title');return;}
 if(button){
  if(button.closest('svg') && button.dataset.item!.startsWith('aspect-') && e.detail!==0){
   const svg=$('wheel') as unknown as SVGSVGElement,rect=svg.getBoundingClientRect(),q={x:(e.clientX-rect.left)*640/rect.width-20,y:(e.clientY-rect.top)*640/rect.height-20};
   const bs=bodies(),near=aspects().filter(a=>distance(q,p(bs.find(b=>b.name===a.pair![0])!.longitude,104),p(bs.find(b=>b.name===a.pair![1])!.longitude,104))<11);
   if(near.length>1){opener=button.id;openPicker([...new Set(near.flatMap(a=>a.pair!))],'aspects',near.map(a=>a.id));return;}
  }
  selectItem(button.dataset.item!,button.id,e.detail===0);return;
 }
 if(target.closest('#wheel'))clear();
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){e.preventDefault();clear();}
 const folder=(e.target as Element).closest<HTMLElement>('[data-folder]');if(folder&&(e.key==='Enter'||e.key===' ')){e.preventDefault();opener=folder.id;openPicker(folder.dataset.folder!.split(','));$('detail-title').focus();return;}
 const target=(e.target as Element).closest<HTMLElement>('g[data-item],path[data-item]');
 if(target&&(e.key==='Enter'||e.key===' ')){e.preventDefault();selectItem(target.dataset.item!,target.id,true);}
});
$('close').addEventListener('click',clear);
$('expand').addEventListener('click',()=>{sheetHeight=sheetHeight>=70?40:70;render();});
$('scenario').addEventListener('change',e=>{picker=null;sheetHeight=40;dispatch({type:'scenario',value:(e.target as HTMLSelectElement).value});});
$('category').addEventListener('change',e=>dispatch({type:'category',value:(e.target as HTMLSelectElement).value}));
let suppressClick=false;
$('chart-mode').addEventListener('change',e=>{chartMode=(e.target as HTMLSelectElement).value;picker=null;sheetHeight=40;dispatch({type:'scenario',value:'initial'});});
$('zoom').addEventListener('click',()=>{zoom=!zoom;render();});
$('pan-left').addEventListener('click',()=>$('drawing').scrollBy({left:-140,behavior:'smooth'}));
$('pan-right').addEventListener('click',()=>$('drawing').scrollBy({left:140,behavior:'smooth'}));
let panDrag:{id:number;x:number;y:number;scroll:number;moved:boolean}|null=null;
$('drawing').addEventListener('pointerdown',e=>{if(!zoom)return;panDrag={id:e.pointerId,x:e.clientX,y:e.clientY,scroll:$('drawing').scrollLeft,moved:false};});
$('drawing').addEventListener('pointermove',e=>{if(!panDrag)return;const delta=e.clientX-panDrag.x;if(Math.abs(delta)>6&&Math.abs(delta)>Math.abs(e.clientY-panDrag.y)){panDrag={...panDrag,moved:true};$('drawing').setPointerCapture(e.pointerId);$('drawing').scrollLeft=panDrag.scroll-delta;}});
const finishPan=()=>{if(panDrag?.moved)suppressClick=true;panDrag=null;};
$('drawing').addEventListener('pointerup',finishPan);$('drawing').addEventListener('pointercancel',()=>{panDrag=null;});
let resizeDrag:{y:number;start:number}|null=null;
const handle=$('resize-handle');
handle.addEventListener('pointerdown',e=>{resizeDrag={y:e.clientY,start:sheetHeight};handle.setPointerCapture(e.pointerId);});
handle.addEventListener('pointermove',e=>{if(!resizeDrag)return;sheetHeight=Math.max(0,Math.min(70,resizeDrag.start+(resizeDrag.y-e.clientY)/innerHeight*100));$('panel').style.setProperty('--sheet-height',sheetHeight+'dvh');});
const finishResize=()=>{if(!resizeDrag)return;sheetHeight=[0,40,70].reduce((a,b)=>Math.abs(b-sheetHeight)<Math.abs(a-sheetHeight)?b:a);resizeDrag=null;if(!sheetHeight)clear();else render();};
handle.addEventListener('pointerup',finishResize);handle.addEventListener('pointercancel',finishResize);
handle.addEventListener('keydown',e=>{if(['ArrowUp','ArrowDown','Home','End'].includes(e.key)){e.preventDefault();sheetHeight=e.key==='Home'?0:e.key==='End'?70:e.key==='ArrowUp'?70:sheetHeight>40?40:0;if(!sheetHeight)clear();else render();}});
const changeVariant=(delta:number)=>{variant=['A','B','C'][(['A','B','C'].indexOf(variant)+delta+3)%3];const url=new URL(location.href);url.searchParams.set('variant',variant);history.replaceState(null,'',url);spotlight=0;render();};
$('previous-variant').addEventListener('click',()=>changeVariant(-1));$('next-variant').addEventListener('click',()=>changeVariant(1));
document.addEventListener('keydown',e=>{if((e.target as Element).closest('input,select,textarea,[contenteditable], [role=slider]'))return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();changeVariant(e.key==='ArrowLeft'?-1:1);}});
render();

// Guided scenarios reset to a known state; each step remains a real action.
const walks = [
 {name:'Body and aspect',intro:'Watch unrelated lines dim, then replace the body selection with an aspect.',steps:[{label:'1. Select Sun',action:{type:'select',value:'body-SUN'}},{label:'2. Select a Sun connection',action:{type:'select',value:'aspect-sun-moon'}},{label:'3. Clear selection',action:{type:'clear'}}]},
 {name:'Crossing lines',intro:'Two opposition lines cross at the center. Choose the precise relationship.',steps:[{label:'1. Open crossing chooser',action:{type:'choices',choices:['aspect-sun-mars','aspect-moon-jupiter']}},{label:'2. Select an aspect',action:{type:'select',value:'aspect-moon-jupiter'}},{label:'3. Clear selection',action:{type:'clear'}}]},
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
 if(step){picker=null;sheetHeight=40;opener='walk-tabs';const action=walks[Number(step.dataset.guide)].steps[Number(step.dataset.step)].action;if(action.type==='choices'){const near=aspects().slice(0,3);openPicker([...new Set(near.flatMap(a=>a.pair!))],'aspects',near.map(a=>a.id));}else if(action.value?.startsWith('aspect-')&&snapshot()){dispatch({type:'select',value:aspects().find(a=>a.pair!.includes('SUN'))?.id??aspects()[0].id});}else dispatch(action);}
});
showWalk(0);
// Shareable review links can open the crowded folder immediately.
if(new URLSearchParams(location.search).get('picker')==='folder'){
 state={...initial,scenario:'crowded'};
 const group=clusters().find(group=>group.length>1);
 if(group){opener='folder-'+group[0].name;openPicker(group.map(b=>b.name));}else render();
}
const requestedScenario=new URLSearchParams(location.search).get('scenario');
if(requestedScenario&&['initial','edited','crowded','triangle','overflow'].includes(requestedScenario)){
 picker=null;state={...initial,scenario:requestedScenario};render();
}
