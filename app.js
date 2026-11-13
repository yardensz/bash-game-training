import {Shell,HOME,COMMANDS} from './engine.js?v=4.2';
import {lessons} from './lessons.js?v=4.2';
import {missionDetails,sectors} from './mission-details.js?v=4.2';

const $=id=>document.getElementById(id);
const KEY='bash-quest-progress-v1';
const TOTAL=lessons.length,XP_PER=50,XP_LEVEL=100;
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
let completed=new Set(),stars={},active=0,free=false,streak=0,bestStreak=0;
let shell,history=[],commands=[],cursor=0,assisted=false,solutionUsed=false;
let soundOn=true,calm=false,storyTimer=0,toastTimer=0,userHidden=false;

try{
  const data=JSON.parse(localStorage.getItem(KEY)||'{}');
  completed=new Set((Array.isArray(data.completed)?data.completed:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<TOTAL));
  stars=data.stars&&typeof data.stars==='object'?data.stars:{};
  active=Number.isInteger(data.active)&&data.active>=0&&data.active<TOTAL?data.active:0;
  streak=Number.isInteger(data.streak)?data.streak:0;
  bestStreak=Number.isInteger(data.bestStreak)?data.bestStreak:0;
  document.body.classList.toggle('light',localStorage.getItem('bash-quest-theme')==='light');
  soundOn=localStorage.getItem('bash-quest-sound')!=='off';
  calm=localStorage.getItem('bash-quest-calm')==='on';
}catch{$('saved').textContent='Local saving unavailable';}

const unlocked=i=>i>=0&&i<TOTAL&&(i===0||completed.has(i-1)||completed.has(i));
if(!unlocked(active))active=0;
const pad=n=>String(n).padStart(2,'0');
const base=p=>p==='/'?'/':p.slice(p.lastIndexOf('/')+1);
const isDir=p=>shell.fs.get(p)===null;
const tilde=p=>p===HOME?'~':p.startsWith(HOME+'/')?'~'+p.slice(HOME.length):p;
const starText=n=>'★'.repeat(n)+'☆'.repeat(3-n);
const focusCommand=()=>$('command').focus({preventScroll:true});

// Commands, flags, operators, and variables inside mission text render as code chips.
const TOKEN=new RegExp(`(?<![\\w./-])(${COMMANDS.join('|')})(?![\\w./-])|(?<![\\w-])(-[a-z]{1,2})(?![\\w-])|(\\$[A-Za-z_]\\w*)|(>>|>|\\||(?<!\\.)\\.\\.(?!\\.)|(?<![\\w/])~(?![\\w]))`,'g');
function richText(el,text){
  el.replaceChildren();let last=0;
  for(const m of text.matchAll(TOKEN)){
    if(m.index>last)el.append(text.slice(last,m.index));
    const code=document.createElement('code');code.className=m[1]?'cmd':'tok';code.textContent=m[0];el.append(code);
    last=m.index+m[0].length;
  }
  if(last<text.length)el.append(text.slice(last));
}
function missionTools(lesson){
  const found=[];
  for(const line of lesson.solution)for(const word of line.match(/"[^"]*"|'[^']*'|\S+/g)||[]){
    const tool=COMMANDS.includes(word)?word:['|','>','>>'].includes(word)?word:/^[A-Za-z_]\w*=/.test(word)?'name=value':null;
    if(tool&&!found.includes(tool))found.push(tool);
  }
  return found;
}

function save(){
  try{localStorage.setItem(KEY,JSON.stringify({completed:[...completed],active,stars,streak,bestStreak}));}
  catch{$('saved').textContent='Saving unavailable — progress is temporary';}
}

/* ---------- Sound (Web Audio, no assets) ---------- */
let audio,audioIdle=0;
function sound(name){
  if(!soundOn)return;
  const tunes={
    key:[[880,0,.03,'square',.02]],
    error:[[160,0,.12,'sawtooth',.06],[120,.1,.16,'sawtooth',.06]],
    success:[[523,0,.1,'triangle',.12],[659,.09,.1,'triangle',.12],[784,.18,.18,'triangle',.12]],
    chapter:[[523,0,.12,'triangle',.12],[659,.1,.12,'triangle',.12],[784,.2,.12,'triangle',.12],[1047,.3,.35,'triangle',.14],[784,.3,.35,'sine',.06]],
    level:[[392,0,.08,'square',.05],[523,.08,.08,'square',.05],[784,.16,.2,'square',.05]]
  };
  try{
    audio??=new (window.AudioContext||window.webkitAudioContext)();
    if(audio.state==='suspended')audio.resume();
    const t0=audio.currentTime;let end=0;
    for(const [f,start,dur,type,vol] of tunes[name]){
      const o=audio.createOscillator(),g=audio.createGain();
      o.type=type;o.frequency.value=f;
      g.gain.setValueAtTime(vol,t0+start);g.gain.exponentialRampToValueAtTime(.0001,t0+start+dur);
      o.connect(g).connect(audio.destination);o.start(t0+start);o.stop(t0+start+dur+.02);end=Math.max(end,start+dur);
    }
    // An idle running AudioContext keeps the audio thread busy; suspend it between effects.
    clearTimeout(audioIdle);audioIdle=setTimeout(()=>audio.suspend(),end*1000+400);
  }catch{}
}

/* ---------- Confetti (canvas exists in layout only while particles fly) ---------- */
const fx=$('fx'),ctx=fx.getContext('2d');let particles=[],fxRunning=false;
function resizeFx(){const r=Math.min(devicePixelRatio||1,1.5);fx.width=innerWidth*r;fx.height=innerHeight*r;ctx.setTransform(r,0,0,r,0,0);}
function confetti(x,y,count=60,power=9){
  if(reducedMotion||calm||document.hidden)return;
  const colors=['#5cf2a0','#4cc9f0','#ffd166','#ff6b7a','#c792ea','#ffffff'];
  for(let i=0;i<count;i++){
    const a=Math.random()*Math.PI*2,v=Math.random()*power+2;
    particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-power*.6,r:Math.random()*360,vr:(Math.random()-.5)*20,s:Math.random()*6+4,c:colors[i%colors.length],life:90+Math.random()*50});
  }
  if(particles.length>300)particles.splice(0,particles.length-300);
  if(!fxRunning){fxRunning=true;resizeFx();fx.classList.add('on');requestAnimationFrame(tick);}
}
function tick(){
  ctx.clearRect(0,0,innerWidth,innerHeight);
  particles=particles.filter(p=>p.life-->0&&p.y<innerHeight+20);
  for(const p of particles){
    p.vy+=.28;p.vx*=.985;p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.r*Math.PI/180);ctx.globalAlpha=Math.min(1,p.life/30);
    ctx.fillStyle=p.c;ctx.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);ctx.restore();
  }
  if(particles.length&&!document.hidden)requestAnimationFrame(tick);
  else{particles=[];fxRunning=false;fx.classList.remove('on');fx.width=fx.height=0;}
}
function centerOf(el){const r=el.getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2];}

/* ---------- HUD ---------- */
const levelOf=xp=>Math.floor(xp/XP_LEVEL)+1;
function rankOf(n){return n===TOTAL?'Bash commander':n>=36?'Station chief':n>=24?'Bash explorer':n>=18?'Terminal operator':n>=12?'Pipeline engineer':n>=6?'Command explorer':'New explorer';}
function badgeCount(){return sectors.filter((_,i)=>lessons.filter(l=>l.chapter===i).every(l=>completed.has(l.id))).length;}
function stats(){
  const n=completed.size,xp=n*XP_PER;
  $('completed').textContent=`${n}/${TOTAL}`;
  $('level').textContent=levelOf(xp);
  $('rank').textContent=rankOf(n);
  $('xpText').textContent=n===TOTAL?`${xp} XP · MAX`:`${xp%XP_LEVEL} / ${XP_LEVEL} XP`;
  $('xpFill').style.width=(n===TOTAL?100:xp%XP_LEVEL/XP_LEVEL*100)+'%';
  $('starsTotal').textContent=[...completed].reduce((sum,id)=>sum+(Number(stars[id])||0),0);
  $('streak').textContent=streak;
  $('streak').parentElement.title=`Missions in a row solved without hints or solutions · best: ${bestStreak}`;
  $('badges').textContent=`${badgeCount()}/${sectors.length}`;
}
function pop(id){const el=$(id).closest('.stat,.level-badge');el.classList.remove('pop','bump');void el.offsetWidth;el.classList.add(el.classList.contains('level-badge')?'bump':'pop');}
function floatXP(text){
  if(calm||reducedMotion)return;
  const [x,y]=centerOf($('xpFill').parentElement);
  const el=document.createElement('div');el.className='xp-float';el.textContent=text;
  el.style.left=x-30+'px';el.style.top=y+10+'px';document.body.append(el);setTimeout(()=>el.remove(),1500);
}

/* ---------- Mission map ---------- */
function map(){
  $('chapters').replaceChildren();
  sectors.forEach((sector,ci)=>{
    const subset=lessons.filter(l=>l.chapter===ci),count=subset.filter(l=>completed.has(l.id)).length;
    const section=document.createElement('section');
    section.className='chapter'+(ci===lessons[active].chapter&&!free?' active-sector':'')+(count===subset.length?' restored':'')+(!unlocked(subset[0].id)?' locked':'');
    const title=document.createElement('div');title.className='chapter-title';
    const icon=document.createElement('span');icon.className='chapter-icon';icon.textContent=count===subset.length?'✓':sector.icon;
    const text=document.createElement('div');const b=document.createElement('b');b.textContent=`${ci+1}. ${sector.name}`;
    const locked=!unlocked(subset[0].id);
    const small=document.createElement('small');small.textContent=count===subset.length?`🏅 ${sector.badge} badge`:locked?`🔒 Restore system ${ci} to unlock`:sector.story;
    text.append(b,small);const counter=document.createElement('span');counter.textContent=`${count}/${subset.length}`;
    title.append(icon,text,counter);
    const path=document.createElement('div');path.className='level-path';
    subset.forEach(l=>{
      const node=document.createElement('button');
      node.className='node'+(l.id===active&&!free?' current':'')+(completed.has(l.id)?' done':'');
      node.disabled=!unlocked(l.id);
      const dot=document.createElement('span');dot.className='dot';dot.textContent=completed.has(l.id)&&l.id!==active?'✓':pad(l.id+1);
      const st=document.createElement('span');st.className='mini-stars';st.textContent=stars[l.id]?'★'.repeat(stars[l.id]):'';
      node.append(dot,st);
      node.title=`${pad(l.id+1)}. ${l.title}${completed.has(l.id)?` · ${starText(stars[l.id]||1)}`:''}${node.disabled?' · locked':''}`;
      node.setAttribute('aria-label',`Mission ${l.id+1}: ${l.title}${node.disabled?' — locked':completed.has(l.id)?' — completed':''}`);
      if(l.id===active&&!free)node.setAttribute('aria-current','step');
      node.onclick=()=>{active=l.id;free=false;start();};
      path.append(node);
    });
    section.append(title,path);$('chapters').append(section);
  });
  keepInView($('chapters').querySelector('.active-sector'));
}
// Scroll only the mission map's own scroller, never the page.
function keepInView(el){
  if(!el)return;
  for(let box=el.parentElement;box&&box!==document.body;box=box.parentElement){
    const st=getComputedStyle(box);
    if(/(auto|scroll)/.test(st.overflowY)&&box.scrollHeight>box.clientHeight){
      const top=el.offsetTop-box.offsetTop-60;if(top<box.scrollTop||el.offsetTop-box.offsetTop+el.offsetHeight>box.scrollTop+box.clientHeight)box.scrollTop=Math.max(0,top);return;
    }
    if(/(auto|scroll)/.test(st.overflowX)&&box.scrollWidth>box.clientWidth){box.scrollLeft=el.offsetLeft-box.offsetLeft-10;return;}
  }
}

/* ---------- Terminal output ---------- */
function log(text,cls){const el=document.createElement('div');el.className=cls;el.textContent=text;$('output').append(el);$('output').scrollTop=$('output').scrollHeight;return el;}
function logCommand(prompt,line){const el=document.createElement('div');el.className='command-line';const p=document.createElement('span');p.className='p';p.textContent=prompt+' ';el.append(p,line);$('output').append(el);}

/* ---------- Station map (live file tree) ---------- */
function relPath(to){
  const from=shell.cwd;if(to===from)return '.';
  const a=from.split('/').filter(Boolean),b=to.split('/').filter(Boolean);
  let i=0;while(i<a.length&&i<b.length&&a[i]===b[i])i++;
  const up=a.length-i;
  if(up>2||(up>0&&to.startsWith(HOME)&&!from.startsWith(HOME)))return tilde(to);
  return [...Array(up).fill('..'),...b.slice(i)].join('/')||'.';
}
function insertText(text){
  const input=$('command'),v=input.value,at=input.selectionStart??v.length;
  const before=v.slice(0,at),after=v.slice(at);
  const glue=before&&!/\s$/.test(before)?' ':'';
  input.value=before+glue+text+after;
  const pos=(before+glue+text).length;input.focus();input.setSelectionRange(pos,pos);
}
function quoteIfNeeded(p){return /[\s'"$|&;<>#\\]/.test(p)?`"${p.replace(/(["\\$])/g,'\\$1')}"`:p;}

function renderTree(changes){
  const showHidden=$('showHidden').checked;
  const cwd=shell.cwd;
  const kids=p=>[...shell.fs.keys()].filter(k=>k!=='/'&&shell.parent(k)===p&&(showHidden||!base(k).startsWith('.')))
    .sort((x,y)=>(isDir(y)-isDir(x))||base(x).localeCompare(base(y)));
  const onTrail=p=>p===cwd||cwd.startsWith(p==='/'?'/':p+'/');
  const frag=document.createDocumentFragment();
  const addRow=(p,branch)=>{
    const dir=isDir(p),current=p===cwd,trail=onTrail(p);
    const row=document.createElement('button');row.type='button';row.tabIndex=-1;
    row.className='tree-row'+(dir?' dir':' file')+(current?' current':'')+(trail?' trail':'')+(base(p).startsWith('.')?' hidden-file':'')
      +(changes?.added.has(p)?' added':changes?.modified.has(p)?' modified':'');
    const br=document.createElement('span');br.className='branch';br.textContent=branch;
    const icon=document.createElement('span');icon.className='icon';icon.textContent=dir?(trail?'📂':'📁'):base(p).startsWith('.')?'🗝️':'📄';
    const name=document.createElement('span');name.className='name';name.textContent=p===HOME?'student (~)':base(p)+(dir&&p!=='/'?'/':'');
    row.append(br,icon,name);
    if(current){const here=document.createElement('span');here.className='here';here.textContent='◀ YOU';row.append(here);}
    else if(changes?.added.has(p)||changes?.modified.has(p)){const tag=document.createElement('span');tag.className='tag';tag.textContent=changes.added.has(p)?'NEW':'EDIT';row.append(tag);}
    if(dir)row.title=`${p}\nClick to type its path`;
    else{const content=shell.fs.get(p),lines=content?content.replace(/\n$/,'').split('\n'):[];
      row.title=`${p}\n${lines.length} line(s)${lines.length?`\n› ${lines.slice(0,3).join('\n› ')}${lines.length>3?'\n…':''}`:' — empty'}\nClick to type its path`;}
    row.onclick=()=>{sound('key');insertText(quoteIfNeeded(relPath(p)+(dir&&p!==cwd&&p!=='/'?'/':'')));};
    frag.append(row);
  };
  const walk=(p,prefix)=>{const list=kids(p);list.forEach((k,i)=>{const last=i===list.length-1;addRow(k,prefix+(last?'└─ ':'├─ '));if(isDir(k))walk(k,prefix+(last?'   ':'│  '));});};
  addRow('/','');walk('/','');
  $('tree').replaceChildren(frag);
  $('tree').querySelector('.current')?.scrollIntoView({block:'nearest'});

  $('cwdPath').textContent=cwd+(cwd===HOME?'  (~)':'');
  const crumbs=$('breadcrumbs');crumbs.replaceChildren();
  const parts=['/',...cwd.split('/').filter(Boolean)];
  parts.forEach((part,i)=>{
    if(i>1){const s=document.createElement('span');s.className='sep';s.textContent='›';crumbs.append(s);}
    const target='/'+parts.slice(1,i+1).join('/');
    const b=document.createElement('button');b.type='button';b.textContent=part;b.title=`Type: cd ${relPath(target)}`;
    b.onclick=()=>{sound('key');$('command').value=`cd ${quoteIfNeeded(relPath(target))}`;focusCommand();};
    crumbs.append(b);
  });
  const t=tilde(cwd);$('prompt').textContent=t+' $';$('terminalPath').textContent='student@bash-quest: '+t;
}
function diff(before){
  const added=new Set(),modified=new Set(),removed=[];
  for(const [k,v] of shell.fs){if(!before.has(k))added.add(k);else if(before.get(k)!==v)modified.add(k);}
  for(const k of before.keys())if(!shell.fs.has(k))removed.push(k);
  return {added,modified,removed};
}
function showChanges(c){
  const box=$('treeChanges');box.replaceChildren();
  const line=(cls,text)=>{const d=document.createElement('div');d.className=cls;d.textContent=text;box.append(d);};
  c.added.forEach(p=>line('add',`+ created ${tilde(p)}${isDir(p)?'/':''}`));
  c.modified.forEach(p=>line('mod',`✎ changed ${tilde(p)}`));
  c.removed.forEach(p=>line('del',`− removed ${tilde(p)}`));
}

/* ---------- Mission flow ---------- */
function typeStory(text){
  clearInterval(storyTimer);const el=$('story');el.classList.remove('done');
  if(reducedMotion||calm||document.hidden){el.textContent=text;el.classList.add('done');return;}
  let i=0;el.textContent='';
  storyTimer=setInterval(()=>{el.textContent=text.slice(0,++i);if(i>=text.length){clearInterval(storyTimer);setTimeout(()=>el.classList.add('done'),1200);}},18);
}
function start({boot=false}={}){
  shell=new Shell();history=[];commands=[];cursor=0;assisted=false;solutionUsed=false;
  if(!userHidden)$('showHidden').checked=false;
  $('output').replaceChildren();$('command').value='';$('hintText').hidden=true;$('treeChanges').replaceChildren();
  $('feedback').className='feedback';
  $('feedback').textContent=free?'🧪 Experiment freely. Your course progress is safe.':'Fresh workspace · you start in /home/student (~) · watch the station map as you work.';
  $('learnTab').classList.toggle('selected',!free);$('freeTab').classList.toggle('selected',free);
  const l=lessons[active],d=missionDetails[active];
  $('lessonBadge').textContent=free?'SANDBOX':`SYSTEM ${l.chapter+1} · ${sectors[l.chapter].name.toUpperCase()}`;
  $('lessonStars').textContent=free?'':completed.has(active)?starText(Number(stars[active])||1):'☆☆☆';
  $('lessonNumber').textContent=free?'∞':pad(active+1);
  $('lessonTitle').textContent=free?'Playground':l.title;
  typeStory(free?'> Sandbox online. Try an idea and watch what changes.':`> ${sectors[l.chapter].story} ${completed.has(active)?'[replay]':`[+${XP_PER} XP]`}`);
  richText($('concept'),free?'Use the command guide (F2) to explore supported commands. Files here are simulated and reset when you leave this workspace.':l.concept);
  $('example').textContent=free?'help':l.example;
  richText($('task'),free?'There is no required result. Try building your own folder structure and watch the station map.':d.target);
  $('steps').replaceChildren();
  (free?['Type any supported command — try help.','Click a folder in the station map to type its path.']:d.steps).forEach(text=>{const li=document.createElement('li');const span=document.createElement('span');richText(span,text);li.append(span);$('steps').append(li);});
  $('tools').hidden=free;
  if(!free){const list=$('toolList');list.replaceChildren();for(const t of missionTools(l)){const code=document.createElement('code');code.className=COMMANDS.includes(t)?'cmd':'tok';code.textContent=t;list.append(code);}}
  $('hint').hidden=free;$('solution').hidden=free;
  $('learnMore').open=window.innerHeight>=820||window.innerWidth<1000;
  document.querySelector('.lesson-scroll').scrollTop=0;
  if(boot){
    for(const t of ['BASH QUEST station OS v4.0 — booting…','[ ok ] life support','[ ok ] simulated filesystem mounted at /','[ ok ] terminal link established'])log(t,'boot');
  }
  log(free?'# Playground — type help to list commands.':`# Mission ${pad(active+1)}/${TOTAL} — ${l.title}\n# Goal: ${l.task}`,'intro');
  renderTree();stats();map();save();focusCommand();
}
function showToast({icon,title,text,starsN,chapter}){
  clearTimeout(toastTimer);
  const t=$('toast');t.classList.remove('show','chapter');void t.offsetWidth;
  $('toastIcon').textContent=icon;$('toastTitle').textContent=title;$('toastText').textContent=text;$('toastStars').textContent=starsN?starText(starsN):'';
  t.classList.toggle('chapter',!!chapter);t.classList.add('show');
  toastTimer=setTimeout(()=>t.classList.remove('show'),chapter?5200:3400);
}
function completeMission(result){
  const id=active,first=!completed.has(id),rating=solutionUsed?1:assisted?2:3;
  const levelBefore=levelOf(completed.size*XP_PER);
  completed.add(id);stars[id]=Math.max(Number(stars[id])||0,rating);
  streak=rating===3?streak+1:0;bestStreak=Math.max(bestStreak,streak);
  const chapterDone=first&&lessons.filter(l=>l.chapter===lessons[id].chapter).every(l=>completed.has(l.id));
  const finale=id===TOTAL-1;
  // Synchronous transition prevents timers from stealing input typed for the next mission.
  if(finale)free=true;else active++;
  start();
  log(`✔ MISSION ${pad(id+1)} COMPLETE ${starText(rating)}${first?`  +${XP_PER} XP`:''}`,'success-line');
  if(result.output)log('# Last output:\n'+result.output.trimEnd(),'intro');
  if(!finale)log(`# Mission ${pad(active+1)} loaded. Read the objective, then keep typing.`,'intro');
  const sector=sectors[lessons[id].chapter];
  const rateText=rating===3?'Flawless — no help needed!':rating===2?'Solved with a hint. Replay for 3 stars.':'Guided solve. Replay without help for 3 stars.';
  showToast(finale?{icon:'🏆',title:'STATION RESTORED!',text:'You completed every mission. The playground is yours.',starsN:rating,chapter:true}
    :chapterDone?{icon:'🏅',title:`${sector.name} restored!`,text:`${sector.badge} badge unlocked · ${rateText}`,starsN:rating,chapter:true}
    :{icon:'✓',title:`Mission ${pad(id+1)} complete${first?` · +${XP_PER} XP`:''}`,text:rateText+(streak>1?` 🔥 ${streak} in a row`:''),starsN:rating});
  const term=$('terminal');term.classList.remove('win');void term.offsetWidth;term.classList.add('win');
  const [x,y]=centerOf(term);
  confetti(x,y-80,finale?220:chapterDone?140:45,finale||chapterDone?14:8);
  sound(chapterDone||finale?'chapter':'success');
  if(first){floatXP(`+${XP_PER} XP`);pop('completed');}
  if(rating===3)pop('streak');
  if(levelOf(completed.size*XP_PER)>levelBefore){pop('level');setTimeout(()=>sound('level'),450);}
  $('feedback').className='feedback good';
  $('feedback').textContent=finale?'🏆 All systems restored. Revisit any mission to improve your stars.':`✔ Mission ${pad(id+1)} complete. Next: ${lessons[active].title}`;
}

$('commandForm').addEventListener('submit',e=>{
  e.preventDefault();const line=$('command').value.trim();if(!line)return;
  commands.push(line);cursor=commands.length;$('command').value='';
  logCommand($('prompt').textContent,line);
  const before=new Map(shell.fs);
  const result=shell.run(line);history.push(result);
  if(result.ok&&result.events.some(ev=>ev.cmd==='clear'))$('output').replaceChildren();
  if(result.output)log(result.output.replace(/\n$/,''),result.ok?'result-line':'error-line');
  const revealed=result.ok&&result.events.some(ev=>ev.cmd==='ls'&&ev.args.some(a=>/^-\w*a/.test(a)))&&!$('showHidden').checked;
  if(revealed)$('showHidden').checked=true;
  const changes=diff(before);
  renderTree(changes);showChanges(changes);
  if(!free&&lessons[active].check(shell,result,history)){completeMission(result);focusCommand();return;}
  if(!result.ok){
    sound('error');
    const term=$('terminal');term.classList.remove('shake');void term.offsetWidth;term.classList.add('shake');
    $('feedback').className='feedback error';
    $('feedback').textContent='⚠ Read the red error in the terminal and try again — or press F1 for a hint. Mistakes cost nothing.';
  }else{
    $('feedback').className='feedback';
    const moved=result.events.some(ev=>ev.cmd==='cd');
    $('feedback').textContent=revealed?'🗝️ Hidden files revealed on the station map!'
      :moved?`📍 You moved to ${tilde(shell.cwd)} — see the marker on the station map.`
      :changes.added.size||changes.modified.size||changes.removed.length?(free?'🗺️ The station map updated — see the highlights.':'🗺️ The station map updated. Compare it with “Success looks like”.')
      :free?'Command complete. Keep experimenting.':'Command complete. Check “Success looks like” and continue your objective.';
  }
  focusCommand();
});

/* ---------- Tab completion ---------- */
function complete(){
  const input=$('command'),at=input.selectionStart??input.value.length;
  const left=input.value.slice(0,at),right=input.value.slice(at);
  const word=left.match(/(\S*)$/)[1],before=left.slice(0,left.length-word.length);
  let options;
  if(!before.trim()||/[|]\s*$/.test(before))options=COMMANDS.filter(c=>c.startsWith(word)).map(c=>c+' ');
  else{
    const slash=word.lastIndexOf('/'),dirPart=word.slice(0,slash+1),namePart=word.slice(slash+1);
    const dir=shell.path(dirPart||'.');
    if(shell.fs.get(dir)!==null){sound('error');return;}
    options=[...shell.fs.keys()].filter(k=>k!=='/'&&shell.parent(k)===dir).map(base)
      .filter(n=>n.startsWith(namePart)&&(namePart.startsWith('.')||!n.startsWith('.')))
      .sort().map(n=>dirPart+n+(isDir(dir==='/'?'/'+n:dir+'/'+n)?'/':' '));
  }
  if(!options.length){sound('error');return;}
  let common=options[0];for(const o of options)while(!o.startsWith(common))common=common.slice(0,-1);
  if(common.length>word.length||options.length===1){
    const text=options.length===1?options[0]:common;
    input.value=before+text+right;const pos=(before+text).length;input.setSelectionRange(pos,pos);sound('key');
  }else{log(options.map(o=>o.trim()).join('   '),'intro');}
}

$('command').addEventListener('keydown',e=>{
  if(e.key==='Tab'&&!e.shiftKey){e.preventDefault();complete();return;}
  if(e.key==='l'&&e.ctrlKey){e.preventDefault();$('output').replaceChildren();return;}
  if(e.key==='ArrowUp'||e.key==='ArrowDown'){
    e.preventDefault();cursor=Math.max(0,Math.min(commands.length,cursor+(e.key==='ArrowUp'?-1:1)));$('command').value=commands[cursor]||'';
  }
});

/* ---------- Help & controls ---------- */
function showHint(){if(free)return;assisted=true;$('hintText').hidden=false;richText($('hintText'),'💡 '+lessons[active].hint);$('hintText').scrollIntoView({block:'nearest'});focusCommand();}
$('hint').onclick=showHint;
$('solution').onclick=()=>{
  solutionUsed=true;const box=$('hintText');box.hidden=false;
  box.replaceChildren(document.createTextNode('🔑 Run one command per line. Guided completion earns 1 star; replay independently to earn 3.'));
  const code=document.createElement('code');code.className='solution';code.textContent=lessons[active].solution.join('\n');box.append(code);
  box.scrollIntoView({block:'nearest'});focusCommand();
};
$('resetLevel').onclick=()=>start();
$('freeTab').onclick=()=>{free=true;start();};
$('learnTab').onclick=()=>{free=false;start();};
$('showHidden').onchange=()=>{userHidden=$('showHidden').checked;renderTree();focusCommand();};
$('resetProgress').onclick=()=>{
  if(!confirm('Reset all progress, XP, stars, streaks, and badges on this device?'))return;
  completed.clear();stars={};active=0;free=false;streak=0;bestStreak=0;start();
};
$('theme').onclick=()=>{document.body.classList.toggle('light');try{localStorage.setItem('bash-quest-theme',document.body.classList.contains('light')?'light':'dark');}catch{}focusCommand();};
function syncSound(){$('sound').textContent=soundOn?'🔊':'🔇';$('sound').setAttribute('aria-pressed',String(soundOn));}
$('sound').onclick=()=>{soundOn=!soundOn;syncSound();try{localStorage.setItem('bash-quest-sound',soundOn?'on':'off');}catch{}sound('key');focusCommand();};
syncSound();
function syncCalm(){document.body.classList.toggle('calm',calm);$('calm').textContent=calm?'🌙':'✨';$('calm').setAttribute('aria-pressed',String(calm));$('calm').title=calm?'Calm mode on: no animations or confetti (lowest GPU use)':'Effects on — click for calm mode (lowest GPU use)';}
$('calm').onclick=()=>{calm=!calm;syncCalm();try{localStorage.setItem('bash-quest-calm',calm?'on':'off');}catch{}focusCommand();};
syncCalm();

const reference=[['pwd','Print the current directory path'],['ls [-a] [-l] [directory]','List files; -a includes hidden entries, -l shows illustrative permissions'],['cd [directory]','Change directory. .. means parent; ~ means home'],['cat [file]','Read a file or input from a pipe'],['mkdir [-p] directory','Create a directory. -p also creates missing parent directories'],['rmdir directory','Remove an empty directory'],['touch file','Create an empty file if it does not exist'],['cp source destination','Copy a file; keep the source'],['mv source destination','Move or rename a file'],['rm file','Delete a file — no recycle bin'],['echo "text"','Print text followed by a newline'],['command > file','Write output to a file; overwrite existing contents'],['command >> file','Append output to a file'],['grep [-i] [-v] [-c] text [file]','Select lines containing plain text. -i ignores case, -v inverts the match, -c counts matching lines'],['wc -l|-w [file]','Count lines (-l) or words (-w)'],['head -n 2 [file]','The first two lines'],['tail -n 2 [file]','The last two lines'],['sort [-r] [file]','Sort lines; -r reverses the order'],['uniq [-c] [file]','Remove adjacent duplicate lines; -c prefixes each with its count'],['command | command','Pass output as input to the next command'],['name=value','Store a value in a variable; no spaces around ='],['echo "$name"','Expand a variable inside double quotes'],["echo '$name'",'Literal text; no variable expansion'],['clear','Clear the terminal; keep the files'],['help','List supported commands'],['Tab','Complete a command, file, or folder name'],['Ctrl+L','Clear the terminal screen']];
function guide(){
  const query=$('search').value.toLowerCase();$('guideList').replaceChildren();
  reference.filter(x=>x.join(' ').toLowerCase().includes(query)).forEach(([cmd,desc])=>{
    const row=document.createElement('div');row.className='guide-item';const code=document.createElement('code');code.textContent=cmd;
    const p=document.createElement('p');p.textContent=desc;row.append(code,p);$('guideList').append(row);
  });
  if(!$('guideList').children.length)$('guideList').textContent='No matching commands found.';
}
function openGuide(){guide();$('guide').showModal();$('search').focus();}
$('reference').onclick=openGuide;
$('closeGuide').onclick=()=>$('guide').close();$('search').oninput=guide;
$('guide').addEventListener('close',focusCommand);
document.addEventListener('keydown',e=>{
  if($('guide').open)return;
  if(e.key==='F1'){e.preventDefault();showHint();}
  if(e.key==='F2'){e.preventDefault();openGuide();}
  if(e.altKey&&e.key.toLowerCase()==='r'){e.preventDefault();start();}
  if(e.altKey&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const next=active+(e.key==='ArrowLeft'?-1:1);if(unlocked(next)){active=next;free=false;start();}}
  if(e.key==='Escape')focusCommand();
});
start({boot:true});
