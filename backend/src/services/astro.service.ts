import { IntentType } from "./ajit.service";
import { EmotionType } from "./manu.service";

export type PlanetPosition = {
  name: string; longitude: number; sign: string; signIndex: number;
  degree: number; nakshatra: string; nakshatraLord: string;
};
export type DivisionalChart = { name: string; planets: Record<string, { sign: string; signIndex: number }>; };
export type DashaLevel = { planet: string; startDate: string; endDate: string; durationYears: number; };
export type VimshottariDasha = { mahadasha: DashaLevel; antardasha: DashaLevel; pratyantardasha: DashaLevel; sookshmadasha: DashaLevel; };
export type AstroInfluence = { dominantPlanet: string; stability: "low"|"medium"|"high"; risk: "low"|"medium"|"high"; signal: "favorable"|"challenging"|"neutral"; };
export type AstroResult = { influence: AstroInfluence; interpretation: string; currentPlanets: Record<string, PlanetPosition>; dasha: VimshottariDasha; d1: DivisionalChart; d9: DivisionalChart; d10: DivisionalChart; calculatedAt: string; location: { latitude: number; longitude: number }; };

const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const NAKSHATRAS = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
const NAKSHATRA_LORDS = ["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"];
const DASHA_YEARS: Record<string,number> = { Ketu:7, Venus:20, Sun:6, Moon:10, Mars:7, Rahu:18, Jupiter:16, Saturn:19, Mercury:17 };
const TOTAL_DASHA_YEARS = 120;
const PLANET_ORDER = ["Ketu","Venus","Sun","Moon","Mars","Rahu","Jupiter","Saturn","Mercury"];
const NAKSHATRA_SPAN = 360/27;
const EXALTATION: Record<string,number> = { Sun:0,Moon:1,Mercury:5,Venus:11,Mars:9,Jupiter:3,Saturn:6,Rahu:1,Ketu:7 };
const DEBILITATION: Record<string,number> = { Sun:6,Moon:7,Mercury:11,Venus:5,Mars:3,Jupiter:9,Saturn:0,Rahu:7,Ketu:1 };
const BENEFICS = new Set(["Venus","Jupiter","Mercury","Moon"]);
const MALEFICS = new Set(["Saturn","Mars","Rahu","Ketu","Sun"]);

function norm(a:number){return((a%360)+360)%360;}
function rad(d:number){return d*Math.PI/180;}
function toJD(d:Date){const Y=d.getUTCFullYear(),M=d.getUTCMonth()+1,D=d.getUTCDate(),H=d.getUTCHours()+d.getUTCMinutes()/60+d.getUTCSeconds()/3600,A=Math.floor((14-M)/12),y=Y+4800-A,m=M+12*A-3,JDN=D+Math.floor((153*m+2)/5)+365*y+Math.floor(y/4)-Math.floor(y/100)+Math.floor(y/400)-32045;return JDN+(H-12)/24;}
function ayanamsa(jd:number){const T=(jd-2451545)/36525;return 23.85+0.013978*T+0.000003*T*T;}
function sun(jd:number){const T=(jd-2451545)/36525,L=280.46646+36000.76983*T,Mr=rad(norm(357.52911+35999.05029*T)),C=(1.914602-0.004817*T)*Math.sin(Mr)+(0.019993-0.000101*T)*Math.sin(2*Mr)+0.000289*Math.sin(3*Mr);return norm(L+C);}
function moon(jd:number){const T=(jd-2451545)/36525,L=218.3164477+481267.88123421*T,D=rad(297.8501921+445267.1114034*T),M=rad(357.5291092+35999.0502909*T),Mp=rad(134.9633964+477198.8675055*T),F=rad(93.2720950+483202.0175233*T);return norm(L+6.288774*Math.sin(Mp)+1.274027*Math.sin(2*D-Mp)+0.658314*Math.sin(2*D)+0.213618*Math.sin(2*Mp)-0.185116*Math.sin(M)-0.114332*Math.sin(2*F)+0.058793*Math.sin(2*D-2*Mp));}
const ME:Record<string,[number,number]>={Mercury:[252.250906,149474.0722491],Venus:[181.979801,58519.2130302],Mars:[355.433275,19141.6964746],Jupiter:[34.351519,3034.9056606],Saturn:[50.077444,1222.1138488]};
function planet(jd:number,p:string){const T=(jd-2451545)/36525,[L,r]=ME[p];return norm(L+r*T);}
function rahu(jd:number){const T=(jd-2451545)/36525;return norm(125.04452-1934.136261*T+0.0020708*T*T);}

function computePositions(jd:number):Record<string,PlanetPosition>{
  const ay=ayanamsa(jd);
  const tr:Record<string,number>={Sun:sun(jd),Moon:moon(jd),Mercury:planet(jd,"Mercury"),Venus:planet(jd,"Venus"),Mars:planet(jd,"Mars"),Jupiter:planet(jd,"Jupiter"),Saturn:planet(jd,"Saturn"),Rahu:rahu(jd)};
  tr["Ketu"]=norm(tr["Rahu"]+180);
  const out:Record<string,PlanetPosition>={};
  for(const[n,tl] of Object.entries(tr)){const s=norm(tl-ay),si=Math.floor(s/30),deg=s-si*30,ni=Math.floor(s/NAKSHATRA_SPAN);out[n]={name:n,longitude:+s.toFixed(4),sign:SIGNS[si],signIndex:si,degree:+deg.toFixed(4),nakshatra:NAKSHATRAS[ni],nakshatraLord:NAKSHATRA_LORDS[ni%9]};}
  return out;
}

function d1(pos:Record<string,PlanetPosition>):DivisionalChart{const p:Record<string,{sign:string;signIndex:number}>={};for(const[n,v] of Object.entries(pos))p[n]={sign:v.sign,signIndex:v.signIndex};return{name:"D1 (Rasi)",planets:p};}
function navSign(lon:number){const si=Math.floor(lon/30),d=lon-si*30,n=Math.floor(d/(30/9)),sm=[0,9,6,3,0,9,6,3,0,9,6,3],ns=(sm[si]+n)%12;return{sign:SIGNS[ns],signIndex:ns};}
function d9(pos:Record<string,PlanetPosition>):DivisionalChart{const p:Record<string,{sign:string;signIndex:number}>={};for(const[n,v] of Object.entries(pos))p[n]=navSign(v.longitude);return{name:"D9 (Navamsha)",planets:p};}
function dashSign(lon:number){const si=Math.floor(lon/30),d=lon-si*30,n=Math.floor(d/3),odd=si%2===0,ss=odd?si:(si+8)%12,ds=(ss+n)%12;return{sign:SIGNS[ds],signIndex:ds};}
function d10(pos:Record<string,PlanetPosition>):DivisionalChart{const p:Record<string,{sign:string;signIndex:number}>={};for(const[n,v] of Object.entries(pos))p[n]=dashSign(v.longitude);return{name:"D10 (Dashamsha)",planets:p};}

function msd(ms:number){return new Date(ms).toISOString().split("T")[0];}
function computeDasha(moonLon:number,now:Date):VimshottariDasha{
  const ni=Math.floor(moonLon/NAKSHATRA_SPAN),li=ni%9,mp=NAKSHATRA_LORDS[li],mi=PLANET_ORDER.indexOf(mp);
  const frac=(moonLon-ni*NAKSHATRA_SPAN)/NAKSHATRA_SPAN,maY=DASHA_YEARS[mp],maMs=maY*365.25*86400000;
  const maS=now.getTime()-frac*maMs,maE=maS+maMs;
  let aS=maS,ap=mp,aE=maS,aY=maY;
  for(let i=0;i<9;i++){const p=PLANET_ORDER[(mi+i)%9],y=(DASHA_YEARS[p]*maY)/TOTAL_DASHA_YEARS,ms2=y*365.25*86400000;aE=aS+ms2;if(now.getTime()>=aS&&now.getTime()<aE){ap=p;aY=y;break;}aS=aE;}
  const ai=PLANET_ORDER.indexOf(ap);
  let pS=aS,pp=ap,pE=aS,pY=aY;
  for(let i=0;i<9;i++){const p=PLANET_ORDER[(ai+i)%9],y=(DASHA_YEARS[p]*aY)/TOTAL_DASHA_YEARS,ms2=y*365.25*86400000;pE=pS+ms2;if(now.getTime()>=pS&&now.getTime()<pE){pp=p;pY=y;break;}pS=pE;}
  const pi=PLANET_ORDER.indexOf(pp);
  let sS=pS,sp=pp,sE=pS,sY=pY;
  for(let i=0;i<9;i++){const p=PLANET_ORDER[(pi+i)%9],y=(DASHA_YEARS[p]*pY)/TOTAL_DASHA_YEARS,ms2=y*365.25*86400000;sE=sS+ms2;if(now.getTime()>=sS&&now.getTime()<sE){sp=p;sY=y;break;}sS=sE;}
  return{mahadasha:{planet:mp,startDate:msd(maS),endDate:msd(maE),durationYears:maY},antardasha:{planet:ap,startDate:msd(aS),endDate:msd(aE),durationYears:+aY.toFixed(3)},pratyantardasha:{planet:pp,startDate:msd(pS),endDate:msd(pE),durationYears:+pY.toFixed(5)},sookshmadasha:{planet:sp,startDate:msd(sS),endDate:msd(sE),durationYears:+sY.toFixed(7)}};
}

function strength(planet:string,pos:Record<string,PlanetPosition>):"exalted"|"debilitated"|"neutral"{
  const si=pos[planet]?.signIndex??-1;
  if(si!==-1&&EXALTATION[planet]===si)return"exalted";
  if(si!==-1&&DEBILITATION[planet]===si)return"debilitated";
  return"neutral";
}

function intentPlanet(intent:IntentType):string{switch(intent){case"relationship":return"Venus";case"conflict":return"Mars";case"decision":return"Mercury";case"career":return"Saturn";case"health":return"Sun";default:return"Moon";}}

function influence(ip:string,pos:Record<string,PlanetPosition>,dasha:VimshottariDasha):AstroInfluence{
  const s=strength(ip,pos);
  const mb=BENEFICS.has(dasha.mahadasha.planet),ab=BENEFICS.has(dasha.antardasha.planet),mm=MALEFICS.has(dasha.mahadasha.planet);
  let stab:"low"|"medium"|"high",risk:"low"|"medium"|"high",sig:"favorable"|"challenging"|"neutral";
  if(s==="exalted"&&mb&&ab){stab="high";risk="low";sig="favorable";}
  else if(s==="debilitated"&&!mb&&!ab){stab="low";risk="high";sig="challenging";}
  else if(s==="exalted"||mb){stab="medium";risk="low";sig="favorable";}
  else if(s==="debilitated"||mm){stab="low";risk="medium";sig="challenging";}
  else{stab="medium";risk="medium";sig="neutral";}
  return{dominantPlanet:ip,stability:stab,risk,signal:sig};
}

function interpret(inf:AstroInfluence,dasha:VimshottariDasha,pos:Record<string,PlanetPosition>):string{
  const{dominantPlanet:dp,signal,stability,risk}=inf;
  const m=pos["Moon"],pl=pos[dp];
  const ds=`${dasha.mahadasha.planet} Mahadasha / ${dasha.antardasha.planet} Antardasha / ${dasha.pratyantardasha.planet} Pratyantardasha`;
  const moonInfo=m?`Moon in ${m.nakshatra} (${m.sign})`:"";
  const s=strength(dp,pos);
  const planetInfo=pl?`${dp} in ${pl.sign} (${s})`:`${dp} active`;
  if(signal==="favorable")return`${planetInfo}. ${ds}. ${moonInfo}. Planetary support strong — stability:${stability}, risk:${risk}. Good window for decisive action.`;
  if(signal==="challenging")return`${planetInfo}. ${ds}. ${moonInfo}. Planetary friction elevated — stability:${stability}, risk:${risk}. Avoid impulsive decisions.`;
  return`${planetInfo}. ${ds}. ${moonInfo}. Mixed energies — stability:${stability}, risk:${risk}. Measured action recommended.`;
}

export function analyzeAstro(intent:IntentType,_emotion:EmotionType,options?:{latitude?:number;longitude?:number}):AstroResult{
  const now=new Date(),lat=options?.latitude??28.6139,lon=options?.longitude??77.2090;
  const jd=toJD(now),pos=computePositions(jd);
  const dasha=computeDasha(pos["Moon"].longitude,now);
  const ip=intentPlanet(intent),inf=influence(ip,pos,dasha);
  return{influence:inf,interpretation:interpret(inf,dasha,pos),currentPlanets:pos,dasha,d1:d1(pos),d9:d9(pos),d10:d10(pos),calculatedAt:now.toISOString(),location:{latitude:lat,longitude:lon}};
}
