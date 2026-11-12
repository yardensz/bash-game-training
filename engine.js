// An intentionally bounded teaching simulator, never a host shell.
export const HOME = '/home/student';
export const COMMANDS = ['pwd','ls','cd','cat','mkdir','touch','cp','mv','rm','echo','grep','wc','head','tail','sort','uniq','clear','help'];
export class Shell {
  constructor() {
    this.cwd = HOME;
    this.vars = {HOME, USER: 'student'};
    this.fs = new Map([['/',null],['/home',null],[HOME,null],
      [HOME+'/missions',null],[HOME+'/archive',null],
      [HOME+'/welcome.txt','Welcome, explorer!\nYour mission starts here.\n'],
      [HOME+'/.secret','The hidden door is open.\n'],
      [HOME+'/missions/crew.txt','Maya\nNoam\nMaya\nYarden\n'],
      [HOME+'/missions/log.txt','INFO launch ready\nERROR antenna offline\nINFO fuel ready\nERROR signal lost\n'],
      [HOME+'/missions/notes.txt','learn\npractice\nrepeat\n']]);
  }
  path(p='~') {
    if(p==='~'||p.startsWith('~/')) p=HOME+p.slice(1);
    const out=[];
    for(const bit of (p.startsWith('/')?p:this.cwd+'/'+p).split('/')) {
      if(bit==='..')out.pop(); else if(bit&&bit!=='.')out.push(bit);
    }
    return '/'+out.join('/');
  }
  read(p){const k=this.path(p); if(!this.fs.has(k))throw Error(`${p}: No such file or directory`); if(this.fs.get(k)===null)throw Error(`${p}: Is a directory`); return this.fs.get(k);}
  parent(p){return p.slice(0,p.lastIndexOf('/'))||'/';}
  write(p,v){const k=this.path(p);if(this.fs.get(this.parent(k))!==null)throw Error(`${p}: parent directory does not exist`);if(this.fs.get(k)===null)throw Error(`${p}: Is a directory`);this.fs.set(k,v);}
  // Quote-aware lexer: operators inside quotes remain literal; single quotes disable expansion.
  tokens(line){
    const ts=[]; let word='', active=false, quote=null;
    const flush=()=>{if(active){ts.push({v:word,op:false});word='';active=false;}};
    for(let i=0;i<line.length;i++){
      const c=line[i];
      if(c==='\\'&&quote!=="'"){if(i+1===line.length)throw Error('Missing character after \\');const next=line[++i];if(quote==='"'&&!['$','"','\\'].includes(next))word+='\\';word+=next;active=true;continue;}
      if(quote){if(c===quote){quote=null;continue;}}
      else {
        if(c==='"'||c==="'"){quote=c;active=true;continue;}
        if(/\s/.test(c)){flush();continue;}
        if(c==='#'&&!active)break;
        if('|><;&'.includes(c)){flush();let v=c;if(line[i+1]===c){v+=c;i++;}ts.push({v,op:true});continue;}
      }
      if(c==='$'&&quote!=="'"){
        const m=line.slice(i).match(/^\$(?:\{([A-Za-z_][\w]*)\}|([A-Za-z_][\w]*))/);
        if(m){word+=this.vars[m[1]||m[2]]||'';i+=m[0].length-1;active=true;continue;}
      }
      word+=c;active=true;
    }
    if(quote)throw Error('Unclosed quote. Add a matching quote at the end of the text.');flush();return ts;
  }
  run(line){
    const events=[];let output='';
    try {
      const ts=this.tokens(line);
      if(ts.some(t=>t.op&&!['|','>','>>'].includes(t.v)))throw Error('This operator is not supported in the simulator. Use one command per line, |, or >.');
      const segments=[[]];for(const t of ts){if(t.op&&t.v==='|')segments.push([]);else segments.at(-1).push(t);}
      if(!ts.length)return {output:'',events,ok:true};
      if(segments.some(s=>!s.length))throw Error('Missing command before or after |.');
      for(let si=0;si<segments.length;si++){
        const s=segments[si];const ri=s.findIndex(t=>t.op);let redirect=null;
        if(ri>=0){if(ri===0||s.length!==ri+2||s[ri+1].op)throw Error('Redirection syntax: command > file');redirect={mode:s[ri].v,file:s[ri+1].v};s.splice(ri);}
        const args=s.map(t=>t.v);const cmd=args.shift();
        if(/^[A-Za-z_]\w*=/.test(cmd)&&!args.length){const n=cmd.indexOf('=');this.vars[cmd.slice(0,n)]=cmd.slice(n+1);output='';events.push({cmd:'assign',name:cmd.slice(0,n)});}
        else {output=this.execute(cmd,args,si?output:null);events.push({cmd,args,cwd:this.cwd,output});}
        if(redirect){this.write(redirect.file,(redirect.mode==='>>'&&this.fs.has(this.path(redirect.file))?this.read(redirect.file):'')+output);events.push({cmd:redirect.mode,path:this.path(redirect.file)});output='';}
      }
      return {output,events,ok:true,piped:segments.length>1};
    }catch(e){return {output:e.message,events,ok:false};}
  }
  execute(cmd,args,input){
    const exact=n=>{if(args.length!==n)throw Error(`${cmd}: expected ${n} argument(s)`);};
    const lines=s=>s===''?[]:s.replace(/\n$/,'').split('\n');
    const text=files=>files.length?files.map(p=>this.read(p)).join(''):(input??'');
    const flagless=()=>{if(args.some(a=>a.startsWith('-')))throw Error(`${cmd}: this option is not supported in the simulator`);};
    switch(cmd){
      case 'pwd':exact(0);return this.cwd+'\n';
      case 'cd':if(args.length>1)throw Error('cd: too many arguments');{const p=this.path(args[0]);if(!this.fs.has(p))throw Error(`cd: ${args[0]}: No such file or directory`);if(this.fs.get(p)!==null)throw Error(`${args[0]}: Not a directory`);this.cwd=p;return '';}
      case 'ls':{
        const flags=args.filter(a=>a.startsWith('-'));if(flags.some(f=>!/^-[al]+$/.test(f)))throw Error('ls: supported options: -a, -l, -la');
        const targets=args.filter(a=>!a.startsWith('-'));if(targets.length>1)throw Error('ls: one directory at a time in this simulator');
        const p=this.path(targets[0]||'.');if(!this.fs.has(p))throw Error(`${p}: No such file or directory`);
        if(this.fs.get(p)!==null)return p.split('/').at(-1)+'\n';
        const all=flags.join('').includes('a'),long=flags.join('').includes('l');
        return [...this.fs.keys()].filter(k=>k!==p&&this.parent(k)===p&&(all||!k.split('/').at(-1).startsWith('.'))).sort().map(k=>(long?(this.fs.get(k)===null?'drwxr-xr-x  ':'-rw-r--r--  '):'')+k.split('/').at(-1)).join('\n')+'\n';
      }
      case 'cat':flagless();return text(args);
      case 'mkdir':{
        const recursive=args[0]==='-p';const names=recursive?args.slice(1):args;if(!names.length)throw Error('mkdir: missing directory');
        for(const name of names){if(name.startsWith('-'))throw Error('mkdir: supported option: -p');const p=this.path(name);if(this.fs.has(p)){if(recursive&&this.fs.get(p)===null)continue;throw Error(`${name}: File exists`);}
          if(recursive){let current='';for(const bit of p.split('/').filter(Boolean)){current+='/'+bit;if(this.fs.has(current)&&this.fs.get(current)!==null)throw Error(`${current}: Not a directory`);this.fs.set(current,null);}}
          else {if(this.fs.get(this.parent(p))!==null)throw Error('parent directory does not exist');this.fs.set(p,null);}}
        return '';
      }
      case 'touch':flagless();if(!args.length)throw Error('touch: missing file');for(const a of args)if(!this.fs.has(this.path(a)))this.write(a,'');return '';
      case 'cp':case 'mv':{
        flagless();exact(2);const source=this.path(args[0]);let dest=this.path(args[1]);const value=this.read(source);if(this.fs.get(dest)===null)dest+='/'+source.split('/').at(-1);if(source===dest)throw Error('source and destination are the same file');this.write(dest,value);if(cmd==='mv')this.fs.delete(source);return '';
      }
      case 'rm':flagless();if(!args.length)throw Error('rm: missing file');for(const a of args){this.read(a);this.fs.delete(this.path(a));}return '';
      case 'echo':if(args[0]?.startsWith('-'))throw Error('echo: options are not supported in this simulator');return args.join(' ')+'\n';
      case 'grep':{
        const insensitive=args[0]==='-i';if(insensitive)args=args.slice(1);if(!args.length)throw Error('grep: missing pattern');if(args[0].startsWith('-'))throw Error('grep: supported option: -i');const pattern=args[0];
        if(/[\\[\]{}()*+?^$|]/.test(pattern))throw Error('The simulator supports plain-text grep searches only, not regular expressions.');
        const source=text(args.slice(1));return lines(source).filter(l=>insensitive?l.toLowerCase().includes(pattern.toLowerCase()):l.includes(pattern)).map(l=>l+'\n').join('');
      }
      case 'wc':if(args[0]!=='-l')throw Error('Use wc -l to count lines in this simulator.');{const files=args.slice(1);if(files.length>1)throw Error('wc: use one file at a time');const s=text(files);return String((s.match(/\n/g)||[]).length)+(files.length?' '+files[0]:'')+'\n';}
      case 'head':case 'tail':{let n=10;if(args[0]==='-n'){if(!/^\d+$/.test(args[1]||''))throw Error('expected a nonnegative count after -n');n=Number(args[1]);args=args.slice(2);}if(args.some(a=>a.startsWith('-')))throw Error('supported option: -n');const ls=lines(text(args));return (cmd==='head'?ls.slice(0,n):n?ls.slice(-n):[]).map(l=>l+'\n').join('');}
      case 'sort':flagless();return lines(text(args)).sort().map(l=>l+'\n').join('');
      case 'uniq':flagless();return lines(text(args)).filter((l,i,ls)=>i===0||l!==ls[i-1]).map(l=>l+'\n').join('');
      case 'clear':exact(0);return '';
      case 'help':return COMMANDS.join('  ')+'\n';
      default:throw Error(`${cmd}: command not found\nCheck capitalization and spaces. Type help for supported commands.`);
    }
  }
}
