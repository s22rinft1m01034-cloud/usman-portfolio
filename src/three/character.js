// A designed character, not a photo avatar — built entirely from primitives
// so it always renders correctly (no external model to fail to load).
// Tracks the cursor, breathes, and exposes startTalking()/stopTalking() for
// the chat widget to drive a mouth/core pulse while a reply is "spoken".
import * as THREE from 'three';

const ACCENT = 0x3ddc7a;
const ACCENT_2 = 0xffb020;

export function initCharacter({ canvas, stage }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x0a0e12, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(2, 3, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(ACCENT, 0.8);
  rim.position.set(-3, 1, -2);
  scene.add(rim);

  const root = new THREE.Group();
  scene.add(root);

  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a3a1f, roughness: 0.5, metalness: 0.12 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.6, 0.85, 8, 16), bodyMat);
  body.position.y = -0.55;
  root.add(body);

  const headGroup = new THREE.Group();
  headGroup.position.y = 0.55;
  root.add(headGroup);
  const headMat = new THREE.MeshStandardMaterial({ color: 0x234d2a, roughness: 0.45, metalness: 0.15 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 40, 40), headMat);
  headGroup.add(head);

  // A visible "power core" on the chest — sits slightly proud of the body
  // surface so it always reads clearly (no reliance on translucency).
  const coreMat = new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 1.8, roughness: 0.3 });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 24), coreMat);
  core.position.set(0, -0.15, 0.56);
  root.add(core);
  const coreRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.19, 0.012, 8, 32),
    new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.6 })
  );
  coreRing.position.copy(core.position);
  root.add(coreRing);

  const eyeGeo = new THREE.SphereGeometry(0.07, 16, 16);
  const eyeMat = new THREE.MeshBasicMaterial({ color: ACCENT });
  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  eyeL.position.set(-0.19, 0.05, 0.48);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.19;
  headGroup.add(eyeL, eyeR);
  const eyes = [eyeL, eyeR];

  const mouthMat = new THREE.MeshBasicMaterial({ color: ACCENT_2 });
  const mouth = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.2, 4, 8), mouthMat);
  mouth.rotation.z = Math.PI / 2;
  mouth.position.set(0, -0.18, 0.51);
  headGroup.add(mouth);

  // Two halo rings at different angles/colors — a small "digital being"
  // signature, easy to get looking right (flat unlit material, no lighting
  // risk) unlike the glass-shell attempt this replaced.
  const ringA = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.012, 8, 64),
    new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.35 })
  );
  ringA.rotation.x = Math.PI / 2.4;
  root.add(ringA);
  const ringB = new THREE.Mesh(
    new THREE.TorusGeometry(0.98, 0.008, 8, 64),
    new THREE.MeshBasicMaterial({ color: ACCENT_2, transparent: true, opacity: 0.22 })
  );
  ringB.rotation.x = Math.PI / 1.85;
  ringB.rotation.z = 0.25;
  root.add(ringB);

  // A handful of slow-orbiting sparks for a touch of life.
  const SPARK_COUNT = 22;
  const sparkPositions = new Float32Array(SPARK_COUNT * 3);
  for (let i = 0; i < SPARK_COUNT; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 1.05 + Math.random() * 0.35;
    sparkPositions[i * 3] = Math.cos(a) * r;
    sparkPositions[i * 3 + 1] = (Math.random() - 0.5) * 1.6;
    sparkPositions[i * 3 + 2] = Math.sin(a) * r;
  }
  const sparkGeo = new THREE.BufferGeometry();
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
  const sparkMat = new THREE.PointsMaterial({
    size: 0.03, color: ACCENT, transparent: true, opacity: 0.65,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  root.add(sparks);

  function frameCamera() {
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const height = size.y || 1.6;
    camera.position.set(center.x, center.y + height * 0.12, center.z + height * 1.55);
    camera.lookAt(center.x, center.y + height * 0.1, center.z);
  }
  frameCamera();

  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    // Clamped defensively — the stage is resized continuously while
    // scrolling (see dock.js), so a stray mid-layout read (e.g. one
    // dimension not yet updated) shouldn't be able to skew the character.
    camera.aspect = THREE.MathUtils.clamp(w / Math.max(h, 1), 0.5, 2);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  // Cursor tracking (normalized, smoothed)
  const mouse = { x: 0, y: 0 };
  const targetMouse = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    targetMouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  let talking = false;
  let waveTimer = 0;
  const clock = new THREE.Clock();
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    const t = clock.getElapsedTime();

    mouse.x += (targetMouse.x - mouse.x) * 0.06;
    mouse.y += (targetMouse.y - mouse.y) * 0.06;

    if (!prefersReducedMotion) {
      root.position.y = Math.sin(t * 1.4) * 0.035;

      const yaw = THREE.MathUtils.clamp(mouse.x * 0.5, -0.5, 0.5);
      const pitch = THREE.MathUtils.clamp(-mouse.y * 0.3, -0.3, 0.3);
      headGroup.rotation.y += (yaw - headGroup.rotation.y) * 0.08;
      headGroup.rotation.x += (pitch - headGroup.rotation.x) * 0.08;

      const corePulse = talking ? 0.9 : 0.6;
      core.scale.setScalar(corePulse + Math.sin(t * (talking ? 10 : 2)) * (talking ? 0.25 : 0.08));

      if (talking) {
        const pulse = (Math.sin(t * 14) * 0.5 + 0.5) * 0.7 + 0.1;
        mouth.scale.y = 0.6 + pulse * 0.9;
      } else {
        mouth.scale.y += (1 - mouth.scale.y) * 0.2;
      }

      const blink = Math.max(0, Math.sin(t * 0.6)) > 0.985 ? 0.1 : 1;
      eyes.forEach((e) => (e.scale.y += (blink - e.scale.y) * 0.5));

      ringA.rotation.z = t * 0.22;
      ringB.rotation.z = -t * 0.16;
      sparks.rotation.y = t * 0.1;

      if (waveTimer < 1) {
        waveTimer += dt * 0.6;
        root.rotation.z = Math.sin(waveTimer * Math.PI * 4) * 0.06 * (1 - waveTimer);
      }
    }

    renderer.render(scene, camera);
  }
  animate();

  return {
    startTalking() { talking = true; },
    stopTalking() { talking = false; },
    dispose() {
      ro.disconnect();
      renderer.dispose();
    }
  };
}
