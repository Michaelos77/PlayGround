import * as THREE from 'three';

const canvas = document.querySelector('#world');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9cae8c);
scene.fog = new THREE.FogExp2(0x809375, 0.0085);
const camera = new THREE.PerspectiveCamera(73, innerWidth / innerHeight, 0.1, 260);
camera.rotation.order = 'YXZ';
camera.position.set(0, 1.7, 0);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.34;

const ambient = new THREE.HemisphereLight(0xe5f0d7, 0x526546, 2.35);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffe6b4, 2.5);
sun.position.set(-38, 65, 24);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -48; sun.shadow.camera.right = 48; sun.shadow.camera.top = 48; sun.shadow.camera.bottom = -48;
sun.shadow.bias = -0.0004;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xb7d6d1, 0.45); fill.position.set(35, 18, -30); scene.add(fill);

const rand = (() => { let s = 184731; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; })();
const clamp = THREE.MathUtils.clamp;
const groundY = (x, z) => 0.42 * Math.sin(x * 0.11) * Math.cos(z * 0.085) + 0.24 * Math.sin((x + z) * 0.23) + 0.13 * Math.cos(z * 0.39 + x * 0.17);
const riverX = z => -15 + Math.sin(z * 0.052) * 5 + Math.sin(z * 0.12) * 1.5;
const terrainGeo = new THREE.PlaneGeometry(190, 190, 150, 150);
terrainGeo.rotateX(-Math.PI / 2);
const positions = terrainGeo.attributes.position;
const colors = [];
const colorA = new THREE.Color(0x314d32), colorB = new THREE.Color(0x526b3a), colorC = new THREE.Color(0x766d46);
for (let i = 0; i < positions.count; i++) {
  const x = positions.getX(i), z = positions.getZ(i), h = groundY(x, z);
  positions.setY(i, h);
  const n = clamp(0.52 + h * 0.45 + (rand() - 0.5) * 0.15, 0, 1);
  const color = colorA.clone().lerp(colorB, n).lerp(colorC, clamp((h - 0.32) * 0.25, 0, 0.3));
  colors.push(color.r, color.g, color.b);
}
terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
terrainGeo.computeVertexNormals();
const ground = new THREE.Mesh(terrainGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }));
ground.receiveShadow = true; scene.add(ground);

// A winding, gently rippled river with a shallow sandy bank.
const waterMaterial = new THREE.MeshStandardMaterial({ color: 0x397d78, roughness: 0.24, metalness: 0.12, transparent: true, opacity: 0.91, side: THREE.DoubleSide });
const waterVerts = [], waterIndices = [];
for (let i = 0; i <= 160; i++) {
  const z = -88 + i * 1.1, cx = riverX(z), w = 3.15 + Math.sin(i * 0.24) * 0.35;
  waterVerts.push(cx - w, groundY(cx - w, z) + 0.09, z, cx + w, groundY(cx + w, z) + 0.09, z);
  if (i < 160) { const a = i * 2; waterIndices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
}
const riverGeo = new THREE.BufferGeometry(); riverGeo.setAttribute('position', new THREE.Float32BufferAttribute(waterVerts, 3)); riverGeo.setIndex(waterIndices); riverGeo.computeVertexNormals();
const river = new THREE.Mesh(riverGeo, waterMaterial); river.position.y = 0.015; scene.add(river);
const riverBed = new THREE.Mesh(new THREE.PlaneGeometry(9, 180), new THREE.MeshStandardMaterial({ color: 0x897c55, roughness: 1 }));
riverBed.rotation.x = -Math.PI / 2; riverBed.position.set(-15, 0.02, 0); scene.add(riverBed);

// Instanced rainforest trunks and layered crowns keep the canopy dense and real 3D.
const treePositions = [];
const trunkGeo = new THREE.CylinderGeometry(0.2, 0.36, 1, 8, 1); trunkGeo.translate(0, 0.5, 0);
const trunkMesh = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x66503a, roughness: 0.98 }), 420);
trunkMesh.castShadow = true; trunkMesh.receiveShadow = true; scene.add(trunkMesh);
const crownGeo = new THREE.SphereGeometry(1, 9, 7);
const crownMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x263619, emissiveIntensity: 0.14, roughness: 0.96 });
const crowns = Array.from({ length: 5 }, () => { const m = new THREE.InstancedMesh(crownGeo, crownMaterial, 420); m.castShadow = false; m.receiveShadow = false; scene.add(m); return m; });
const dummy = new THREE.Object3D();
let treeCount = 0;
for (let i = 0; i < 420; i++) {
  let x, z;
  do { x = (rand() - 0.5) * 172; z = (rand() - 0.5) * 172; } while (Math.hypot(x, z) < 8 || Math.abs(x - riverX(z)) < 6);
  const y = groundY(x, z), height = 8 + rand() * 10, girth = 0.65 + rand() * 0.58;
  treePositions.push({ x, z, r: girth * 0.72 });
  dummy.position.set(x, y, z); dummy.rotation.set(0, rand() * Math.PI, 0); dummy.scale.set(girth, height * 0.9, girth); dummy.updateMatrix(); trunkMesh.setMatrixAt(treeCount, dummy.matrix);
  const barkColor = new THREE.Color().setHSL(0.075 + rand() * 0.035, 0.23, 0.27 + rand() * 0.09); trunkMesh.setColorAt(treeCount, barkColor);
  for (let l = 0; l < 5; l++) {
    const angle = l * Math.PI * 0.5 + rand() * 0.35;
    const isCenter = l === 0;
    const offset = isCenter ? 0 : height * (0.075 + rand() * 0.035);
    const size = height * (isCenter ? 0.21 + rand() * 0.035 : 0.15 + rand() * 0.035);
    dummy.position.set(x + Math.cos(angle) * offset, y + height * (isCenter ? 0.87 : 0.84 + rand() * 0.075), z + Math.sin(angle) * offset);
    dummy.rotation.set(rand() * 0.16, rand() * Math.PI * 2, rand() * 0.16);
    dummy.scale.set(size * (1.1 + rand() * 0.2), size * (0.62 + rand() * 0.16), size * (1.1 + rand() * 0.2));
    dummy.updateMatrix(); crowns[l].setMatrixAt(treeCount, dummy.matrix);
    const leaf = new THREE.Color().setHSL(0.25 + rand() * 0.055, 0.42 + rand() * 0.18, 0.35 + rand() * 0.1); crowns[l].setColorAt(treeCount, leaf);
  }
  treeCount++;
}
trunkMesh.count = treeCount; trunkMesh.instanceMatrix.needsUpdate = true;
for (const m of crowns) { m.count = treeCount; m.instanceMatrix.needsUpdate = true; }

// Wind-driven instanced grass: each blade bends in gusts and yields near the player.
const bladeGeo = new THREE.BufferGeometry();
const bladeVerts = [], bladeIndices = [];
for (const angle of [0, Math.PI / 4, Math.PI / 2, Math.PI * 3 / 4]) {
  const along = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
  const across = new THREE.Vector3(-along.z, 0, along.x);
  const first = bladeVerts.length / 3;
  for (const [height, width, lean] of [[0, 0.042, 0], [0.3, 0.03, 0.05], [0.58, 0, 0.12]]) {
    for (const side of [-1, 1]) bladeVerts.push(across.x * width * side + along.x * lean, height, across.z * width * side + along.z * lean);
  }
  for (let segment = 0; segment < 2; segment++) {
    const a = first + segment * 2, b = a + 2;
    bladeIndices.push(a, a + 1, b, a + 1, b + 1, b);
  }
}
bladeGeo.setAttribute('position', new THREE.Float32BufferAttribute(bladeVerts, 3));
bladeGeo.setIndex(bladeIndices); bladeGeo.computeVertexNormals();
const grassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.92 });
grassMat.onBeforeCompile = shader => {
  shader.uniforms.uTime = { value: 0 }; shader.uniforms.uPlayer = { value: new THREE.Vector2(0, 0) };
  shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform vec2 uPlayer;');
  shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
    float bladeHeight = transformed.y;
    float gust = sin(uTime * 1.7 + instanceMatrix[3].x * 0.14 + instanceMatrix[3].z * 0.09) * 0.12;
    vec2 away = instanceMatrix[3].xz - uPlayer;
    float proximity = max(0.0, 1.0 - length(away) / 3.2);
    transformed.x += bladeHeight * (gust + normalize(away + vec2(0.001)) .x * proximity * 0.48);
    transformed.z += bladeHeight * (cos(uTime + instanceMatrix[3].z * 0.12) * 0.08 + normalize(away + vec2(0.001)).y * proximity * 0.48);`);
  grassMat.userData.shader = shader;
};
const grass = new THREE.InstancedMesh(bladeGeo, grassMat, 18000); grass.frustumCulled = false; grass.receiveShadow = false;
for (let i = 0; i < 18000; i++) {
  let x = (rand() - 0.5) * 178, z = (rand() - 0.5) * 178;
  if (Math.abs(x - riverX(z)) < 4.7) { x += 6; }
  dummy.position.set(x, groundY(x, z), z); dummy.rotation.set(0, rand() * Math.PI, 0); const scale = 0.58 + rand() * 0.64; dummy.scale.set(scale, scale * (0.72 + rand() * 0.55), scale); dummy.updateMatrix(); grass.setMatrixAt(i, dummy.matrix);
  grass.setColorAt(i, new THREE.Color().setHSL(0.22 + rand() * 0.09, 0.45 + rand() * 0.2, 0.29 + rand() * 0.1));
}
grass.instanceMatrix.needsUpdate = true; scene.add(grass);

// Broad-leaf understory, small palms, and distant canopy fill the forest floor.
const shrubGeo = new THREE.IcosahedronGeometry(1, 1);
const shrub = new THREE.InstancedMesh(shrubGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x182513, emissiveIntensity: 0.14, roughness: 0.98 }), 820);
shrub.castShadow = true;
for (let i=0;i<820;i++) { let x=(rand()-.5)*170,z=(rand()-.5)*170; if(Math.hypot(x,z)<7)x+=10; dummy.position.set(x,groundY(x,z)+0.2,z); dummy.rotation.set(rand()*.2,rand()*6,rand()*.2); const s=.2+rand()*.38; dummy.scale.set(s*1.2,s*.8,s); dummy.updateMatrix(); shrub.setMatrixAt(i,dummy.matrix); shrub.setColorAt(i,new THREE.Color().setHSL(.24+rand()*.06,.48,.31+rand()*.1)); }
scene.add(shrub);

// Collectible resources are simple physical objects in the scene, not flat icons.
const resources = [];
const stickGeo = new THREE.CylinderGeometry(0.045, 0.065, 1.2, 5);
const stoneGeo = new THREE.DodecahedronGeometry(0.29, 0);
const berryGeo = new THREE.SphereGeometry(0.14, 8, 6);
const addResource = (type, x, z) => {
  const y = groundY(x,z); const group = new THREE.Group(); group.position.set(x,y,z); scene.add(group);
  if(type==='stick') { const log = new THREE.Mesh(stickGeo,new THREE.MeshStandardMaterial({color:0x806344,roughness:1})); log.rotation.set(.15,rand()*3,.2+rand()*.45); log.castShadow=true; group.add(log); }
  if(type==='stone') { const rock=new THREE.Mesh(stoneGeo,new THREE.MeshStandardMaterial({color:0x8c9280,roughness:1})); rock.scale.set(1.2,.72,.95); rock.position.y=.12; rock.rotation.set(rand(),rand()*3,rand()); rock.castShadow=true; group.add(rock); }
  if(type==='berry') { const bush=new THREE.Mesh(new THREE.IcosahedronGeometry(.42,1),new THREE.MeshStandardMaterial({color:0x537242,roughness:1})); bush.scale.set(1,.75,1); bush.position.y=.28; bush.castShadow=true; group.add(bush); for(let b=0;b<5;b++){const berry=new THREE.Mesh(berryGeo,new THREE.MeshStandardMaterial({color:b%2?0xa64f43:0x7d3440,roughness:.5})); berry.position.set((rand()-.5)*.62,.35+rand()*.44,(rand()-.5)*.62); group.add(berry);} }
  resources.push({type,x,z,group,active:true});
};
for(const type of ['stick','stone','berry']) for(let i=0;i<39;i++) { let x,z; do{x=(rand()-.5)*150;z=(rand()-.5)*150;}while(Math.hypot(x,z)<8||Math.abs(x-riverX(z))<5);addResource(type,x,z); }

// Fireflies and canopy specks create depth without external art assets.
const speckPositions=[]; for(let i=0;i<420;i++)speckPositions.push((rand()-.5)*160,3+rand()*15,(rand()-.5)*160);
const specksGeo=new THREE.BufferGeometry();specksGeo.setAttribute('position',new THREE.Float32BufferAttribute(speckPositions,3));
const specks=new THREE.Points(specksGeo,new THREE.PointsMaterial({color:0xd9e4a4,size:.045,transparent:true,opacity:.32,depthWrite:false}));scene.add(specks);

const player = { x:0, z:0, yaw:0, pitch:0, health:100, water:100, food:100, stamina:100, sticks:0, stones:0, berries:0, shelter:false, alive:false, elapsed:0, bob:0, moving:false };
const DAY_SECONDS = 78, TARGET_SECONDS = DAY_SECONDS * 3;
const keys = new Set();
const el = id => document.getElementById(id);
let toastTimer;
function toast(message){const t=el('toast');t.textContent=message;t.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2100);}
function weight(){return player.sticks+player.stones+player.berries;}
function updateInventory(){el('sticks-count').textContent=player.sticks;el('stones-count').textContent=player.stones;el('berries-count').textContent=player.berries;el('pack-weight').textContent=`${weight()} / 12`;el('craft-button').disabled=player.shelter||player.sticks<3||player.stones<2||!player.alive;el('craft-button').innerHTML=player.shelter?'✓ SHELTER BUILT <small>Night protection active</small>':'✦ BUILD LEAN-TO <small>3 sticks · 2 stones</small>';el('shelter-note').textContent=player.shelter?'Your shelter is ready for the night.':'A shelter makes the long nights safer.';}
function setStat(name,value){player[name]=clamp(value,0,100);const id=name==='water'?'water':name==='food'?'food':name;el(`${id}-value`).textContent=Math.round(player[name]);el(`${id}-meter`).style.width=`${player[name]}%`;}
function interact(){
 if(!player.alive)return;
 const px=player.x,pz=player.z;
 const closest=resources.filter(r=>r.active).map(r=>({r,d:Math.hypot(r.x-px,r.z-pz)})).sort((a,b)=>a.d-b.d)[0];
 const nearWater=Math.abs(px-riverX(pz))<5.4;
 if(closest&&closest.d<2.6){
  const r=closest.r;
  if(weight()>=12){toast('Pack full — make room before foraging.');return;}
  r.active=false; scene.remove(r.group);
  if(r.type==='stick'){player.sticks++;toast('Fallen branch collected.');}
  if(r.type==='stone'){player.stones++;toast('River stone collected.');}
  if(r.type==='berry'){player.berries+=2;toast('Wild berries gathered. Use F to eat.');}
  updateInventory(); return;
 }
 if(nearWater){setStat('water',player.water+42);toast('You drink from the river. Hydration restored.');return;}
 toast('Nothing close enough to interact with.');
}
function eat(){if(!player.alive)return;if(!player.berries){toast('No berries in your pack. Forage near the ground.');return;}if(player.food>94){toast('You are not hungry yet.');return;}player.berries--;setStat('food',player.food+32);updateInventory();toast('You eat a handful of berries.');}
function craft(){if(!player.alive||player.shelter||player.sticks<3||player.stones<2)return;player.sticks-=3;player.stones-=2;player.shelter=true;updateInventory();buildShelter();toast('Lean-to built. You are safer after dark.');}
function buildShelter(){const x=player.x+Math.sin(player.yaw)*2.5,z=player.z-Math.cos(player.yaw)*2.5,y=groundY(x,z);const group=new THREE.Group();group.position.set(x,y,z);const wood=new THREE.MeshStandardMaterial({color:0x76583a,roughness:1});const leaf=new THREE.MeshStandardMaterial({color:0x45623b,roughness:1,side:THREE.DoubleSide});for(let i=0;i<5;i++){const pole=new THREE.Mesh(new THREE.CylinderGeometry(.055,.08,3.8,5),wood);pole.position.set((i-2)*.37,1.05,0);pole.rotation.z=i<2?-.68:.68;pole.castShadow=true;group.add(pole);}const roof=new THREE.Mesh(new THREE.PlaneGeometry(3.1,3.6),leaf);roof.position.set(0,2.0,0);roof.rotation.set(-.58,0,0);roof.castShadow=true;group.add(roof);scene.add(group);}
function nearestPrompt(){const close=resources.filter(r=>r.active).reduce((best,r)=>{const d=Math.hypot(r.x-player.x,r.z-player.z);return d<best.d?{r,d}:best;},{d:99});const riverDist=Math.abs(player.x-riverX(player.z));let text='',visible=false;if(close.d<2.6){text=close.r.type==='stick'?'Collect fallen branch':close.r.type==='stone'?'Collect river stone':'Gather wild berries';visible=true;}else if(riverDist<5.4){text=player.water<95?'Drink from the river':'Drink · clean water';visible=true;}const box=el('interaction');box.classList.toggle('show',visible);el('interaction-text').textContent=text;}
function nearestDistance(){for(const t of treePositions){const dx=player.x-t.x,dz=player.z-t.z,d=Math.hypot(dx,dz),min=t.r+.55;if(d<min&&d>0){player.x=t.x+dx/d*min;player.z=t.z+dz/d*min;}}player.x=clamp(player.x,-91,91);player.z=clamp(player.z,-91,91);}
function updateWorld(dt){
 const forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)+touchMove.y;
 const side=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+touchMove.x;
 const hasMoveInput=Math.abs(forward)+Math.abs(side)>.05;
 const sprintInput=keys.has('ShiftLeft')||keys.has('ShiftRight')||touchSprint;
 const sprint=sprintInput&&player.stamina>1;
 const speed=sprint?7.0:4.15;
 player.moving=false;
 if(hasMoveInput&&player.alive){const oldX=player.x,oldZ=player.z,len=Math.hypot(forward,side)||1,f=forward/len,s=side/len;player.x+=(-Math.sin(player.yaw)*f+Math.cos(player.yaw)*s)*speed*dt;player.z+=(-Math.cos(player.yaw)*f-Math.sin(player.yaw)*s)*speed*dt;nearestDistance();player.moving=Math.hypot(player.x-oldX,player.z-oldZ)>.002;}
 if(player.alive){if(sprint&&player.moving)setStat('stamina',player.stamina-22*dt);else setStat('stamina',player.stamina+13*dt);}
 player.bob+=dt*(player.moving? (sprint?13:9):2);
 const t=player.elapsed,phase=((t%DAY_SECONDS)/DAY_SECONDS)*Math.PI*2-Math.PI/2;
 const daylight=clamp((Math.sin(phase)+.18)*1.12,0.2,1);
 const dusk=1-daylight;
 sun.position.set(-38*Math.cos(phase),Math.max(8,55*Math.sin(phase)),25);
 sun.intensity=0.36+daylight*2.35; sun.color.setHSL(.11+daylight*.035,.45,.66+daylight*.24);
 scene.fog.color.setRGB(.17+daylight*.32,.23+daylight*.36,.16+daylight*.29);scene.fog.density=.0068+dusk*.003;
 scene.background.copy(scene.fog.color);
 fill.intensity=.23+daylight*.3;
 waterMaterial.color.setHSL(.49,.36,.19+daylight*.11);
 specks.material.opacity=.06+dusk*.48;
 const floor=groundY(player.x,player.z);
 camera.position.set(player.x,floor+1.66+(player.moving?Math.sin(player.bob)*.035:0),player.z);
 camera.rotation.set(player.pitch,player.yaw,0,'YXZ');
 if(grassMat.userData.shader){grassMat.userData.shader.uniforms.uTime.value=t;grassMat.userData.shader.uniforms.uPlayer.value.set(player.x,player.z);}
 if(player.alive){
  // Needs decline steadily; clean water and fruit gathered along the river replenish them.
  setStat('water',player.water-(.105+(sprint&&player.moving?.075:0))*dt);
  setStat('food',player.food-.067*dt);
  if(player.water<18||player.food<15){setStat('health',player.health-(player.water<18?.24:.12)*dt);}
  if(player.shelter&&dusk>.42&&player.health<100)setStat('health',player.health+.09*dt);
  if(player.health<=0){finish(false);}
  if(t>=TARGET_SECONDS){finish(true);}
  const day=Math.floor(t/DAY_SECONDS)+1,dayPart=(t%DAY_SECONDS)/DAY_SECONDS;
  el('day-number').textContent=String(day).padStart(2,'0');
  const minute=Math.floor((6+dayPart*24)*60),hh=Math.floor(minute/60)%24,mm=minute%60;
  el('clock').textContent=`${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
  const progress=clamp(t/TARGET_SECONDS*100,0,100);el('mission-progress').style.width=`${progress}%`;el('progress-percent').textContent=`${Math.floor(progress)}%`;el('progress-time').textContent=`DAY ${day} OF 3`;
  el('mission-title').textContent=dayPart>.64?'Night is closing in.':'Make it to daybreak.';
  el('mission-copy').textContent=player.shelter?'Your lean-to is ready. Keep water and food levels up.':'Stay alive through three days. Find clean water and forage to keep going.';
  nearestPrompt();
 }
}
function finish(won){player.alive=false;document.exitPointerLock?.();const overlay=el('end-overlay');overlay.classList.remove('hidden');el('end-icon').textContent=won?'✳':'☁';el('end-title').textContent=won?'YOU SURVIVED':'LOST IN THE GREEN';el('end-copy').textContent=won?'Three days beneath the canopy. You read the forest, found what you needed, and made it out alive.':'The rainforest is unforgiving. Water, food, and shelter are the difference between surviving and becoming part of the forest.';}

let last=performance.now();
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.05);last=now;if(player.alive)player.elapsed+=dt;updateWorld(dt);renderer.render(scene,camera);}
requestAnimationFrame(frame);
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.setSize(innerWidth,innerHeight);});
window.addEventListener('keydown',e=>{keys.add(e.code);if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();if(e.code==='KeyE'&&!e.repeat)interact();if(e.code==='KeyF'&&!e.repeat)eat();});
window.addEventListener('keyup',e=>keys.delete(e.code));
canvas.addEventListener('click',()=>{if(player.alive&&!isMobile())canvas.requestPointerLock?.();});
window.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&player.alive){player.yaw-=e.movementX*.0022;player.pitch=clamp(player.pitch-e.movementY*.0019,-1.25,1.25);}});
function isMobile(){return matchMedia('(max-width: 700px), (pointer: coarse)').matches;}
const touchMove={x:0,y:0};let joyPointer=null,touchLook=null,touchSprint=false;
const joystick=el('joystick'),knob=el('joy-knob');
joystick.addEventListener('pointerdown',e=>{joyPointer=e.pointerId;joystick.setPointerCapture(e.pointerId);moveJoy(e);});
joystick.addEventListener('pointermove',e=>{if(e.pointerId===joyPointer)moveJoy(e);});
function moveJoy(e){const r=joystick.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2),max=35,l=Math.hypot(dx,dy)||1,m=Math.min(max,l);knob.style.transform=`translate(${dx/l*m}px,${dy/l*m}px)`;touchMove.x=dx/max;touchMove.y=-dy/max;}
function resetJoy(){joyPointer=null;touchMove.x=0;touchMove.y=0;knob.style.transform='';}
joystick.addEventListener('pointerup',resetJoy);joystick.addEventListener('pointercancel',resetJoy);
window.addEventListener('blur',()=>{keys.clear();touchSprint=false;resetJoy();});
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')touchLook={x:e.clientX,y:e.clientY,id:e.pointerId};});
canvas.addEventListener('pointermove',e=>{if(touchLook&&e.pointerId===touchLook.id){const dx=e.clientX-touchLook.x,dy=e.clientY-touchLook.y;player.yaw-=dx*.006;player.pitch=clamp(player.pitch-dy*.004,-1.2,1.2);touchLook={x:e.clientX,y:e.clientY,id:e.pointerId};}});
canvas.addEventListener('pointerup',()=>touchLook=null);canvas.addEventListener('pointercancel',()=>touchLook=null);
el('mobile-interact').addEventListener('pointerdown',e=>{e.preventDefault();interact();});el('mobile-eat').addEventListener('pointerdown',e=>{e.preventDefault();eat();});
el('mobile-sprint').addEventListener('pointerdown',e=>{e.preventDefault();touchSprint=true;});for(const type of ['pointerup','pointercancel','lostpointercapture'])el('mobile-sprint').addEventListener(type,()=>touchSprint=false);
el('craft-button').addEventListener('click',craft);
el('start-button').addEventListener('click',()=>{keys.clear();touchSprint=false;resetJoy();player.alive=true;el('start-overlay').classList.add('hidden');if(!isMobile())canvas.requestPointerLock?.();});
el('restart-button').addEventListener('click',()=>location.reload());
let soundOn=false;el('sound-button').addEventListener('click',()=>{soundOn=!soundOn;el('sound-button').style.color=soundOn?'#c9dd91':'';toast(soundOn?'Ambient sound is not available in this field build.':'Sound off.');});
updateInventory();el('loading').classList.add('done');
