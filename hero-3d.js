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
    scene.fog = new THREE.Fog(0x0f1120, 16, 46);
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 140);
    camera.position.set(0, 6.5, 17);

    // Soft radial glow sprite shared by particles and ambient glows.
    function makeGlowTexture() {
      const size = 64;
      const glowCanvas = document.createElement("canvas");
      glowCanvas.width = size;
      glowCanvas.height = size;
      const ctx = glowCanvas.getContext("2d");
      const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      gradient.addColorStop(0, "rgba(255,255,255,1)");
      gradient.addColorStop(0.3, "rgba(255,255,255,.5)");
      gradient.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
      return new THREE.CanvasTexture(glowCanvas);
    }
    const glowTexture = makeGlowTexture();

    // Twin wireframe terrains: one near, one faint and far behind the fog.
    function makeTerrain(width, height, segmentsX, segmentsY, color, opacity, x, y, z) {
      const geometry = new THREE.PlaneGeometry(width, height, segmentsX, segmentsY);
      const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({
          color,
          wireframe: true,
          transparent: true,
          opacity,
          depthWrite: false
        })
      );
      mesh.rotation.x = -Math.PI * 0.47;
      mesh.position.set(x, y, z);
      scene.add(mesh);
      return { mesh, positions: geometry.attributes.position, baseOpacity: opacity };
    }

    const terrain = makeTerrain(52, 34, 36, 22, 0x5664ff, 0.34, 0, -8.5, -4);
    const farTerrain = makeTerrain(64, 42, 30, 18, 0x38bdf8, 0.1, 4, -3.2, -24);

    // Glowing particles that bob on per-particle seeds.
    const particleCount = 170;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSeeds = [];
    for (let index = 0; index < particleCount; index += 1) {
      particlePositions[index * 3] = (Math.random() - 0.5) * 52;
      const baseY = (Math.random() - 0.5) * 16;
      particlePositions[index * 3 + 1] = baseY;
      particlePositions[index * 3 + 2] = (Math.random() - 0.5) * 24;
      particleSeeds.push({
        baseY,
        phase: Math.random() * Math.PI * 2,
        amp: 0.4 + Math.random() * 1.2,
        speed: 0.25 + Math.random() * 0.5
      });
    }
    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particles = new THREE.Points(
      particlesGeometry,
      new THREE.PointsMaterial({
        color: 0x9fb4ff,
        size: 0.17,
        map: glowTexture,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
      })
    );
    scene.add(particles);

    // Ambient colored glows that drift slowly behind the terrain.
    function makeGlowSprite(color, scale, x, y, z, opacity) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTexture,
          color,
          transparent: true,
          opacity,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      );
      sprite.scale.set(scale, scale, 1);
      sprite.position.set(x, y, z);
      scene.add(sprite);
      return { sprite, baseX: x, baseY: y };
    }

    const glows = [
      { ...makeGlowSprite(0x5664ff, 13, -14, 3.5, -18, 0.55), phase: 0 },
      { ...makeGlowSprite(0x7c5cff, 10, 13, 5, -26, 0.42), phase: 2.1 },
      { ...makeGlowSprite(0x38bdf8, 11, -5, 1.5, -13, 0.38), phase: 4.2 }
    ];

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

    function updateTerrain(positions, time) {
      for (let index = 0; index < positions.count; index += 1) {
        const x = positions.getX(index);
        const y = positions.getY(index);
        const wave =
          Math.sin(x * 0.32 + time * 0.55) * 0.75 +
          Math.cos(y * 0.4 - time * 0.35) * 0.6;
        positions.setZ(index, wave);
      }
      positions.needsUpdate = true;
    }

    function renderFrame(time) {
      frameId = 0;
      if (!heroVisible || !pageVisible) return;

      const delta = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0.016;
      lastTime = time;
      elapsed += delta;

      updateTerrain(terrain.positions, elapsed);
      updateTerrain(farTerrain.positions, elapsed * 0.8 + 3.4);
      terrain.mesh.material.opacity = Math.max(0.16, terrain.baseOpacity + Math.sin(elapsed * 0.6) * 0.08);
      farTerrain.mesh.material.opacity = Math.max(0.04, farTerrain.baseOpacity + Math.sin(elapsed * 0.6 + Math.PI) * 0.04);

      for (let index = 0; index < particleCount; index += 1) {
        const seed = particleSeeds[index];
        particlePositions[index * 3 + 1] = seed.baseY + Math.sin(elapsed * seed.speed + seed.phase) * seed.amp;
      }
      particlesGeometry.attributes.position.needsUpdate = true;
      particles.rotation.y = elapsed * 0.02 + drift.x * 0.05;

      glows.forEach(glow => {
        glow.sprite.position.x = glow.baseX + Math.sin(elapsed * 0.16 + glow.phase) * 1.6;
        glow.sprite.position.y = glow.baseY + Math.cos(elapsed * 0.12 + glow.phase) * 1.1;
      });

      drift.x += (pointer.x - drift.x) * 0.045;
      drift.y += (pointer.y - drift.y) * 0.045;

      terrain.mesh.rotation.z = drift.x * 0.06;
      farTerrain.mesh.rotation.z = drift.x * -0.035;
      camera.position.x = drift.x * 1.8;
      camera.position.y = 6.5 + drift.y * 0.9;
      camera.lookAt(0, 0, -4);

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
        updateTerrain(terrain.positions, 0);
        updateTerrain(farTerrain.positions, 3.4);
        glows.forEach(glow => {
          glow.sprite.position.x = glow.baseX;
          glow.sprite.position.y = glow.baseY;
        });
        camera.position.set(0, 6.5, 17);
        camera.lookAt(0, 0, -4);
        renderer.render(scene, camera);
      } else {
        schedule();
      }
    }

    resize();
    updateTerrain(terrain.positions, 0);
    updateTerrain(farTerrain.positions, 3.4);
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
