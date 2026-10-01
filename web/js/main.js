/* ============ DUSKSPIRE — boot & menus ============ */
const SPLASH_TIPS = [
  "Sharpening blades…","Stocking the pantry…","Waking the wisps…",
  "Mining starsteel…","Whispering to runes…","Bribing the boss…",
];
const OB_SLIDES = [
  {e:"⚔️",t:"Ascend the Spire",p:"Train 21 interconnected skills, battle through 21 zones, and wake the sleeping god at Godspire Summit."},
  {e:"⛏️",t:"Skills feed skills",p:"Mine ore → smith blades. Fell timber → fletch bows. Fish & farm → cook meals. Hunt hides → craft armour. Everything connects."},
  {e:"💤",t:"Idle & offline",p:"Your hero works while you're away. Set an activity, close the app, and return to a pile of loot — up to 12 hours of progress."},
  {e:"👹",t:"Fight smart",p:"Auto-combat with real tactics: weapons carry status effects, food keeps you alive, potions tilt the odds. 27 bosses guard the way."},
];

let obStep=0, pickedClass=null;

async function boot(){
  // splash progress while data loads
  const fill=document.getElementById("splash-fill");
  const tip=document.getElementById("splash-tip");
  tip.textContent=SPLASH_TIPS[Math.floor(Math.random()*SPLASH_TIPS.length)];
  await loadData(p=>{ fill.style.width=(p*85)+"%"; });
  fill.style.width="100%";
  setTimeout(()=>{ show("menu"); syncMenu(); },350);

  // menu buttons
  document.getElementById("btn-new").onclick=()=>{
    Sfx.play("tap");
    if(Game.hasSave() && !confirm("Start a new hero? Your existing save will be kept until you pick a class.")) return;
    obStep=0; renderOb(); show("onboard");
  };
  document.getElementById("btn-continue").onclick=()=>{
    Sfx.play("tap");
    const s=Game.load();
    if(s){ Game.s=s; enterGame(true); }
  };
  document.getElementById("btn-settings").onclick=()=>{ Sfx.play("tap"); menuSettings(); };
  document.getElementById("btn-about").onclick=()=>{ Sfx.play("tap"); menuAbout(); };
  document.getElementById("btn-share").onclick=()=>{ shareGame(); };
  document.getElementById("btn-rate").onclick=()=>{ rateGame(); };

  // onboarding
  document.getElementById("ob-next").onclick=()=>{
    Sfx.play("tap");
    if(obStep<OB_SLIDES.length-1){ obStep++; renderOb(); }
    else { show("classpick"); renderClasses(); }
  };
  document.getElementById("ob-skip").onclick=()=>{ show("classpick"); renderClasses(); };

  // class pick
  document.getElementById("cp-name").oninput=e=>{
    document.getElementById("cp-start").disabled = !pickedClass;
  };
  document.getElementById("cp-start").onclick=()=>{
    if(!pickedClass) return;
    const name=document.getElementById("cp-name").value.trim();
    Game.newGame(pickedClass,name);
    Sfx.play("win"); enterGame(false);
  };

  // persist on hide
  document.addEventListener("visibilitychange",()=>{ if(document.hidden) Game.save(); });
  window.addEventListener("beforeunload",()=>Game.save());
}

function renderOb(){
  const s=OB_SLIDES[obStep];
  document.getElementById("ob-body").innerHTML=
    `<div class="ob-emoji">${s.e}</div><h2>${s.t}</h2><p>${s.p}</p>`;
  document.getElementById("ob-dots").innerHTML=
    OB_SLIDES.map((_,i)=>`<i class="${i===obStep?"on":""}"></i>`).join("");
  document.getElementById("ob-next").textContent=
    obStep===OB_SLIDES.length-1?"Choose your Path":"Next";
}

function renderClasses(){
  const el=document.getElementById("cp-list");
  el.innerHTML=DB.classes.map(c=>`
    <button class="cp-card" data-c="${c.id}">
      <img src="${c.art}" onerror="this.outerHTML='<div class=cp-ico>${c.icon}</div>'" alt="">
      <div class="grow"><b>${c.icon} ${c.name}</b><small>${c.desc}</small></div>
    </button>`).join("");
  el.querySelectorAll(".cp-card").forEach(b=>b.onclick=()=>{
    Sfx.play("tap");
    el.querySelectorAll(".cp-card").forEach(x=>x.classList.remove("sel"));
    b.classList.add("sel"); pickedClass=b.dataset.c;
    document.getElementById("cp-start").disabled=false;
  });
}

function enterGame(returning){
  show("game");
  UI.init(); UI.tab="fight"; UI.render();
  Game.start();
  if(returning){
    const r=Game.offlineProgress();
    if(r && r.lines.length){
      UI.modal(`<h3>Welcome back</h3>
        <div class="small dim" style="margin-bottom:10px">You were away ${fmtDur(r.secs)} — offline progress (max 12h):</div>
        ${r.lines.map(l=>`<div class="card small" style="margin-bottom:6px">${l}</div>`).join("")}
        <button class="btn btn-primary" style="width:100%" onclick="UI.closeModal()">Collect</button>`);
      Sfx.play("win");
    }
  } else {
    UI.toast("Welcome to Duskspire. Pick a Fight to begin — or Train a skill first.","gold");
  }
}

function menuSettings(){
  UI.modal(`<h3>Settings</h3>
    <div class="m-row"><span>Sound effects</span><button class="toggle ${(Game.load()?.settings?.sfx??true)?"on":""}" id="ms-sfx"></button></div>
    <div class="m-row"><span>Keep screen awake while fighting</span><button class="toggle on" id="ms-wake"></button></div>`);
  document.getElementById("ms-sfx").onclick=e=>{Sfx.on=!Sfx.on;e.target.classList.toggle("on",Sfx.on);
    const s=Game.load(); if(s){s.settings.sfx=Sfx.on;localStorage.setItem(SAVE_KEY,JSON.stringify(s));}};
}
function menuAbout(){
  UI.modal(`<h3>About Duskspire</h3>
    <div class="small" style="line-height:1.7;color:var(--tx2)">
    An original idle skilling RPG inspired by the classics of the genre.<br><br>
    • 21 skills — combat, gathering & artisan, all interconnected<br>
    • 21 zones · ${DB.manifest?.counts?.monsters||300}+ monsters · ${DB.manifest?.counts?.bosses||25} bosses<br>
    • ${DB.manifest?.counts?.items||590} items across 25 rarity tiers<br>
    • Offline progression up to 12 hours<br>
    • Data-driven: every item, monster and recipe lives in JSON<br><br>
    <b style="color:var(--gold)">Duskspire v1.0</b> · Made with Devin</div>`);
}

document.addEventListener("DOMContentLoaded",boot);
