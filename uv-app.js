import * as THREE from "./vendor/three.module.js";
import { GLTFLoader } from "./vendor/GLTFLoader.js";
import { OrbitControls } from "./vendor/OrbitControls.js";

const canvas = document.getElementById("uv-bike-canvas");
const rotationLabel = document.getElementById("rotation-label");
const hotspotsLayer = document.getElementById("hotspots-layer");
const featureSheet = document.getElementById("feature-sheet");
const featureSheetClose = document.getElementById("feature-sheet-close");
const featureSheetTitle = document.getElementById("feature-sheet-title");
const featureSheetDescription = document.getElementById("feature-sheet-description");
const featureSheetPoints = document.getElementById("feature-sheet-points");
const FEATURE_REVEAL_DELAY_MS = 260;

const moduleStops = [
  { id: "dashboard", label: "Pilot Dashboard", angle: 0 },
  { id: "controls", label: "Controls + Performance", angle: 55 },
  { id: "diagnostics", label: "Diagnostics", angle: 120 },
  { id: "rides", label: "Ride Statistics", angle: 190 },
  { id: "safety", label: "Safety + Alerts", angle: 255 },
  { id: "lockdown", label: "Lockdown Mode", angle: 288 },
  { id: "charging", label: "Charging Experience", angle: 320 },
];

const moduleContentMap = new Map([
  [
    "dashboard",
    {
      title: "Pilot Dashboard",
      description: "Live range, parked state, sync freshness, and quick access navigation for everyday rides.",
      points: [
        "Range-first UI with high visibility at a glance.",
        "Fast status clarity for ride-ready decisions.",
        "Clear bottom nav for quick module switching.",
      ],
    },
  ],
  [
    "safety",
    {
      title: "Safety + Alerts",
      description: "Critical rider intelligence surfaced in one place with active alert status cards.",
      points: [
        "Crash alert signal state.",
        "A.C.W.S and Delta Watch indicators.",
        "Activity timeline visualization with day-wise spikes.",
      ],
    },
  ],
  [
    "lockdown",
    {
      title: "Lockdown Mode",
      description:
        "When Lockdown is enabled, the bike is immobilized until you re-arm or unlock it, reducing unauthorized usage risk.",
      points: [
        "Works like a phone lock for your bike and is ideal for public parking or overnight stops.",
        "Paired with connected security: remote lock/lockdown, live tracking, movement and tamper alerts, and Find My F77 app support.",
        "Security best practice: use Lockdown mode with smart parking and physical security when needed.",
      ],
    },
  ],
  [
    "controls",
    {
      title: "Controls + Performance",
      description: "Ride behavior controls with immediate feedback across performance mode components.",
      points: [
        "Hill Hold, ABS, and TC access.",
        "Regen level tuning panel.",
        "Range and battery visualization.",
      ],
    },
  ],
  [
    "diagnostics",
    {
      title: "Diagnostics",
      description: "Vehicle health surfacing for proactive maintenance and service planning.",
      points: [
        "Tyre pressure and battery health summary.",
        "Service prediction based on distance/time.",
        "In-app service scheduling trigger.",
      ],
    },
  ],
  [
    "rides",
    {
      title: "Ride Statistics",
      description: "Trip timeline and efficiency metrics for post-ride analysis.",
      points: [
        "Distance, duration, top speed, and avg speed.",
        "Efficiency and fuel/CO2-equivalent savings.",
        "Route node timestamps for contextual review.",
      ],
    },
  ],
  [
    "charging",
    {
      title: "Charging Experience",
      description: "Charger flow optimized for practical charging sessions and destination context.",
      points: [
        "Supernova station identity and location.",
        "Session duration control with quick adjustments.",
        "Start charging action with focused CTA.",
      ],
    },
  ],
]);

const hotspotDefinitions = [
  {
    id: "dashboard-pin",
    label: "Pilot Dashboard",
    moduleId: "dashboard",
    point: [0.5, 0.77, 0.81],
    side: "right",
    focusOffset: [0.0, 0.42, 1.08],
  },
  {
    id: "controls-pin",
    label: "Ride Controls",
    moduleId: "controls",
    point: [0.24, 0.55, 0.62],
    side: "left",
    focusOffset: [-0.86, 0.22, 0.6],
  },
  {
    id: "diagnostics-pin",
    label: "Diagnostics",
    moduleId: "diagnostics",
    point: [0.72, 0.48, 0.53],
    side: "right",
    focusOffset: [0.86, 0.22, 0.62],
  },
  {
    id: "rides-pin",
    label: "Ride Statistics",
    moduleId: "rides",
    point: [0.54, 0.4, 0.26],
    side: "right",
    focusOffset: [0.16, 0.2, -1.0],
  },
  {
    id: "safety-pin",
    label: "Safety Alerts",
    moduleId: "safety",
    point: [0.5, 0.8, 0.4],
    side: "left",
    focusOffset: [0.1, 0.55, -0.88],
  },
  {
    id: "lockdown-pin",
    label: "Lockdown Mode",
    moduleId: "lockdown",
    point: [0.36, 0.61, 0.5],
    side: "left",
    focusOffset: [-0.58, 0.3, -0.5],
  },
  {
    id: "charging-pin",
    label: "Charging Flow",
    moduleId: "charging",
    point: [0.47, 0.17, 0.19],
    side: "left",
    focusOffset: [0.0, 0.12, -1.22],
  },
];

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.26;
if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;

const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 3000);
camera.position.set(0, 1.1, 3.2);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.enablePan = false;
controls.autoRotate = false;
controls.autoRotateSpeed = 0;
controls.minPolarAngle = Math.PI * 0.2;
controls.maxPolarAngle = Math.PI * 0.52;
controls.target.set(0, 0.35, 0);
controls.update();

scene.add(new THREE.HemisphereLight(0xeaffff, 0x0e1324, 1.2));

const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
keyLight.position.set(3.7, 3.5, 2.8);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x41ecff, 1.05);
fillLight.position.set(-2.8, 2.2, -2.4);
scene.add(fillLight);

const rimLight = new THREE.DirectionalLight(0x8da7ff, 0.7);
rimLight.position.set(0, 2.4, -4.2);
scene.add(rimLight);

const root = new THREE.Group();
scene.add(root);

const clock = new THREE.Clock();
const pointer = { x: 0, y: 0 };
const hotspotRuntime = [];

const particleState = {
  count: 3600,
  points: null,
  glowPoints: null,
  positions: null,
  velocity: null,
  interaction: {
    active: false,
    touching: false,
    strength: 0,
  },
  bounds: {
    x: 4,
    yMin: -2,
    yMax: 3,
    zMin: -3.6,
    zMax: -0.35,
  },
};

let activeModuleId = "";
let loadedModel = null;
let modelRadius = 1;
let defaultCameraView = null;
let selectedHotspotId = "";
let cameraTweenToken = 0;
let featureRevealTimer = 0;
let rootBaseYOffset = 0;

function normalizeDegrees(value) {
  return ((value % 360) + 360) % 360;
}

function circularDistance(a, b) {
  const d = Math.abs(a - b);
  return Math.min(d, 360 - d);
}

function isFeatureSheetOpen() {
  return Boolean(featureSheet && !featureSheet.hidden);
}

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function seedParticle(index) {
  if (!particleState.positions || !particleState.velocity) return;
  const base = index * 3;
  const { x, yMin, yMax, zMin, zMax } = particleState.bounds;

  particleState.positions[base] = randomRange(-x, x);
  particleState.positions[base + 1] = randomRange(yMin, yMax);
  particleState.positions[base + 2] = randomRange(zMin, zMax);

  particleState.velocity[base] = randomRange(-0.0062, 0.0062);
  particleState.velocity[base + 1] = randomRange(0.0032, 0.0088);
  particleState.velocity[base + 2] = randomRange(0.003, 0.0078);
}

function createParticleField() {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleState.count * 3);
  const velocity = new Float32Array(particleState.count * 3);

  particleState.positions = positions;
  particleState.velocity = velocity;

  for (let i = 0; i < particleState.count; i += 1) {
    seedParticle(i);
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0x4cefff,
    size: 0.056,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
  });
  material.toneMapped = false;

  const glowMaterial = new THREE.PointsMaterial({
    color: 0x6af4ff,
    size: 0.12,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.24,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
  });
  glowMaterial.toneMapped = false;

  const points = new THREE.Points(geometry, material);
  points.renderOrder = -3;

  const glowPoints = new THREE.Points(geometry, glowMaterial);
  glowPoints.renderOrder = -4;

  particleState.points = points;
  particleState.glowPoints = glowPoints;
  root.add(points);
  root.add(glowPoints);
}

function syncParticleBoundsWithModel() {
  particleState.bounds.x = modelRadius * 4.1;
  particleState.bounds.yMin = -modelRadius * 1.6;
  particleState.bounds.yMax = modelRadius * 2.8;
  particleState.bounds.zMin = -modelRadius * 3.2;
  particleState.bounds.zMax = -modelRadius * 0.25;

  if (!particleState.positions) return;
  particleState.points.position.set(0, modelRadius * 0.04, -modelRadius * 0.95);
  if (particleState.glowPoints) {
    particleState.glowPoints.position.copy(particleState.points.position);
  }
  for (let i = 0; i < particleState.count; i += 1) seedParticle(i);
  particleState.points.geometry.attributes.position.needsUpdate = true;
}

function updateParticleField(delta, elapsed) {
  if (!particleState.points || !particleState.positions || !particleState.velocity) return;

  const { positions, velocity, bounds } = particleState;
  const step = Math.min(delta * 60, 1.8);
  const radius = modelRadius * 1.35;
  const radiusSq = radius * radius;

  const hoverX = THREE.MathUtils.clamp(pointer.x, -1, 1) * bounds.x * 0.82;
  const hoverY = THREE.MathUtils.lerp(bounds.yMin, bounds.yMax, (1 - THREE.MathUtils.clamp(pointer.y, -1, 1)) * 0.5);

  const targetStrength = particleState.interaction.active
    ? particleState.interaction.touching
      ? 2.4
      : 1.7
    : 0;
  particleState.interaction.strength = THREE.MathUtils.lerp(particleState.interaction.strength, targetStrength, 0.14);

  const strength = particleState.interaction.strength;

  for (let i = 0; i < particleState.count; i += 1) {
    const base = i * 3;
    const wave = Math.sin(elapsed * 0.7 + i * 0.14) * 0.0012;

    positions[base] += (velocity[base] + wave) * step;
    positions[base + 1] += velocity[base + 1] * step;
    positions[base + 2] += velocity[base + 2] * step;

    if (strength > 0.01) {
      const dx = positions[base] - hoverX;
      const dy = positions[base + 1] - hoverY;
      const distSq = dx * dx + dy * dy;

      if (distSq < radiusSq) {
        const dist = Math.sqrt(distSq) + 0.001;
        const falloff = (1 - dist / radius) * strength;
        const repel = falloff * 0.17 * step;
        positions[base] += (dx / dist) * repel;
        positions[base + 1] += (dy / dist) * repel * 0.88;
        positions[base + 2] -= repel * 0.84;
      }
    }

    if (positions[base] > bounds.x) positions[base] = -bounds.x;
    else if (positions[base] < -bounds.x) positions[base] = bounds.x;

    if (positions[base + 1] > bounds.yMax) positions[base + 1] = bounds.yMin;

    if (positions[base + 2] > bounds.zMax) {
      positions[base + 2] = bounds.zMin;
      positions[base] = randomRange(-bounds.x, bounds.x);
      positions[base + 1] = randomRange(bounds.yMin, bounds.yMax);
    }
  }

  particleState.points.geometry.attributes.position.needsUpdate = true;
}

function setActiveModule(id, fallbackLabel = "") {
  if (activeModuleId === id) return;
  activeModuleId = id;

  const moduleStop = moduleStops.find((stop) => stop.id === id);
  const label = moduleStop?.label || fallbackLabel || id;

  if (rotationLabel) {
    rotationLabel.textContent = `Active Module: ${label}`;
  }
}

function setSelectedHotspot(id) {
  selectedHotspotId = id;
  hotspotRuntime.forEach((item) => {
    item.element.classList.toggle("is-active", item.definition.id === id);
  });
}

function openFeatureSheet(moduleId) {
  if (!featureSheet || !featureSheetTitle || !featureSheetDescription || !featureSheetPoints) return;
  const content = moduleContentMap.get(moduleId);
  if (!content) return;

  featureSheetTitle.textContent = content.title;
  featureSheetDescription.textContent = content.description;
  featureSheetPoints.innerHTML = content.points.map((text) => `<li>${text}</li>`).join("");
  featureSheet.hidden = false;
}

function closeFeatureSheet(restoreCamera = true) {
  if (!featureSheet) return;
  if (featureRevealTimer) {
    window.clearTimeout(featureRevealTimer);
    featureRevealTimer = 0;
  }
  featureSheet.hidden = true;
  setSelectedHotspot("");

  if (restoreCamera && defaultCameraView) {
    tweenCamera(defaultCameraView.position, defaultCameraView.target, 680, () => {
      controls.autoRotate = false;
    });
  }
}

function updateModuleFromRotation() {
  if (isFeatureSheetOpen()) return;
  const deg = normalizeDegrees(THREE.MathUtils.radToDeg(controls.getAzimuthalAngle()));

  let winner = moduleStops[0];
  let bestDistance = circularDistance(deg, winner.angle);

  for (let i = 1; i < moduleStops.length; i += 1) {
    const candidate = moduleStops[i];
    const dist = circularDistance(deg, candidate.angle);
    if (dist < bestDistance) {
      winner = candidate;
      bestDistance = dist;
    }
  }

  setActiveModule(winner.id, winner.label);
}

function fitCanvas() {
  const { width, height } = canvas.getBoundingClientRect();
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function tweenCamera(toPosition, toTarget, duration = 780, onComplete = null) {
  const fromPosition = camera.position.clone();
  const fromTarget = controls.target.clone();
  const token = ++cameraTweenToken;
  const start = performance.now();

  function step(now) {
    if (token !== cameraTweenToken) return;
    const t = Math.min(1, (now - start) / duration);
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    camera.position.set(
      THREE.MathUtils.lerp(fromPosition.x, toPosition.x, eased),
      THREE.MathUtils.lerp(fromPosition.y, toPosition.y, eased),
      THREE.MathUtils.lerp(fromPosition.z, toPosition.z, eased)
    );

    controls.target.set(
      THREE.MathUtils.lerp(fromTarget.x, toTarget.x, eased),
      THREE.MathUtils.lerp(fromTarget.y, toTarget.y, eased),
      THREE.MathUtils.lerp(fromTarget.z, toTarget.z, eased)
    );

    controls.update();

    if (t < 1) {
      requestAnimationFrame(step);
    } else if (onComplete) {
      onComplete();
    }
  }

  requestAnimationFrame(step);
}

function pointFromNormalizedBounds(box, point) {
  return new THREE.Vector3(
    THREE.MathUtils.lerp(box.min.x, box.max.x, point[0]),
    THREE.MathUtils.lerp(box.min.y, box.max.y, point[1]),
    THREE.MathUtils.lerp(box.min.z, box.max.z, point[2])
  );
}

function focusHotspot(item) {
  const { definition } = item;
  const anchorWorld = item.anchorBase.clone().add(root.position);

  const offset = new THREE.Vector3(...definition.focusOffset).multiplyScalar(modelRadius);
  const toPosition = anchorWorld.clone().add(offset);

  controls.autoRotate = false;
  setSelectedHotspot(definition.id);
  setActiveModule(definition.moduleId, definition.label);
  if (featureSheet) featureSheet.hidden = true;
  if (featureRevealTimer) {
    window.clearTimeout(featureRevealTimer);
    featureRevealTimer = 0;
  }

  tweenCamera(toPosition, anchorWorld, 760, () => {
    featureRevealTimer = window.setTimeout(() => {
      openFeatureSheet(definition.moduleId);
      featureRevealTimer = 0;
    }, FEATURE_REVEAL_DELAY_MS);
  });
}

function buildHotspots() {
  if (!hotspotsLayer || !loadedModel) return;
  hotspotsLayer.innerHTML = "";
  hotspotRuntime.length = 0;

  const box = new THREE.Box3().setFromObject(loadedModel);

  hotspotDefinitions.forEach((definition) => {
    const anchorBase = pointFromNormalizedBounds(box, definition.point);

    const button = document.createElement("button");
    button.type = "button";
    button.className = `hotspot-tag${definition.side === "left" ? " is-left" : ""}`;
    button.setAttribute("aria-label", `Focus ${definition.label}`);
    button.innerHTML = `
      <span class="hotspot-dot"></span>
      <span class="hotspot-label">${definition.label}</span>
    `;

    const item = { definition, anchorBase, element: button };

    button.addEventListener("click", (event) => {
      event.stopPropagation();
      focusHotspot(item);
    });

    hotspotsLayer.appendChild(button);
    hotspotRuntime.push(item);
  });
}

function updateHotspotScreenPositions() {
  if (!hotspotRuntime.length) return;

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  hotspotRuntime.forEach((item) => {
    const world = item.anchorBase.clone().add(root.position);
    const projected = world.project(camera);

    const visible = projected.z > -1 && projected.z < 1;
    if (!visible) {
      item.element.style.display = "none";
      return;
    }

    const x = (projected.x * 0.5 + 0.5) * width;
    const y = (-projected.y * 0.5 + 0.5) * height;

    item.element.style.display = "block";
    item.element.style.left = `${x}px`;
    item.element.style.top = `${y}px`;
  });
}

function fitCameraToModel(model) {
  model.scale.setScalar(1.22);

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  model.position.sub(center);
  model.position.y -= size.y * 0.1;
  model.updateMatrixWorld(true);

  const normalizedBox = new THREE.Box3().setFromObject(model);
  const sphere = normalizedBox.getBoundingSphere(new THREE.Sphere());
  modelRadius = Math.max(sphere.radius, 0.8);
  syncParticleBoundsWithModel();

  controls.target.set(0, modelRadius * 0.15, 0);
  controls.minDistance = modelRadius * 0.78;
  controls.maxDistance = modelRadius * 2.9;

  camera.near = Math.max(0.01, modelRadius / 260);
  camera.far = Math.max(1200, modelRadius * 24);
  camera.position.set(modelRadius * 1.08, modelRadius * 0.63, modelRadius * 1.52);
  rootBaseYOffset = modelRadius * 0.205;
  camera.updateProjectionMatrix();
  controls.update();

  defaultCameraView = {
    position: camera.position.clone(),
    target: controls.target.clone(),
  };
}

function loadBikeModel() {
  const loader = new GLTFLoader();
  loader.load(
    "./assets/models/three_cylinder_naked_street_bike/scene.gltf",
    (gltf) => {
      loadedModel = gltf.scene;
      root.add(loadedModel);
      fitCameraToModel(loadedModel);
      buildHotspots();
      setActiveModule("dashboard", "Pilot Dashboard");
    },
    undefined,
    (error) => {
      console.error("Bike model failed to load", error);
      if (rotationLabel) {
        rotationLabel.textContent = "3D model failed to load. Please verify asset path.";
      }
    }
  );
}

function capturePointerPosition(clientX, clientY) {
  pointer.x = (clientX / window.innerWidth) * 2 - 1;
  pointer.y = (clientY / window.innerHeight) * 2 - 1;
}

window.addEventListener("mousemove", (event) => {
  particleState.interaction.active = true;
  particleState.interaction.touching = false;
  capturePointerPosition(event.clientX, event.clientY);
});

function handleTouch(event) {
  particleState.interaction.active = true;
  particleState.interaction.touching = true;
  if (!event.touches || !event.touches.length) return;
  const t = event.touches[0];
  capturePointerPosition(t.clientX, t.clientY);
}

document.addEventListener("touchstart", handleTouch, { passive: true, capture: true });
document.addEventListener("touchmove", handleTouch, { passive: true, capture: true });
window.addEventListener(
  "touchend",
  () => {
    particleState.interaction.touching = false;
    particleState.interaction.active = false;
  },
  { passive: true }
);
window.addEventListener(
  "touchcancel",
  () => {
    particleState.interaction.touching = false;
    particleState.interaction.active = false;
  },
  { passive: true }
);

canvas.addEventListener("mouseleave", () => {
  if (!particleState.interaction.touching) {
    particleState.interaction.active = false;
  }
});

if (featureSheetClose) {
  featureSheetClose.addEventListener("click", () => {
    closeFeatureSheet(true);
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isFeatureSheetOpen()) {
    closeFeatureSheet(true);
  }
});

if (hotspotsLayer) {
  hotspotsLayer.addEventListener("click", (event) => {
    event.stopPropagation();
  });
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;

  controls.update();

  if (loadedModel) {
    root.position.y = rootBaseYOffset + Math.sin(performance.now() * 0.0007) * modelRadius * 0.01;
  }

  updateHotspotScreenPositions();
  updateModuleFromRotation();
  updateParticleField(delta, elapsed);
  renderer.render(scene, camera);
}

window.addEventListener("resize", fitCanvas);
fitCanvas();
createParticleField();
loadBikeModel();
animate();
