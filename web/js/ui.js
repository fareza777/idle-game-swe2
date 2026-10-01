/* ============ DUSKSPIRE — UI rendering ============ */
const UI = {
  tab:"train", fskill:null, cskill:null, zoneSel:null, bagFilter:"all",

  init(){
    document.querySelectorAll(".tab").forEach(b=>
      b.onclick=()=>{ Sfx.play("tap"); this.tab=b.dataset.tab; this.render(); });
    Game.on("render",()=>this.render());
    Game.on("tick",()=>this.tickRender());
    Game.on("toast",(m,c)=>this.toast(m,c));
    Game.on("loot",(l)=>this.lootFx(l));
    Game.on("dmg",(d)=>this.dmgFx(d));
    Game.on("clog",(l)=>this.clog(l));
    Game.on("action",(a)=>this.actFx(a));
    Game.on("heal",(h)=>this.healFx(h.amount));
    Game.on("levelup",(l)=>this.lvlFx(l));
    Game.on("kill",(k)=>this.killFx(k));
    if(!document.getElementById("lootfeed")){
      const f=document.createElement("div"); f.className="loot-feed"; f.id="lootfeed";
      document.body.appendChild(f);
    }
  },

  /* ---------- shell ---------- */
  render(){
    const s=Game.s; if(!s) return;
    document.getElementById("hud-name").textContent=s.name;
    document.getElementById("hud-class").textContent=Game.cls().icon;
    document.getElementById("hud-lvl").textContent=`CLv ${Game.combatLevel()} · ${Game.cls().name}`;
    document.getElementById("hud-gold").textContent=fmtNum(Game.gold());
    const act=s.activity;
    document.getElementById("hud-doing").textContent =
      act?({gather:"⛏ "+DB.actById[act.id]?.name,craft:"⚒ "+DB.recById[act.id]?.name,
        fight:"⚔ "+(DB.monById[act.monsterId]?.name||"")})[act.kind]||"…":"Idle";
    document.querySelectorAll(".tab").forEach(b=>
      b.classList.toggle("on",b.dataset.tab===this.tab));
    const v=document.getElementById("view");
    if(this._lastTab!==this.tab){ this._lastTab=this.tab;
      v.classList.remove("view-in"); void v.offsetWidth; v.classList.add("view-in"); }
    const fn={train:this.vTrain,craft:this.vCraft,fight:this.vFight,bag:this.vBag,
      hero:this.vHero,quests:this.vQuests,more:this.vMore}[this.tab]||this.vTrain;
    fn.call(this,v);
  },
  tickRender(){
    // light per-tick updates: progress bars, combat
    const s=Game.s; if(!s) return;
    const act=s.activity;
    if(act&&(act.kind==="gather"||act.kind==="craft")){
      const a=act.kind==="gather"?DB.actById[act.id]:DB.recById[act.id];
      const el=document.querySelector(`[data-prog="${act.id}"]>i`);
      if(el) el.style.width=Math.min(100,act.prog/(a.ticks*0.4)*100)+"%";
    }
    if(act?.kind==="fight"&&s.combat){
      const m=DB.monById[s.combat.monId];
      const hpM=document.getElementById("hp-mon"); if(hpM) hpM.style.width=Math.max(0,s.combat.monHp/m.hp*100)+"%";
      const lagM=document.getElementById("hp-mon-lag"); if(lagM) lagM.style.width=Math.max(0,s.combat.monHp/m.hp*100)+"%";
      const hpP=document.getElementById("hp-player"); if(hpP){ hpP.style.width=Math.max(0,s.hp/Game.maxHp()*100)+"%";
        hpP.closest(".bar")?.classList.toggle("low",s.hp/Game.maxHp()<0.25); }
      const lagP=document.getElementById("hp-player-lag"); if(lagP) lagP.style.width=Math.max(0,s.hp/Game.maxHp()*100)+"%";
      const hpT=document.getElementById("hp-mon-t"); if(hpT) hpT.textContent=`${Math.max(0,Math.ceil(s.combat.monHp))}/${m.hp}`;
      const hpPT=document.getElementById("hp-player-t"); if(hpPT) hpPT.textContent=`${Math.max(0,Math.ceil(s.hp))}/${Game.maxHp()}`;
      const stM=document.getElementById("st-mon");
      if(stM) stM.innerHTML=Object.keys(s.combat.statusesM).map(id=>`<i style="color:${DB.statusById[id]?.color}">${DB.statusById[id]?.icon||""}</i>`).join("");
      const stP=document.getElementById("st-player");
      if(stP) stP.innerHTML=Object.keys(s.combat.statusesP).map(id=>`<i style="color:${DB.statusById[id]?.color}">${DB.statusById[id]?.icon||""}</i>`).join("");
    }
  },

  /* ---------- TRAIN (gathering) ---------- */
  vTrain(v){
    const f=this.fskill;
    let h=`<div class="fchips">${GATHER_SKILLS.map(sk=>{
      const s=DB.skillById[sk];
      return `<button class="fchip ${f===sk?"on":""}" onclick="UI.fskill='${sk}';UI.render()">${s.icon} ${s.name} <b>${Game.lvl(sk)}</b></button>`;
    }).join("")}</div>`;
    const sk=f||GATHER_SKILLS[0];
    const acts=(DB.actsBySkill[sk]||[]).slice().sort((a,b)=>a.level-b.level);
    for(const a of acts){
      const chk=Game.canDoActivity(a);
      const doing=Game.s.activity?.kind==="gather"&&Game.s.activity.id===a.id;
      const od=DB.itemById[a.output.item];
      const need=a.ticks*0.4;
      h+=`<div class="act-card ${chk.ok?"":"locked"} ${doing?"doing":""}">
        <div class="act-ico">${od.icon}</div>
        <div class="grow">
          <div class="act-name">${esc(a.name)}</div>
          <div class="act-req">Lv ${a.level} ${DB.skillById[a.skill].name} · ${DB.zones[a.zone]?.name||""}${a.tool?` · ${a.tool}`:""}</div>
          <div class="act-out">→ ${a.output.qty}× ${od.name} · ${a.xp} XP ${a.consume?`<span class="dim">· uses ${a.consume.qty}× ${DB.itemById[a.consume.item].name}</span>`:""}</div>
          ${doing?`<div class="work-stage"><span class="ws-av">${Avatar.svg(Avatar.poseFor(a.skill),Game.s.cls,40)}</span>
            <span class="ws-sparks"><i>✦</i><i>✦</i><i>✦</i></span>
            <span class="ws-res">${od.icon}</span></div>
            <div class="bar act act-prog" data-prog="${a.id}"><i style="width:${Game.s.activity.prog/need*100}%"></i></div>`:""}
        </div>
        <button class="act-go" ${chk.ok?"":"disabled"} data-g="${a.id}">${doing?"Stop":"Go"}</button>
      </div>`;
    }
    v.innerHTML=h;
    v.querySelectorAll("[data-g]").forEach(b=>b.onclick=()=>{
      const id=b.dataset.g;
      if(Game.s.activity?.kind==="gather"&&Game.s.activity.id===id) Game.stopActivity();
      else Game.startGather(id);
    });
  },

  /* ---------- CRAFT ---------- */
  vCraft(v){
    const f=this.cskill;
    let h=`<div class="fchips">${ARTISAN_SKILLS.map(sk=>{
      const s=DB.skillById[sk];
      return `<button class="fchip ${f===sk?"on":""}" onclick="UI.cskill='${sk}';UI.render()">${s.icon} ${s.name} <b>${Game.lvl(sk)}</b></button>`;
    }).join("")}</div>`;
    const sk=f||ARTISAN_SKILLS[0];
    const recs=(DB.recsBySkill[sk]||[]).slice().sort((a,b)=>a.level-b.level);
    for(const r of recs){
      const chk=Game.canCraft(r);
      const doing=Game.s.activity?.kind==="craft"&&Game.s.activity.id===r.id;
      const od=DB.itemById[r.output.item];
      const ins=r.inputs.map(i=>{
        const d=DB.itemById[i.item],have=Game.count(i.item);
        return `<span class="${have<i.qty?"miss":""}">${i.qty}× ${d.name} <i class="dim">(${have})</i></span>`;
      }).join(", ");
      h+=`<div class="recipe ${doing?"act-card doing":""}">
        <div class="act-ico">${od.icon}</div>
        <div class="io">
          <div class="act-name">${esc(r.name)} <span class="dim small">Lv ${r.level}</span></div>
          <div class="rec-in">${ins}</div>
          <div class="act-out">→ ${r.output.qty}× ${od.name} · ${r.xp} XP</div>
          ${doing?`<div class="work-stage"><span class="ws-av">${Avatar.svg(Avatar.poseFor(sk),Game.s.cls,40)}</span>
            <span class="ws-sparks"><i>✦</i><i>✦</i><i>✦</i></span>
            <span class="ws-res">${od.icon}</span></div>
            <div class="bar act act-prog" data-prog="${r.id}"><i style="width:${Game.s.activity.prog/(r.ticks*0.4)*100}%"></i></div>`:""}
        </div>
        <button class="act-go" ${chk.ok?"":"disabled"} data-r="${r.id}">${doing?"Stop":"Craft"}</button>
      </div>`;
    }
    v.innerHTML=h;
    v.querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>{
      const id=b.dataset.r;
      if(Game.s.activity?.kind==="craft"&&Game.s.activity.id===id) Game.stopActivity();
      else Game.startCraft(id,true);
    });
  },

  /* ---------- FIGHT ---------- */
  vFight(v){
    const s=Game.s;
    if(s.combat){ this.vCombat(v); return; }
    let h=`<div class="sec-title">Zones — combat level ${Game.combatLevel()}</div>`;
    for(const z of DB.zones){
      const open=s.zones.includes(z.id);
      const bosses=z.bosses.map(b=>DB.monById[b].name.split(",")[0]).join(" · ");
      const killedBoss=z.bosses.every(b=>(s.kills[b]||0)>0);
      h+=`<div class="zone-card ${open?"":"locked"}" data-z="${z.id}">
        <div class="zone-bg" style="background-image:url('${z.art}')"></div>
        <div class="zone-info">
          <div class="zone-name">${esc(z.name)} ${killedBoss?"👑":""}</div>
          <div class="zone-sub">${esc(z.biome)} · Lv ${z.levelRange[0]}–${z.levelRange[1]}${bosses?` · Boss: ${esc(bosses)}`:""}</div>
        </div>
        ${open?"":`<div class="zone-lock">🔒 defeat previous boss</div>`}
      </div>`;
    }
    v.innerHTML=h;
    v.querySelectorAll(".zone-card:not(.locked)").forEach(c=>
      c.onclick=()=>{ Sfx.play("tap"); this.zoneSel=c.dataset.z; this.vZoneList(v); });
  },
  vZoneList(v){
    const z=DB.zoneById[this.zoneSel];
    const mons=DB.monsByZone[z.id];
    let h=`<button class="btn-link" onclick="UI.zoneSel=null;UI.render()">← Zones</button>
      <div class="zone-card"><div class="zone-bg" style="background-image:url('${z.art}')"></div>
      <div class="zone-info"><div class="zone-name">${esc(z.name)}</div>
      <div class="zone-sub">${esc(z.biome)} · Lv ${z.levelRange[0]}–${z.levelRange[1]}</div></div></div>`;
    const reg=mons.filter(m=>!m.isBoss), boss=mons.filter(m=>m.isBoss);
    h+=`<div class="sec-title">Monsters</div>`;
    for(const m of reg) h+=this.monRow(m);
    h+=`<div class="sec-title">Bosses</div>`;
    for(const m of boss) h+=this.monRow(m,true);
    v.innerHTML=h;
    v.querySelectorAll("[data-f]").forEach(b=>b.onclick=()=>{
      Game.startFight(z.id,b.dataset.f); UI.zoneSel=null; });
  },
  monRow(m,boss=false){
    const kills=Game.s.kills[m.id]||0;
    const mi=this.monIcon(m);
    return `<div class="mon-row ${boss?"bossrow":""}">
      <div class="mon-ico ${boss?"boss":""}">${mi}</div>
      <div class="grow"><div class="mon-name">${esc(m.name)}</div>
        <div class="mon-lvl">Lv ${m.level} · ${m.hp} HP · ${m.style}${boss?' <span class="tag-boss">BOSS</span>':""}${kills?` · <span class="ok">${kills} slain</span>`:""}</div></div>
      <button class="fight-btn" data-f="${m.id}">Fight</button></div>`;
  },
  monIcon(m){ return MonAvatar.svg(m,40); },

  /* ---------- combat view ---------- */
  vCombat(v){
    const s=Game.s,c=s.combat,m=DB.monById[c.monId],z=DB.zoneById[s.activity.id];
    const w=Game.weapon();
    const biome=(z.biome||"").toLowerCase();
    const bk=/snow|frost|tundra|whiteout/.test(biome)?"snow"
      :/ember|burn|volcano|fire|smoulder|ash/.test(biome)?"ember"
      :/coast|sea|tide|wreck|throat|abyss/.test(biome)?"bubble"
      :/desert|dune|sand|waste/.test(biome)?"sand"
      :/swamp|barrow|mire|moor|hollow/.test(biome)?"wisp"
      :/mine|cave|crystal|quarry|deep/.test(biome)?"mote"
      :/storm|peak|thunder|highland|wind/.test(biome)?"spark"
      :/star|rift|celest|void|god|whisper|crater/.test(biome)?"star"
      :"leaf";
    v.innerHTML=`
      <div class="combat-arena arena-${bk} ${m.isBoss?"boss":''}">
        <div class="arena-bg" style="background-image:url('${z.art}')"></div>
        <div class="arena-parts">${"<i></i>".repeat(7)}</div>
        <div class="arena-inner">
          <div class="vs">
            <div class="fighter">
              <div class="f-stage"><div class="fighter-av" id="fic-p">${Avatar.svg(Avatar.fightPose(w?.style||"melee"),s.cls,92)}</div></div>
              <div class="f-name">${esc(s.name)}</div>
              <div class="bar hp f-hp"><i id="hp-player" style="width:${s.hp/Game.maxHp()*100}%"></i><i class="lag" id="hp-player-lag" style="width:${s.hp/Game.maxHp()*100}%"></i></div>
              <div class="tiny dim" id="hp-player-t">${Math.ceil(s.hp)}/${Game.maxHp()}</div>
              <div class="f-status" id="st-player"></div>
            </div>
            <div style="font-size:22px;font-weight:900;color:var(--gold);padding-top:26px">⚔</div>
            <div class="fighter">
              <div class="f-stage"><div class="f-ico spawn" id="fic-m">${MonAvatar.svg(m,m.isBoss?108:90)}</div></div>
              <div class="f-name">${esc(m.name)}${m.isBoss?' <span class="tag-boss">BOSS</span>':""}</div>
              <div class="bar mhp f-hp"><i id="hp-mon" style="width:${c.monHp/m.hp*100}%"></i><i class="lag" id="hp-mon-lag" style="width:${c.monHp/m.hp*100}%"></i></div>
              <div class="tiny dim" id="hp-mon-t">${Math.ceil(c.monHp)}/${m.hp}</div>
              <div class="f-status" id="st-mon"></div>
            </div>
          </div>
        </div>
      </div>
      <div class="row" style="margin-bottom:10px">
        <div class="pill">${w.icon||"🗡️"} ${esc(w.name)} (${w.style})</div>
        <div class="grow"></div>
        <button class="fight-btn" onclick="Game.stopActivity()">Flee</button>
        <button class="chip" id="btn-eat">Eat 🍖</button>
      </div>
      <div class="combat-log" id="clog"></div>`;
    document.getElementById("btn-eat").onclick=()=>{
      const f=Game.findFood(); if(f) Game.eat(f); else UI.toast("No food!","myth");
    };
  },
  monIconBig(m){ return MonAvatar.svg(m,64); },
  dmgFx(d){
    const tgt=document.getElementById(d.who==="mon"?"fic-m":"fic-p");
    const src=document.getElementById(d.who==="mon"?"fic-p":"fic-m");
    const arena=document.querySelector(".combat-arena");
    if(!tgt||!arena) return;
    const tp=d.who==="mon"?"t-m":"t-p";   // hit lands on mon → right side
    // attacker lunges; ranged styles fire a projectile instead
    const atkrStyle=d.who==="mon"
      ?(Game.weapon()?.style||"melee")
      :(DB.monById[Game.s?.combat?.monId]?.style||"melee");
    if(src&&!d.status){
      if(atkrStyle==="ranged"||atkrStyle==="magic"){
        const p=document.createElement("div");
        p.className=`proj proj-${atkrStyle==="magic"?"orb":"arrow"} ${d.who==="mon"?"pl":"mo"}`;
        arena.appendChild(p); setTimeout(()=>p.remove(),420);
      }else{
        src.classList.remove("atk-l","atk-r"); void src.offsetWidth;
        src.classList.add(d.who==="mon"?"atk-l":"atk-r");
      }
    }
    // impact: slash (melee), hit flash, burst (crit)
    setTimeout(()=>{
      const now=document.getElementById(d.who==="mon"?"fic-m":"fic-p");
      if(!now) return;
      if(!d.miss&&!d.status&&atkrStyle==="melee"){
        const s=document.createElement("div"); s.className=`slash ${tp}`;
        arena.appendChild(s); setTimeout(()=>s.remove(),320);
      }
      if(!d.miss){
        const f=document.createElement("div"); f.className=`hitflash ${tp}`;
        arena.appendChild(f); setTimeout(()=>f.remove(),300);
      }
      if(d.crit){
        const b=document.createElement("div"); b.className=`burst ${tp}`;
        arena.appendChild(b); setTimeout(()=>b.remove(),520);
      }
      now.classList.remove("hurt","strike","dodge"); void now.offsetWidth;
      now.classList.add(d.miss?"dodge":"hurt");
      if(d.crit){ arena.classList.remove("shake"); void arena.offsetWidth; arena.classList.add("shake"); }
      const n=document.createElement("div");
      n.className=`dmg-num${d.crit?" crit":""}${d.status?" status":""}`;
      n.style.left=(d.who==="mon"?62+Math.random()*20:8+Math.random()*15)+"%";
      n.style.top=(30+Math.random()*30)+"%";
      n.style.color=d.miss?"#8a93a8":(d.crit?"#ffd75e":(d.status?"#c98aff":(d.who==="mon"?"#ff9a8a":"#ff6a6a")));
      n.textContent=d.miss?"miss":(d.crit?`${d.amount}!`:d.amount);
      arena.appendChild(n); setTimeout(()=>n.remove(),1000);
    },atkrStyle!=="melee"&&!d.status?250:120);
    // death animation
    if(!d.miss&&d.who==="mon"&&Game.s?.combat){
      const m=DB.monById[Game.s.combat.monId];
      if(m&&Game.s.combat.monHp<=0){ tgt.classList.add("dead"); }
    }
  },
  killFx(k){
    const arena=document.querySelector(".combat-arena"); if(!arena) return;
    const b=document.createElement("div");
    b.className="kill-banner";
    b.innerHTML=`<span>☠ ${esc(k.mon.name.split(",")[0])} slain</span>${k.drops?.length?`<i>${k.drops.length} drop${k.drops.length>1?"s":""}</i>`:""}`;
    arena.appendChild(b); setTimeout(()=>b.remove(),1100);
    Sfx.play("win");
  },
  healFx(amt){
    const arena=document.querySelector(".combat-arena"); if(!arena) return;
    const n=document.createElement("div");
    n.className="heal-num t-p"; n.textContent=`+${amt}`;
    arena.appendChild(n); setTimeout(()=>n.remove(),1000);
  },
  clog(l){
    const el=document.getElementById("clog"); if(!el) return;
    const d=document.createElement("div"); d.innerHTML=l;
    el.prepend(d); while(el.children.length>40) el.lastChild.remove();
  },

  /* ---------- BAG ---------- */
  vBag(v){
    const s=Game.s;
    const cats=[["all","All"],["equip","Gear"],["food","Food"],["mat","Materials"],["misc","Misc"]];
    const typeCat={weapon:"equip",armor:"equip",jewelry:"equip",tool:"equip",gadget:"equip",
      food:"food",potion:"food",crop:"food",meat:"food",fish:"food",
      ore:"mat",bar:"mat",log:"mat",plank:"mat",hide:"mat",leather:"mat",gem:"mat",
      rune:"mat",herb:"mat",seed:"mat",essence:"mat",bone:"mat",misc:"misc",
      consumable:"misc",currency:"misc",quest:"misc"};
    let entries=Object.entries(s.inv).filter(([k,q])=>q>0);
    entries.sort((a,b)=>{
      const da=DB.itemById[a[0].split("@")[0]],db=DB.itemById[b[0].split("@")[0]];
      return (db.sellPrice||0)*b[1]-(da.sellPrice||0)*a[1];
    });
    if(this.bagFilter!=="all")
      entries=entries.filter(([k])=>typeCat[DB.itemById[k.split("@")[0]]?.type]===this.bagFilter);
    let h=`<div class="fchips">${cats.map(([id,n])=>
      `<button class="fchip ${this.bagFilter===id?"on":""}" onclick="UI.bagFilter='${id}';UI.render()">${n}</button>`).join("")}</div>`;
    h+=`<div class="item-grid">`;
    for(const [key,qty] of entries){
      const [iid,rar]=key.split("@");
      const d=DB.itemById[iid]; if(!d) continue;
      const rr=rar?DB.rarById[rar]:null;
      const rc=rr?.color||null;
      h+=`<div class="cell ${rr&&rr.tier>=3?"cell-glow":""}" data-i="${key}" title="${esc(d.name)}" ${rc?`style="--rc:${rc}"`:''}>
        ${rc?`<div class="rar" style="border-color:${rc}"></div>`:""}
        ${d.icon}<span class="q">${qty>999?fmtNum(qty):qty}</span></div>`;
    }
    h+=`</div>`;
    if(!entries.length) h+=`<div class="card center dim">Empty. Go gather something.</div>`;
    v.innerHTML=h;
    v.querySelectorAll(".cell").forEach(c=>c.onclick=()=>this.itemModal(c.dataset.i));
  },
  itemModal(key){
    const [iid,rar]=key.split("@");
    const d=DB.itemById[iid],s=Game.s,qty=s.inv[key]||0;
    const r=rar?DB.rarById[rar]:null;
    let h=`<h3>${d.icon} ${esc(d.name)}</h3>`;
    if(r) h+=`<div class="rar-label" style="color:${r.color}">◆ ${r.name}</div>`;
    h+=`<div class="small dim" style="margin:6px 0 12px">Qty: ${qty} · Sells for ${Math.round((d.sellPrice||1)*(r?.statMult||1))} coins</div>`;
    if(d.equip){
      const mult=r?.statMult||1;
      const stats=Object.entries(d.equip).filter(([k,v])=>typeof v==="number"&&k!=="tier")
        .map(([k,v])=>`${k}: +${Math.round(v*mult)}`).join(" · ");
      h+=`<div class="card small">${stats}</div>`;
      h+=`<button class="btn btn-primary" style="width:100%;margin-bottom:8px" id="im-equip">Equip</button>`;
    }
    if(d.food||d.potion) h+=`<button class="btn" style="width:100%;margin-bottom:8px" id="im-use">${d.food?`Eat (+${d.food.heal} HP)`:"Drink"}</button>`;
    h+=`<div class="row">
        <button class="btn grow" id="im-sell1">Sell 1</button>
        ${qty>1?`<button class="btn grow" id="im-sellall">Sell all (${qty})</button>`:""}
      </div>`;
    this.modal(h);
    document.getElementById("im-equip")?.addEventListener("click",()=>{Game.equip(iid,rar);this.closeModal();});
    document.getElementById("im-use")?.addEventListener("click",()=>{Game.eat(iid);this.closeModal();});
    document.getElementById("im-sell1")?.addEventListener("click",()=>{Game.sell(iid,rar,1);this.closeModal();});
    document.getElementById("im-sellall")?.addEventListener("click",()=>{Game.sell(iid,rar,qty);this.closeModal();});
  },

  /* ---------- HERO ---------- */
  vHero(v){
    const s=Game.s;
    const st=Game.gearStats(),w=Game.weapon();
    let h=`<div class="card"><div class="row">
        <div>${Avatar.svg(Avatar.fightPose(w?.style||"melee"),s.cls,64)}</div>
        <div class="grow"><b>${esc(s.name)}</b> <span class="dim">the ${Game.cls().name}</span>
          <div class="small dim">${esc(Game.cls().desc)}</div></div>
        <div class="pill gold">CLv ${Game.combatLevel()}</div></div>
      <div style="margin-top:10px"><div class="small dim">HP ${Math.ceil(s.hp)}/${Game.maxHp()}</div>
        <div class="bar hp"><i style="width:${s.hp/Game.maxHp()*100}%"></i></div></div></div>`;
    // equipment
    h+=`<div class="sec-title">Equipment</div><div class="equip-grid">`;
    const slotNames={weapon:"Weapon",helm:"Helm",body:"Body",legs:"Legs",boots:"Boots",
      gloves:"Gloves",shield:"Shield",ring:"Ring",amulet:"Amulet",bracelet:"Bracelet",
      trinket:"Trinket",tool:"Tool"};
    for(const slot of EQUIP_SLOTS){
      const e=s.equip[slot];
      if(e){ const d=DB.itemById[e.item],r=DB.rarById[e.rar];
        h+=`<div class="slot filled" data-slot="${slot}" style="border-color:${r.color}">
          <div class="ei">${d.icon}</div><div style="color:${r.color};font-size:8px">${slotNames[slot]}</div></div>`;
      } else h+=`<div class="slot"><div class="ei" style="opacity:.4">${{weapon:"🗡️",helm:"🪖",body:"🥋",legs:"🦵",boots:"🥾",gloves:"🧤",shield:"🛡️",ring:"💍",amulet:"📿",bracelet:"⌚",trinket:"🔧",tool:"⛏️"}[slot]}</div>${slotNames[slot]}</div>`;
    }
    h+=`</div><div class="sec-title">Stats</div><div class="card" style="padding:8px 14px">
      <div class="stat-row"><span>Attack</span><b>${(Game.playerStats().atk)}</b></div>
      <div class="stat-row"><span>Strength</span><b>${(Game.playerStats().str)}</b></div>
      <div class="stat-row"><span>Defence</span><b>${Game.playerStats().def}</b></div>
      <div class="stat-row"><span>Luck</span><b>${Math.round(Game.luckBonus()*100)}%</b></div>
      <div class="stat-row"><span>Kills / Boss kills</span><b>${s.totalKills} / ${s.bossKills}</b></div></div>`;
    // all skills
    h+=`<div class="sec-title">Skills — ${DB.skills.length}</div>`;
    for(const sk of DB.skills){
      const xp=s.xp[sk.id]||0,l=Game.lvl(sk.id),p=xpProgress(xp);
      h+=`<div class="sk-row"><div class="sk-ico" style="color:${sk.color}">${sk.icon}</div>
        <div class="grow"><div class="row"><span class="sk-name">${sk.name}</span>
          <span class="sk-lvl">Lv ${l}</span></div>
          <div class="bar xp sk-bar"><i style="width:${p*100}%"></i></div></div>
        <span class="tiny dim">${fmtNum(xp)} xp</span></div>`;
    }
    v.innerHTML=h;
    v.querySelectorAll(".slot.filled").forEach(c=>c.onclick=()=>{
      const slot=c.dataset.slot,e=s.equip[slot];
      if(e){Game.unequip(slot);this.toast(`Unequipped ${DB.itemById[e.item].name}`);}
    });
  },

  /* ---------- QUESTS ---------- */
  vQuests(v){
    const s=Game.s;
    const qRow=q=>{
      const st=s.quests[q.id]||{p:0,done:false,claimed:false};
      const req=q.reqs[0];
      let progTxt="";
      if(req.kind==="skill_level"){
        let val=req.target==="any"?Math.max(...Object.keys(s.xp).map(k=>Game.lvl(k)),1)
          :req.target==="any_combat"?Math.max(...COMBAT_SKILLS.map(k=>Game.lvl(k)),1):Game.lvl(req.target);
        progTxt=`${Math.min(val,req.qty)}/${req.qty}`;
      } else progTxt=`${st.p||0}/${req.qty}`;
      const rw=[];
      for(const [sk,xp] of Object.entries(q.rewards?.xp||{})) rw.push(`+${fmtNum(xp)} ${DB.skillById[sk].name} XP`);
      for(const it of q.rewards?.items||[]) rw.push(`${it.qty}× ${DB.itemById[it.item].name}`);
      if(q.rewards?.unlock_zone) rw.push(`Unlock ${DB.zoneById[q.rewards.unlock_zone].name}`);
      return `<div class="quest ${q.type==="main"?"main":""} ${st.done?"done":""}">
        <div class="row"><div class="grow"><div class="quest-name">${q.type==="main"?"👑":"📜"} ${esc(q.name)}</div>
        <div class="quest-desc">${esc(q.desc)} <span class="dim">(${progTxt})</span></div>
        <div class="tiny" style="color:var(--ok);margin-top:3px">${rw.join(" · ")}</div></div>
        ${st.done&&!st.claimed?`<button class="quest-claim" data-q="${q.id}">Claim</button>`:""}
        ${st.claimed?`<span class="pill">✓</span>`:""}</div>
        <div class="bar xp quest-prog"><i style="width:${Math.min(100,(st.p||0)/req.qty*100)}%"></i></div></div>`;
    };
    let h=`<div class="sec-title">Main Quest — Ascend the Spire</div>`;
    h+=DB.mainQuests.map(qRow).join("");
    h+=`<div class="sec-title">Side Quests</div>`;
    h+=DB.sideQuests.map(qRow).join("");
    v.innerHTML=h;
    v.querySelectorAll("[data-q]").forEach(b=>b.onclick=()=>Game.claimQuest(b.dataset.q));
  },

  /* ---------- MORE ---------- */
  vMore(v){
    const s=Game.s;
    v.innerHTML=`
      <div class="sec-title">Game</div>
      <div class="card">
        <div class="m-row"><span>Sound effects</span><button class="toggle ${s.settings.sfx?"on":""}" id="tg-sfx"></button></div>
        <div class="m-row"><span>Auto-eat in combat</span><button class="toggle ${s.settings.autoEat?"on":""}" id="tg-eat"></button></div>
        <div class="m-row"><span>Export save</span><button class="chip" id="btn-export">Copy</button></div>
        <div class="m-row"><span>Import save</span><button class="chip" id="btn-import">Paste</button></div>
      </div>
      <div class="sec-title">Community</div>
      <div class="card">
        <div class="m-row"><span>Share Duskspire</span><button class="chip" id="m-share">Share</button></div>
        <div class="m-row"><span>Rate the game</span><button class="chip" id="m-rate">★ Rate</button></div>
      </div>
      <div class="sec-title">About</div>
      <div class="card small dim" style="line-height:1.7">
        <b style="color:var(--gold)">DUSKSPIRE — Idle Realm</b><br>
        An idle skilling RPG. 21 skills that feed each other, 21 zones, ${DB.manifest.counts.monsters}+ monsters, ${DB.manifest.counts.bosses} bosses, ${DB.manifest.counts.items} items, 25 rarities.<br><br>
        Mining → Smithing. Woodcutting → Fletching. Fishing & Farming → Cooking. Hunting → Crafting. Divination → Runecrafting → Magic. Every skill feeds another.<br><br>
        Version 1.0 · Built with Devin
      </div>
      <div class="card">
        <div class="m-row"><span style="color:var(--bad)">Delete save</span><button class="chip" id="m-wipe" style="color:var(--bad)">Reset</button></div>
      </div>
      <button class="btn" style="width:100%" id="m-exit">Exit to Title</button>`;
    document.getElementById("tg-sfx").onclick=e=>{s.settings.sfx=!s.settings.sfx;Sfx.on=s.settings.sfx;UI.render();};
    document.getElementById("tg-eat").onclick=e=>{s.settings.autoEat=!s.settings.autoEat;UI.render();};
    document.getElementById("btn-export").onclick=()=>{
      navigator.clipboard?.writeText(btoa(JSON.stringify(Game.s))).then(()=>UI.toast("Save copied!"),()=>UI.toast("Copy failed","myth"));};
    document.getElementById("btn-import").onclick=()=>{
      const t=prompt("Paste save string:"); if(!t)return;
      try{Game.s=JSON.parse(atob(t));Game.save();UI.render();UI.toast("Save imported!");}catch(e){UI.toast("Invalid save","myth");}};
    document.getElementById("m-share").onclick=()=>shareGame();
    document.getElementById("m-rate").onclick=()=>rateGame();
    document.getElementById("m-wipe").onclick=()=>{
      if(confirm("Delete your save forever?")){Game.wipe();location.reload();}};
    document.getElementById("m-exit").onclick=()=>{Game.save();show("menu");syncMenu();};
  },

  /* ---------- fx ---------- */
  toast(msg,cls){
    const t=document.getElementById("toast");
    const el=document.createElement("div");
    el.className=`toast-msg ${cls||""}`; el.innerHTML=msg;
    t.appendChild(el);
    setTimeout(()=>{el.classList.add("toast-out");setTimeout(()=>el.remove(),400);},2600);
    while(t.children.length>4) t.firstChild.remove();
  },
  lootFx(l){
    const d=DB.itemById[l.item]; if(!d) return;
    const r=l.rar?DB.rarById[l.rar]:null;
    // mini feed: every drop slides in bottom-left
    const feed=document.getElementById("lootfeed");
    if(feed){
      const c=document.createElement("div");
      c.className="drop-chip";
      c.innerHTML=`${d.icon} <b style="color:${r?r.color:"var(--tx)"}">+${l.qty}</b> <span class="dim">${esc(d.name)}</span>`;
      feed.appendChild(c);
      while(feed.children.length>4) feed.firstChild.remove();
      setTimeout(()=>c.remove(),1600);
    }
    if(!r) return; // only pop equippable rarity drops
    if(r.tier<3 && l.qty<2) return;
    const p=document.createElement("div");
    p.className="loot-pop";
    p.innerHTML=`<div class="lp-ico" style="color:${r.color}">${d.icon}</div>
      <div class="lp-name" style="color:${r.color}">${esc(d.name)}</div>
      <div class="lp-rar" style="color:${r.color}">${r.name}${l.qty>1?` ×${l.qty}`:""}</div>`;
    document.body.appendChild(p);
    setTimeout(()=>p.remove(),1600);
    Sfx.play("loot");
  },
  // float "+N icon" on the card being worked (gather/craft)
  actFx(a){
    const id=a.type==="gather"?a.act?.id:a.rec?.id;
    if(!id) return;
    const card=document.querySelector(`[data-prog="${id}"]`)?.closest(".act-card,.recipe");
    if(!card) return;
    const out=a.type==="gather"?a.act?.output:a.rec?.output;
    const od=out?DB.itemById[out.item]:null;
    const f=document.createElement("div");
    f.className="fx-float";
    const xp=a.type==="gather"?a.act?.xp:a.rec?.xp;
    f.innerHTML=`+${out?.qty||1} ${od?.icon||""}<span class="fx-xp">+${xp||0} xp</span>`;
    card.appendChild(f);
    setTimeout(()=>f.remove(),900);
  },
  lvlFx(l){
    const f=document.createElement("div");
    f.className="lvl-flash";
    f.innerHTML=`<div class="lvl-tag">⬆ ${DB.skillById[l.skill]?.name||""} ${l.level}</div>`;
    document.body.appendChild(f);
    setTimeout(()=>f.remove(),1000);
    Sfx.play("level");
  },
  modal(html){
    const m=document.getElementById("modal");
    document.getElementById("modal-card").innerHTML=html+
      `<button class="btn-link" style="width:100%;margin-top:10px" onclick="UI.closeModal()">Close</button>`;
    m.classList.add("open");
    m.onclick=e=>{if(e.target===m)UI.closeModal();};
  },
  closeModal(){document.getElementById("modal").classList.remove("open");},
};

function shareGame(){
  const txt="I'm climbing the Duskspire — an idle RPG with 21 skills, 300+ monsters and a sleeping god at the top. ⚔️";
  if(navigator.share) navigator.share({title:"Duskspire",text:txt}).catch(()=>{});
  else navigator.clipboard?.writeText(txt).then(()=>UI.toast("Copied! Paste it anywhere ✨"),()=>UI.toast("Sharing not supported","myth"));
}
function rateGame(){
  UI.modal(`<h3>Rate Duskspire</h3>
    <div class="center" style="font-size:40px;letter-spacing:.1em" id="stars">
      ${[1,2,3,4,5].map(i=>`<button class="star" data-s="${i}" style="font-size:38px">☆</button>`).join("")}
    </div><p class="center small dim">Thanks for playing!</p>`);
  document.querySelectorAll(".star").forEach(b=>b.onclick=()=>{
    document.querySelectorAll(".star").forEach((x,i)=>x.textContent=i<b.dataset.s?"★":"☆");
    Sfx.play("win"); setTimeout(()=>{UI.closeModal();UI.toast(`Thanks for the ${b.dataset.s}★ rating!`,"gold");},600);
  });
}
function show(id){
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("visible"));
  document.getElementById(id).classList.add("visible");
}
function syncMenu(){
  document.getElementById("btn-continue").classList.toggle("hidden",!Game.hasSave());
}
