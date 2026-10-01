/* Duskspire — tiny WebAudio synth sfx (no assets) */
const Sfx = {
  ctx:null, on:true,
  ensure(){
    if(!this.ctx){ try{ this.ctx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} }
    if(this.ctx && this.ctx.state==="suspended") this.ctx.resume();
  },
  tone(f,dur=0.08,type="square",vol=0.05,slide=0){
    if(!this.on||!this.ctx) return;
    const t=this.ctx.currentTime, o=this.ctx.createOscillator(), g=this.ctx.createGain();
    o.type=type; o.frequency.setValueAtTime(f,t);
    if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(20,f+slide),t+dur);
    g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t+dur);
  },
  noise(dur=0.1,vol=0.06){
    if(!this.on||!this.ctx) return;
    const t=this.ctx.currentTime, n=this.ctx.createBufferSource(),
      buf=this.ctx.createBuffer(1,this.ctx.sampleRate*dur,this.ctx.sampleRate),
      d=buf.getChannelData(0), g=this.ctx.createGain();
    for(let i=0;i<d.length;i++) d[i]=(Math.random()*2-1)*(1-i/d.length);
    n.buffer=buf; g.gain.setValueAtTime(vol,t);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    n.connect(g); g.connect(this.ctx.destination); n.start(t);
  },
  play(name){
    this.ensure(); if(!this.ctx||!this.on) return;
    switch(name){
      case "tap": this.tone(600,0.05,"triangle",0.03); break;
      case "coin": this.tone(950,0.07,"square",0.035); this.tone(1400,0.09,"square",0.025); break;
      case "hit": this.noise(0.09,0.07); this.tone(180,0.07,"sawtooth",0.04,-60); break;
      case "crit": this.noise(0.12,0.09); this.tone(300,0.12,"sawtooth",0.05,-180); break;
      case "hurt": this.tone(140,0.12,"sawtooth",0.05,-60); break;
      case "die": this.tone(320,0.3,"sawtooth",0.05,-260); break;
      case "win": [523,659,784,1047].forEach((f,i)=>setTimeout(()=>this.tone(f,0.14,"triangle",0.05),i*80)); break;
      case "level": [440,554,659,880].forEach((f,i)=>setTimeout(()=>this.tone(f,0.12,"triangle",0.05),i*70)); break;
      case "loot": this.tone(800,0.08,"triangle",0.04); this.tone(1100,0.12,"triangle",0.03); break;
      case "craft": this.tone(500,0.06,"square",0.035); this.tone(380,0.09,"square",0.03); break;
      case "gather": this.tone(300,0.05,"triangle",0.03); break;
      case "quest": [660,880,1320].forEach((f,i)=>setTimeout(()=>this.tone(f,0.12,"sine",0.045),i*90)); break;
      case "equip": this.tone(450,0.08,"triangle",0.04,150); break;
      case "error": this.tone(200,0.15,"square",0.04,-80); break;
      case "buy": this.tone(700,0.06,"square",0.035); this.tone(900,0.08,"square",0.03); break;
    }
  }
};
