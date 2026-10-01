/* Duskspire — SVG monster rig: parametric animated creatures.
   Archetype picked from name keywords; palette from element keywords + name hash. */
"use strict";
const MonAvatar={
  ARCHES:{
    serpent:["serpent","viper","cobra","snake","eel","worm","slug","leech","basilisk","wyrm"],
    winged:["drake","bat","crow","owl","moth","hawk","falcon","raven","wyvern","phoenix","griffin","seraph","valkyrie","harpy","bee","wasp","hornet","gargoyle","sprite","fairy","pixie"],
    bug:["beetle","spider","tick","ant","swarm","crab","scorpion","mite","roach","locust","crawler"],
    blob:["slime","moss","blob","pudding","spore","ooze","mimic","branch","fungus","gel","mass","shard"],
    floater:["wisp","wraith","revenant","wight","ghost","shade","imp","fiend","djinn","spirit","soul","will","orb","eyes","specter","banshee","poltergeist"],
    biped:["golem","knight","paladin","sentinel","warden","tyrant","king","witch","hag","priest","acolyte","giant","hulk","ettin","ogre","troll","gnome","goblin","dwarf","mummy","zombie","skeleton","monk","brigand","cultist","elemental","devil","god","colossus","avatar","automaton","titan","brute","fiendling","stalker","one"],
    quad:["rat","hare","boar","wolf","hound","lizard","marten","stag","elk","deer","fox","toad","frog","cat","lynx","panther","bear","beast","mole","badger","otter","jackal","hyena","ram","goat","horse","steed","mule","mossling","gnoll"],
  },
  PALS:{
    fire:{b:"#e0683c",d:"#a33c20",a:"#ffb35c"},frost:{b:"#7fb8e6",d:"#4a7ca6",a:"#d6f0ff"},
    ice:{b:"#7fb8e6",d:"#4a7ca6",a:"#d6f0ff"},venom:{b:"#5fa64a",d:"#3a7030",a:"#b8f57a"},
    poison:{b:"#5fa64a",d:"#3a7030",a:"#b8f57a"},swamp:{b:"#5a7a4a",d:"#3a5230",a:"#a8d67a"},
    void:{b:"#6a4a9e",d:"#452f6e",a:"#c9a2ff"},shadow:{b:"#5a4a8e",d:"#3a2f60",a:"#b49aff"},
    dark:{b:"#5a4a8e",d:"#3a2f60",a:"#b49aff"},blood:{b:"#a63a3a",d:"#702424",a:"#ff7a6a"},
    crimson:{b:"#a63a3a",d:"#702424",a:"#ff7a6a"},crystal:{b:"#5ec8c0",d:"#3a8a86",a:"#c8fff8"},
    gem:{b:"#5ec8c0",d:"#3a8a86",a:"#c8fff8"},gold:{b:"#c9a24a",d:"#8a6c2a",a:"#ffe89a"},
    divine:{b:"#c9a24a",d:"#8a6c2a",a:"#ffe89a"},celestial:{b:"#c9a24a",d:"#8a6c2a",a:"#ffe89a"},
    storm:{b:"#5a7ad6",d:"#3a50a0",a:"#ffe66a"},thunder:{b:"#5a7ad6",d:"#3a50a0",a:"#ffe66a"},
    stone:{b:"#8a8a96",d:"#5c5c6a",a:"#cfd0dc"},rock:{b:"#8a8a96",d:"#5c5c6a",a:"#cfd0dc"},
    iron:{b:"#8a8a96",d:"#5c5c6a",a:"#cfd0dc"},steel:{b:"#8a8a96",d:"#5c5c6a",a:"#cfd0dc"},
    bone:{b:"#c8c2ae",d:"#968e76",a:"#f5eeda"},sand:{b:"#d0a86a",d:"#98703c",a:"#f0d8a0"},
    sun:{b:"#e0a040",d:"#a06820",a:"#ffe89a"},moon:{b:"#8a90c0",d:"#585e8e",a:"#d8e0ff"},
    star:{b:"#8a90c0",d:"#585e8e",a:"#d8e0ff"},
    rat:{b:"#8a7a6a",d:"#5c5044",a:"#e0b89a"},hare:{b:"#c2a884",d:"#8a7050",a:"#f0dcc0"},
    boar:{b:"#9a6a4a",d:"#6a4430",a:"#e0b080"},wolf:{b:"#7a8290",d:"#525868",a:"#c8d0e0"},
    hound:{b:"#8a6a4a",d:"#5c4630",a:"#e0b080"},stag:{b:"#a0764a",d:"#6e5030",a:"#e8c890"},
    elk:{b:"#a0764a",d:"#6e5030",a:"#e8c890"},deer:{b:"#a0764a",d:"#6e5030",a:"#e8c890"},
    fox:{b:"#d07a3a",d:"#96542a",a:"#ffcf9a"},toad:{b:"#6a8a4a",d:"#485c32",a:"#b8dc8a"},
    frog:{b:"#6a8a4a",d:"#485c32",a:"#b8dc8a"},bear:{b:"#7a5c40",d:"#52402a",a:"#d8b890"},
    field:{b:"#6fa24e",d:"#4a7032",a:"#c8e89a"},meadow:{b:"#6fa24e",d:"#4a7032",a:"#c8e89a"},
    grass:{b:"#6fa24e",d:"#4a7032",a:"#c8e89a"},briar:{b:"#5e8a4a",d:"#3f5c30",a:"#aad878"},
    thistle:{b:"#7a6a9e",d:"#52486e",a:"#d8b8f5"},clover:{b:"#4e9a5e",d:"#326a40",a:"#a0e8b0"},
    moss:{b:"#5e8a52",d:"#3e5c36",a:"#aad888"},dandelion:{b:"#e8c84a",d:"#a8902a",a:"#fff0a0"},
    pine:{b:"#4a7a56",d:"#2f5438",a:"#90d0a0"},bark:{b:"#7a5c3c",d:"#523e28",a:"#d0aa78"},
    timber:{b:"#7a5c3c",d:"#523e28",a:"#d0aa78"},root:{b:"#8a6a44",d:"#5c482c",a:"#d8b888"},
    acorn:{b:"#a0723c",d:"#6e4c26",a:"#e0bc80"},grove:{b:"#4a8a5c",d:"#2f5c3e",a:"#90dcb0"},
    wood:{b:"#7a5c3c",d:"#523e28",a:"#d0aa78"},mist:{b:"#9aa4b4",d:"#6a7488",a:"#dce4f0"},
    fog:{b:"#9aa4b4",d:"#6a7488",a:"#dce4f0"},grey:{b:"#8a92a0",d:"#5c6474",a:"#ccd4e0"},
    pale:{b:"#b4ae9c",d:"#847e6a",a:"#e8e2cc"},shroud:{b:"#6a7088",d:"#464c60",a:"#b0b8d8"},
    barrow:{b:"#7a7a68",d:"#525244",a:"#d0d0b8"},dread:{b:"#4a3a5e",d:"#302640",a:"#a070c8"},
    sorrow:{b:"#5a5a8a",d:"#3c3c60",a:"#a8a8e0"},thorn:{b:"#4a6a3e",d:"#304828",a:"#c86aa0"},
    serpent:{b:"#5e9a44",d:"#3e6a2c",a:"#c8f08a"},viper:{b:"#5e9a44",d:"#3e6a2c",a:"#c8f08a"},
    sprite:{b:"#c86ab0",d:"#8a4678",a:"#ffb0e8"},imp:{b:"#7ab05c",d:"#527a3c",a:"#d0f0a0"},
    wisp:{b:"#7ad0d8",d:"#4a8a92",a:"#d0f8ff"},crow:{b:"#3c4048",d:"#22262c",a:"#8a90a0"},
    beetle:{b:"#5a6a8a",d:"#3a465c",a:"#a0b8e0"},drake:{b:"#b05040",d:"#7a3428",a:"#ffa070"},
    gnome:{b:"#8aa050",d:"#5c6c34",a:"#d8e890"},lizard:{b:"#6a9a50",d:"#486a34",a:"#c8e890"},
  },
  hash(s){let h=0;for(let i=0;i<s.length;i++){h=(h*31+s.charCodeAt(i))|0}return Math.abs(h)},
  arch(name){
    const ws=(name.toLowerCase().match(/[a-z]+/g)||[]);
    for(let i=ws.length-1;i>=0;i--){
      for(const [a,list] of Object.entries(this.ARCHES))
        if(list.includes(ws[i])) return a;
    }
    return ["quad","biped","floater","serpent"][this.hash(name)%4];
  },
  pal(name){
    const ws=(name.toLowerCase().match(/[a-z]+/g)||[]);
    for(let i=ws.length-1;i>=0;i--) if(this.PALS[ws[i]]) return this.PALS[ws[i]];
    const h=this.hash(name)%360;
    return {b:`hsl(${h},42%,52%)`,d:`hsl(${h},46%,34%)`,a:`hsl(${(h+40)%360},80%,72%)`};
  },
  face(cx,cy,r,p){ // eyes + mouth
    return `<g class="mav-face">
      <circle cx="${cx-r*.4}" cy="${cy}" r="${r*.17}" fill="#14101f"/>
      <circle cx="${cx+r*.4}" cy="${cy}" r="${r*.17}" fill="#14101f"/>
      <circle cx="${cx-r*.4+1}" cy="${cy-1}" r="${r*.06}" fill="#fff"/>
      <circle cx="${cx+r*.4+1}" cy="${cy-1}" r="${r*.06}" fill="#fff"/>
      <path d="M${cx-r*.32} ${cy+r*.42} q${r*.32} ${r*.3} ${r*.64} 0" stroke="#14101f" stroke-width="${r*.1}" fill="none" stroke-linecap="round"/></g>`;
  },
  svg(m,px){
    const a=this.arch(m.name),p=this.pal(m.name);
    const B=({serpent:`<path class="mav-seg" d="M14 56 Q26 38 40 50 T66 48" fill="none" stroke="${p.b}" stroke-width="13" stroke-linecap="round"/>
        <path d="M14 56 Q26 38 40 50 T66 48" fill="none" stroke="${p.d}" stroke-width="13" stroke-linecap="round" stroke-dasharray="4 9" opacity=".55"/>
        <g class="mav-head"><ellipse cx="64" cy="46" rx="11" ry="9" fill="${p.b}"/>${this.face(64,45,16,p)}
          <path class="mav-tongue" d="M74 48 h7 m0 0 l-3 -3 m3 3 l-3 3" stroke="#e05a6a" stroke-width="1.6" fill="none"/></g>`,
      winged:`<g class="mav-wing wl"><path d="M40 34 Q18 16 8 26 Q20 30 26 40 Z" fill="${p.d}"/></g>
        <g class="mav-wing wr"><path d="M40 34 Q62 16 72 26 Q60 30 54 40 Z" fill="${p.d}"/></g>
        <ellipse class="mav-core" cx="40" cy="44" rx="14" ry="16" fill="${p.b}"/>
        ${this.face(40,40,14,p)}<path d="M34 58 q6 6 12 0" stroke="${p.d}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
      bug:`<g stroke="${p.d}" stroke-width="3" stroke-linecap="round" class="mav-legs">
          <line x1="26" y1="50" x2="16" y2="60"/><line x1="30" y1="54" x2="22" y2="66"/><line x1="36" y1="56" x2="32" y2="68"/>
          <line x1="54" y1="50" x2="64" y2="60"/><line x1="50" y1="54" x2="58" y2="66"/><line x1="44" y1="56" x2="48" y2="68"/></g>
        <ellipse cx="40" cy="48" rx="17" ry="13" fill="${p.b}"/>
        <ellipse cx="40" cy="42" rx="17" ry="9" fill="${p.d}" opacity=".5"/>
        <g class="mav-ant"><path d="M33 36 q-4 -8 -9 -9" stroke="${p.d}" stroke-width="2" fill="none"/><path d="M47 36 q4 -8 9 -9" stroke="${p.d}" stroke-width="2" fill="none"/></g>
        ${this.face(40,44,15,p)}`,
      blob:`<path class="mav-body" d="M20 58 q-2 -26 20 -26 t20 26 q0 6 -20 6 t-20 -6" fill="${p.b}"/>
        <path d="M24 52 q4 -14 16 -15" stroke="#fff" stroke-width="3" opacity=".25" fill="none" stroke-linecap="round"/>
        ${this.face(40,44,15,p)}<ellipse cx="40" cy="63" rx="18" ry="3.4" fill="${p.d}" opacity=".6"/>`,
      floater:`<path class="mav-body" d="M28 26 q12 -10 24 0 q4 10 0 20 l-4 14 -8 -8 -8 8 -4 -14 q-4 -10 0 -20" fill="${p.b}" opacity=".92"/>
        ${this.face(40,38,15,p)}
        <circle class="mav-tail" cx="40" cy="60" r="4" fill="${p.a}" opacity=".8"/>`,
      biped:`<g stroke="${p.d}" stroke-width="6" stroke-linecap="round"><line x1="33" y1="58" x2="31" y2="68"/><line x1="47" y1="58" x2="49" y2="68"/></g>
        <rect class="mav-body" x="26" y="30" width="28" height="30" rx="9" fill="${p.b}"/>
        <g class="mav-arm"><line x1="28" y1="36" x2="20" y2="50" stroke="${p.d}" stroke-width="6" stroke-linecap="round"/></g>
        <g class="mav-arm2"><line x1="52" y1="36" x2="60" y2="50" stroke="${p.d}" stroke-width="6" stroke-linecap="round"/></g>
        <g class="mav-head"><circle cx="40" cy="22" r="12" fill="${p.b}"/>${this.face(40,21,15,p)}
          <path d="M28 16 q12 -10 24 0" stroke="${p.d}" stroke-width="5" fill="none" stroke-linecap="round"/></g>`,
      quad:`<g stroke="${p.d}" stroke-width="5" stroke-linecap="round"><line x1="28" y1="52" x2="26" y2="64"/><line x1="38" y1="54" x2="37" y2="66"/><line x1="50" y1="54" x2="51" y2="66"/><line x1="58" y1="52" x2="60" y2="64"/></g>
        <ellipse cx="42" cy="48" rx="19" ry="12" fill="${p.b}"/>
        <path class="mav-tail" d="M24 48 q-9 -2 -10 -10" stroke="${p.d}" stroke-width="4" fill="none" stroke-linecap="round"/>
        <g class="mav-head"><circle cx="58" cy="38" r="11" fill="${p.b}"/>
          <path d="M52 30 l-3 -7 6 3 M64 30 l3 -7 -6 3" stroke="${p.b}" stroke-width="4" fill="none" stroke-linecap="round"/>
          ${this.face(58,37,14,p)}</g>`,
    })[a]||"";
    return `<svg class="mav mav-${a}" width="${px}" height="${Math.round(px*70/80)}" viewBox="0 0 80 70">
      <ellipse cx="40" cy="66" rx="${a==="serpent"?24:16}" ry="3.6" fill="#000" opacity=".35"/>
      <g class="mav-move">${B}</g>
      ${m.isBoss?`<circle class="mav-bossring" cx="40" cy="40" r="33" fill="none" stroke="#ff6a5a" stroke-width="1.4" stroke-dasharray="5 6" opacity=".65"/>`:""}
    </svg>`;
  },
};
