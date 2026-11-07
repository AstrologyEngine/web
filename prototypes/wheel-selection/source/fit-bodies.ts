// Throwaway fit-first packing. Pure functions; positions never change chart facts.
export type BodyPosition = {name:string;longitude:number};
export type Sector = {start:number;width:number;index:number};
type Slot = {longitude:number;radius:number;x:number;y:number};
type Placement = Slot & {body:BodyPosition};
const radians=Math.PI/180;
const point=(longitude:number,radius:number)=>({x:radius*Math.cos(longitude*radians),y:radius*Math.sin(longitude*radians)});
export const footprint=22,clearance=5,separation=footprint*2+3;
// The two radii permit a triangle: two on the wider outer row, one inward.
const slotsFor=(sector:Sector):Slot[]=>[203,160].flatMap(radius=>{
 const inset=Math.asin((footprint+clearance)/radius)/radians;
 const available=sector.width-2*inset;
 if(available<0)return [];
 const steps=Math.max(1,Math.ceil(available/1.5));
 return Array.from({length:steps+1},(_,i)=>{
  const longitude=sector.start+inset+available*i/steps;
  return {longitude,radius,...point(longitude,radius)};
 });
});
export const fitHouse=(bodies:BodyPosition[],sector:Sector):Placement[]|null=>{
 if(!bodies.length)return [];
 const slots=slotsFor(sector);
 const ordered=[...bodies].sort((a,b)=>(a.longitude-sector.start+360)%360-(b.longitude-sector.start+360)%360||a.name.localeCompare(b.name));
 // Bounded beam search avoids locking an early glyph into the only later slot.
 const result=ordered.reduce<{cost:number;placed:Placement[]}[]>((beam,body)=>
  beam.flatMap(candidate=>slots.filter(slot=>candidate.placed.every(p=>Math.hypot(p.x-slot.x,p.y-slot.y)>=separation)).map(slot=>{
   const delta=((slot.longitude-body.longitude+540)%360)-180;
   return {cost:candidate.cost+delta*delta+(slot.radius===203?0:18),placed:[...candidate.placed,{...slot,body}]};
  })).sort((a,b)=>a.cost-b.cost).slice(0,160),
 [{cost:0,placed:[]}]);
 return result[0]?.placed??null;
};
