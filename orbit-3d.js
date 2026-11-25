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

    const group = new THREE.Group();
    scene.add(group);

    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.6, 1),
      new THREE.MeshBasicMaterial({ color: 0x5664ff, wireframe: true, transparent: true, opacity: 0.35 })
    );
    group.add(core);

    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(3.2, 24, 16),
      new THREE.MeshBasicMaterial({ color: 0xb9beff, wireframe: true, transparent: true, opacity: 0.06 })
    );
    group.add(shell);

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
      const spoke = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), position]),
        new THREE.LineBasicMaterial({ color: 0x5664ff, transparent: true, opacity: 0.18 })
      );
      group.add(spoke);
      return { project, mesh, halo, spoke, scale: 1 };
    });

    // Link nodes that share a category.
    projects.forEach((a, i) => {
      projects.forEach((b, j) => {
        if (j <= i || a.category !== b.category) return;
        group.add(new THREE.Line(
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
      group.rotation.y += velocity.x;
      group.rotation.x = Math.max(-1.1, Math.min(1.1, group.rotation.x + velocity.y));
      if (!dragging) {
        velocity.x += (reduce.matches ? 0 : (hovered >= 0 ? 0 : 0.0025) - velocity.x) * 0.04;
        velocity.y *= 0.92;
      }
      nodes.forEach((node, i) => {
        const target = i === hovered ? 1.7 : 1;
        node.scale += (target - node.scale) * 0.18;
        node.mesh.scale.setScalar(node.scale);
        node.halo.scale.setScalar(node.scale * (i === hovered ? 1.5 : 1));
      });
      core.rotation.y -= 0.004;
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
