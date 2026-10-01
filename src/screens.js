import { clamp, lerp, range, ease } from './utils.js';

export const LW = 1280, LH = 800, PW = 540, PH = 1168;

/* ================= conteúdo das telas ================= */
function rr(g,x,y,w,h,r){g.beginPath();g.roundRect(x,y,w,h,r)}
function txt(g,s,x,y,font,color,align='left'){g.font=font;g.fillStyle=color;g.textAlign=align;g.fillText(s,x,y)}

/* --- editor de código (tela inicial do notebook) --- */
const CODE=[
"import { Canvas, useFrame } from '@react-three/fiber'",
"import { useScroll } from '@react-three/drei'",
"",
"// a câmera acompanha a rolagem da página",
"const tomadas = [",
"  { em: 0.00, alvo: 'cena' },",
"  { em: 0.24, alvo: 'notebook' },",
"  { em: 0.72, alvo: 'celular' },",
"]",
"",
"export function Vitrine() {",
"  const rolagem = useScroll()",
"  useFrame(() => camera.voar(tomadas, rolagem.offset))",
"  return <Cena notebook celular />",
"}",
];
const KW=/^(import|from|const|export|function|return)$/;
export function drawCode(g,t){
  g.fillStyle='#0f1218';g.fillRect(0,0,LW,LH);
  g.fillStyle='#0a0c11';g.fillRect(0,0,LW,44);
  ['#ff5f57','#febc2e','#28c840'].forEach((c,i)=>{g.fillStyle=c;g.beginPath();g.arc(26+i*22,22,7,0,7);g.fill()});
  g.fillStyle='#0b0d12';g.fillRect(0,44,230,LH-44);
  txt(g,'EXPLORADOR',22,82,'500 14px JetBrains Mono','#5c6579');
  ['src','  cena.tsx','  vitrine.ts','  loja/','  app/','package.json'].forEach((f,i)=>txt(g,f,22,116+i*30,'400 16px JetBrains Mono',i===2?'#e8ecf3':'#7f889b'));
  g.fillStyle='#151a23';g.fillRect(230,44,170,40);txt(g,'vitrine.ts',252,70,'500 15px JetBrains Mono','#e8ecf3');
  const total=CODE.join('\n').length;let budget=Math.floor((t*44)%(total+160));
  g.font='400 19px JetBrains Mono';g.textAlign='left';
  let cx=0,cy=0;
  CODE.forEach((line,li)=>{
    const y=128+li*34;txt(g,String(li+1).padStart(2,' '),252,y,'400 17px JetBrains Mono','#3c4456');
    let x=300;g.font='400 19px JetBrains Mono';
    const parts=line.split(/(\/\/.*$|'[^']*'|\b\d+\.\d+\b|\b[a-z]+\b)/);
    for(const part of parts){
      if(!part)continue;if(budget<=0)break;
      const vis=part.slice(0,budget);budget-=part.length;
      let col='#d6deeb';
      if(part.startsWith('//'))col='#637089';else if(part.startsWith("'"))col='#c3e88d';else if(/^\d/.test(part))col='#f78c6c';else if(KW.test(part))col='#c792ea';else if(/^[A-Z<]/.test(part))col='#82aaff';
      g.fillStyle=col;g.fillText(vis,x,y);x+=g.measureText(vis).width;cx=x;cy=y;
    }
    budget-=1;
  });
  if(Math.floor(t*2)%2===0){g.fillStyle='#8fb3ff';g.fillRect(cx+2,cy-18,10,22)}
  g.fillStyle='#0a0c11';g.fillRect(230,LH-130,LW-230,130);
  txt(g,'TERMINAL',252,LH-100,'500 13px JetBrains Mono','#5c6579');
  txt(g,'$ npm run build',252,LH-68,'400 17px JetBrains Mono','#d6deeb');
  txt(g,'✓ compilado em 2,1 s · pronto para publicar',252,LH-38,'400 17px JetBrains Mono','#7fd1a3');
}

/* --- tênis estilizado (loja) --- */
function drawShoe(g,cx,cy,sc,c,rot=0){
  g.save();g.translate(cx,cy);g.rotate(rot);g.scale(sc,sc);
  g.fillStyle='rgba(0,0,0,.14)';g.beginPath();g.ellipse(0,78,150,14,0,0,7);g.fill();
  g.fillStyle=c.sole;rr(g,-165,18,330,44,22);g.fill();
  g.fillStyle=c.mid;rr(g,-160,30,320,10,5);g.fill();
  g.fillStyle=c.upper;g.beginPath();g.moveTo(-158,24);
  g.bezierCurveTo(-162,-18,-128,-40,-86,-44);g.lineTo(-28,-50);g.bezierCurveTo(4,-54,14,-92,46,-98);g.lineTo(86,-96);
  g.bezierCurveTo(104,-92,106,-62,116,-42);g.bezierCurveTo(134,-10,170,-2,164,24);g.closePath();g.fill();
  g.fillStyle=c.accent;g.beginPath();g.moveTo(-120,8);g.quadraticCurveTo(-10,-4,90,-56);g.quadraticCurveTo(10,10,-120,20);g.closePath();g.fill();
  g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=5;g.lineCap='round';
  for(let i=0;i<4;i++){g.beginPath();g.moveTo(-10+i*22,-58-i*9);g.lineTo(14+i*22,-50-i*9);g.stroke()}
  g.fillStyle='rgba(255,255,255,.18)';g.beginPath();g.ellipse(-120,-6,34,18,-.2,0,7);g.fill();
  g.restore();
}

/* --- loja virtual --- */
const PRODUCTS=[
  {n:'Vértice Run',p:'R$ 649,90',bg:'#ffe0d1',c:{upper:'#1b1b1d',sole:'#f4f4f4',mid:'#ff5a1f',accent:'#ff5a1f'}},
  {n:'Vértice Trail',p:'R$ 799,90',bg:'#dde8dc',c:{upper:'#2f4a35',sole:'#3a3a3a',mid:'#c8e06a',accent:'#c8e06a'}},
  {n:'Vértice Daily',p:'R$ 499,90',bg:'#e1e5f3',c:{upper:'#3c4a8a',sole:'#ffffff',mid:'#9fb0ff',accent:'#ffffff'}},
  {n:'Vértice Kids',p:'R$ 299,90',bg:'#fbefc8',c:{upper:'#d9480f',sole:'#ffffff',mid:'#ffd43b',accent:'#ffd43b'}},
];
export function drawShop(g,s,t){
  const off=ease(range(s,.3,1))*1150;
  g.fillStyle='#f5f6f8';g.fillRect(0,0,LW,LH);
  g.save();g.translate(0,-off);
  const hg=g.createLinearGradient(0,0,LW,780);hg.addColorStop(0,'#f7f7f9');hg.addColorStop(1,'#eceef2');g.fillStyle=hg;g.fillRect(0,0,LW,780);
  g.letterSpacing='3px';txt(g,'NOVA COLEÇÃO · OUTONO 2026',80,190,'700 17px Archivo','#ff5a1f');g.letterSpacing='0px';
  txt(g,'Corra',80,300,'800 112px Archivo','#111');txt(g,'mais leve.',80,408,'800 112px Archivo','#111');
  txt(g,'Espuma de amortecimento reciclada e cabedal',80,470,'500 22px Manrope','#555');
  txt(g,'respirável. 248 g no número 40.',80,502,'500 22px Manrope','#555');
  txt(g,'R$ 649,90',80,568,'800 40px Archivo','#111');txt(g,'ou 6x de R$ 108,32 sem juros',80,600,'500 18px Manrope','#777');
  const pressed=s>.12&&s<.17;
  g.fillStyle=pressed?'#ff5a1f':'#111';rr(g,80,632,330,72,36);g.fill();
  txt(g,'Adicionar ao carrinho',245,676,'700 22px Manrope','#fff','center');
  const cg=g.createRadialGradient(880,360,30,920,400,290);cg.addColorStop(0,'#ff9a62');cg.addColorStop(1,'#ff5a1f');g.fillStyle=cg;g.beginPath();g.arc(920,400,272,0,7);g.fill();
  drawShoe(g,920,410+Math.sin(t*1.4)*8,1.55,PRODUCTS[0].c,-.08+Math.sin(t*.9)*.03);
  ['#1b1b1d','#2f4a35','#3c4a8a','#d9480f'].forEach((c,i)=>{g.fillStyle=c;g.beginPath();g.arc(830+i*60,730,16,0,7);g.fill();if(!i){g.strokeStyle='#111';g.lineWidth=2;g.beginPath();g.arc(830,730,23,0,7);g.stroke()}});
  g.fillStyle='#111';g.fillRect(0,780,LW,60);
  ['Frete grátis acima de R$ 299','Troca grátis em 30 dias','5% de desconto no Pix'].forEach((s2,i)=>txt(g,s2,213+i*427,817,'600 18px Manrope','#fff','center'));
  txt(g,'Mais vendidos',80,930,'800 44px Archivo','#111');txt(g,'Ver tudo →',1200,928,'700 19px Manrope','#ff5a1f','right');
  PRODUCTS.forEach((pr,i)=>{const x=80+i*285,y=965,w=265;
    g.fillStyle='#fff';rr(g,x,y,w,400,18);g.fill();
    g.fillStyle=pr.bg;rr(g,x+12,y+12,w-24,250,12);g.fill();
    drawShoe(g,x+w/2,y+150,.62,pr.c,-.1);
    txt(g,pr.n,x+20,y+300,'700 21px Manrope','#111');txt(g,pr.p,x+20,y+334,'800 22px Archivo','#111');
    g.fillStyle='#ffb000';for(let k=0;k<5;k++){g.beginPath();g.arc(x+26+k*20,y+366,6,0,7);g.fill()}
    txt(g,'(1.2 mil)',x+128,y+372,'500 15px Manrope','#888');
  });
  g.fillStyle='#111';rr(g,80,1420,1120,360,28);g.fill();
  txt(g,'Monte o seu par',140,1540,'800 62px Archivo','#fff');
  txt(g,'Escolha cor, solado e cadarço.',140,1590,'500 22px Manrope','#b9bcc4');
  txt(g,'Entrega em 5 dias úteis.',140,1622,'500 22px Manrope','#b9bcc4');
  const hue=(t*30)%360;const custom={upper:`hsl(${hue} 55% 38%)`,sole:'#f4f4f4',mid:`hsl(${(hue+40)%360} 80% 60%)`,accent:`hsl(${(hue+40)%360} 80% 60%)`};
  ['#ff5a1f','#c8e06a','#9fb0ff','#ffd43b','#ffffff'].forEach((c,i)=>{g.fillStyle=c;g.beginPath();g.arc(160+i*52,1690,16,0,7);g.fill()});
  drawShoe(g,930,1610,1.05,custom,-.1);
  txt(g,'© 2026 Vértice Calçados · loja demonstrativa',80,1880,'500 16px Manrope','#888');
  g.restore();
  g.fillStyle='rgba(255,255,255,.94)';g.fillRect(0,0,LW,74);g.fillStyle='#e6e7ea';g.fillRect(0,74,LW,1);
  txt(g,'VÉRTICE',80,48,'800 27px Archivo','#111');
  ['Corrida','Trilha','Casual','Ofertas'].forEach((l,i)=>txt(g,l,400+i*120,46,'600 18px Manrope','#333'));
  g.fillStyle='#f0f1f3';rr(g,880,18,230,40,20);g.fill();txt(g,'Buscar',910,44,'500 16px Manrope','#999');
  g.strokeStyle='#111';g.lineWidth=3;rr(g,1150,24,30,26,5);g.stroke();g.beginPath();g.arc(1165,24,8,Math.PI,0);g.stroke();
  const added=s>.16;
  if(added){g.fillStyle='#ff5a1f';g.beginPath();g.arc(1186,22,11,0,7);g.fill();txt(g,'1',1186,28,'800 14px Archivo','#fff','center')}
  const toast=range(s,.16,.2)*(1-range(s,.42,.48));
  if(toast>0){g.save();g.globalAlpha=toast;g.translate(0,(1-toast)*-20);
    g.shadowColor='rgba(0,0,0,.18)';g.shadowBlur=30;g.shadowOffsetY=8;g.fillStyle='#fff';rr(g,880,96,330,80,16);g.fill();g.shadowColor='transparent';
    g.fillStyle='#1fa463';g.beginPath();g.arc(920,136,18,0,7);g.fill();g.strokeStyle='#fff';g.lineWidth=4;g.beginPath();g.moveTo(911,136);g.lineTo(918,143);g.lineTo(930,129);g.stroke();
    txt(g,'Adicionado ao carrinho',952,130,'700 18px Manrope','#111');txt(g,'Vértice Run · número 40',952,156,'500 15px Manrope','#777');g.restore()}
  // cursor
  const m=ease(range(s,.02,.12));let px=lerp(1060,250,m),py=lerp(560,670,m);
  if(s>.2){const m2=ease(range(s,.2,.3));px=lerp(250,1160,m2);py=lerp(670,40,m2)}
  g.save();g.translate(px,py);if(pressed)g.scale(.88,.88);g.fillStyle='#111';g.strokeStyle='#fff';g.lineWidth=2.5;
  g.beginPath();g.moveTo(0,0);g.lineTo(0,30);g.lineTo(8,23);g.lineTo(14,36);g.lineTo(19,34);g.lineTo(13,21);g.lineTo(23,21);g.closePath();g.fill();g.stroke();g.restore();
  if(pressed){g.strokeStyle='rgba(255,90,31,.6)';g.lineWidth=3;g.beginPath();g.arc(250,670,18+range(s,.12,.17)*30,0,7);g.stroke()}
}

/* --- site de destino --- */
function ridge(g,baseY,amp,freq,seed,color,shift){
  g.fillStyle=color;g.beginPath();g.moveTo(0,LH+40);
  for(let x=0;x<=LW;x+=16){const y=baseY+shift+amp*(Math.sin(x*freq+seed)*.6+Math.sin(x*freq*2.3+seed*1.7)*.3+Math.sin(x*freq*5.1+seed*.3)*.1);g.lineTo(x,y)}
  g.lineTo(LW,LH+40);g.closePath();g.fill();
}
function miniScene(g,type,x,y,w,h,t){
  g.save();rr(g,x,y,w,h,14);g.clip();
  if(type==='cachoeira'){
    const sk=g.createLinearGradient(0,y,0,y+h);sk.addColorStop(0,'#a9d3c9');sk.addColorStop(1,'#3f6b5e');g.fillStyle=sk;g.fillRect(x,y,w,h);
    g.fillStyle='#4a3a33';g.beginPath();g.moveTo(x,y+30);g.lineTo(x+w*.4,y+50);g.lineTo(x+w*.42,y+h);g.lineTo(x,y+h);g.fill();
    g.beginPath();g.moveTo(x+w,y+20);g.lineTo(x+w*.58,y+46);g.lineTo(x+w*.56,y+h);g.lineTo(x+w,y+h);g.fill();
    g.fillStyle='#e8f4f6';g.fillRect(x+w*.42,y+48,w*.15,h-80);
    g.strokeStyle='rgba(160,200,210,.9)';g.lineWidth=3;g.setLineDash([14,10]);g.lineDashOffset=-t*60;
    for(let i=0;i<4;i++){g.beginPath();g.moveTo(x+w*.44+i*12,y+48);g.lineTo(x+w*.44+i*12,y+h-30);g.stroke()}
    g.setLineDash([]);g.fillStyle='#7fb3b8';g.beginPath();g.ellipse(x+w/2,y+h-18,w*.42,26,0,0,7);g.fill();
  }else if(type==='canion'){
    const sk=g.createLinearGradient(0,y,0,y+h);sk.addColorStop(0,'#f6c48a');sk.addColorStop(1,'#d77a4c');g.fillStyle=sk;g.fillRect(x,y,w,h);
    g.fillStyle='#8a4b33';g.beginPath();g.moveTo(x,y);g.lineTo(x+w*.44,y+h*.5);g.lineTo(x+w*.36,y+h);g.lineTo(x,y+h);g.fill();
    g.fillStyle='#6d3a28';g.beginPath();g.moveTo(x+w,y+10);g.lineTo(x+w*.55,y+h*.5);g.lineTo(x+w*.64,y+h);g.lineTo(x+w,y+h);g.fill();
    g.strokeStyle='#9fd0e0';g.lineWidth=8;g.beginPath();g.moveTo(x+w*.5,y+h*.5);g.quadraticCurveTo(x+w*.42,y+h*.8,x+w*.5,y+h);g.stroke();
  }else{
    const sk=g.createLinearGradient(0,y,0,y+h);sk.addColorStop(0,'#dbe8f2');sk.addColorStop(1,'#f3efe2');g.fillStyle=sk;g.fillRect(x,y,w,h);
    [['#9fb88a',.55],['#7c9a6b',.7],['#5b7a52',.85]].forEach(([c,f],i)=>{g.fillStyle=c;g.beginPath();g.moveTo(x,y+h);
      for(let k=0;k<=w;k+=10)g.lineTo(x+k,y+h*f+Math.sin(k*.02+i*2)*16);g.lineTo(x+w,y+h);g.fill()});
    g.strokeStyle='#f3efe2';g.lineWidth=3;g.setLineDash([6,8]);g.beginPath();g.moveTo(x+20,y+h-10);g.bezierCurveTo(x+w*.3,y+h*.7,x+w*.6,y+h*.85,x+w-30,y+h*.6);g.stroke();g.setLineDash([]);
  }
  g.restore();
}
export function drawTravel(g,s,t){
  const off=ease(range(s,.12,1))*1260;
  g.fillStyle='#f2f4ef';g.fillRect(0,0,LW,LH);
  g.save();g.translate(0,-off);
  const sky=g.createLinearGradient(0,0,0,800);sky.addColorStop(0,'#1f3557');sky.addColorStop(.45,'#5f7fa8');sky.addColorStop(.8,'#f0b47e');sky.addColorStop(1,'#f6d6a8');
  g.fillStyle=sky;g.fillRect(0,0,LW,820);
  const sun=g.createRadialGradient(900,470,10,900,470,220);sun.addColorStop(0,'rgba(255,244,214,1)');sun.addColorStop(.25,'rgba(255,230,180,.8)');sun.addColorStop(1,'rgba(255,220,160,0)');
  g.fillStyle=sun;g.fillRect(600,200,600,540);
  g.save();g.beginPath();g.rect(0,0,LW,820);g.clip();
  ridge(g,520,60,.006,1,'#b47c6b',off*.5);ridge(g,590,70,.005,4,'#7c5a64',off*.38);ridge(g,665,58,.007,2,'#4a3e52',off*.24);ridge(g,748,36,.009,7,'#242534',off*.1);
  g.restore();
  g.shadowColor='rgba(0,0,0,.35)';g.shadowBlur=24;
  txt(g,'Serra do Cipó',80,320,'600 104px Fraunces','#fff');g.shadowBlur=0;g.shadowColor='transparent';
  txt(g,'Cachoeiras, cânions e campos rupestres',82,378,'500 26px Manrope','rgba(255,255,255,.92)');
  txt(g,'a cerca de 100 km de Belo Horizonte.',82,414,'500 26px Manrope','rgba(255,255,255,.92)');
  g.fillStyle='rgba(255,255,255,.95)';rr(g,80,456,640,78,39);g.fill();
  txt(g,'Quando você vai?',120,503,'600 19px Manrope','#334');g.fillStyle='#d9ddd5';g.fillRect(330,474,1,42);
  txt(g,'2 hóspedes',360,503,'600 19px Manrope','#334');
  g.fillStyle='#24452f';rr(g,560,466,148,58,29);g.fill();txt(g,'Buscar',634,502,'700 19px Manrope','#fff','center');
  g.fillStyle='#f2f4ef';g.fillRect(0,820,LW,1300);
  txt(g,'Para onde ir',80,915,'600 56px Fraunces','#1d2a22');
  [['cachoeira','Cachoeira Grande','Trilha leve · banho liberado'],['canion','Cânion das Bandeirinhas','Trilha moderada · paredões de pedra'],['trilha','Travessia Lapinha–Tabuleiro','Três dias · campos de altitude']]
  .forEach(([ty,n,m],i)=>{const x=80+i*380,y=955;g.fillStyle='#fff';rr(g,x,y,360,430,20);g.fill();miniScene(g,ty,x+12,y+12,336,260,t);
    txt(g,n,x+24,y+318,'600 27px Fraunces','#1d2a22');txt(g,m,x+24,y+352,'500 17px Manrope','#667066');
    txt(g,'Ver roteiro →',x+24,y+400,'700 17px Manrope','#24452f')});
  g.fillStyle='#e4eadf';rr(g,80,1450,1120,440,24);g.fill();
  g.save();rr(g,80,1450,1120,440,24);g.clip();g.strokeStyle='rgba(36,69,47,.16)';g.lineWidth=2;
  for(let k=0;k<12;k++){g.beginPath();for(let x=80;x<=1200;x+=12){const y=1500+k*36+Math.sin(x*.008+k*.7)*22+Math.sin(x*.021+k)*8;x===80?g.moveTo(x,y):g.lineTo(x,y)}g.stroke()}
  g.strokeStyle='#d9480f';g.lineWidth=5;g.setLineDash([2,14]);g.lineCap='round';g.lineDashOffset=-t*30;
  g.beginPath();g.moveTo(560,1780);g.bezierCurveTo(700,1640,820,1760,920,1620);g.bezierCurveTo(990,1530,1080,1600,1120,1540);g.stroke();g.setLineDash([]);
  [[560,1780,'Cachoeira Grande'],[920,1620,'Cânion'],[1120,1540,'Mirante']].forEach(([x,y,l])=>{g.fillStyle='#24452f';g.beginPath();g.arc(x,y,13,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.arc(x,y,5,0,7);g.fill();txt(g,l,x,y-24,'700 16px Manrope','#24452f','center')});
  g.restore();
  g.fillStyle='#fff';rr(g,110,1480,360,380,18);g.fill();
  txt(g,'Roteiro de 3 dias',140,1532,'600 30px Fraunces','#1d2a22');
  [['Dia 1','Cachoeira Grande e vila'],['Dia 2','Cânion das Bandeirinhas'],['Dia 3','Mirantes e campos rupestres']].forEach(([d,l],i)=>{
    txt(g,d.toUpperCase(),140,1590+i*80,'700 14px Manrope','#d9480f');txt(g,l,140,1618+i*80,'600 19px Manrope','#334')});
  txt(g,'Melhor época: abril a setembro, na estação seca.',80,1950,'500 18px Manrope','#667066');
  g.restore();
  const solid=range(off,420,560);
  g.fillStyle=`rgba(242,244,239,${solid*.96})`;g.fillRect(0,0,LW,74);
  const navC=solid>.5?'#1d2a22':'#fff';
  txt(g,'cipó',80,50,'italic 500 34px Fraunces',navC);
  ['Roteiros','Onde ficar','Agenda','Contato'].forEach((l,i)=>txt(g,l,560+i*130,46,'600 18px Manrope',navC));
  g.fillStyle=solid>.5?'#24452f':'rgba(255,255,255,.95)';rr(g,1070,18,130,40,20);g.fill();
  txt(g,'Reservar',1135,44,'700 17px Manrope',solid>.5?'#fff':'#1d2a22','center');
}

/* --- celular: tela de bloqueio --- */
function island(g){g.fillStyle='#000';rr(g,PW/2-66,24,132,38,19);g.fill()}
function statusBar(g,c){txt(g,'9:41',56,54,'700 22px Manrope',c);g.fillStyle=c;rr(g,PW-92,38,40,18,5);g.fill();for(let i=0;i<4;i++)g.fillRect(PW-150+i*9,54-6-i*3,6,6+i*3)}
export function drawLock(g,t){
  const bg=g.createLinearGradient(0,0,PW,PH);bg.addColorStop(0,'#0f2a33');bg.addColorStop(.55,'#1d5a57');bg.addColorStop(1,'#e2a46a');g.fillStyle=bg;g.fillRect(0,0,PW,PH);
  g.fillStyle='rgba(255,255,255,.07)';g.beginPath();g.arc(420+Math.sin(t*.4)*20,300,220,0,7);g.fill();g.beginPath();g.arc(80,900,260,0,7);g.fill();
  statusBar(g,'#fff');island(g);
  txt(g,'quinta-feira, 1 de outubro',PW/2,190,'600 26px Manrope','rgba(255,255,255,.85)','center');
  txt(g,'9:41',PW/2,330,'700 150px Bricolage Grotesque','#fff','center');
  g.fillStyle='rgba(255,255,255,.2)';rr(g,28,500,PW-56,124,28);g.fill();
  g.fillStyle='#ff7a45';rr(g,50,524,52,52,13);g.fill();g.strokeStyle='#fff';g.lineWidth=4;g.beginPath();g.arc(76,550,13,0,5.2);g.stroke();
  txt(g,'RITMO',118,540,'700 17px Manrope','rgba(255,255,255,.8)');txt(g,'agora',PW-50,540,'500 16px Manrope','rgba(255,255,255,.7)','right');
  txt(g,'Hora de alongar',118,572,'700 21px Manrope','#fff');txt(g,'Cinco minutos já fazem diferença.',118,600,'500 18px Manrope','rgba(255,255,255,.85)');
  [[90,'#fff'],[PW-90,'#fff']].forEach(([x])=>{g.fillStyle='rgba(255,255,255,.18)';g.beginPath();g.arc(x,PH-110,36,0,7);g.fill()});
  g.fillStyle='rgba(255,255,255,.8)';rr(g,PW/2-70,PH-26,140,6,3);g.fill();
}

/* --- celular: app --- */
export function drawApp(g,s,t){
  const off=ease(range(s,.25,1))*760;
  g.fillStyle='#f4f5f1';g.fillRect(0,0,PW,PH);
  g.save();g.translate(0,-off);
  txt(g,'QUINTA, 1 DE OUTUBRO',36,148,'700 15px Manrope','#8a9085');
  txt(g,'Bom dia, Ana',36,196,'700 44px Bricolage Grotesque','#16201a');
  g.fillStyle='#ffd8c4';g.beginPath();g.arc(PW-64,172,30,0,7);g.fill();txt(g,'A',PW-64,182,'700 26px Manrope','#b4471c','center');
  g.fillStyle='#fff';rr(g,24,230,PW-48,330,32);g.fill();
  const fill=ease(range(s,0,.3));
  const rings=[[100,'#ff7a45',.82],[74,'#2f6b4f',.64],[48,'#4c7fd9',.9]];
  rings.forEach(([r,c,f])=>{g.lineWidth=20;g.lineCap='round';g.strokeStyle=c+'26';g.beginPath();g.arc(150,395,r,0,7);g.stroke();
    g.strokeStyle=c;g.beginPath();g.arc(150,395,r,-Math.PI/2,-Math.PI/2+Math.PI*2*f*Math.max(.02,fill));g.stroke()});
  [['Mover',`${Math.round(412*fill)}/500 kcal`,'#ff7a45'],['Exercício',`${Math.round(26*fill)}/40 min`,'#2f6b4f'],['Em pé',`${Math.round(9*fill)}/10 h`,'#4c7fd9']].forEach(([l,v,c],i)=>{
    const y=320+i*74;g.fillStyle=c;g.beginPath();g.arc(298,y-6,7,0,7);g.fill();txt(g,l,316,y,'600 18px Manrope','#6c736a');txt(g,v,298,y+30,'700 24px Manrope','#16201a')});
  g.fillStyle='#fff';rr(g,24,584,PW-48,300,32);g.fill();
  txt(g,'Passos na semana',52,636,'700 22px Manrope','#16201a');txt(g,'7.842 hoje',PW-52,636,'700 18px Manrope','#2f6b4f','right');
  const bars=[.52,.74,.46,.9,.63,.81,.78*fill];
  ['S','T','Q','Q','S','S','D'].forEach((d,i)=>{const x=56+i*62,h=170*bars[i];g.fillStyle=i===6?'#2f6b4f':'#dfe5dc';rr(g,x,840-h,36,h,10);g.fill();txt(g,d,x+18,868,'600 15px Manrope','#8a9085','center')});
  txt(g,'Para hoje',36,940,'700 30px Bricolage Grotesque','#16201a');
  [['Corrida leve','30 min · zona 2','#ff7a45'],['Mobilidade','15 min · quadril e coluna','#4c7fd9'],['Força','40 min · membros inferiores','#2f6b4f']].forEach(([n,m,c],i)=>{
    const y=966+i*146;g.fillStyle='#fff';rr(g,24,y,PW-48,128,26);g.fill();g.fillStyle=c;rr(g,46,y+28,72,72,20);g.fill();
    g.fillStyle='#fff';g.beginPath();g.arc(82,y+64,14,0,7);g.fill();
    txt(g,n,138,y+58,'700 24px Manrope','#16201a');txt(g,m,138,y+90,'500 17px Manrope','#7a8077');
    g.fillStyle='#16201a';g.beginPath();g.arc(PW-74,y+64,24,0,7);g.fill();g.fillStyle='#fff';g.beginPath();g.moveTo(PW-80,y+52);g.lineTo(PW-64,y+64);g.lineTo(PW-80,y+76);g.fill()});
  g.fillStyle='#16201a';rr(g,24,1420,PW-48,220,32);g.fill();
  txt(g,'Sono',52,1470,'700 22px Manrope','#9fb3a6');txt(g,'7 h 12 min',52,1520,'700 40px Bricolage Grotesque','#fff');
  for(let i=0;i<22;i++){const h=20+Math.abs(Math.sin(i*1.7))*60;g.fillStyle=i%5===0?'#ff7a45':'#4c7fd9';rr(g,52+i*19,1610-h,12,h,4);g.fill()}
  g.restore();
  g.fillStyle='rgba(244,245,241,.96)';g.fillRect(0,0,PW,96);statusBar(g,'#16201a');island(g);
  g.fillStyle='#fff';g.fillRect(0,PH-118,PW,118);g.fillStyle='#e3e6df';g.fillRect(0,PH-118,PW,1);
  ['Hoje','Treinos','Progresso','Perfil'].forEach((l,i)=>{const x=68+i*135;g.fillStyle=i===0?'#2f6b4f':'#a6aca2';rr(g,x-14,PH-96,28,28,8);g.fill();txt(g,l,x,PH-48,'600 15px Manrope',i===0?'#2f6b4f':'#8a9085','center')});
  g.fillStyle='#16201a';rr(g,PW/2-70,PH-20,140,6,3);g.fill();
  const tap=range(s,.42,.5);if(tap>0&&tap<1){const y=966+64-off;g.strokeStyle=`rgba(22,32,26,${.5*(1-tap)})`;g.lineWidth=4;g.beginPath();g.arc(PW-74,y,24+tap*40,0,7);g.stroke()}
  const ban=range(s,.55,.6)*(1-range(s,.84,.9));
  if(ban>0){g.save();g.translate(0,(1-ban)*-160);g.shadowColor='rgba(0,0,0,.25)';g.shadowBlur=30;g.fillStyle='#16201a';rr(g,20,74,PW-40,110,28);g.fill();g.shadowColor='transparent';
    g.fillStyle='#ff7a45';rr(g,42,100,56,56,14);g.fill();g.strokeStyle='#fff';g.lineWidth=4;g.beginPath();g.moveTo(58,128);g.lineTo(67,137);g.lineTo(83,119);g.stroke();
    txt(g,'Meta atingida',116,122,'700 21px Manrope','#fff');txt(g,'Você passou de 10.000 passos hoje.',116,152,'500 17px Manrope','#b8c2bb');g.restore()}
}
