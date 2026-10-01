/* ============ DUSKSPIRE — game engine (fully data-driven) ============ */
const SAVE_KEY = "duskspire_save_v1";
const TICK_MS = 200;
const OFFLINE_CAP_S = 12 * 3600;

const Game = {
  s: null,
  listeners: {},
  _t: null,
  _saveT: 0,

  /* ---------- events ---------- */
  on(ev, fn){ (this.listeners[ev] ||= []).push(fn); },
  emit(ev, data){ (this.listeners[ev]||[]).forEach(f=>f(data)); },

  /* ---------- save/load ---------- */
  newGame(clsId, name){
    this.s = {
      v:1, name: name || "Nameless", cls: clsId, createdAt: Date.now(),
      lastSeen: Date.now(), xp: {}, inv: {}, equip: {}, zones: ["greenhollow"],
      quests: {}, hp: 0, activity: null, combat: null,
      kills: {}, totalKills: 0, bossKills: 0,
      crafted: {}, gathered: {},
      settings: {sfx:true, autoEat:true},
      tut: 0,
    };
    const cls = DB.classById[clsId];
    for (const [sk,l] of Object.entries(cls.startSkills||{}))
      this.s.xp[sk] = XP_TABLE[l];
    // starter kit
    this.give("wpn_sword_copper",1,{rar:"common"});
    this.give("tool_pickaxe_copper",1,{rar:"common"});
    this.give("tool_hatchet_copper",1,{rar:"common"});
    this.give("eng_fishing_rod",1,{rar:"common"});
    this.give("cooked_shrimp",8);
    this.give("seed_turnip",6);
    this.give("coins",50);
    this.s.hp = this.maxHp();
    this.save();
  },
  save(){
    if(!this.s) return;
    this.s.lastSeen = Date.now();
    try{ localStorage.setItem(SAVE_KEY, JSON.stringify(this.s)); }catch(e){}
  },
  load(){
    try{ const raw = localStorage.getItem(SAVE_KEY); return raw ? JSON.parse(raw) : null; }catch(e){ return null; }
  },
  wipe(){ localStorage.removeItem(SAVE_KEY); this.s=null; },
  hasSave(){ return !!this.load(); },

  /* ---------- derived ---------- */
  lvl(sk){ return levelForXp(this.s.xp[sk]||0); },
  cls(){ return DB.classById[this.s.cls]; },
  combatLevel(){
    const a=this.lvl("attack")+this.lvl("strength")+this.lvl("defence");
    const o=Math.max(this.lvl("ranged"),this.lvl("magic"))*1.5;
    return Math.floor((Math.max(a,o)+this.lvl("vitality")*0.5)/4)+1;
  },
  maxHp(){
    let hp = 10 + this.lvl("vitality")*6;
    const st = this.gearStats();
    hp += st.hp||0;
    const b = this.cls().bonus||{};
    if(b.hpUp) hp *= 1+b.hpUp;
    return Math.floor(hp);
  },
  gearStats(){
    const t = {};
    for(const slot of EQUIP_SLOTS){
      const e = this.s.equip[slot]; if(!e) continue;
      const def = DB.itemById[e.item]; if(!def||!def.equip) continue;
      const mult = (DB.rarById[e.rar]||{statMult:1}).statMult;
      for(const [k,v] of Object.entries(def.equip)){
        if(typeof v==="number" && k!=="speed" && k!=="tier" && k!=="boost")
          t[k]=(t[k]||0)+Math.round(v*mult);
      }
    }
    return t;
  },
  weapon(){
    const e = this.s.equip.weapon;
    if(!e) return {speed:2.4, atk:0, str:2, style:"melee", name:"Fists"};
    const d = DB.itemById[e.item];
    const mult = (DB.rarById[e.rar]||{statMult:1}).statMult;
    const eq = d.equip||{};
    return {speed:eq.speed||2.5, atk:Math.round((eq.atk||0)*mult),
      str:Math.round((eq.str||0)*mult), style:eq.style||"melee",
      name:d.name, status:eq.status||null, icon:d.icon};
  },
  toolBoost(tclass){
    const e = this.s.equip.tool;
    if(e && DB.itemById[e.item]?.equip?.toolClass===tclass)
      return DB.itemById[e.item].equip.boost||1;
    // tool in bag works at half boost
    for(const key in this.s.inv){
      const iid = key.split("@")[0];
      const eq = DB.itemById[iid]?.equip;
      if(eq?.toolClass===tclass) return 1+((eq.boost||1)-1)*0.5;
    }
    return 1;
  },

  /* ---------- inventory ---------- */
  invKey(itemId, rar){
    const d = DB.itemById[itemId];
    return (d && !d.stackable) ? `${itemId}@${rar||"common"}` : itemId;
  },
  give(itemId, qty=1, opts={}){
    if(!DB.itemById[itemId]) return;
    const d = DB.itemById[itemId];
    if(!d.stackable){
      const rar = opts.rar || this.rollRarity(opts.luck||0, DB.itemById[itemId].minRarity||0);
      const key = `${itemId}@${rar}`;
      this.s.inv[key]=(this.s.inv[key]||0)+qty;
      this.emit("loot",{item:itemId,qty,rar});
      return rar;
    }
    this.s.inv[itemId]=(this.s.inv[itemId]||0)+qty;
    this.emit("loot",{item:itemId,qty});
  },
  take(itemId, qty=1, rar=null){
    if(rar!==null){
      const key=`${itemId}@${rar}`;
      if((this.s.inv[key]||0)<qty) return false;
      this.s.inv[key]-=qty; if(!this.s.inv[key]) delete this.s.inv[key];
      return true;
    }
    // stackable or any rarity
    if(DB.itemById[itemId]?.stackable){
      if((this.s.inv[itemId]||0)<qty) return false;
      this.s.inv[itemId]-=qty; if(!this.s.inv[itemId]) delete this.s.inv[itemId];
      return true;
    }
    let need=qty;
    for(const key of Object.keys(this.s.inv)){
      if(key.startsWith(itemId+"@")){
        const c=Math.min(this.s.inv[key],need);
        this.s.inv[key]-=c; need-=c;
        if(!this.s.inv[key]) delete this.s.inv[key];
        if(!need) return true;
      }
    }
    return need<qty;
  },
  count(itemId){
    if(DB.itemById[itemId]?.stackable) return this.s.inv[itemId]||0;
    let n=0;
    for(const k in this.s.inv) if(k.startsWith(itemId+"@")) n+=this.s.inv[k];
    for(const slot in this.s.equip)
      if(this.s.equip[slot]?.item===itemId) n+=1;
    return n;
  },
  gold(){ return this.s.inv["coins"]||0; },
  sell(itemId, rar, qty=1){
    const d=DB.itemById[itemId]; if(!d) return;
    if(!this.take(itemId,qty,rar)) return;
    const mult=(DB.rarById[rar]||{statMult:1}).statMult;
    const price=Math.max(1,Math.round((d.sellPrice||1)*mult*qty));
    this.give("coins",price);
    Sfx.play("coin"); this.emit("render");
  },
  rollRarity(luck=0, minTier=0){
    // weight = dropMult * (1+luck) biased upward a bit for bosses
    let tot=0; const ws=[];
    for(const r of DB.rarities){
      const w = r.dropMult * (1 + luck*(r.tier/25));
      ws.push(w); tot+=w;
    }
    let x=Math.random()*tot, pick=DB.rarities[0];
    for(let i=0;i<ws.length;i++){ x-=ws[i]; if(x<=0){pick=DB.rarities[i];break;} }
    if(pick.tier<minTier) pick = DB.rarities[Math.min(minTier,24)];
    return pick.id;
  },

  /* ---------- equipment ---------- */
  equip(itemId, rar){
    const d=DB.itemById[itemId]; if(!d?.equip) return false;
    const key=this.invKey(itemId,rar);
    if(!this.s.inv[key]) return false;
    const slot=d.equip.slot;
    // unequip current
    if(this.s.equip[slot]){
      const cur=this.s.equip[slot];
      this.s.inv[this.invKey(cur.item,cur.rar)]=(this.s.inv[this.invKey(cur.item,cur.rar)]||0)+1;
    }
    this.s.inv[key]--; if(!this.s.inv[key]) delete this.s.inv[key];
    this.s.equip[slot]={item:itemId,rar};
    if(slot==="weapon" && this.s.combat) this.resetPlayerCd();
    Sfx.play("equip"); this.emit("render"); return true;
  },
  unequip(slot){
    const e=this.s.equip[slot]; if(!e) return;
    delete this.s.equip[slot];
    this.s.inv[this.invKey(e.item,e.rar)]=(this.s.inv[this.invKey(e.item,e.rar)]||0)+1;
    Sfx.play("tap"); this.emit("render");
  },

  /* ---------- consumables ---------- */
  eat(itemId){
    const d=DB.itemById[itemId];
    if(!d?.food && !d?.potion) return false;
    if(!this.take(itemId,1)) return false;
    if(d.food){ this.s.hp=Math.min(this.maxHp(),this.s.hp+d.food.heal);
      this.emit("toast",`${d.icon} +${d.food.heal} HP`); }
    if(d.potion){
      const p=d.potion;
      if(p.kind==="heal"){ this.s.hp=Math.min(this.maxHp(),this.s.hp+p.mag*4); }
      else if(p.kind==="buff"){
        // temporary skill boost: store as buff status on player
        this.addPlayerStatus({id:"focus"}, p.mag); // simplified: focus
      } else if(p.kind==="buffstatus"){
        this.addPlayerStatus({id:p.stat},0);
      } else if(p.kind==="cure"){
        delete this.s.combat?.statusesP?.[p.stat];
        this.emit("toast","Cured!");
      }
    }
    this.emit("render"); return true;
  },

  /* ---------- xp ---------- */
  addXp(sk, amt){
    const before=this.lvl(sk);
    this.s.xp[sk]=(this.s.xp[sk]||0)+amt;
    const after=this.lvl(sk);
    if(after>before){
      Sfx.play("level");
      this.emit("levelup",{skill:sk,level:after});
      this.emit("toast",`⭐ ${DB.skillById[sk].name} level ${after}!`,"gold");
    }
    this.questTick_levels();
  },
  questTick_levels(){
    for(const q of DB.quests){
      const st=this.s.quests[q.id];
      if(st?.done) continue;
      for(const r of q.reqs){
        if(r.kind==="skill_level"){
          let v=0;
          if(r.target==="any") v=Math.max(...Object.keys(this.s.xp).map(k=>this.lvl(k)),1);
          else if(r.target==="any_combat") v=Math.max(...COMBAT_SKILLS.map(k=>this.lvl(k)),1);
          else v=this.lvl(r.target);
          this.setQuestProg(q.id,r,v);
        }
      }
    }
  },

  /* ---------- quests ---------- */
  setQuestProg(qid,req,val){
    const q=DB.questById[qid];
    const st=this.s.quests[qid] ||= {p:0,done:false,claimed:false};
    st.p=Math.min(req.qty,val);
    if(st.p>=req.qty && !st.done){
      // all reqs must be met
      let ok=true;
      for(const r of q.reqs){
        if(r.kind===q.reqs[0].kind && r.target===q.reqs[0].target) continue;
        ok=false;
      }
      st.done=true;
      Sfx.play("quest"); this.emit("toast",`📜 Quest ready: ${q.name}`,"gold");
      this.emit("render");
    }
  },
  questEvent(kind,target,qty=1){
    for(const q of DB.quests){
      const st=this.s.quests[q.id];
      if(st?.done) continue;
      for(const r of q.reqs){
        if(r.kind!==kind) continue;
        if(kind==="kill" && r.target!==target) continue;
        if(kind==="gather" && r.target!==target) continue;
        if(kind==="craft_any" && r.target!==target) continue;
        if(kind==="craft_qty" && !target.startsWith(r.target)) continue;
        if(kind==="kill_any"||kind==="kill_boss"||kind==="craft_any"||
           (kind==="kill"&&r.target===target)||(kind==="gather"&&r.target===target)||
           (kind==="craft_qty"&&target.startsWith(r.target))){
          const cur=(this.s.quests[q.id] ||= {p:0,done:false,claimed:false});
          this.setQuestProg(q.id,r,cur.p+qty);
        }
      }
    }
  },
  claimQuest(qid){
    const q=DB.questById[qid], st=this.s.quests[qid];
    if(!st?.done||st.claimed) return;
    st.claimed=true;
    const rw=q.rewards||{};
    for(const [sk,xp] of Object.entries(rw.xp||{})) this.addXp(sk,xp);
    for(const it of rw.items||[]) this.give(it.item,it.qty,{rar:"rare"});
    if(rw.unlock_zone && !this.s.zones.includes(rw.unlock_zone)){
      this.s.zones.push(rw.unlock_zone);
      this.emit("toast",`🗺️ New zone unlocked: ${DB.zoneById[rw.unlock_zone].name}`,"gold");
    }
    Sfx.play("win"); this.emit("render");
  },

  /* ---------- activities ---------- */
  canDoActivity(a){
    if(this.lvl(a.skill)<a.level) return {ok:false,why:`Requires ${DB.skillById[a.skill].name} ${a.level}`};
    const z=DB.zones[a.zone||0];
    if(z && !this.s.zones.includes(z.id)) return {ok:false,why:`Unlock ${z.name} first`};
    if(a.tool && !this.toolPresent(a.tool)) return {ok:false,why:`Need a ${a.tool}`};
    if(a.consume && this.count(a.consume.item)<a.consume.qty)
      return {ok:false,why:`Needs ${a.consume.qty}× ${DB.itemById[a.consume.item].name}`};
    return {ok:true};
  },
  toolPresent(tclass){
    const e=this.s.equip.tool;
    if(e && DB.itemById[e.item]?.equip?.toolClass===tclass) return true;
    for(const k in this.s.inv){
      const d=DB.itemById[k.split("@")[0]];
      if(d?.equip?.toolClass===tclass) return true;
    }
    return false;
  },
  canCraft(r){
    if(this.lvl(r.skill)<r.level) return {ok:false,why:`Requires ${DB.skillById[r.skill].name} ${r.level}`};
    for(const inp of r.inputs)
      if(this.count(inp.item)<inp.qty) return {ok:false,why:`Missing ${DB.itemById[inp.item].name}`};
    return {ok:true};
  },
  startGather(actId){ this.s.activity={kind:"gather",id:actId,prog:0}; this.s.combat=null; Sfx.play("tap"); this.emit("render"); },
  startCraft(recId, max=false){ this.s.activity={kind:"craft",id:recId,prog:0,max}; this.s.combat=null; Sfx.play("tap"); this.emit("render"); },
  startFight(zoneId, monId){
    const m=DB.monById[monId]; if(!m) return;
    this.s.activity={kind:"fight",id:zoneId,monsterId:monId,prog:0};
    this.s.combat={monId,monHp:m.hp,cdP:0,cdM:m.speed,statusesP:{},statusesM:{}};
    Sfx.play("hit"); this.emit("render");
  },
  resetPlayerCd(){ if(this.s.combat) this.s.combat.cdP=0; },
  stopActivity(){ this.s.activity=null; this.s.combat=null; this.emit("render"); },

  /* ---------- status helpers ---------- */
  addStatus(bag,statusId,defs){
    const sd=DB.statusById[statusId]; if(!sd) return;
    bag[statusId]={id:statusId,left:sd.dur};
  },
  addPlayerStatus(st){ if(this.s.combat) this.addStatus(this.s.combat.statusesP,st.id); },
  tickStatuses(who, bag){
    // returns {dmg, heal, skip}
    let out={dmg:0,heal:0,skip:false};
    for(const id of Object.keys(bag)){
      const sd=DB.statusById[id], st=bag[id];
      if(!sd){ delete bag[id]; continue; }
      if(sd.tick?.dmgPct && !sd.tick.onFoe) out.dmg+=sd.tick.dmgPct;
      if(sd.tick?.dmgPct && sd.tick.onFoe && who==="player") out.dmg+=sd.tick.dmgPct;
      if(sd.tick?.healPct) out.heal+=sd.tick.healPct;
      if(sd.skipChance && Math.random()<sd.skipChance) out.skip=true;
      st.left--; if(st.left<=0) delete bag[id];
    }
    return out;
  },

  /* ---------- main tick ---------- */
  start(){
    if(this._t) clearInterval(this._t);
    let last=Date.now();
    this._t=setInterval(()=>{
      const now=Date.now(), dt=now-last; last=now;
      if(!this.s) return;
      this.tick(dt/1000);
      this._saveT+=dt;
      if(this._saveT>15000){ this._saveT=0; this.save(); }
    },TICK_MS);
  },
  tick(dt){
    const act=this.s.activity; if(!act) return;
    if(act.kind==="gather") this.tickGather(act,dt);
    else if(act.kind==="craft") this.tickCraft(act,dt);
    else if(act.kind==="fight") this.tickFight(act,dt);
    this.emit("tick");
  },

  tickGather(act,dt){
    const a=DB.actById[act.id]; if(!a){this.s.activity=null;return;}
    const chk=this.canDoActivity(a);
    if(!chk.ok){ this.emit("toast","⚠ "+chk.why); this.s.activity=null; this.emit("render"); return; }
    const speed = a.tool ? this.toolBoost(a.tool) : 1;
    act.prog += dt*speed;
    const need=a.ticks*0.4; // seconds per action
    if(act.prog>=need){
      act.prog=0;
      if(a.consume) this.take(a.consume.item,a.consume.qty);
      const out=a.output;
      const got=this.give(out.item,out.qty,{luck:this.luckBonus()});
      this.s.gathered[out.item]=(this.s.gathered[out.item]||0)+out.qty;
      this.questEvent("gather",out.item,out.qty);
      for(const b of a.bonus||[]) if(Math.random()<b.chance) this.give(b.item,b.qty,{luck:this.luckBonus()});
      this.addXp(a.skill,a.xp);
      Sfx.play("gather");
      this.emit("action",{type:"gather",act:a});
    }
  },
  luckBonus(){
    let l=0; const st=this.gearStats(); l+=(st.luck||0)/50;
    const b=this.cls().bonus||{}; if(b.luckUp) l+=b.luckUp;
    return l;
  },

  tickCraft(act,dt){
    const r=DB.recById[act.id]; if(!r){this.s.activity=null;return;}
    const chk=this.canCraft(r);
    if(!chk.ok){ this.emit("toast","⚠ "+chk.why); this.s.activity=null; this.emit("render"); return; }
    act.prog+=dt;
    const need=r.ticks*0.4;
    if(act.prog>=need){
      act.prog=0;
      for(const inp of r.inputs) this.take(inp.item,inp.qty);
      const got=this.give(r.output.item,r.output.qty,{luck:this.luckBonus()});
      this.s.crafted[r.skill]=(this.s.crafted[r.skill]||0)+1;
      this.questEvent("craft_any",r.skill,1);
      this.questEvent("craft_qty",r.output.item,r.output.qty);
      this.addXp(r.skill,r.xp);
      Sfx.play("craft");
      this.emit("action",{type:"craft",rec:r,got});
      // continue until out of mats unless act.max===false... always loop till missing
      const chk2=this.canCraft(r);
      if(!chk2.ok){ this.emit("toast","Out of materials."); this.s.activity=null; this.emit("render"); }
    }
  },

  /* ---------- combat ---------- */
  styleKey(w){ return w.style||"melee"; },
  playerStats(){
    const w=this.weapon(), g=this.gearStats(), b=this.cls().bonus||{};
    const style=this.styleKey(w);
    const skillForAcc = style==="melee" ? this.lvl("attack") : this.lvl(style);
    const skillForStr = style==="melee" ? this.lvl("strength") : this.lvl(style);
    let atk=skillForAcc*2 + (w.atk||0) + (g.atk||0);
    let str=skillForStr*2 + (w.str||0) + (g.str||0);
    let def=this.lvl("defence")*2 + (g.def||0);
    if(b.defUp) def*=1+b.defUp;
    let dmgMul=1;
    if(b.dmgUp) dmgMul+=b.dmgUp;
    if(b.style===style && b.dmgUp) {} // merged above
    if(b.dmgUp===undefined && b.style===style) dmgMul+=0.12;
    return {atk,str,def,w,dmgMul,luck:this.luckBonus()};
  },
  monStats(m){ return {atk:m.atk,def:m.def,str:m.str,hp:m.hp,speed:m.speed}; },

  tickFight(act,dt){
    const c=this.s.combat; if(!c){this.s.activity=null;return;}
    const m=DB.monById[c.monId]; if(!m){this.s.combat=null;this.s.activity=null;return;}
    const ps=this.playerStats();
    const zone=DB.zoneById[act.id];

    // player status ticks
    const sp=this.tickStatuses("player",c.statusesP);
    if(sp.dmg){ const d=Math.max(1,Math.round(this.maxHp()*sp.dmg)); this.s.hp-=d; }
    if(sp.heal){ this.s.hp=Math.min(this.maxHp(),this.s.hp+Math.round(this.maxHp()*sp.heal)); }

    // monster status ticks
    const sm=this.tickStatuses("monster",c.statusesM);
    if(sm.dmg){ const d=Math.max(1,Math.round(m.hp*sm.dmg)); c.monHp-=d; this.emit("dmg",{who:"mon",amount:d,status:true}); }
    if(sm.heal){}

    // auto-eat
    if(this.s.settings.autoEat && this.s.hp < this.maxHp()*0.35){
      const food=this.findFood(); if(food) this.eat(food);
    }
    if(this.s.hp<=0){ this.playerDeath(); return; }

    // player attack
    const haste = c.statusesP.haste ? 1+(DB.statusById.haste.speedUp||0) : 1;
    c.cdP -= dt*haste;
    if(c.cdP<=0){
      c.cdP = ps.w.speed;
      if(!sp.skip) this.playerHit(m,ps);
      else this.emit("clog","You are incapacitated!");
      if(c.monHp<=0){ this.monsterKilled(m,zone); return; }
    }
    // monster attack
    c.cdM -= dt;
    if(c.cdM<=0){
      c.cdM = m.speed;
      if(!sm.skip) this.monsterHit(m,ps);
      else this.emit("clog",`${m.name} is incapacitated!`);
      if(this.s.hp<=0){ this.playerDeath(); return; }
    }
  },

  playerHit(m,ps){
    const c=this.s.combat;
    const defM=m.def;
    let acc=0.55+(ps.atk-defM)/160;
    if(c.statusesP.focus) acc+=DB.statusById.focus.accUp||0;
    if(c.statusesM.soak) acc+=(DB.statusById.soak.defDown||0);
    acc=Math.min(0.95,Math.max(0.12,acc));
    if(Math.random()>acc){ this.emit("dmg",{who:"mon",amount:0,miss:true}); return; }
    let dmg = (ps.str*0.6+ps.w.str*0.8+ps.atk*0.15);
    dmg *= 0.55+Math.random()*0.65;
    if(c.statusesP.fury) dmg*=1+(DB.statusById.fury.dmgUp||0);
    dmg*=ps.dmgMul;
    let crit=false;
    if(Math.random()<0.08+ps.luck*0.5){ dmg*=1.6; crit=true; }
    dmg=Math.max(1,Math.round(dmg));
    c.monHp-=dmg;
    this.emit("dmg",{who:"mon",amount:dmg,crit});
    Sfx.play(crit?"crit":"hit");
    // weapon status proc
    const wst=ps.w.status;
    if(wst && Math.random()<(wst.chance||0))
      this.addStatus(c.statusesM,wst.id);
    // xp to used skills + vitality share
    const style=ps.w.style;
    const usedSkill = style==="melee"?(Math.random()<0.5?"attack":"strength"):style;
    this.addXp(usedSkill, Math.max(1,Math.round(dmg*0.35)));
    this.addXp("vitality", Math.max(1,Math.round(dmg*0.1)));
  },
  monsterHit(m,ps){
    const c=this.s.combat;
    const defP=ps.def + (this.s.equip.shield?(DB.itemById[this.s.equip.shield.item].equip.def* (DB.rarById[this.s.equip.shield.rar]?.statMult||1)*0.5):0);
    let acc=0.5+(m.atk-defP)/180;
    acc=Math.min(0.9,Math.max(0.12,acc));
    if(Math.random()>acc){ this.emit("dmg",{who:"player",amount:0,miss:true}); return; }
    let dmg=(m.str*0.7+m.atk*0.3)*(0.5+Math.random()*0.6);
    if(c.statusesM.weaken) dmg*=1-(DB.statusById.weaken.atkDown||0);
    if(c.statusesP.shield) dmg*=1-(DB.statusById.shield.absorb||0);
    dmg=Math.max(1,Math.round(dmg));
    this.s.hp-=dmg;
    this.emit("dmg",{who:"player",amount:dmg});
    Sfx.play("hurt");
    for(const st of m.statuses||[]){
      if(Math.random()<st.chance){ this.addStatus(c.statusesP,st.id);
        this.emit("clog",`Afflicted by ${DB.statusById[st.id]?.name||st.id}!`); }
    }
  },
  monsterKilled(m,zone){
    const c=this.s.combat;
    this.s.totalKills++;
    this.s.kills[m.id]=(this.s.kills[m.id]||0)+1;
    if(m.isBoss) this.s.bossKills++;
    this.addXp(STYLE_SKILL[m.style]||"attack",m.xp*0.4);
    this.addXp("vitality",m.xp*0.3);
    this.addXp("devotion",m.xp*0.2);
    this.emit("clog",`<b>${m.name}</b> defeated!`);
    // drops
    const drops=this.rollDrops(m);
    for(const d of drops) this.give(d.item,d.qty,{luck:this.luckBonus()+(m.isBoss?1.5:0)});
    this.questEvent("kill",m.id,1);
    this.questEvent("kill_any","any",1);
    if(m.isBoss) this.questEvent("kill_boss","any",1);
    // zone unlock on boss kill
    if(m.isBoss){
      const zi=DB.zones.findIndex(z=>z.id===zone.id);
      const next=DB.zones[zi+1];
      if(next && !this.s.zones.includes(next.id)){
        this.s.zones.push(next.id);
        this.emit("toast",`🗺️ ${next.name} unlocked!`,"gold");
      }
      // also completes the matching main quest implicitly via kill req
    }
    Sfx.play("die");
    // continue fighting same monster (respawn)
    this.s.combat={monId:m.id,monHp:m.hp,cdP:0,cdM:m.speed,
      statusesP:c.statusesP,statusesM:{}};
    if(this.s.hp<this.maxHp()*0.15){
      this.emit("toast","⚠ Low HP — auto-fleeing!","gold");
      this.stopActivity();
    }
    this.emit("render");
  },
  rollDrops(m){
    const out=[];
    for(const d of m.drops||[]){
      if(Math.random()<d.chance*(1+this.luckBonus())){
        out.push({item:d.item,qty:d.qty});
      }
    }
    return out;
  },
  playerDeath(){
    const c=this.s.combat; const m=DB.monById[c.monId];
    this.emit("clog",`<b>You were slain by ${m.name}…</b>`);
    this.s.hp=Math.floor(this.maxHp()*0.5);
    const lost=Math.floor(this.gold()*0.05);
    if(lost>0){ this.take("coins",lost); this.emit("toast",`You limp away… (-${lost} coins)`,"myth"); }
    this.s.combat=null; this.s.activity=null;
    Sfx.play("die"); this.emit("render");
  },
  findFood(){
    let best=null,bh=0;
    for(const k in this.s.inv){
      const d=DB.itemById[k.split("@")[0]];
      if(d?.food && d.food.heal>bh){bh=d.food.heal;best=d.id;}
    }
    return best;
  },

  /* ---------- offline ---------- */
  offlineProgress(){
    const el=Math.min(OFFLINE_CAP_S,(Date.now()-this.s.lastSeen)/1000);
    if(el<60) return null;
    const act=this.s.activity;
    if(!act) return {secs:el,lines:[`Rested for ${fmtDur(el)}.`]};
    const lines=[];
    if(act.kind==="gather"){
      const a=DB.actById[act.id];
      const boost=a.tool?this.toolBoost(a.tool):1;
      const n=Math.floor(el*boost/(a.ticks*0.4));
      if(a.consume){
        const can=Math.floor(this.count(a.consume.item)/a.consume.qty);
        var nc=Math.min(n,can);
      } else var nc=n;
      if(nc>0){
        if(a.consume) this.take(a.consume.item,a.consume.qty*nc);
        this.give(a.output.item,a.output.qty*nc,{luck:this.luckBonus()});
        this.addXp(a.skill,a.xp*nc);
        for(const b of a.bonus||[]){
          const k=Math.floor(nc*b.chance); if(k>0) this.give(b.item,k);
        }
        lines.push(`${DB.skillById[a.skill].icon} ${a.name} ×${nc} — +${a.output.qty*nc} ${DB.itemById[a.output.item].name}, +${fmtNum(a.xp*nc)} XP`);
      }
    } else if(act.kind==="craft"){
      const r=DB.recById[act.id];
      let n=Math.floor(el/(r.ticks*0.4));
      for(const inp of r.inputs) n=Math.min(n,Math.floor(this.count(inp.item)/inp.qty));
      if(n>0){
        for(const inp of r.inputs) this.take(inp.item,inp.qty*n);
        this.give(r.output.item,r.output.qty*n,{luck:this.luckBonus()});
        this.s.crafted[r.skill]=(this.s.crafted[r.skill]||0)+n;
        this.addXp(r.skill,r.xp*n);
        lines.push(`⚒ ${r.name} ×${n} — +${r.output.qty*n} ${DB.itemById[r.output.item].name}, +${fmtNum(r.xp*n)} XP`);
      }
    } else if(act.kind==="fight"){
      const m=DB.monById[act.monsterId];
      const ps=this.playerStats();
      const dps=Math.max(1,(ps.str*0.6+ps.w.str*0.8)*0.75)/ps.w.speed;
      const fightT=Math.max(4,m.hp/dps+m.speed);
      const n=Math.min(500,Math.floor(el/fightT));
      const zone=DB.zoneById[act.id];
      let deaths=0;
      for(let i=0;i<n;i++){
        const dmgTaken=m.str*0.5*fightT;
        if(dmgTaken>this.maxHp()*0.8){deaths++;continue;}
        this.s.totalKills++; this.s.kills[m.id]=(this.s.kills[m.id]||0)+1;
        if(m.isBoss) this.s.bossKills++;
        const drops=this.rollDrops(m);
        for(const d of drops) this.give(d.item,d.qty,{luck:this.luckBonus()});
        this.addXp(STYLE_SKILL[m.style]||"attack",m.xp*0.4);
        this.addXp("vitality",m.xp*0.3);
        this.questEvent("kill",m.id,1); this.questEvent("kill_any","any",1);
        if(m.isBoss) this.questEvent("kill_boss","any",1);
      }
      lines.push(`⚔️ Fought ${m.name} ×${n-deaths} kills${deaths?`, ${deaths} narrow escapes`:""}`);
      this.s.hp=this.maxHp();
    }
    return {secs:el,lines};
  },
};
function fmtDur(s){
  if(s<3600) return Math.floor(s/60)+"m";
  if(s<86400) return (s/3600).toFixed(1)+"h";
  return (s/86400).toFixed(1)+"d";
}
