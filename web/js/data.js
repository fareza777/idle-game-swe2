/* Duskspire — data loading + indexes */
const DB = {
  skills:[], rarities:[], zones:[], monsters:[], items:[],
  recipes:[], activities:[], quests:[], statuses:[], classes:[],
  byId:{}, // id -> def for items/monsters/recipes/activities/quests/statuses/zones
  skillById:{}, rarById:{}, zoneById:{}, monById:{}, itemById:{},
  recById:{}, actById:{}, questById:{}, statusById:{}, classById:{},
};

const DATA_FILES = ["skills","rarities","zones","monsters","items",
  "recipes","activities","quests","statuses","classes","manifest"];

async function loadData(onProgress){
  const results = await Promise.all(DATA_FILES.map(f =>
    fetch(`data/${f}.json`).then(r => r.json())));
  DATA_FILES.forEach((f,i)=>{ DB[f] = results[i]; onProgress?.((i+1)/DATA_FILES.length); });
  for (const k of ["skills","rarities","zones","monsters","items","recipes",
                   "activities","quests","statuses","classes"]) {
    const map = {};
    for (const d of DB[k]||[]) map[d.id] = d;
    DB.byId[k] = map;
  }
  DB.skillById=DB.byId.skills; DB.rarById=DB.byId.rarities;
  DB.zoneById=DB.byId.zones; DB.monById=DB.byId.monsters;
  DB.itemById=DB.byId.items; DB.recById=DB.byId.recipes;
  DB.actById=DB.byId.activities; DB.questById=DB.byId.quests;
  DB.statusById=DB.byId.statuses; DB.classById=DB.byId.classes;
  // index helpers
  DB.actsBySkill = {};
  for (const a of DB.activities) (DB.actsBySkill[a.skill] ||= []).push(a);
  DB.recsBySkill = {};
  for (const r of DB.recipes) (DB.recsBySkill[r.skill] ||= []).push(r);
  DB.monsByZone = {};
  for (const m of DB.monsters) (DB.monsByZone[m.zone] ||= []).push(m);
  DB.mainQuests = DB.quests.filter(q=>q.type==="main").sort((a,b)=>a.order-b.order);
  DB.sideQuests = DB.quests.filter(q=>q.type==="side").sort((a,b)=>a.order-b.order);
}

const GATHER_SKILLS = ["mining","woodcutting","fishing","farming","hunting","divination","thieving"];
const ARTISAN_SKILLS = ["smithing","cooking","alchemy","crafting","fletching","runecrafting","engineering"];
const COMBAT_SKILLS = ["attack","strength","defence","vitality","ranged","magic","devotion"];
const STYLE_SKILL = {melee:"attack", ranged:"ranged", magic:"magic"};
const EQUIP_SLOTS = ["weapon","helm","body","legs","boots","gloves","shield","ring","amulet","bracelet","trinket","tool"];

/* XP curve: cumulative xp needed for level L */
function xpForLevel(l){ return Math.floor(50 * Math.pow(l, 2.4)); }
const XP_TABLE = (()=>{ const t=[0]; for(let l=1;l<=99;l++) t[l]=xpForLevel(l); return t; })();
function levelForXp(xp){
  let l=1; while(l<99 && xp>=XP_TABLE[l+1]) l++; return l;
}
function xpProgress(xp){
  const l=levelForXp(xp); if(l>=99) return 1;
  return (xp-XP_TABLE[l])/(XP_TABLE[l+1]-XP_TABLE[l]);
}
function fmtNum(n){
  n=Math.floor(n);
  if(n>=1e9) return (n/1e9).toFixed(2)+"B";
  if(n>=1e6) return (n/1e6).toFixed(2)+"M";
  if(n>=1e3) return (n/1e3).toFixed(1)+"K";
  return ""+n;
}
function esc(s){ return String(s).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
