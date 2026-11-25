import * as THREE from "three";

const canvas = document.querySelector(".hero-canvas");
const hero = document.querySelector(".hero");

if (canvas && hero) {
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  let renderer = null;

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance"
    });
  } catch (error) {
    canvas.remove();
  }

  if (renderer) {
    renderer.setClearAlpha(0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 140);
    camera.position.set(0, 6.5, 17);

    const terrainGeometry = new THREE.PlaneGeometry(52, 34, 36, 22);
    const terrainPositions = terrainGeometry.attributes.position;
    const terrain = new THREE.Mesh(
      terrainGeometry,
      new THREE.MeshBasicMaterial({
        color: 0x5664ff,
        wireframe: true,
        transparent: true,
        opacity: 0.42,
        depthWrite: false
      })
    );
    terrain.rotation.x = -Math.PI * 0.46;
    terrain.position.set(0, -8.5, -4);
    scene.add(terrain);

    const particleCount = 110;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      particlePositions[index * 3] = (Math.random() - 0.5) * 52;
      particlePositions[index * 3 + 1] = (Math.random() - 0.5) * 16;
      particlePositions[index * 3 + 2] = (Math.random() - 0.5) * 24;
    }
    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(
      particlesGeometry,
      new THREE.PointsMaterial({
        color: 0xb9beff,
        size: 0.14,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        sizeAttenuation: true
      })
    );
    scene.add(particles);

    const pointer = { x: 0, y: 0 };
    const drift = { x: 0, y: 0 };
    let elapsed = 0;
    let frameId = 0;
    let lastTime = 0;
    let heroVisible = true;
    let pageVisible = !document.hidden;

    function resize() {
      const width = hero.clientWidth;
      const height = hero.clientHeight;
      if (!width || !height) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    function updateTerrain(time) {
      for (let index = 0; index < terrainPositions.count; index += 1) {
        const x = terrainPositions.getX(index);
        const y = terrainPositions.getY(index);
        const wave =
          Math.sin(x * 0.32 + time * 0.55) * 0.75 +
          Math.cos(y * 0.4 - time * 0.35) * 0.6;
        terrainPositions.setZ(index, wave);
      }
      terrainPositions.needsUpdate = true;
    }

    function renderFrame(time) {
      frameId = 0;
      if (!heroVisible || !pageVisible) return;

      const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0.016;
      lastTime = time;
      elapsed += delta;

      updateTerrain(elapsed);

      drift.x += (pointer.x - drift.x) * 0.045;
      drift.y += (pointer.y - drift.y) * 0.045;

      terrain.rotation.z = drift.x * 0.06;
      camera.position.x = drift.x * 1.8;
      camera.position.y = 6.5 + drift.y * 0.9;
      camera.lookAt(0, 0, -4);

      particles.rotation.y = elapsed * 0.02 + drift.x * 0.05;

      renderer.render(scene, camera);
      schedule();
    }

    function schedule() {
      if (!frameId && heroVisible && pageVisible) {
        frameId = window.requestAnimationFrame(renderFrame);
      }
    }

    function stop() {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      lastTime = 0;
    }

    function handlePointerMove(event) {
      const bounds = hero.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = ((event.clientY - bounds.top) / bounds.height) * 2 - 1;
    }

    function handleMotionPreference() {
      if (motionQuery.matches) {
        stop();
        updateTerrain(0);
        camera.position.set(0, 6.5, 17);
        camera.lookAt(0, 0, -4);
        renderer.render(scene, camera);
      } else {
        schedule();
      }
    }

    resize();
    updateTerrain(0);
    camera.lookAt(0, 0, -4);
    renderer.render(scene, camera);

    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (motionQuery.matches) renderer.render(scene, camera);
    });
    resizeObserver.observe(hero);

    if ("IntersectionObserver" in window) {
      const visibilityObserver = new IntersectionObserver(entries => {
        heroVisible = entries[0].isIntersecting;
        if (heroVisible) schedule();
        else stop();
      }, { threshold: 0 });
      visibilityObserver.observe(hero);
    }

    document.addEventListener("visibilitychange", () => {
      pageVisible = !document.hidden;
      if (pageVisible) schedule();
      else stop();
    });

    canvas.addEventListener("webglcontextlost", event => {
      event.preventDefault();
      stop();
    });
    canvas.addEventListener("webglcontextrestored", () => {
      resize();
      schedule();
    });

    if (!motionQuery.matches) {
      hero.addEventListener("pointermove", handlePointerMove, { passive: true });
      motionQuery.addEventListener("change", handleMotionPreference);
      schedule();
    }
  }
}
