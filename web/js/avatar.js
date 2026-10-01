/* Duskspire — SVG hero rig: a little animated character used in work-stages and combat.
   Pose = skill or combat style; class picks the armor tint. All animation is CSS. */
"use strict";
const Avatar={
  SKIN:"#e8b48a", SKIN2:"#d69a6e", DARK:"#1c1430", LINE:"#120b22",
  CLASS_COL:{warrior:"#c04a40",ranger:"#3fa65c",mage:"#8a5fd6",warden:"#c2954a",shade:"#5a5f86"},
  // gather + artisan skill -> pose key
  POSE:{mining:"mine",woodcutting:"chop",fishing:"fish",farming:"farm",hunting:"hunt",
        divination:"divine",thieving:"thief",smithing:"smith",cooking:"cook",alchemy:"alch",
        crafting:"craft",fletching:"fletch",runecrafting:"rune",engineering:"eng"},
  poseFor(skill){return this.POSE[skill]||"idle"},
  // weapon style -> combat pose
  fightPose(style){return style==="ranged"?"bow":style==="magic"?"staff":"melee"},

  /* tool held in right hand, drawn pointing "up-right" so arm rotation swings it */
  tool(pose){
    const T={mine:"pick",chop:"axe",fish:"rod",farm:"hoe",hunt:"bow",thief:"dagger",
      smith:"hammer",cook:"ladle",alch:"flask",craft:"knife",fletch:"knife",rune:"crystal",
      eng:"wrench",melee:"sword",bow:"bow",staff:"staff",divine:""}[pose];
    switch(T){
      case "pick":return `<g class="t t-pick"><line x1="0" y1="0" x2="0" y2="-17" stroke="#8a5a33" stroke-width="3" stroke-linecap="round"/><path d="M-8 -17 Q0 -24 8 -17" fill="none" stroke="#9aa7bd" stroke-width="3.4" stroke-linecap="round"/></g>`;
      case "axe":return `<g class="t"><line x1="0" y1="0" x2="0" y2="-16" stroke="#8a5a33" stroke-width="3" stroke-linecap="round"/><path d="M1 -16 L10 -15 L7 -8 L1 -10 Z" fill="#9aa7bd"/></g>`;
      case "rod":return `<g class="t"><line x1="0" y1="0" x2="6" y2="-26" stroke="#8a5a33" stroke-width="2.4" stroke-linecap="round"/><line class="t-line" x1="6" y1="-26" x2="16" y2="-14" stroke="#cfd8e6" stroke-width="1" stroke-dasharray="2 1"/><circle class="t-bobber" cx="16" cy="-13" r="2.2" fill="#e6484d"/></g>`;
      case "hoe":return `<g class="t"><line x1="0" y1="0" x2="0" y2="-15" stroke="#8a5a33" stroke-width="3" stroke-linecap="round"/><rect x="-1" y="-18" width="9" height="4" rx="1.4" fill="#8b93a5"/></g>`;
      case "bow":return `<g class="t"><path d="M-2 -18 Q10 -9 -2 0" fill="none" stroke="#8a5a33" stroke-width="3" stroke-linecap="round"/><line x1="-2" y1="-18" x2="-2" y2="0" stroke="#e8e8f2" stroke-width="1"/><line class="t-arrow" x1="-2" y1="-9" x2="8" y2="-9" stroke="#c9a24a" stroke-width="1.6"/></g>`;
      case "dagger":return `<g class="t"><line x1="0" y1="0" x2="0" y2="-10" stroke="#8a5a33" stroke-width="2.6" stroke-linecap="round"/><path d="M0 -10 L-3 -20 L0 -24 L3 -20 Z" fill="#cfd8e6"/></g>`;
      case "hammer":return `<g class="t"><line x1="0" y1="0" x2="0" y2="-14" stroke="#8a5a33" stroke-width="3" stroke-linecap="round"/><rect x="-7" y="-19" width="14" height="7" rx="2" fill="#8b93a5"/></g>`;
      case "ladle":return `<g class="t"><line x1="0" y1="0" x2="0" y2="-15" stroke="#8b93a5" stroke-width="2.6" stroke-linecap="round"/><circle cx="0" cy="-18" r="3.4" fill="#8b93a5"/></g>`;
      case "flask":return `<g class="t"><line x1="0" y1="0" x2="0" y2="-8" stroke="#8a5a33" stroke-width="2.4"/><path d="M-4 -18 L-1 -10 L1 -10 L4 -18 L1 -19 Z" fill="#7fe0c3" opacity=".9"/><path d="M-2 -18 L-1 -12 L1 -12 L2 -18 Z" fill="#3ba58a"/></g>`;
      case "knife":return `<g class="t"><line x1="0" y1="0" x2="0" y2="-8" stroke="#5a4632" stroke-width="2.6" stroke-linecap="round"/><path d="M0 -8 L-2 -16 L0 -18 L2 -16 Z" fill="#cfd8e6"/></g>`;
      case "crystal":return `<g class="t"><path d="M0 -24 L5 -15 L0 -8 L-5 -15 Z" fill="#7fd6ff" opacity=".95"/><path d="M0 -24 L2.5 -15 L0 -8 Z" fill="#c8f0ff" opacity=".8"/></g>`;
      case "wrench":return `<g class="t"><line x1="0" y1="0" x2="0" y2="-15" stroke="#8b93a5" stroke-width="3" stroke-linecap="round"/><path d="M-4 -20 A5 5 0 1 0 4 -20 L2 -17 L-2 -17 Z" fill="#8b93a5"/></g>`;
      case "sword":return `<g class="t"><line x1="0" y1="0" x2="0" y2="-7" stroke="#5a4632" stroke-width="3" stroke-linecap="round"/><rect x="-5" y="-10" width="10" height="2.6" rx="1.2" fill="#c9a24a"/><path d="M0 -10 L-2.6 -26 L0 -30 L2.6 -26 Z" fill="#dfe7f4"/></g>`;
      case "staff":return `<g class="t"><line x1="0" y1="2" x2="2" y2="-24" stroke="#6b4a2e" stroke-width="3" stroke-linecap="round"/><circle class="t-orb" cx="2" cy="-27" r="4.4" fill="#b48aff"/><circle cx="2" cy="-27" r="7" fill="#b48aff" opacity=".18"/></g>`;
      default:return "";
    }
  },
  /* prop drawn beside/behind the hero (rock, anvil, pot...) */
  prop(pose){
    switch(pose){
      case "mine":return `<g class="prop"><ellipse cx="47" cy="72" rx="9" ry="6" fill="#4d4a63"/><ellipse cx="44" cy="70" rx="4" ry="3" fill="#6b6884"/><circle class="chip c1" cx="47" cy="66" r="1.6" fill="#ffb35c"/><circle class="chip c2" cx="44" cy="65" r="1.3" fill="#ffd75e"/></g>`;
      case "chop":return `<g class="prop"><rect x="42" y="62" width="11" height="11" rx="2" fill="#7a5230"/><ellipse cx="47.5" cy="62" rx="5.5" ry="2.4" fill="#a06a3c"/><circle class="chip c1" cx="47" cy="58" r="1.5" fill="#d9a05e"/><circle class="chip c2" cx="50" cy="57" r="1.2" fill="#f0c98a"/></g>`;
      case "fish":return `<g class="prop"><rect x="30" y="70" width="30" height="8" rx="4" fill="#2f5d86"/><circle class="rip r1" cx="46" cy="73" r="2.4" fill="none" stroke="#9fd4ff" stroke-width="1"/><circle class="rip r2" cx="52" cy="74" r="1.8" fill="none" stroke="#9fd4ff" stroke-width="1"/></g>`;
      case "farm":return `<g class="prop"><path d="M44 74 v-9" stroke="#3f8f4f" stroke-width="2"/><path d="M44 68 q-5 -1 -6 -6" stroke="#4fae5f" stroke-width="2" fill="none"/><path d="M44 66 q5 -1 6 -6" stroke="#4fae5f" stroke-width="2" fill="none"/><ellipse cx="44" cy="76" rx="8" ry="2.6" fill="#4a3423"/></g>`;
      case "hunt":return `<g class="prop"><ellipse cx="47" cy="70" rx="7" ry="5" fill="#3d5a3f"/><circle cx="47" cy="65" r="1.4" fill="#e8d44a"/></g>`;
      case "divine":return `<g class="prop"><circle class="wisp w1" cx="50" cy="58" r="2.6" fill="#b48aff"/><circle class="wisp w2" cx="55" cy="66" r="2" fill="#7fd6ff"/><circle class="wisp w3" cx="45" cy="52" r="1.8" fill="#ff9ad8"/></g>`;
      case "thief":return `<g class="prop"><ellipse cx="48" cy="72" rx="6" ry="4" fill="#6b5a34"/><circle cx="48" cy="68" r="1.2" fill="#ffd75e"/><circle cx="50" cy="70" r="1.1" fill="#ffd75e"/></g>`;
      case "smith":return `<g class="prop"><path d="M40 72 h14 l-2 -6 h-10 Z" fill="#4a4f63"/><rect x="40" y="60" width="14" height="6" rx="2" fill="#5a6078"/><circle class="chip c1" cx="47" cy="58" r="1.6" fill="#ffb35c"/><circle class="chip c2" cx="50" cy="56" r="1.2" fill="#ffd75e"/></g>`;
      case "cook":return `<g class="prop"><path d="M39 64 q8 -4 16 0 v8 a8 3.4 0 0 1 -16 0 Z" fill="#3a3f55"/><path d="M39 64 q8 -4 16 0" fill="none" stroke="#5a6078" stroke-width="1.6"/><circle class="fire f1" cx="44" cy="75" r="2.4" fill="#ff8a3c"/><circle class="fire f2" cx="49" cy="76" r="1.8" fill="#ffd75e"/><circle class="steam s1" cx="47" cy="58" r="1.6" fill="#cfd8e6" opacity=".7"/></g>`;
      case "alch":return `<g class="prop"><path d="M44 66 h10 l-1.6 8 h-6.8 Z" fill="#2f3450" stroke="#5a6078" stroke-width="1"/><circle class="bub b1" cx="47" cy="66" r="1.5" fill="#7fe0c3"/><circle class="bub b2" cx="51" cy="64" r="1.2" fill="#b48aff"/></g>`;
      case "eng":return `<g class="prop"><circle cx="48" cy="68" r="6" fill="#5a6078"/><circle cx="48" cy="68" r="2.4" fill="#2f3450"/><g fill="#5a6078"><rect x="46.6" y="60" width="2.8" height="3" rx="1"/><rect x="46.6" y="73" width="2.8" height="3" rx="1"/><rect x="40" y="66.6" width="3" height="2.8" rx="1"/><rect x="53" y="66.6" width="3" height="2.8" rx="1"/></g></g>`;
      case "craft":case "fletch":return `<g class="prop"><rect x="40" y="68" width="16" height="5" rx="2" fill="#7a5230"/><ellipse cx="48" cy="68" rx="8" ry="2" fill="#a06a3c"/><circle class="chip c1" cx="46" cy="64" r="1.3" fill="#d9a05e"/></g>`;
      case "rune":return `<g class="prop"><circle cx="48" cy="70" r="7" fill="none" stroke="#7fd6ff" stroke-width="1.2" opacity=".7"/><path class="runesym" d="M45 70 l3 -4 3 4 M48 66 v7" stroke="#b4e6ff" stroke-width="1.2" fill="none"/></g>`;
      default:return "";
    }
  },
  /* full character markup. pose: key above; cls: class id for armor tint; px: display size */
  svg(pose,cls,px,opts={}){
    const c=this.CLASS_COL[cls]||"#8a5fd6";
    const bothArmsUp=pose==="divine"||pose==="rune";
    const armL=bothArmsUp
      ?`<line x1="20" y1="38" x2="13" y2="28" stroke="${this.SKIN2}" stroke-width="5" stroke-linecap="round"/>`
      :`<line x1="20" y1="38" x2="15" y2="52" stroke="${this.SKIN2}" stroke-width="5" stroke-linecap="round"/>`;
    return `<svg class="av av-${pose} ${opts.cls||""}" width="${px}" height="${Math.round(px*84/64)}" viewBox="0 0 64 84" style="--avc:${c}">
      <ellipse class="av-shadow" cx="30" cy="78" rx="15" ry="3.6" fill="#000" opacity=".35"/>
      ${this.prop(pose)}
      <g class="av-move">
        <g class="av-legs" stroke="${this.DARK}" stroke-width="6" stroke-linecap="round">
          <line x1="25" y1="60" x2="24" y2="74"/><line x1="35" y1="60" x2="36" y2="74"/>
        </g>
        <rect class="av-body" x="18" y="30" width="24" height="32" rx="8" fill="${c}"/>
        <rect x="18" y="50" width="24" height="6" rx="3" fill="#000" opacity=".25"/>
        <circle cx="30" cy="34" r="4" fill="#000" opacity=".18"/>
        <g class="av-arml">${armL}</g>
        <g class="av-head">
          <circle cx="30" cy="19" r="11" fill="${this.SKIN}"/>
          <path class="av-helm" d="M19.5 17 a11 11 0 0 1 21 0 l-2.4 -1 a8.5 8.5 0 0 0 -16.2 0 Z" fill="${c}"/>
          <circle cx="26.5" cy="20" r="1.5" fill="${this.LINE}"/><circle cx="33.5" cy="20" r="1.5" fill="${this.LINE}"/>
          <path d="M26.5 25.5 q3.5 2.4 7 0" stroke="${this.LINE}" stroke-width="1.3" fill="none" stroke-linecap="round"/>
        </g>
        <g class="av-armr">
          <line x1="40" y1="38" x2="46" y2="50" stroke="${this.SKIN}" stroke-width="5" stroke-linecap="round"/>
          <g class="av-tool" transform="translate(46 50)">${this.tool(pose)}</g>
        </g>
      </g>
    </svg>`;
  },
};
