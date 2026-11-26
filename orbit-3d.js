import * as THREE from "three";

const stage = document.querySelector(".orbit-stage");
const canvas = document.querySelector(".orbit-canvas");
const label = document.querySelector(".orbit-label");
const chipList = document.querySelector(".orbit-chips");
const projects = Array.isArray(window.PORTFOLIO_PROJECTS) ? window.PORTFOLIO_PROJECTS : [];

if (stage && canvas && projects.length) {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const COLORS = { web: 0x5664ff, mobile: 0x38bdf8, vision: 0xc084fc, other: 0x94a3b8 };
  let renderer = null;

  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (error) {
    stage.classList.add("is-fallback");
  }

  const tone = project => COLORS[project.category] || COLORS.other;

  function goToProject(project) {
    const cards = document.querySelectorAll("[data-project-title]");
    const card = Array.from(cards).find(node => node.classList.contains("project-card") && node.dataset.projectTitle === project.title);
    if (!card) return;
    card.scrollIntoView({ behavior: reduce.matches ? "auto" : "smooth", block: "center" });
    card.classList.add("is-pinged");
    window.setTimeout(() => card.classList.remove("is-pinged"), 1800);
  }

  // Accessible/fallback list: one button per project, also drives hover state.
  const chips = projects.map(project => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "orbit-chip";
    button.textContent = project.title;
    button.style.setProperty("--chip", "#" + tone(project).toString(16).padStart(6, "0"));
    button.addEventListener("click", () => goToProject(project));
    li.appendChild(button);
    chipList.appendChild(li);
    return button;
  });

  if (renderer) {
    renderer.setClearAlpha(0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 10.5);

    // Soft radial glow texture shared by node glows and the core.
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

    const group = new THREE.Group();
    scene.add(group);

    // Starfield shell that slowly counter-rotates around the constellation.
    const starGroup = new THREE.Group();
    scene.add(starGroup);
    const starCount = 260;
    const starPositions = new Float32Array(starCount * 3);
    for (let index = 0; index < starCount; index += 1) {
      const vector = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ).normalize().multiplyScalar(6.5 + Math.random() * 3.5);
      starPositions[index * 3] = vector.x;
      starPositions[index * 3 + 1] = vector.y;
      starPositions[index * 3 + 2] = vector.z;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    starGroup.add(new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({
        color: 0xb9beff,
        size: 0.055,
        map: glowTexture,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true
      })
    ));

    // Core: wireframe shell + dark inner solid + center glow.
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.6, 1),
      new THREE.MeshBasicMaterial({ color: 0x5664ff, wireframe: true, transparent: true, opacity: 0.4 })
    );
    group.add(core);
    const coreInner = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.28, 1),
      new THREE.MeshBasicMaterial({ color: 0x0f1120 })
    );
    group.add(coreInner);
    const coreGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: 0x5664ff,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );
    coreGlow.scale.set(4.4, 4.4, 1);
    group.add(coreGlow);

    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(3.2, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0xb9beff, wireframe: true, transparent: true, opacity: 0.06 })
    );
    group.add(shell);

    // Tilted orbital rings with a small moon riding each one.
    function makeRing(radius, tiltX, tiltZ, moonSpeed) {
      const ringGroup = new THREE.Group();
      ringGroup.rotation.x = tiltX;
      ringGroup.rotation.z = tiltZ;
      const curvePoints = new THREE.EllipseCurve(0, 0, radius, radius).getPoints(90);
      const ringLine = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(curvePoints.map(point => new THREE.Vector3(point.x, 0, point.y))),
        new THREE.LineBasicMaterial({ color: 0x5664ff, transparent: true, opacity: 0.2 })
      );
      ringGroup.add(ringLine);
      const moonPivot = new THREE.Group();
      const moon = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 12, 8),
        new THREE.MeshBasicMaterial({ color: 0xb9beff })
      );
      moon.position.x = radius;
      moonPivot.add(moon);
      ringGroup.add(moonPivot);
      group.add(ringGroup);
      return { ringGroup, moonPivot, moonSpeed };
    }
    const rings = [
      makeRing(3.9, 1.15, 0.35, 0.0055),
      makeRing(4.6, -1.05, -0.5, -0.0038)
    ];

    // Line materials pulse gently; track them with their base opacity.
    const pulsingLines = [];
    function trackLine(line) {
      group.add(line);
      pulsingLines.push({ material: line.material, base: line.material.opacity, phase: Math.random() * Math.PI * 2 });
    }

    // Node radius scaled by score (6.0 - 10.0 -> 0.20 - 0.38); in-progress at 0.16.
    const getNodeRadius = project => {
      if (project.isInProgress || typeof project.score !== "number") return 0.16;
      const normalized = Math.max(0, Math.min(1, (project.score - 6.0) / 4.0));
      return 0.20 + normalized * 0.18;
    };

    // Fibonacci sphere placement of project nodes.
    const nodes = projects.map((project, index) => {
      const n = projects.length;
      const y = 1 - (index + 0.5) / n * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = Math.PI * (3 - Math.sqrt(5)) * index;
      const position = new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r).multiplyScalar(3.2);
      const radius = getNodeRadius(project);
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 20, 14),
        new THREE.MeshBasicMaterial({ color: tone(project), transparent: true, opacity: project.isInProgress ? 0.6 : 1 })
      );
      mesh.position.copy(position);
      mesh.userData.index = index;
      group.add(mesh);
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 1.65, 16, 12),
        new THREE.MeshBasicMaterial({ color: tone(project), transparent: true, opacity: 0.14, depthWrite: false })
      );
      halo.position.copy(position);
      group.add(halo);
      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTexture,
          color: tone(project),
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      );
      glow.position.copy(position);
      glow.scale.setScalar(radius * 6);
      group.add(glow);
      const spoke = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), position]),
        new THREE.LineBasicMaterial({ color: 0x5664ff, transparent: true, opacity: 0.18 })
      );
      trackLine(spoke);
      return {
        project,
        mesh,
        halo,
        glow,
        scale: 1,
        glowScale: radius * 6,
        pulsePhase: Math.random() * Math.PI * 2
      };
    });

    // Link nodes that share a category.
    projects.forEach((a, i) => {
      projects.forEach((b, j) => {
        if (j <= i || a.category !== b.category) return;
        trackLine(new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([nodes[i].mesh.position, nodes[j].mesh.position]),
          new THREE.LineBasicMaterial({ color: 0xb9beff, transparent: true, opacity: 0.12 })
        ));
      });
    });

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(2, 2);
    const velocity = { x: 0, y: 0.003 };
    let dragging = false;
    let moved = 0;
    let last = { x: 0, y: 0 };
    let hovered = -1;
    let frameId = 0;
    let visible = true;
    let pageVisible = !document.hidden;
    let clock = 0;

    function resize() {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      if (!width || !height) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.position.z = width < 520 ? 13 : 10.5;
      camera.updateProjectionMatrix();
    }

    function setHover(index, event) {
      if (index === hovered && !event) return;
      hovered = index;
      stage.classList.toggle("is-hovering", index >= 0);
      chips.forEach((chip, i) => chip.classList.toggle("is-active", i === index));
      if (index < 0) {
        label.hidden = true;
        return;
      }
      label.hidden = false;
      const proj = nodes[index].project;
      const meta = proj.isInProgress ? "In progress" : (proj.score ? `${proj.score}/10` : "");
      label.textContent = meta ? `${proj.title} · ${meta}` : proj.title;
    }

    function pick() {
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(nodes.map(node => node.mesh), false)[0];
      return hit ? hit.object.userData.index : -1;
    }

    function positionLabel() {
      if (hovered < 0) return;
      const world = nodes[hovered].mesh.getWorldPosition(new THREE.Vector3()).project(camera);
      label.style.transform = `translate(${(world.x * 0.5 + 0.5) * stage.clientWidth}px, ${(-world.y * 0.5 + 0.5) * stage.clientHeight}px)`;
    }

    function draw() {
      clock += reduce.matches ? 0 : 1;
      group.rotation.y += velocity.x;
      group.rotation.x = Math.max(-1.1, Math.min(1.1, group.rotation.x + velocity.y));
      if (!dragging) {
        velocity.x += (reduce.matches ? 0 : (hovered >= 0 ? 0 : 0.0025) - velocity.x) * 0.04;
        velocity.y *= 0.92;
      }
      starGroup.rotation.y -= 0.0006;
      starGroup.rotation.x = Math.sin(clock * 0.0012) * 0.05;
      const pulse = 1 + Math.sin(clock * 0.04) * 0.05;
      nodes.forEach((node, i) => {
        const target = i === hovered ? 1.7 : 1;
        node.scale += (target - node.scale) * 0.18;
        const breathe = 1 + Math.sin(clock * 0.03 + node.pulsePhase) * 0.05;
        node.mesh.scale.setScalar(node.scale * breathe);
        node.halo.scale.setScalar(node.scale * (i === hovered ? 1.5 : 1) * pulse);
        const glowTarget = i === hovered ? 0.95 : 0.5;
        node.glow.material.opacity += (glowTarget - node.glow.material.opacity) * 0.15;
        node.glow.scale.setScalar(node.glowScale * node.scale * (i === hovered ? 1.5 : 1) * pulse);
      });
      rings.forEach(ring => {
        ring.moonPivot.rotation.y += ring.moonSpeed;
      });
      pulsingLines.forEach(line => {
        line.material.opacity = Math.max(0.04, line.base + Math.sin(clock * 0.025 + line.phase) * 0.05);
      });
      core.rotation.y -= 0.004;
      core.rotation.x = Math.sin(clock * 0.002) * 0.12;
      coreInner.rotation.y += 0.002;
      coreGlow.material.opacity = 0.6 + Math.sin(clock * 0.035) * 0.12;
      positionLabel();
      renderer.render(scene, camera);
    }

    function loop() {
      frameId = 0;
      if (!visible || !pageVisible) return;
      draw();
      schedule();
    }

    function schedule() {
      if (!frameId && visible && pageVisible && !reduce.matches) frameId = window.requestAnimationFrame(loop);
    }

    function stop() {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
    }

    function toPointer(event) {
      const bounds = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
    }

    canvas.addEventListener("pointerdown", event => {
      dragging = true;
      moved = 0;
      last = { x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
      stage.classList.add("is-dragging");
    });

    canvas.addEventListener("pointermove", event => {
      toPointer(event);
      if (dragging) {
        const dx = event.clientX - last.x;
        const dy = event.clientY - last.y;
        moved += Math.abs(dx) + Math.abs(dy);
        last = { x: event.clientX, y: event.clientY };
        velocity.x = dx * 0.006;
        velocity.y = dy * 0.006;
      } else if (event.pointerType === "mouse") {
        setHover(pick());
      }
      if (reduce.matches) {
        group.rotation.y += velocity.x;
        velocity.x = 0;
        draw();
      }
    });

    function release(event) {
      if (!dragging) return;
      dragging = false;
      stage.classList.remove("is-dragging");
      if (moved < 6) {
        toPointer(event);
        const index = pick();
        if (index >= 0) {
          setHover(index, true);
          goToProject(nodes[index].project);
        }
      }
    }
    canvas.addEventListener("pointerup", release);
    canvas.addEventListener("pointercancel", () => { dragging = false; stage.classList.remove("is-dragging"); });
    canvas.addEventListener("pointerleave", () => { if (!dragging) setHover(-1); });

    chips.forEach((chip, i) => {
      chip.addEventListener("pointerenter", () => setHover(i));
      chip.addEventListener("focus", () => setHover(i));
      chip.addEventListener("pointerleave", () => setHover(-1));
      chip.addEventListener("blur", () => setHover(-1));
    });

    stage.querySelector(".orbit-reset").addEventListener("click", () => {
      group.rotation.set(0, 0, 0);
      velocity.x = reduce.matches ? 0 : 0.0025;
      velocity.y = 0;
      draw();
    });

    resize();
    draw();
    new ResizeObserver(() => { resize(); draw(); }).observe(stage);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        if (visible) schedule(); else stop();
      }).observe(stage);
    }
    document.addEventListener("visibilitychange", () => {
      pageVisible = !document.hidden;
      if (pageVisible) schedule(); else stop();
    });
    reduce.addEventListener("change", () => { if (reduce.matches) stop(); else schedule(); });
    schedule();
  }
}
