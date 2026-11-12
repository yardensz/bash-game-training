import {Shell,HOME} from './engine.js';
import {lessons} from './lessons.js';
import {missionDetails,sectors} from './mission-details.js';
const $=id=>document.getElementById(id);
const KEY='bash-quest-progress-v1';
let completed=new Set(),stars={},active=0,free=false,shell,history=[],commands=[],cursor=0;
let assisted=false,solutionUsed=false;
try {
  const data=JSON.parse(localStorage.getItem(KEY)||'{}');
  completed=new Set((Array.isArray(data.completed)?data.completed:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<lessons.length));
  stars=data.stars&&typeof data.stars==='object'?data.stars:{};
  active=Number.isInteger(data.active)&&data.active>=0&&data.active<lessons.length?data.active:0;
  document.body.classList.toggle('dark',localStorage.getItem('bash-quest-theme')==='dark');
} catch { $('saved').textContent='Local saving unavailable'; }
const unlocked=i=>i>=0&&i<lessons.length&&(i===0||completed.has(i-1)||completed.has(i));
if(!unlocked(active))active=0;
function focusCommand(){ $('command').focus({preventScroll:true}); }
function save(){try{localStorage.setItem(KEY,JSON.stringify({completed:[...completed],active,stars}));}catch{$('saved').textContent='Progress is temporary; saving unavailable';}}
function stats(){
  const n=completed.size;
  $('completed').textContent=`${n} / 24`;
  $('xp').textContent=`${n*50} XP`;
  $('progress').style.width=n/24*100+'%';
  $('rank').textContent=n===24?'Bash explorer':n>=18?'Terminal operator':n>=6?'Command explorer':'New explorer';
  const badges=sectors.filter((_,i)=>lessons.filter(l=>l.chapter===i).every(l=>completed.has(l.id))).length;
  $('badges').textContent=`${badges} / 4 badges unlocked`;
}
function map(){
  $('chapters').replaceChildren();
  sectors.forEach((sector,ci)=>{
    const subset=lessons.filter(l=>l.chapter===ci),count=subset.filter(l=>completed.has(l.id)).length;
    const section=document.createElement('section');
    section.className='chapter'+(ci===lessons[active].chapter&&!free?' active-sector':'')+(count===6?' restored':'');
    section.innerHTML=`<div class="chapter-title"><span class="chapter-icon">${sector.icon}</span><div><b>${sector.name}</b><small>${count===6?'✓ '+sector.badge+' badge':sector.story}</small></div><span>${count}/6</span></div>`;
    const grid=document.createElement('div');grid.className='level-grid';
    subset.forEach(l=>{
      const b=document.createElement('button');
      b.className='level'+(l.id===active&&!free?' current':'')+(completed.has(l.id)?' done':'');
      b.disabled=!unlocked(l.id);
      b.textContent=String(l.id+1).padStart(2,'0');
      b.title=`${l.title}${completed.has(l.id)?' · completed':''}${stars[l.id]?' · '+stars[l.id]+'/3 stars':''}`;
      b.setAttribute('aria-label',`Mission ${l.id+1}: ${l.title}${b.disabled?' — locked':''}`);
      if(l.id===active&&!free)b.setAttribute('aria-current','step');
      b.onclick=()=>{active=l.id;free=false;start();};grid.append(b);
    });
    section.append(grid);$('chapters').append(section);
  });
}
function log(text,cls){const el=document.createElement('div');el.className=cls;el.textContent=text;$('output').append(el);$('output').scrollTop=$('output').scrollHeight;}
function renderFiles(){
  $('fileTree').textContent=HOME+'/\n'+[...shell.fs.entries()].filter(([p])=>p.startsWith(HOME+'/')).sort(([a],[b])=>a.localeCompare(b)).map(([p,v])=>(v===null?'[dir]  ':'[file] ')+p.slice(HOME.length+1)).join('\n');
  const cwd=shell.cwd===HOME?'~':shell.cwd.startsWith(HOME+'/')?'~'+shell.cwd.slice(HOME.length):shell.cwd;
  $('prompt').textContent=cwd+' $';$('terminalPath').textContent='student@bash-quest: '+cwd;
}
function start(){
  shell=new Shell();history=[];commands=[];cursor=0;assisted=false;solutionUsed=false;
  $('output').replaceChildren();$('command').value='';$('hintText').hidden=true;
  $('feedback').classList.remove('error');
  $('feedback').textContent=free?'Experiment freely. Your course progress is safe.':'Fresh workspace · Start in /home/student · One command per line';
  $('learnTab').classList.toggle('selected',!free);$('freeTab').classList.toggle('selected',free);
  const l=lessons[active],d=missionDetails[active];
  $('lessonBadge').textContent=free?'SANDBOX':`SYSTEM ${l.chapter+1} · ${sectors[l.chapter].name}`;
  $('lessonCount').textContent=free?'Unlimited practice':`50 XP · ${completed.has(active)?'Replay':'New mission'}`;
  $('lessonTitle').textContent=free?'Your playground':`${String(active+1).padStart(2,'0')}. ${l.title}`;
  $('story').textContent=free?'Try an idea. See what changes.':sectors[l.chapter].story;
  $('concept').textContent=free?'Use the command guide to explore supported commands. Files here are simulated and reset when you leave this workspace.':l.concept;
  $('example').textContent=free?'help':l.example;
  $('task').textContent=free?'There is no required result. Try creating a directory or saving a message.':d.target;
  $('steps').replaceChildren();
  (free?['Type any supported command. Use F2 for the guide or F3 to inspect files.']:d.steps).forEach(text=>{const li=document.createElement('li');li.textContent=text;$('steps').append(li);});
  $('hint').hidden=free;$('solution').hidden=free;
  // Keep objectives and input visible on smaller laptop screens; explanations remain one key away.
  $('learnMore').open=window.innerHeight>=850||window.innerWidth<1000;
  document.querySelector('.lesson-scroll').scrollTop=0;
  log(free?'# Playground — try help to explore.':`# Mission ${String(active+1).padStart(2,'0')} / 24\n# Fresh workspace. Type a command, then Enter.`,'intro');
  renderFiles();stats();map();save();focusCommand();
}
function celebrate(id,first,rating,chapterDone){
  $('reward').classList.remove('celebrate','chapter-win');
  $('reward').classList.add('earned');
  if(chapterDone)$('reward').classList.add('chapter-win');
  $('rewardIcon').textContent=chapterDone?'✦':'✓';
  $('rewardTitle').textContent=id===23?'STATION RESTORED — fundamentals complete!':chapterDone?`${sectors[lessons[id].chapter].name} restored · ${sectors[lessons[id].chapter].badge} badge unlocked!`:`Mission ${String(id+1).padStart(2,'0')} complete${first?' · +50 XP':' · replay complete'}`;
  $('rewardText').textContent=`${rating===3?'Independent solve!':rating===2?'Completed with a hint.':'Guided practice complete.'} ${id===23?'The playground is ready. Revisit missions to improve your stars.':`Mission ${String(id+2).padStart(2,'0')} is ready — keep typing.`}`;
  $('rewardStars').textContent='★'.repeat(rating)+'☆'.repeat(3-rating);
  $('rewardStars').title='3 stars: no help · 2: hint · 1: solution. Mistakes never reduce stars.';
  void $('reward').offsetWidth;$('reward').classList.add('celebrate');
}
$('commandForm').addEventListener('submit',e=>{
  e.preventDefault();const line=$('command').value.trim();if(!line)return;
  commands.push(line);cursor=commands.length;$('command').value='';log($('prompt').textContent+' '+line,'command-line');
  const result=shell.run(line);history.push(result);
  if(result.ok&&result.events.some(e=>e.cmd==='clear'))$('output').replaceChildren();
  if(result.output)log(result.output,result.ok?'result-line':'error-line');
  renderFiles();
  if(!free&&lessons[active].check(shell,result,history)){
    const id=active,first=!completed.has(id),rating=solutionUsed?1:assisted?2:3;
    completed.add(id);stars[id]=Math.max(Number(stars[id])||0,rating);
    const chapterDone=first&&lessons.filter(l=>l.chapter===lessons[id].chapter).every(l=>completed.has(l.id));
    // Synchronous transition prevents timers from stealing input typed for the next mission.
    if(id===23)free=true;else active++;
    start();celebrate(id,first,rating,chapterDone);
    log(`# Previous mission ${id+1} completed${first?' · +50 XP':''}${result.output?'\n# Last output:\n'+result.output.trimEnd():''}`,'intro');
  }else{
    $('feedback').classList.toggle('error',!result.ok);
    $('feedback').textContent=result.ok?(free?'Command complete. Keep experimenting.':'Command complete. Check “Success looks like” and continue your objective.'):'Check the terminal error. Try again, or press F1 for a hint. Mistakes cost no points.';
  }
  focusCommand();
});
$('command').addEventListener('keydown',e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();cursor=Math.max(0,Math.min(commands.length,cursor+(e.key==='ArrowUp'?-1:1)));$('command').value=commands[cursor]||'';}});
function showHint(){if(free)return;assisted=true;$('hintText').hidden=false;$('hintText').textContent=lessons[active].hint;$('hintText').scrollIntoView({block:'nearest'});focusCommand();}
$('hint').onclick=showHint;
$('solution').onclick=()=>{solutionUsed=true;const box=$('hintText');box.hidden=false;box.replaceChildren(document.createTextNode('Run one command per line. Guided completion earns 1 star; replay independently to earn 3.'));const code=document.createElement('code');code.textContent=lessons[active].solution.join('\n');box.append(code);box.scrollIntoView({block:'nearest'});focusCommand();};
$('resetLevel').onclick=start;
$('freeTab').onclick=()=>{free=true;start();};$('learnTab').onclick=()=>{free=false;start();};
$('resetProgress').onclick=()=>{if(confirm('Reset all progress, XP, stars, and badges on this device?')){completed.clear();stars={};active=0;free=false;$('reward').className='reward';$('rewardTitle').textContent='Your next skill is one command away.';$('rewardText').textContent='Complete missions to earn XP and restore all four systems.';$('rewardStars').textContent='';start();}};
$('theme').onclick=()=>{document.body.classList.toggle('dark');try{localStorage.setItem('bash-quest-theme',document.body.classList.contains('dark')?'dark':'light');}catch{}focusCommand();};
const reference=[['pwd','Print the current directory path'],['ls [-a] [-l] [directory]','List files; -a includes hidden entries, -l shows illustrative permissions'],['cd [directory]','Change directory. .. means parent; ~ means home'],['cat [file]','Read a file or input from a pipe'],['mkdir [-p] directory','Create a directory. -p also creates missing parent directories'],['touch file','Create an empty file if it does not exist'],['cp source destination','Copy a file; keep the source'],['mv source destination','Move or rename a file'],['rm file','Delete a file — no recycle bin'],['echo "text"','Print text followed by a newline'],['command > file','Write output to a file; overwrite existing contents'],['command >> file','Append output to a file'],['grep [-i] text [file]','Select lines containing plain text. -i ignores case'],['wc -l [file]','Count newline characters'],['head -n 2 [file]','The first two lines'],['tail -n 2 [file]','The last two lines'],['sort [file]','Sort lines'],['uniq [file]','Remove adjacent duplicate lines'],['command | command','Pass output as input to the next command'],['name=value','Store a value in a variable; no spaces around ='],['echo "$name"','Expand a variable inside double quotes'],["echo '$name'",'Literal text; no variable expansion'],['clear','Clear the terminal; keep the files'],['help','List supported commands']];
function guide(){const query=$('search').value.toLowerCase();$('guideList').replaceChildren();reference.filter(x=>x.join(' ').toLowerCase().includes(query)).forEach(([cmd,desc])=>{const row=document.createElement('div');row.className='guide-item';const code=document.createElement('code');code.textContent=cmd;const p=document.createElement('p');p.textContent=desc;row.append(code,p);$('guideList').append(row);});if(!$('guideList').children.length)$('guideList').textContent='No matching commands found.';}
function openGuide(){guide();$('guide').showModal();$('search').focus();}
$('reference').onclick=openGuide;
$('closeGuide').onclick=()=>$('guide').close();$('search').oninput=guide;
$('filesButton').onclick=()=>{$('filesDialog').showModal();};
$('closeFiles').onclick=()=>$('filesDialog').close();
for(const id of ['guide','filesDialog'])$(id).addEventListener('close',focusCommand);
document.addEventListener('keydown',e=>{
  if($('guide').open||$('filesDialog').open)return;
  if(e.key==='F1'){e.preventDefault();showHint();}
  if(e.key==='F2'){e.preventDefault();openGuide();}
  if(e.key==='F3'){e.preventDefault();$('filesDialog').showModal();}
  if(e.altKey&&e.key.toLowerCase()==='r'){e.preventDefault();start();}
  if(e.altKey&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const next=active+(e.key==='ArrowLeft'?-1:1);if(unlocked(next)){active=next;free=false;start();}}
  if(e.key==='Escape')focusCommand();
});
start();
