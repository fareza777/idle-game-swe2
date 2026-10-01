// Headless engine smoke test — run with node tools/smoke_test.js
const fs=require("fs"),path=require("path");
const web=path.join(__dirname,"..","web");

global.window={};
global.localStorage={_d:{},getItem(k){return this._d[k]||null},setItem(k,v){this._d[k]=v},removeItem(k){delete this._d[k]}};
global.fetch=async f=>({json:async()=>JSON.parse(fs.readFileSync(path.join(web,f),"utf8"))});
global.document={getElementById:()=>null,querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){},createElement:()=>({classList:{add(){},remove(){}},style:{},appendChild(){},remove(){}})};

const libs=["js/data.js","js/engine.js"].map(f=>fs.readFileSync(path.join(web,f),"utf8")).join("\n");
const test=`
const Sfx={play(){},ensure(){}};
(async()=>{
  await loadData();
  console.log("data ok:",Object.entries(DB.manifest.counts).map(([k,v])=>k+"="+v).join(" "));

  Game.newGame("warrior","TestHero");
  console.log("newGame ok, hp=",Game.maxHp(),"clv=",Game.combatLevel());

  Game.startGather("mine_copper");
  for(let i=0;i<1500;i++) Game.tick(0.2);
  const ore=Game.count("ore_copper");
  console.log("mined copper ore:",ore,"| mining lvl:",Game.lvl("mining"));
  if(ore<50) throw new Error("gather too slow");

  Game.startCraft("smelt_copper");
  for(let i=0;i<600;i++) Game.tick(0.2);
  const bars=Game.count("bar_copper");
  console.log("smelted bars:",bars);
  if(bars<10) throw new Error("smelting broken");
  Game.startCraft("smith_wpn_sword_copper");
  for(let i=0;i<200;i++) Game.tick(0.2);
  console.log("swords:",Game.count("wpn_sword_copper"));

  Game.equip("wpn_sword_copper","common");
  Game.startFight("greenhollow","m_greenhollow_0");
  for(let i=0;i<4000 && (Game.s.kills["m_greenhollow_0"]||0)<5;i++) Game.tick(0.2);
  console.log("kills:",Game.s.kills["m_greenhollow_0"],"| hp:",Game.s.hp,"| gold:",Game.gold());
  if((Game.s.kills["m_greenhollow_0"]||0)<3) throw new Error("combat too slow/broken");

  Game.s.xp.attack=XP_TABLE[20];Game.s.xp.strength=XP_TABLE[20];Game.s.xp.defence=XP_TABLE[20];Game.s.xp.vitality=XP_TABLE[30];
  Game.s.hp=Game.maxHp();
  Game.startFight("greenhollow","b_greenhollow_0");
  for(let i=0;i<8000 && !Game.s.zones.includes("pinewild");i++) Game.tick(0.2);
  console.log("zones unlocked:",Game.s.zones.join(","));
  if(!Game.s.zones.includes("pinewild")) throw new Error("boss never died / zone never unlocked");
  console.log("main quest state:",JSON.stringify(Game.s.quests["main_0"]));
  Game.claimQuest("main_0");
  console.log("claimed main_0:",Game.s.quests["main_0"].claimed);

  Game.s.lastSeen=Date.now()-3600e3;
  Game.startGather("mine_copper");
  const r=Game.offlineProgress();
  console.log("offline 1h:",r.lines);
  console.log("SMOKE TEST PASSED");
})().catch(e=>{console.error("FAIL:",e);process.exit(1)});
`;
eval(libs+"\n"+test);
