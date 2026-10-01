import * as THREE from 'three';
import './style.css';
import { clamp, lerp, range, ease, reduce } from './utils.js';
import { LW, LH, PW, PH, drawCode, drawShop, drawTravel, drawLock, drawApp } from './screens.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

/* ---------- UI (funciona mesmo sem WebGL) ---------- */
const maxScroll=()=>Math.max(1,document.documentElement.scrollHeight-innerHeight);
const goTo=p=>scrollTo({top:p*maxScroll(),behavior:reduce?'auto':'smooth'});
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>goTo(+b.dataset.go)));
document.querySelectorAll('#rail button').forEach(b=>b.addEventListener('click',()=>goTo(+b.dataset.p)));
document.getElementById('showMail').addEventListener('click',()=>{document.getElementById('mail').hidden=false});
document.getElementById('copyMail').addEventListener('click',async e=>{
  const t=document.getElementById('mailText').textContent;
  try{await navigator.clipboard.writeText(t);e.target.textContent='Copiado'}
  catch{const r=document.createRange();r.selectNodeContents(document.getElementById('mailText'));const s=getSelection();s.removeAllRanges();s.addRange(r);e.target.textContent='Selecionado'}
});

/* ---------- renderer ---------- */
const canvas=document.getElementById('stage');
let renderer;
try{
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
}catch(err){document.documentElement.classList.add('nowebgl');throw err}
const isSmall=Math.min(innerWidth,innerHeight)<700;
renderer.setPixelRatio(Math.min(devicePixelRatio,isSmall?1.5:1.75));
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.0;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;

const scene=new THREE.Scene();
scene.background=new THREE.Color(0x030405);
scene.fog=new THREE.Fog(0x030405,13,28);
const pmrem=new THREE.PMREMGenerator(renderer);
scene.environment=pmrem.fromScene(new RoomEnvironment(),0.04).texture;

const camera=new THREE.PerspectiveCamera(35,innerWidth/innerHeight,0.05,60);

/* luzes */
scene.add(new THREE.HemisphereLight(0xbfd2ff,0x030405,0.12));
const key=new THREE.DirectionalLight(0xffffff,1.25);
key.position.set(-4,7,5);key.castShadow=true;
key.shadow.mapSize.set(2048,2048);
Object.assign(key.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:1,far:20});
key.shadow.radius=6;key.shadow.bias=-0.0004;
scene.add(key);
const rim=new THREE.DirectionalLight(0x8fb3ff,1.6);rim.position.set(4,3,-6);scene.add(rim);
const lapGlow=new THREE.PointLight(0x6e8bff,1.1,4,2);scene.add(lapGlow);
const phoneGlow=new THREE.PointLight(0x4fb0a5,1.6,4,2);scene.add(phoneGlow);

/* chão e fundo */
// chão invisível: só recebe as sombras, o fundo continua preto
const ground=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.ShadowMaterial({opacity:.6}));
ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
function glowTexture(){const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d');
  const r=g.createRadialGradient(128,128,0,128,128,128);r.addColorStop(0,'rgba(143,179,255,0.55)');r.addColorStop(.5,'rgba(143,179,255,0.12)');r.addColorStop(1,'rgba(143,179,255,0)');
  g.fillStyle=r;g.fillRect(0,0,256,256);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
const halo=new THREE.Mesh(new THREE.PlaneGeometry(18,10),new THREE.MeshBasicMaterial({map:glowTexture(),transparent:true,depthWrite:false,fog:false}));
halo.position.set(0.6,2.6,-7);  // halo azul desligado: fundo todo escuro

/* ---------- texturas de tela (canvas) ---------- */
function canvasTex(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const tex=new THREE.CanvasTexture(c);
  tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();return {c,ctx:c.getContext('2d'),tex}}
const lap=canvasTex(LW,LH),lapB=canvasTex(LW,LH),ph=canvasTex(PW,PH),phB=canvasTex(PW,PH);

/* ---------- notebook ---------- */
const alu=new THREE.MeshStandardMaterial({color:0x9aa1ad,metalness:.85,roughness:.32});
const black=new THREE.MeshStandardMaterial({color:0x050608,metalness:.2,roughness:.18});
const laptop=new THREE.Group();laptop.position.set(-0.85,0,0);laptop.rotation.y=0.2;scene.add(laptop);
const base=new THREE.Mesh(new RoundedBoxGeometry(3.0,0.11,2.04,4,0.05),alu);base.position.y=0.055;base.castShadow=base.receiveShadow=true;laptop.add(base);
function keyboardTexture(){const c=document.createElement('canvas');c.width=1024;c.height=384;const g=c.getContext('2d');
  g.fillStyle='#1a1d23';g.fillRect(0,0,1024,384);const rows=[14,14,13,12,11];let y=18;
  rows.forEach((n,ri)=>{const kw=(1024-36-(n-1)*8)/n;for(let i=0;i<n;i++){g.fillStyle='#0b0d11';g.beginPath();g.roundRect(18+i*(kw+8),y,kw,52,7);g.fill()}y+=62});
  g.fillStyle='#0b0d11';g.beginPath();g.roundRect(300,y,424,40,7);g.fill();
  const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t}
const deck=new THREE.Mesh(new THREE.PlaneGeometry(2.62,0.98),new THREE.MeshStandardMaterial({map:keyboardTexture(),roughness:.7,metalness:.1}));
deck.rotation.x=-Math.PI/2;deck.position.set(0,0.1112,-0.3);laptop.add(deck);
const pad=new THREE.Mesh(new THREE.PlaneGeometry(1.05,0.6),new THREE.MeshStandardMaterial({color:0x8c939f,metalness:.7,roughness:.22}));
pad.rotation.x=-Math.PI/2;pad.position.set(0,0.111,0.56);laptop.add(pad);
let hinge=new THREE.Group();hinge.position.set(0,0.146,-0.98);laptop.add(hinge);
const lid=new THREE.Mesh(new RoundedBoxGeometry(3.0,1.96,0.07,4,0.034),alu);lid.position.set(0,0.98,0);lid.castShadow=true;hinge.add(lid);
const bezel=new THREE.Mesh(new THREE.PlaneGeometry(2.92,1.88),black);bezel.position.set(0,0.98,0.0352);hinge.add(bezel);
let lapScreen=new THREE.Mesh(new THREE.PlaneGeometry(2.74,1.7125),new THREE.MeshBasicMaterial({map:lap.tex,toneMapped:false}));
lapScreen.position.set(0,1.0,0.0358);hinge.add(lapScreen);
const LID_CLOSED=1.53,LID_OPEN=-0.2;

/* ---------- celular ---------- */
function roundedShape(w,h,r){const s=new THREE.Shape(),x=-w/2,y=-h/2;
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s}
const phone=new THREE.Group();phone.position.set(2.3,0,0.45);phone.rotation.set(-0.08,-0.4,0);scene.add(phone);
const bodyGeo=new THREE.ExtrudeGeometry(roundedShape(0.8,1.66,0.13),{depth:0.05,bevelEnabled:true,bevelThickness:0.014,bevelSize:0.014,bevelSegments:5,curveSegments:20});
bodyGeo.center();
const phoneBody=new THREE.Mesh(bodyGeo,new THREE.MeshStandardMaterial({color:0x2a2f38,metalness:.8,roughness:.3}));
phoneBody.position.y=0.88;phoneBody.castShadow=true;phone.add(phoneBody);
const glassGeo=new THREE.ShapeGeometry(roundedShape(0.79,1.65,0.125),20);
const phoneGlass=new THREE.Mesh(glassGeo,black);phoneGlass.position.set(0,0.88,0.0391);phone.add(phoneGlass);
const SW=0.74,SH=1.6;
const scrGeo=new THREE.ShapeGeometry(roundedShape(SW,SH,0.1),20);
{const pos=scrGeo.attributes.position,uv=scrGeo.attributes.uv;for(let i=0;i<pos.count;i++)uv.setXY(i,(pos.getX(i)+SW/2)/SW,(pos.getY(i)+SH/2)/SH);uv.needsUpdate=true}
let phoneScreen=new THREE.Mesh(scrGeo,new THREE.MeshBasicMaterial({map:ph.tex,toneMapped:false}));
phoneScreen.position.set(0,0.88,0.0395);phone.add(phoneScreen);
const puck=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.46,0.05,48),new THREE.MeshStandardMaterial({color:0x1a1e26,metalness:.6,roughness:.35}));
puck.position.set(0,0.025,-0.05);puck.receiveShadow=puck.castShadow=true;phone.add(puck);

/* --- composição com transição suave --- */
function compose(main,buf,drawA,drawB,mix){
  drawA(main.ctx);
  if(mix>0){drawB(buf.ctx);main.ctx.globalAlpha=mix;main.ctx.drawImage(buf.c,0,0);main.ctx.globalAlpha=1}
  main.tex.needsUpdate=true;
}

/* ---------- modelos do Blender (public/models) ----------
   Enquanto os .glb carregam, a cena mostra os aparelhos simples acima.
   Quando chegam, substituem a geometria provisória. Se falharem, ela fica. */
const BASE=import.meta.env.BASE_URL;
const draco=new DRACOLoader().setDecoderPath(BASE+'draco/');
const gltf=new GLTFLoader().setDRACOLoader(draco);
const acharTela=root=>{let m=null;root.traverse(o=>{if(!m&&o.isMesh&&/^screen/i.test(o.name))m=o});return m};
function prepararModelo(root){
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material)o.material.envMapIntensity=1.1}});
}
function aplicarTela(mesh,tex){
  tex.flipY=false;tex.needsUpdate=true;              // UV do glTF tem a origem no topo
  mesh.material=new THREE.MeshBasicMaterial({map:tex,toneMapped:false});
}
gltf.loadAsync(BASE+'models/notebook.glb').then(({scene:m})=>{
  const tela=acharTela(m),pivo=m.getObjectByName('LidPivot');
  if(!tela||!pivo)throw new Error('notebook.glb sem "screen" ou "LidPivot"');
  prepararModelo(m);aplicarTela(tela,lap.tex);
  laptop.clear();laptop.add(m);
  pivo.rotation.x=hinge.rotation.x;hinge=pivo;lapScreen=tela;
}).catch(e=>console.warn('Notebook provisório mantido:',e.message));
/* ---------- celular no suporte dobrável ----------
   O suporte fica parado; o celular é um objeto solto (phoneRig) que sai do encaixe
   (Empty "PhoneSlot" do suporte.glb) e vem até a câmera como se alguém o pegasse. */
let phoneRig=null,phoneFocus=null;
const pick={restPos:new THREE.Vector3(),restQuat:new THREE.Quaternion(),held:new THREE.Object3D(),
  liftPos:new THREE.Vector3(),pos:new THREE.Vector3(),quat:new THREE.Quaternion(),sway:new THREE.Quaternion(),e:new THREE.Euler()};
scene.add(pick.held);
Promise.all([gltf.loadAsync(BASE+'models/celular.glb'),gltf.loadAsync(BASE+'models/suporte.glb')]).then(([c,sp])=>{
  const cel=c.scene,sup=sp.scene,tela=acharTela(cel),slot=sup.getObjectByName('PhoneSlot');
  if(!tela||!slot)throw new Error('celular.glb sem "screen" ou suporte.glb sem "PhoneSlot"');
  prepararModelo(cel);prepararModelo(sup);aplicarTela(tela,ph.tex);
  scene.remove(phone);                                    // sai o celular provisório
  sup.position.copy(phone.position).setY(0);sup.rotation.y=phone.rotation.y;scene.add(sup);
  sup.updateMatrixWorld(true);
  slot.matrixWorld.decompose(pick.restPos,pick.restQuat,new THREE.Vector3());
  // pose "na mão": à frente e acima do suporte, de frente para a câmera, levemente inclinado
  const sw=sup.position;
  pick.held.position.set(sw.x-0.85,1.05,sw.z+1.75);
  pick.held.lookAt(sw.x-1.6,1.5,sw.z+9);
  pick.held.rotateX(-0.1);pick.held.rotateZ(0.05);
  pick.liftPos.copy(pick.restPos).add(new THREE.Vector3(0,0.6,0.25));
  // foco da câmera: a tela na pose final, sem o balanço da mão
  phoneRig=new THREE.Group();phoneRig.add(cel);scene.add(phoneRig);phoneRig.updateMatrixWorld(true);
  const local=tela.matrixWorld.clone();                   // rig ainda na origem: matriz da tela relativa ao celular
  phoneFocus=new THREE.Object3D();phoneFocus.applyMatrix4(local);pick.held.add(phoneFocus);pick.held.updateMatrixWorld(true);
  phoneScreen=tela;
}).catch(e=>console.warn('Celular provisório mantido:',e.message));

function animarCelular(p,t){
  if(!phoneRig)return;
  const k=ease(range(p,.6,.71))*(1-ease(range(p,.93,.995)));  // pega em .60–.71, devolve em .93–.995
  // caminho em curva: primeiro sobe para sair dos ganchos, depois vem para a câmera
  const a=1-k;
  pick.pos.copy(pick.restPos).multiplyScalar(a*a)
    .addScaledVector(pick.liftPos,2*a*k)
    .addScaledVector(pick.held.position,k*k);
  pick.quat.copy(pick.restQuat).slerp(pick.held.quaternion,ease(range(k,.12,1)));
  // balanço de mão segurando: pequeno, só enquanto está fora do suporte
  const m=reduce?0:k;
  pick.e.set(Math.sin(t*1.1)*.022*m,Math.sin(t*.8+1.3)*.03*m,Math.sin(t*.9+2)*.012*m);
  pick.sway.setFromEuler(pick.e);pick.quat.multiply(pick.sway);
  pick.pos.y+=Math.sin(t*1.6)*.01*m;pick.pos.x+=Math.sin(t*.7)*.008*m;
  phoneRig.position.copy(pick.pos);phoneRig.quaternion.copy(pick.quat);
  phoneRig.updateMatrixWorld(true);
}

/* ================= câmera guiada pela rolagem ================= */
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
const tmpC=new THREE.Vector3(),tmpN=new THREE.Vector3(),tmpQ=new THREE.Quaternion();
function fitDist(w,h,fill){const vt=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));return Math.max((h/2)/vt,(w/2)/(vt*camera.aspect))/fill}
function wide(look,dir,w,h,fill){const d=fitDist(w,h,fill);return {pos:look.clone().add(dir.clone().normalize().multiplyScalar(d)),look}}
function closeUp(mesh,w,h,fill,lateral,lift){
  mesh.getWorldPosition(tmpC);mesh.getWorldDirection(tmpN);mesh.getWorldQuaternion(tmpQ);
  const right=V(1,0,0).applyQuaternion(tmpQ),up=V(0,1,0).applyQuaternion(tmpQ);
  const look=tmpC.clone().addScaledVector(right,-lateral).addScaledVector(up,-lift);
  return {pos:look.clone().addScaledVector(tmpN,fitDist(w,h,fill)),look};
}
function shots(intro){
  const a=camera.aspect,portrait=a<.85,widePanel=a>1.25;
  const A=portrait?wide(V(0.7,1.25,-0.2),V(0.12,0.34,1),5.2,3.0,1.0):wide(V(widePanel?-0.55:0.3,1.5,-0.2),V(0.12,0.34,1),6.4,3.4,0.9);
  A.pos.add(V(0,0.4,1.6).multiplyScalar(1-intro));
  const lapC=closeUp(lapScreen,2.74,1.7125,portrait?.94:widePanel?.72:.84,widePanel?0.42:0,portrait?0.12:0);
  const phC=closeUp(phoneFocus||phoneScreen,SW,SH,portrait?.66:.8,widePanel?0.36:0,portrait?0.28:0);
  return [
    {p:0,...A},
    {p:.12,...wide(V(-0.4,0.85,-0.4),V(-0.4,0.28,1),4.6,2.6,0.9)},
    {p:.24,...lapC},{p:.5,...lapC},
    {p:.6,...wide(V(0.95,0.85,-0.1),V(0.18,0.24,1),5.6,2.6,0.9)},
    {p:.72,...phC},{p:.92,...phC},
    {p:1,...wide(V(0.65,0.95,-0.2),V(0,0.55,1),6.6,3.2,0.72)},
  ];
}
function camTarget(p,intro){
  const k=shots(intro);let i=0;while(i<k.length-2&&p>k[i+1].p)i++;
  const a=k[i],b=k[i+1],t=ease(range(p,a.p,b.p));
  return {pos:a.pos.clone().lerp(b.pos,t),look:a.look.clone().lerp(b.look,t)};
}

/* ================= laço principal ================= */
const chapters=[...document.querySelectorAll('.chapter')];
const railBtns=[...document.querySelectorAll('#rail button')];
const bar=document.getElementById('progress');
let pTarget=0,pSmooth=0,last=performance.now(),start=last;
const camPos=new THREE.Vector3(),camLook=new THREE.Vector3();let first=true;
function onScroll(){pTarget=clamp(scrollY/maxScroll())}
addEventListener('scroll',onScroll,{passive:true});
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();onScroll()}
addEventListener('resize',resize);resize();

function updateUI(p){
  bar.style.transform=`scaleX(${p})`;
  for(const el of chapters){
    const a=+el.dataset.in,b=+el.dataset.out;
    const o=(a<0?1:range(p,a-.03,a))*(1-range(p,b,b+.03));
    el.style.opacity=o;el.style.visibility=o<.01?'hidden':'visible';
    const base=el.classList.contains('cta')?'translate(-50%,-50%) ':el.classList.contains('bridge')?'translateX(-50%) ':'';
    el.style.transform=base+`translateY(${(1-o)*14}px)`;
  }
  document.querySelector('.hint').style.opacity=1-range(p,0,.04);
  const idx=p<.2?0:p<.375?1:p<.6?2:p<.94?3:4;
  railBtns.forEach((b,i)=>b.classList.toggle('on',i===idx));
}

function frame(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;const t=(now-start)/1000;
  pSmooth=reduce?pTarget:pSmooth+(pTarget-pSmooth)*(1-Math.exp(-dt*7));
  const p=pSmooth;
  const intro=reduce?1:ease(clamp((t-.2)/1.8));
  hinge.rotation.x=lerp(LID_CLOSED,LID_OPEN,intro);
  laptop.updateMatrixWorld(true);phone.updateMatrixWorld(true);
  animarCelular(p,t);

  const tg=camTarget(p,intro);
  if(first||reduce){camPos.copy(tg.pos);camLook.copy(tg.look);first=false}
  else{const k=1-Math.exp(-dt*6);camPos.lerp(tg.pos,k);camLook.lerp(tg.look,k)}
  camera.position.copy(camPos);camera.lookAt(camLook);

  // notebook: código → loja → destino
  const sShop=range(p,.24,.36),sTrav=range(p,.39,.5);
  if(p<.2)compose(lap,lapB,g=>drawCode(g,t),null,0);
  else if(p<.24)compose(lap,lapB,g=>drawCode(g,t),g=>drawShop(g,0,t),range(p,.2,.24));
  else if(p<.36)compose(lap,lapB,g=>drawShop(g,sShop,t),null,0);
  else if(p<.39)compose(lap,lapB,g=>drawShop(g,1,t),g=>drawTravel(g,0,t),range(p,.36,.39));
  else compose(lap,lapB,g=>drawTravel(g,sTrav,t),null,0);
  // celular: bloqueio → app
  const sApp=range(p,.72,.92);
  if(p<.64)compose(ph,phB,g=>drawLock(g,t),null,0);
  else if(p<.7)compose(ph,phB,g=>drawLock(g,t),g=>drawApp(g,0,t),range(p,.64,.7));
  else compose(ph,phB,g=>drawApp(g,sApp,t),null,0);

  // brilho das telas sobre a mesa
  lapScreen.getWorldPosition(tmpC);lapScreen.getWorldDirection(tmpN);lapGlow.position.copy(tmpC).addScaledVector(tmpN,.6);
  lapGlow.color.set(p<.22?0x6e8bff:p<.37?0xffb08a:0xf2b880);lapGlow.intensity=1.1*intro;  // brilho leve da tela sobre o teclado
  phoneScreen.getWorldPosition(tmpC);phoneScreen.getWorldDirection(tmpN);phoneGlow.position.copy(tmpC).addScaledVector(tmpN,.4);
  phoneGlow.color.set(p<.67?0x4fb0a5:0xdfe9dc);

  updateUI(p);
  renderer.render(scene,camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
