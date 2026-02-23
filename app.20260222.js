import * as THREE from "./vendor/three.module.js";
import { GLTFLoader } from "./vendor/GLTFLoader.js";
import { OrbitControls } from "./vendor/OrbitControls.js";

const canvas = document.getElementById("desk-canvas");
const loadingIndicator = document.getElementById("loading-indicator");
const stageCaption = document.getElementById("stage-caption");
const sections = [...document.querySelectorAll(".story-section")];
const navLinks = [...document.querySelectorAll(".section-nav a")];
const contactDropdown = document.getElementById("contact-dropdown");
const contactActionToggle = document.getElementById("contact-action-toggle");
const clickableProjectCards = [...document.querySelectorAll(".project-card-clickable[data-href]")];

const stageLabels = [
  "",
  "Skill Arsenal: System Readout",
  "Career Missions: Production Battle Log",
  "Project Showcase: Interactive Preview",
  "Final Stats: Impact + Growth",
  "Connect Mode: Ready To Collaborate",
];

const mouseReactiveStage = 3;

const scene = new THREE.Scene();

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;
if ("outputColorSpace" in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;

const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 2000);
camera.position.set(0, 1.2, 3.4);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minPolarAngle = 0.2;
controls.maxPolarAngle = Math.PI * 0.5;
controls.target.set(0, 0.2, 0);
controls.update();

const root = new THREE.Group();
scene.add(root);
const clock = new THREE.Clock();

scene.add(new THREE.HemisphereLight(0xe8f8ff, 0x0f1221, 1.25));

const keyLight = new THREE.DirectionalLight(0xffffff, 1.35);
keyLight.position.set(4, 4, 3);
scene.add(keyLight);

const fillLight = new THREE.DirectionalLight(0x5ff8ff, 0.95);
fillLight.position.set(-3, 2.2, -3);
scene.add(fillLight);

const backLight = new THREE.DirectionalLight(0x8eb6ff, 0.65);
backLight.position.set(0, 2.8, -4);
scene.add(backLight);

let deskModel = null;
let modelRadius = 1;
let currentStage = -1;
let tweenToken = 0;
let transitionId = 0;
let isTweeningStage = false;
let isUserInteracting = false;

const particleState = {
  count: 1680,
  points: null,
  positions: null,
  velocity: null,
  interaction: {
    active: false,
    strength: 0,
    touching: false,
  },
  bounds: {
    x: 3.2,
    yMin: -1.6,
    yMax: 2.8,
    zMin: -6.6,
    zMax: -2.1,
  },
};

const stageStates = [];
const sectionHeadings = sections.map((section) => section.querySelector(".type-line"));
const sectionIds = sections.map((section) => section.id || "");
const sectionIdToIndex = new Map(sectionIds.map((id, index) => [id, index]));
const CARD_REVEAL_DELAY_MS = 620;
let cardRevealToken = 0;

const pointer = { x: 0, y: 0 };
const mouseCamOffset = new THREE.Vector3();
const mouseTargetOffset = new THREE.Vector3();
const desiredMouseCamOffset = new THREE.Vector3();
const desiredMouseTargetOffset = new THREE.Vector3();
const baseMouseStageCamera = new THREE.Vector3();
const baseMouseStageTarget = new THREE.Vector3();

function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

function seedParticle(i) {
  if (!particleState.positions || !particleState.velocity) return;
  const base = i * 3;
  const { x, yMin, yMax, zMin, zMax } = particleState.bounds;

  particleState.positions[base] = randomRange(-x, x);
  particleState.positions[base + 1] = randomRange(yMin, yMax);
  particleState.positions[base + 2] = randomRange(zMin, zMax);

  particleState.velocity[base] = randomRange(-0.0054, 0.0054);
  particleState.velocity[base + 1] = randomRange(0.0034, 0.0084);
  particleState.velocity[base + 2] = randomRange(0.0022, 0.0058);
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
    color: 0x57f4ff,
    size: 0.036,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.62,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  points.position.z = -0.08;
  points.renderOrder = -2;

  particleState.points = points;
  root.add(points);
}

function syncParticleBoundsWithModel() {
  const spreadX = modelRadius * 4.6;
  particleState.bounds.x = spreadX;
  particleState.bounds.yMin = -modelRadius * 1.9;
  particleState.bounds.yMax = modelRadius * 2.6;
  particleState.bounds.zMin = -modelRadius * 5.8;
  particleState.bounds.zMax = -modelRadius * 1.8;

  if (!particleState.positions) return;
  for (let i = 0; i < particleState.count; i += 1) seedParticle(i);
  particleState.points.geometry.attributes.position.needsUpdate = true;
}

function updateParticleField(delta, elapsed) {
  if (!particleState.points || !particleState.positions || !particleState.velocity) return;

  const { positions, velocity, bounds } = particleState;
  const step = Math.min(delta * 60, 1.8);
  const radius = modelRadius * 1.85;
  const radiusSq = radius * radius;

  const pointerX = THREE.MathUtils.clamp(pointer.x, -1, 1);
  const pointerY = THREE.MathUtils.clamp(pointer.y, -1, 1);
  const hoverX = pointerX * bounds.x * 0.84;
  const hoverY = THREE.MathUtils.lerp(bounds.yMin, bounds.yMax, (1 - pointerY) * 0.5);

  const targetStrength = particleState.interaction.active ? (particleState.interaction.touching ? 2.8 : 2.1) : 0;
  particleState.interaction.strength = THREE.MathUtils.lerp(particleState.interaction.strength, targetStrength, 0.18);
  const strength = particleState.interaction.strength;

  for (let i = 0; i < particleState.count; i += 1) {
    const base = i * 3;
    const wave = Math.sin(elapsed * 0.6 + i * 0.17) * 0.0012;

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
        const repel = falloff * 0.23 * step;

        positions[base] += (dx / dist) * repel;
        positions[base + 1] += (dy / dist) * repel * 0.9;
        positions[base + 2] -= repel * 0.95;
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

sectionHeadings.forEach((heading) => {
  if (!heading) return;
  const text = heading.dataset.text || heading.textContent.trim();
  heading.dataset.text = text;
  heading.textContent = text;
});

function triggerHaptic(pattern = 10) {
  if ("vibrate" in navigator) navigator.vibrate(pattern);
}

function capturePointerPosition(clientX, clientY) {
  pointer.x = (clientX / window.innerWidth) * 2 - 1;
  pointer.y = (clientY / window.innerHeight) * 2 - 1;
}

window.addEventListener("mousemove", (event) => {
  capturePointerPosition(event.clientX, event.clientY);
});

function handleGlobalTouch(event) {
  particleState.interaction.touching = true;
  particleState.interaction.active = true;
  if (!event.touches || !event.touches.length) return;
  const t = event.touches[0];
  capturePointerPosition(t.clientX, t.clientY);
}

document.addEventListener("touchstart", handleGlobalTouch, { passive: true, capture: true });
document.addEventListener("touchmove", handleGlobalTouch, { passive: true, capture: true });
window.addEventListener("touchstart", handleGlobalTouch, { passive: true });
window.addEventListener("touchmove", handleGlobalTouch, { passive: true });

canvas.addEventListener("mouseenter", () => {
  particleState.interaction.active = true;
});

canvas.addEventListener("mouseleave", () => {
  particleState.interaction.active = false;
});

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

document.addEventListener("click", (event) => {
  const tapTarget = event.target.closest("a");
  if (tapTarget) {
    triggerHaptic(8);
  }
});

function setContactMenuOpen(isOpen) {
  if (!contactDropdown || !contactActionToggle) return;
  contactDropdown.classList.toggle("is-open", isOpen);
  contactActionToggle.setAttribute("aria-expanded", String(isOpen));
}

if (contactDropdown && contactActionToggle) {
  contactActionToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = contactDropdown.classList.contains("is-open");
    setContactMenuOpen(!isOpen);
    triggerHaptic(8);
  });

  document.addEventListener("click", (event) => {
    if (!contactDropdown.contains(event.target)) {
      setContactMenuOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setContactMenuOpen(false);
  });

  const contactMenuLinks = [...contactDropdown.querySelectorAll(".contact-action-menu a")];
  contactMenuLinks.forEach((link) => {
    link.addEventListener("click", () => {
      setContactMenuOpen(false);
    });
  });
}

if (clickableProjectCards.length) {
  clickableProjectCards.forEach((card) => {
    const href = card.dataset.href;
    if (!href) return;

    card.addEventListener("click", (event) => {
      if (event.target.closest("a")) return;
      triggerHaptic(8);
      window.location.href = href;
    });

    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      triggerHaptic(8);
      window.location.href = href;
    });
  });
}

controls.addEventListener("start", () => {
  isUserInteracting = true;
  isTweeningStage = false;
  transitionId += 1;
  tweenToken += 1;
  triggerHaptic(6);
});

controls.addEventListener("end", () => {
  isUserInteracting = false;
  if (currentStage === mouseReactiveStage) {
    baseMouseStageCamera.copy(camera.position).sub(mouseCamOffset);
    baseMouseStageTarget.copy(controls.target).sub(mouseTargetOffset);
  }
});

function fitCanvas() {
  const { width, height } = canvas.getBoundingClientRect();
  if (!width || !height) return;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function typewrite(el, text, speed = 18) {
  if (!el || !text) return;

  const token = `${Date.now()}_${Math.random()}`;
  el.dataset.typeToken = token;
  el.classList.add("is-typing");
  el.textContent = "";

  let index = 0;

  function step() {
    if (el.dataset.typeToken !== token) return;
    index += 1;
    el.textContent = text.slice(0, index);

    if (index < text.length) {
      setTimeout(step, speed);
    } else {
      el.classList.remove("is-typing");
    }
  }

  step();
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function transitionToStage(stage, duration = 980) {
  const fromPos = camera.position.clone();
  const fromTarget = controls.target.clone();

  const token = ++tweenToken;
  const thisTransition = ++transitionId;
  isTweeningStage = true;
  const startTime = performance.now();

  function step(now) {
    if (thisTransition !== transitionId || token !== tweenToken) return;

    const t = Math.min(1, (now - startTime) / duration);
    const e = easeInOutCubic(t);

    camera.position.set(
      THREE.MathUtils.lerp(fromPos.x, stage.camera.x, e),
      THREE.MathUtils.lerp(fromPos.y, stage.camera.y, e),
      THREE.MathUtils.lerp(fromPos.z, stage.camera.z, e)
    );

    controls.target.set(
      THREE.MathUtils.lerp(fromTarget.x, stage.target.x, e),
      THREE.MathUtils.lerp(fromTarget.y, stage.target.y, e),
      THREE.MathUtils.lerp(fromTarget.z, stage.target.z, e)
    );

    controls.update();

    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      isTweeningStage = false;
    }
  }

  requestAnimationFrame(step);
}

function setActiveSection(index, options = {}) {
  const deferCardReveal = Boolean(options.deferCardReveal);
  const revealDelay = deferCardReveal ? CARD_REVEAL_DELAY_MS : 0;

  sections.forEach((section, i) => section.classList.toggle("is-active", i === index));

  if (revealDelay > 0) {
    const token = ++cardRevealToken;
    sections.forEach((section) => section.classList.remove("is-card-visible"));
    setTimeout(() => {
      if (token !== cardRevealToken) return;
      sections.forEach((section, i) => section.classList.toggle("is-card-visible", i === index));
    }, revealDelay);
  } else {
    cardRevealToken += 1;
    sections.forEach((section, i) => section.classList.toggle("is-card-visible", i === index));
  }

  navLinks.forEach((link) => {
    const href = link.getAttribute("href") || "";
    const targetId = href.startsWith("#") ? href.slice(1) : "";
    const linkIndex = sectionIdToIndex.get(targetId);
    const isActive = linkIndex === index;
    link.classList.toggle("is-active", isActive);
    if (isActive) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  const stageText = stageLabels[index] || stageLabels[0];
  if (stageText) {
    typewrite(stageCaption, stageText, 15);
  } else if (stageCaption) {
    stageCaption.dataset.typeToken = "";
    stageCaption.classList.remove("is-typing");
    stageCaption.textContent = "";
  }

  const heading = sectionHeadings[index];
  if (heading) typewrite(heading, heading.dataset.text, 13);
}

function activateStage(index, immediate = false) {
  if (!stageStates[index] || currentStage === index) return;

  currentStage = index;
  setActiveSection(index, { deferCardReveal: !immediate });
  triggerHaptic(10);

  const stage = stageStates[index];
  baseMouseStageCamera.copy(stage.camera);
  baseMouseStageTarget.copy(stage.target);
  mouseCamOffset.set(0, 0, 0);
  mouseTargetOffset.set(0, 0, 0);

  if (immediate) {
    tweenToken += 1;
    transitionId += 1;
    isTweeningStage = false;
    camera.position.copy(stage.camera);
    controls.target.copy(stage.target);
    controls.update();
    return;
  }

  transitionToStage(stage);
}

function worldPositionOf(object3d) {
  const out = new THREE.Vector3();
  object3d.getWorldPosition(out);
  return out;
}

function findSceneNodes(model) {
  const picks = { monitor: null, keyboard: null, book: null };

  model.traverse((obj) => {
    if (!obj.name) return;
    const name = obj.name.toLowerCase();

    if (!picks.monitor && /(monitor|screen|display)/.test(name)) picks.monitor = obj;
    if (!picks.keyboard && /(keyboard|keys)/.test(name)) picks.keyboard = obj;
    if (!picks.book && /(book|notebook|diary)/.test(name)) picks.book = obj;
  });

  return picks;
}

function buildStageStates(model) {
  let box = new THREE.Box3().setFromObject(model);
  const centerBefore = box.getCenter(new THREE.Vector3());
  const sizeBefore = box.getSize(new THREE.Vector3());

  model.position.sub(centerBefore);
  model.position.y -= sizeBefore.y * 0.08;
  model.updateMatrixWorld(true);

  box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  modelRadius = Math.max(sphere.radius, 0.6);
  syncParticleBoundsWithModel();

  camera.near = Math.max(0.01, modelRadius / 220);
  camera.far = Math.max(1200, modelRadius * 34);
  camera.updateProjectionMatrix();

  controls.minDistance = modelRadius * 0.55;
  controls.maxDistance = modelRadius * 6.5;

  const nodes = findSceneNodes(model);

  const monitorTarget = nodes.monitor
    ? worldPositionOf(nodes.monitor)
    : center.clone().add(new THREE.Vector3(0, modelRadius * 0.44, modelRadius * 0.1));

  const keyboardTarget = nodes.keyboard
    ? worldPositionOf(nodes.keyboard)
    : center.clone().add(new THREE.Vector3(0, -modelRadius * 0.26, modelRadius * 0.16));

  const bookTarget = nodes.book
    ? worldPositionOf(nodes.book)
    : center.clone().add(new THREE.Vector3(-modelRadius * 0.24, -modelRadius * 0.14, modelRadius * 0.18));

  const frontTarget = center.clone().add(new THREE.Vector3(0, modelRadius * 0.05, modelRadius * 0.02));

  stageStates.length = 0;
  stageStates.push(
    {
      camera: center.clone().add(new THREE.Vector3(0, modelRadius * 0.62, modelRadius * 2.55)),
      target: frontTarget,
    },
    {
      camera: center.clone().add(new THREE.Vector3(modelRadius * 2.4, modelRadius * 1.4, modelRadius * 2.2)),
      target: center.clone().add(new THREE.Vector3(0, modelRadius * 0.08, 0)),
    },
    {
      camera: keyboardTarget.clone().add(new THREE.Vector3(modelRadius * 1.25, modelRadius * 0.55, modelRadius * 1.0)),
      target: keyboardTarget,
    },
    {
      camera: bookTarget.clone().add(new THREE.Vector3(modelRadius * 1.15, modelRadius * 0.58, modelRadius * 1.05)),
      target: bookTarget,
    },
    {
      camera: center.clone().add(new THREE.Vector3(modelRadius * 0.35, modelRadius * 1.72, modelRadius * 2.68)),
      target: center.clone().add(new THREE.Vector3(0, modelRadius * 0.08, 0)),
    },
    {
      camera: monitorTarget.clone().add(new THREE.Vector3(-modelRadius * 1.2, modelRadius * 0.65, modelRadius * 1.8)),
      target: center.clone().add(new THREE.Vector3(0, modelRadius * 0.12, 0)),
    }
  );
}

function setupSectionScroll() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.55) return;
        const index = Number(entry.target.dataset.stage || 0);
        activateStage(index);
      });
    },
    { threshold: [0.55] }
  );

  sections.forEach((section) => observer.observe(section));

  function syncClosestSection() {
    const mid = window.innerHeight * 0.5;
    let closest = 0;
    let minDelta = Infinity;

    sections.forEach((section, i) => {
      const r = section.getBoundingClientRect();
      const center = r.top + r.height / 2;
      const delta = Math.abs(center - mid);

      if (delta < minDelta) {
        minDelta = delta;
        closest = i;
      }
    });

    activateStage(closest);
  }

  window.addEventListener("scroll", syncClosestSection, { passive: true });
  syncClosestSection();
}

function updateMouseReactiveCamera() {
  if (currentStage !== mouseReactiveStage || isTweeningStage || isUserInteracting) return;

  desiredMouseCamOffset.set(pointer.x * modelRadius * 0.36, -pointer.y * modelRadius * 0.2, Math.abs(pointer.x) * modelRadius * 0.08);
  desiredMouseTargetOffset.set(pointer.x * modelRadius * 0.16, -pointer.y * modelRadius * 0.1, 0);

  mouseCamOffset.lerp(desiredMouseCamOffset, 0.08);
  mouseTargetOffset.lerp(desiredMouseTargetOffset, 0.08);

  camera.position.copy(baseMouseStageCamera).add(mouseCamOffset);
  controls.target.copy(baseMouseStageTarget).add(mouseTargetOffset);
}

function addFallbackGuide() {
  const geometry = new THREE.BoxGeometry(0.7, 0.42, 0.95);
  const material = new THREE.MeshNormalMaterial();
  const debugMesh = new THREE.Mesh(geometry, material);
  root.add(debugMesh);

  loadingIndicator.textContent = "Model failed. Debug mesh active.";
  loadingIndicator.style.color = "#ffd9d9";
}

function loadModel() {
  const loader = new GLTFLoader();
  const candidates = [
    "./assets/models/computer_desk/scene.gltf",
    "./assets/models/computer_desk.glb",
  ];

  function tryLoad(index = 0) {
    const url = candidates[index];
    if (!url) {
      addFallbackGuide();
      return;
    }

    loadingIndicator.textContent = `Loading model: ${url}`;

    loader.load(
      url,
      (gltf) => {
        deskModel = gltf.scene;
        root.add(deskModel);
        buildStageStates(deskModel);
        setupSectionScroll();
        activateStage(0, true);

        loadingIndicator.textContent = "3D model loaded";
        loadingIndicator.style.color = "#8fffd6";
        setTimeout(() => {
          loadingIndicator.style.display = "none";
        }, 1800);
      },
      undefined,
      (error) => {
        console.error(`Failed to load ${url}`, error);
        tryLoad(index + 1);
      }
    );
  }

  tryLoad(0);
}

if (location.protocol === "file:") {
  loadingIndicator.textContent = "Use local server: cd /Users/apple/Documents/portfolio3 && python3 -m http.server 4173";
  loadingIndicator.style.color = "#ffd9d9";
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const elapsed = clock.elapsedTime;

  if (deskModel) {
    const t = performance.now() * 0.001;
    root.position.y = Math.sin(t * 0.6) * 0.008;
  }

  updateParticleField(delta, elapsed);
  updateMouseReactiveCamera();
  controls.update();
  renderer.render(scene, camera);
}

window.addEventListener("resize", fitCanvas);
fitCanvas();
createParticleField();
loadModel();
animate();
