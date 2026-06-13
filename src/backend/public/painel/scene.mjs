import * as THREE from "three";

const canvas = document.getElementById("yukiScene");
const renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true, preserveDrawingBuffer: true});
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
const pointer = new THREE.Vector2(0, 0);
const startedAt = performance.now();

camera.position.set(0, 0, 7.5);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));

const group = new THREE.Group();
scene.add(group);

const coreMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x78d7ff,
  roughness: 0.18,
  metalness: 0.1,
  transmission: 0.46,
  thickness: 0.6,
  transparent: true,
  opacity: 0.52,
  emissive: 0x102b3a,
  emissiveIntensity: 0.8
});

const shellMaterial = new THREE.MeshBasicMaterial({
  color: 0x67f0b2,
  transparent: true,
  opacity: 0.14,
  wireframe: true
});

const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.35, 3), coreMaterial);
const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(1.92, 2), shellMaterial);
group.add(core, shell);

const ringMaterial = new THREE.MeshBasicMaterial({
  color: 0x78d7ff,
  transparent: true,
  opacity: 0.26,
  side: THREE.DoubleSide
});

for (let index = 0; index < 3; index++) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.35 + index * 0.35, 0.006, 8, 160), ringMaterial);
  ring.rotation.x = Math.PI / 2 + index * 0.46;
  ring.rotation.y = index * 0.72;
  group.add(ring);
}

const particleCount = 320;
const positions = new Float32Array(particleCount * 3);
for (let index = 0; index < particleCount; index++) {
  const radius = 2.8 + Math.random() * 4.8;
  const angle = Math.random() * Math.PI * 2;
  const y = (Math.random() - 0.5) * 4.6;
  positions[index * 3] = Math.cos(angle) * radius;
  positions[index * 3 + 1] = y;
  positions[index * 3 + 2] = Math.sin(angle) * radius - 1.2;
}

const particles = new THREE.Points(
  new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(positions, 3)),
  new THREE.PointsMaterial({
    color: 0x9bdfff,
    size: 0.025,
    transparent: true,
    opacity: 0.46,
    depthWrite: false
  })
);
scene.add(particles);

const light = new THREE.PointLight(0x9bdfff, 18, 20);
light.position.set(2.5, 2.5, 4);
scene.add(light);
scene.add(new THREE.AmbientLight(0x5a6d78, 1.4));

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);

  const isMobile = width < 720;
  group.position.set(isMobile ? 1.45 : 4.35, isMobile ? 1.85 : 1.32, isMobile ? -1.2 : -0.2);
  group.scale.setScalar(isMobile ? 0.66 : 1);
}

function animate() {
  const elapsed = (performance.now() - startedAt) / 1000;
  group.rotation.x = elapsed * 0.08 + pointer.y * 0.18;
  group.rotation.y = elapsed * 0.13 + pointer.x * 0.22;
  shell.rotation.y = -elapsed * 0.18;
  particles.rotation.y = elapsed * 0.018;
  particles.rotation.x = Math.sin(elapsed * 0.2) * 0.04;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener("resize", resize);
window.addEventListener("pointermove", (event) => {
  pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
  pointer.y = (event.clientY / window.innerHeight - 0.5) * -2;
});

resize();
animate();
