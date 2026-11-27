(() => {
  "use strict";

  const projects = Array.isArray(window.PORTFOLIO_PROJECTS) ? window.PORTFOLIO_PROJECTS : [];
  const showcaseProjects = projects
    .filter(project => !project.isInProgress)
    .sort((first, second) => first.rank - second.rank);
  const inProgressProjects = projects.filter(project => project.isInProgress);
  const orderedProjects = [...showcaseProjects, ...inProgressProjects];
  const grid = document.querySelector("#project-grid");
  const progressSection = document.querySelector("#in-progress");
  const progressGrid = document.querySelector("#in-progress-grid");
  const count = document.querySelector("#project-count");
  const search = document.querySelector("#project-search");
  const filters = Array.from(document.querySelectorAll(".filter-button"));
  const sectionLinks = Array.from(document.querySelectorAll("[data-section-link]"));
  const sectionRail = document.querySelector(".section-rail");
  const main = document.querySelector("#main");
  const featuredList = document.querySelector("#featured-projects");
  const prefersMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
  const tiltQuery = window.matchMedia ? window.matchMedia("(hover: hover) and (pointer: fine)") : null;
  const canTilt = prefersMotion && Boolean(tiltQuery && tiltQuery.matches);
  const demoTimers = new WeakMap();
  let revealObserver = null;
  let sectionRailFrame = 0;
  let activeCategory = "all";
  let searchTerm = "";
  let demoAutoplay = null;

  function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function add(parent, ...children) {
    children.forEach(child => child && parent.appendChild(child));
  }

  function row(className, left, right) {
    const node = make("div", className);
    add(node, make("span", "", left), make("span", "", right));
    return node;
  }

  function pv(tag, className, text, anim, delay) {
    const node = make(tag, className, text);
    if (anim) node.dataset.pv = anim;
    if (delay !== undefined) node.style.setProperty("--pv-delay", delay + "ms");
    return node;
  }

  function pvWindow(title, body) {
    const win = pv("div", "pv-window", undefined, "pop", 150);
    const bar = make("div", "pv-bar");
    add(bar, make("i"), make("i"), make("i"), pv("span", "pv-title", title), pv("span", "pv-live", "LIVE"));
    add(win, bar, body);
    return win;
  }

  if (prefersMotion && "IntersectionObserver" in window) {
    demoAutoplay = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const card = entry.target;
        demoAutoplay.unobserve(card);
        window.setTimeout(() => {
          if (document.contains(card)) playDemo(card);
        }, 420);
      });
    }, { threshold: 0.45 });
  }

  function setActiveSection(sectionId) {
    sectionLinks.forEach(link => {
      const active = link.hash === "#" + sectionId;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }

  function updateActiveSection() {
    const visibleSections = sectionLinks
      .filter(link => !link.hidden)
      .map(link => document.querySelector(link.hash))
      .filter(Boolean);
    if (!visibleSections.length) return;

    const atPageBottom = Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 1;
    if (atPageBottom) {
      setActiveSection(visibleSections[visibleSections.length - 1].id);
      return;
    }

    const marker = window.innerHeight * .46;
    const activeSection = visibleSections.find(section => {
      const bounds = section.getBoundingClientRect();
      return bounds.top <= marker && bounds.bottom > marker;
    });
    const precedingSections = visibleSections.filter(section => section.getBoundingClientRect().top <= marker);
    setActiveSection((activeSection || precedingSections[precedingSections.length - 1] || visibleSections[0]).id);
  }

  function updateSectionRailBounds() {
    if (!sectionRail || !main) return;
    const mainBounds = main.getBoundingClientRect();
    const topInset = Math.max(96, window.innerHeight * .11);
    const bottomLimit = window.innerHeight - Math.max(28, window.innerHeight * .05);
    const top = Math.max(topInset, Math.min(mainBounds.top, bottomLimit));
    const bottom = Math.min(bottomLimit, mainBounds.bottom);
    const height = Math.max(0, bottom - top);
    const visibleLinkCount = sectionLinks.filter(link => !link.hidden).length;
    sectionRail.style.setProperty("--section-rail-top", Math.round(top) + "px");
    sectionRail.style.setProperty("--section-rail-height", Math.floor(height) + "px");
    sectionRail.classList.toggle("is-within-main", height >= visibleLinkCount * 30);
  }

  function scheduleSectionRailBounds() {
    if (sectionRailFrame) return;
    sectionRailFrame = window.requestAnimationFrame(() => {
      sectionRailFrame = 0;
      updateSectionRailBounds();
      updateActiveSection();
    });
  }

  function refreshSectionNavigation() {
    sectionLinks.forEach(link => {
      const section = document.querySelector(link.hash);
      const available = Boolean(section && !section.hidden);
      link.hidden = !available;
    });
    scheduleSectionRailBounds();
  }

  function stopDemo(scope) {
    const timer = demoTimers.get(scope);
    if (timer) window.clearTimeout(timer);
    demoTimers.delete(scope);
    scope.classList.remove("is-demo-playing");
    const replay = scope.querySelector(".demo-replay");
    const replayLabel = replay && replay.querySelector(".demo-replay-label");
    const title = scope.dataset.projectTitle || (scope.querySelector("h1, h2, h3") || {}).textContent || "project";
    if (replayLabel) replayLabel.textContent = "Replay workflow";
    if (replay) replay.setAttribute("aria-label", "Replay workflow demo for " + title);
  }

  function playDemo(scope) {
    if (!prefersMotion || !scope) return;
    stopDemo(scope);
    const replay = scope.querySelector(".demo-replay");
    const replayLabel = replay && replay.querySelector(".demo-replay-label");
    const title = scope.dataset.projectTitle || (scope.querySelector("h1, h2, h3") || {}).textContent || "project";
    if (replayLabel) replayLabel.textContent = "Playing demo";
    if (replay) replay.setAttribute("aria-label", "Playing workflow demo for " + title);
    void scope.offsetWidth;
    scope.classList.add("is-demo-playing");
    demoTimers.set(scope, window.setTimeout(() => stopDemo(scope), 5000));
  }

  function observeReveals() {
    if (!revealObserver) return;
    document.querySelectorAll("[data-reveal]:not([data-reveal-observed])").forEach(node => {
      node.dataset.revealObserved = "true";
      revealObserver.observe(node);
    });
  }

  if (prefersMotion && "IntersectionObserver" in window) {
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.target.hasAttribute("data-reveal")) {
          entry.target.classList.toggle("is-visible", entry.isIntersecting);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -28px 0px" });
    document.documentElement.classList.add("motion-ready");
  }

  function makeVisual(project) {
    const art = make("div", "project-art project-art--" + project.visual);
    art.setAttribute("role", "group");
    art.setAttribute("aria-label", project.visualLabel);
    const kicker = make("div", "art-kicker");
    kicker.appendChild(make("span", "", project.isInProgress ? "PROJECT STATUS" : "WORKFLOW PREVIEW"));
    if (!project.isInProgress) {
      const replay = make("button", "demo-replay");
      replay.type = "button";
      replay.setAttribute("aria-label", "Play five-second workflow demo for " + project.title);
      add(replay,
        make("span", "demo-replay-symbol", "▶"),
        make("span", "demo-replay-label", "Replay workflow"),
        make("span", "demo-replay-duration", "05 SEC")
      );
      kicker.appendChild(replay);
    }
    art.appendChild(kicker);

    const body = make("div", "pv-body");
    body.classList.add("pv-body--" + project.visual);

    if (project.visual === "models") {
      const input = pv("div", "pv-input", undefined, "slide", 240);
      add(input,
        pv("span", "pv-input-tag", "INPUT · SOCIAL POST"),
        pv("p", "pv-msg", "Hospitals overwhelmed by 5G towers — share this fast.")
      );
      const tokens = make("div", "pv-tokens");
      [["claim", true, 760], ["no source", true, 860], ["5g towers", true, 960], ["loaded words", false, 1060]].forEach(item => {
        tokens.appendChild(pv("i", item[1] ? "is-flag" : "", item[0], "pop", item[2]));
      });
      input.appendChild(tokens);
      const meters = make("div", "pv-meters");
      [["LR", 82, 1150], ["RF", 91, 1360], ["HYB", 94, 1570]].forEach(item => {
        const meter = pv("div", "pv-meter", undefined, "pop", item[2]);
        const track = pv("div", "pv-meter-track");
        const fill = pv("i", "", undefined, "fill", item[2] + 90);
        fill.style.width = item[1] + "%";
        track.appendChild(fill);
        add(meter, pv("b", "", item[0]), track, pv("span", "", item[1] + "%"));
        meters.appendChild(meter);
      });
      add(body, input, meters, pv("div", "pv-verdict", "FLAGGED · 94% CONFIDENCE", "stamp", 2200));
    } else if (project.visual === "budget") {
      const head = pv("div", "pv-fin-head", undefined, "slide", 220);
      add(head, pv("span", "pv-money", "RM 1,240"), pv("span", "pv-trend", "▲ 18% THIS MONTH"));
      const bars = make("div", "pv-bars");
      [34, 48, 42, 61, 55, 74, 92, 80].forEach((height, index) => {
        const bar = pv("i", index === 7 ? "pv-forecast" : "", undefined, "grow", 780 + index * 110);
        bar.style.setProperty("--pv-h", height + "%");
        bars.appendChild(bar);
      });
      const goal = pv("div", "pv-goal", undefined, "pop", 1900);
      add(goal,
        pv("span", "pv-goal-label", "GOAL · RM 1,500 · SEPT 30"),
        pv("span", "pv-chip pv-chip-good", "ON TRACK", "stamp", 2700)
      );
      const track = pv("div", "pv-goal-track");
      track.appendChild(pv("i", "", undefined, "fill", 2050));
      goal.appendChild(track);
      add(body, head, bars, goal);
    } else if (project.visual === "tasks") {
      const inbox = pv("div", "pv-row", undefined, "slide", 220);
      add(inbox, make("span", "", "INBOX"), make("span", "", "14 CAPTURED"));
      const focusCard = pv("div", "pv-card", undefined, "pop", 560);
      add(focusCard, pv("span", "pv-card-tag", "TODAY · TOP 3"));
      [["Ship portfolio site", true, 950], ["Review pull request", true, 1420], ["Draft project README", false, 1890]].forEach(item => {
        const task = pv("div", "pv-task" + (item[1] ? " is-done" : ""), undefined, item[1] ? "check" : "pop", item[2]);
        add(task, pv("span", "pv-check", item[1] ? "✓" : ""), make("span", "", item[0]));
        focusCard.appendChild(task);
      });
      const foot = pv("div", "pv-row", undefined, "slide", 2350);
      add(foot, make("span", "", "2 / 3 DONE"), make("span", "", "NEXT · DRAFT README"));
      add(body, inbox, focusCard, foot);
    } else if (project.visual === "parking") {
      const cams = make("div", "pv-cams");
      const camIn = pv("div", "pv-cam", undefined, "pop", 300);
      add(camIn, pv("b", "", "IN · GATE 1"), pv("span", "pv-cam-car"), pv("span", "", "CAR DETECTED"));
      const ocr = pv("div", "pv-ocr", "YOLOv8\n+ OCR", "pop", 820);
      const camOut = pv("div", "pv-cam", undefined, "pop", 1150);
      add(camOut, pv("b", "", "OUT · GATE 2"), pv("span", "pv-cam-car"), pv("span", "", "CLEAR"));
      add(cams, camIn, ocr, camOut);
      const plate = pv("div", "pv-plate", undefined, "slide", 1500);
      add(plate, pv("span", "pv-plate-label", "PLATE READ"));
      const code = make("div", "pv-plate-code");
      "ABC 1234".split("").forEach((character, index) => {
        code.appendChild(pv("span", "", character, "pop", 1680 + index * 95));
      });
      add(plate, code, pv("span", "pv-plate-note", "MATCH 98%", "pop", 2650));
      const log = pv("div", "pv-log", undefined, "slide", 2950);
      [["07:42", "IN", "ABC 1234"], ["07:45", "OUT", "KX 8811"]].forEach(entry => {
        const logRow = make("div", "pv-log-row");
        add(logRow, make("b", "", entry[0] + " · " + entry[1]), make("span", "", entry[2]));
        log.appendChild(logRow);
      });
      add(body, cams, plate, log);
    } else if (project.visual === "rental") {
      const cars = make("div", "pv-cars");
      [["MYVI", "RM 95/D", true, 300], ["BEZA", "RM 110/D", false, 430], ["X50", "RM 160/D", false, 560]].forEach(item => {
        const carCard = pv("div", "pv-car" + (item[2] ? " is-selected" : ""), undefined, "pop", item[3]);
        add(carCard, pv("b", "", item[0]), pv("span", "", item[1]));
        cars.appendChild(carCard);
      });
      const flow = pv("div", "pv-flow", undefined, "pop", 850);
      flow.appendChild(pv("span", "pv-marker", undefined, "travel", 950));
      ["SELECT", "RENT", "RETURN", "RATE"].forEach((label, index) => {
        flow.appendChild(pv("span", "pv-flow-step" + (index === 3 ? " is-now" : ""), label, "pop", 950 + index * 430));
      });
      const credits = make("div", "pv-credits");
      add(credits,
        pv("span", "pv-credit", "CREDITS −RM 95", "stamp", 3200),
        pv("span", "pv-credit pv-credit-in", "REFUND +RM 70", "stamp", 3550)
      );
      add(body, cars, flow, credits);
    } else if (project.visual === "gymnastics") {
      const routine = make("div", "pv-gym");
      const tiles = make("div", "pv-elements");
      for (let n = 1; n <= 10; n += 1) {
        tiles.appendChild(pv("i", n <= 7 ? "is-done" : (n === 8 ? "is-now" : ""), String(n).padStart(2, "0"), "pop", 350 + (n - 1) * 135));
      }
      const dialWrap = pv("div", "pv-dial-wrap", undefined, "pop", 2050);
      const dial = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      dial.setAttribute("class", "pv-dial");
      dial.setAttribute("viewBox", "0 0 72 72");
      dial.setAttribute("aria-hidden", "true");
      const dialTrack = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dialTrack.setAttribute("class", "pv-dial-track");
      dialTrack.setAttribute("cx", "36");
      dialTrack.setAttribute("cy", "36");
      dialTrack.setAttribute("r", "30");
      const dialArc = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      dialArc.setAttribute("class", "pv-dial-arc");
      dialArc.setAttribute("cx", "36");
      dialArc.setAttribute("cy", "36");
      dialArc.setAttribute("r", "30");
      dialArc.style.strokeDashoffset = "13.2px";
      dialArc.dataset.pv = "dial";
      dialArc.style.setProperty("--pv-delay", "2150ms");
      add(dial, dialTrack, dialArc);
      const dialNum = make("div", "pv-dial-num");
      add(dialNum, pv("b", "", "18.6", "pop", 2600), pv("span", "", "SCORE / 20"));
      add(dialWrap, dial, dialNum);
      const deduction = pv("div", "pv-deduction", undefined, "stamp", 3100);
      add(deduction, make("span", "", "−2 DEDUCTION · APPLIED"), make("span", "", "ELEMENT 05"));
      add(routine, tiles, dialWrap, deduction);
      body.appendChild(routine);
    } else if (project.visual === "scanner") {
      const scan = pv("div", "pv-scan", undefined, "pop", 220);
      const doc = pv("div", "pv-scan-doc", undefined, "doc", 620);
      const lines = make("div", "pv-doc-lines");
      for (let n = 0; n < 4; n += 1) lines.appendChild(make("i"));
      add(doc, lines);
      add(scan, doc, pv("i", "pv-scan-beam"));
      const chips = make("div", "pv-credits");
      add(chips,
        pv("span", "pv-chip", "CANNY · EDGES FOUND", "pop", 1500),
        pv("span", "pv-chip pv-chip-good", "PAGE 01 → PDF", "stamp", 2400)
      );
      add(body, scan, chips);
    } else if (project.visual === "data") {
      const kpis = make("div", "pv-kpis");
      [["41.2K", "SPEEDING FINES", "▲ 6%", 300], ["5.1M", "ROADSIDE TESTS", "▲ 11%", 450], ["3.8%", "POSITIVE RATE", "▼ 2%", 600]].forEach(item => {
        const kpi = pv("div", "pv-kpi", undefined, "slide", item[3]);
        add(kpi, pv("b", "", item[0]), pv("span", "", item[1]), pv("em", "", item[2]));
        kpis.appendChild(kpi);
      });
      const panels = make("div", "pv-panels");
      const map = pv("div", "pv-map", undefined, "pop", 950);
      map.appendChild(make("i", "pv-land"));
      [[18, 34], [27, 52], [22, 66], [34, 60]].forEach((position, index) => {
        const pin = pv("i", "pv-pin", undefined, "pop", 1150 + index * 150);
        pin.style.top = position[0] + "%";
        pin.style.left = position[1] + "%";
        map.appendChild(pin);
      });
      const chart = pv("div", "pv-chart", undefined, "pop", 2000);
      const chartSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      chartSvg.setAttribute("class", "pv-line");
      chartSvg.setAttribute("viewBox", "0 0 100 40");
      chartSvg.setAttribute("preserveAspectRatio", "none");
      chartSvg.setAttribute("aria-hidden", "true");
      const chartLine = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      chartLine.setAttribute("points", "2,33 22,20 40,26 58,10 76,16 98,5");
      chartLine.dataset.pv = "draw";
      chartLine.style.setProperty("--pv-delay", "2100ms");
      chartSvg.appendChild(chartLine);
      chart.appendChild(chartSvg);
      add(panels, map, chart);
      add(body, kpis, panels);
    } else if (project.visual === "progress") {
      const skeleton = make("div", "pv-skel");
      for (let n = 0; n < 3; n += 1) skeleton.appendChild(make("i"));
      body.appendChild(skeleton);
      [["SOURCE FILES", project.hasSource ? "PUBLIC" : "NOT PUBLIC YET"], ["README", project.hasReadme ? "AVAILABLE" : "NOT AVAILABLE YET"]].forEach((item, index) => {
        const statusRow = pv("div", "pv-row", undefined, "slide", 500 + index * 260);
        add(statusRow, make("span", "", item[0]), make("span", "", item[1]));
        body.appendChild(statusRow);
      });
      body.appendChild(pv("div", "pv-chip pv-chip-good", "SHIPPING SOON", "stamp", 1200));
    } else if (project.visual === "rooms") {
      const rooms = make("div", "pv-rooms");
      [["LAB 302 · 8 SEATS", "FREE", "pv-chip-good", 280], ["STUDIO B · 4 SEATS", "BOOKED", "", 480]].forEach(item => {
        const row = pv("div", "pv-room", undefined, "slide", item[3]);
        add(row, make("span", "", item[0]), make("b", "pv-chip " + item[2], item[1]));
        rooms.appendChild(row);
      });
      const slots = make("div", "pv-slots");
      [["09:00", ""], ["10:30", "is-booked"], ["13:00", ""], ["15:00", "is-free"]].forEach((slot, index) => {
        slots.appendChild(pv("span", "pv-slot " + slot[1], slot[0], "pop", 720 + index * 140));
      });
      add(body, rooms, slots, pv("div", "pv-chip pv-chip-good", "NO CONFLICT · CONFIRMED", "stamp", 1400));
    }

    const windowTitles = {
      models: "MODEL COMPARISON",
      rooms: "ROOM BOOKING · LIVE",
      budget: "SAVINGS · GOALS",
      tasks: "PLAN THE DAY",
      parking: "PARKING GATE",
      rental: "RENTAL FLOW",
      gymnastics: "ROUTINE · FLOOR",
      scanner: "DOC SCAN",
      data: "ROAD SAFETY · AU",
      progress: "IN DEVELOPMENT"
    };
    art.appendChild(pvWindow(windowTitles[project.visual] || "WORKFLOW", body));
    if (!project.isInProgress) art.appendChild(make("div", "art-demo-progress"));
    return art;
  }

  function renderFeaturedProjects() {
    if (!featuredList) return;
    featuredList.replaceChildren();

    showcaseProjects.slice(0, 3).forEach(project => {
      const item = make("li", "ranked-project");
      const article = make("article", "ranked-entry");
      const rank = make("span", "ranked-number", String(project.rank).padStart(2, "0"));
      rank.setAttribute("aria-hidden", "true");

      const details = make("div", "ranked-entry-details");
      add(details,
        make("p", "ranked-kind", project.kind),
        make("h3", "", project.title),
        make("p", "ranked-proof", project.featuredReason || project.description)
      );

      const link = make("a", "ranked-entry-link");
      link.href = project.repo;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.setAttribute("aria-label", "Open " + project.title + " repository on GitHub");
      add(link, make("span", "", "Open"), make("span", "ranked-entry-arrow", "↗"));
      link.querySelector(".ranked-entry-arrow").setAttribute("aria-hidden", "true");

      const meta = make("div", "ranked-entry-meta");
      const score = make("span", "ranked-score", project.score.toFixed(1) + " / 10");
      score.setAttribute("aria-label", "Portfolio rating: " + project.score.toFixed(1) + " out of 10");
      add(meta, score, link);

      add(article, rank, details, meta);
      item.appendChild(article);
      featuredList.appendChild(item);
    });
  }

  function playCardDemo(card, project) {
    card.dataset.projectTitle = project.title;
    const replay = card.querySelector(".demo-replay");
    if (replay) replay.addEventListener("click", () => playDemo(card));
  }

  function enableTilt(card) {
    if (!canTilt) return;
    const art = card.querySelector(".project-art");
    if (!art) return;
    let frame = 0;
    let tiltX = 0;
    let tiltY = 0;

    function apply() {
      frame = 0;
      art.style.setProperty("--tilt-x", tiltX.toFixed(2) + "deg");
      art.style.setProperty("--tilt-y", tiltY.toFixed(2) + "deg");
    }

    card.addEventListener("pointermove", event => {
      if (event.pointerType !== "mouse") return;
      const bounds = card.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const x = (event.clientX - bounds.left) / bounds.width - .5;
      const y = (event.clientY - bounds.top) / bounds.height - .5;
      tiltX = -y * 5;
      tiltY = x * 7;
      card.classList.add("is-tilting");
      if (!frame) frame = window.requestAnimationFrame(apply);
    });

    card.addEventListener("pointerleave", () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
      card.classList.remove("is-tilting");
      art.style.setProperty("--tilt-x", "0deg");
      art.style.setProperty("--tilt-y", "0deg");
    });
  }

  function makeCard(project, revealOrder = 0) {
    const article = make("article", "project-card" + (project.isInProgress ? " is-in-progress" : ""));
    if (revealObserver) {
      article.dataset.reveal = "card";
      article.style.setProperty("--reveal-order", String(Math.min(revealOrder, 4)));
    }
    article.dataset.category = project.category;
    article.dataset.name = project.name;
    article.dataset.projectTitle = project.title;
    const art = makeVisual(project);
    const content = make("div", "project-content");
    const topline = make("div", "project-topline");
    const projectOrder = project.rank ? String(project.rank).padStart(2, "0") : "WIP";
    const rating = project.score ? make("span", "project-score", project.score.toFixed(1) + " / 10") : null;
    if (rating) rating.setAttribute("aria-label", "Portfolio rating: " + project.score.toFixed(1) + " out of 10");
    add(topline,
      make("span", "project-number", projectOrder + " / " + project.kind),
      rating,
      make("span", "project-state", project.state)
    );
    const title = make("h3", "", project.title);
    const summary = make("p", "project-description", project.description);
    const features = make("ul", "project-features");
    project.features.forEach(feature => features.appendChild(make("li", "", feature)));
    const stack = make("div", "project-stack");
    stack.setAttribute("aria-label", "Technology stack");
    project.stack.forEach(label => stack.appendChild(make("span", "stack-tag", label)));
    if (project.diagram) {
      const diagramTag = make("a", "stack-tag stack-tag--diagram", "Archify diagram ↗");
      diagramTag.href = project.diagram;
      diagramTag.target = "_blank";
      diagramTag.rel = "noreferrer";
      diagramTag.setAttribute("aria-label", "Open " + project.title + " Archify architecture diagram");
      stack.appendChild(diagramTag);
    }
    const footer = make("div", "project-footer");
    const progressNote = project.hasSource
      ? "Public source files; README not available yet."
      : "Source files and README not public yet.";
    const note = project.testing || (project.isInProgress ? progressNote : (project.category === "vision" ? "See the repository README for requirements and setup." : ""));
    const test = make("span", "project-test", note);
    const links = make("div", "project-links");
    if (project.diagram) {
      const diagramLink = make("a", "diagram-link", "Architecture");
      diagramLink.href = project.diagram;
      diagramLink.target = "_blank";
      diagramLink.rel = "noreferrer";
      diagramLink.setAttribute("aria-label", "Open " + project.title + " architecture diagram");
      diagramLink.appendChild(make("span", "", "↗"));
      links.appendChild(diagramLink);
    }
    const link = make("a", "repo-link", "View repository");
    link.href = project.repo;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.setAttribute("aria-label", "View " + project.name + " on GitHub");
    link.appendChild(make("span", "", "↗"));
    links.appendChild(link);
    add(footer, test, links);
    add(content, topline, title, summary);
    if (project.features.length) content.appendChild(features);
    if (project.stack.length || project.diagram) content.appendChild(stack);
    content.appendChild(footer);
    add(article, art, content);
    playCardDemo(article, project);
    enableTilt(article);
    if (demoAutoplay && !project.isInProgress) demoAutoplay.observe(article);
    return article;
  }

  function matchingProjects() {
    return orderedProjects.filter(project => {
      const categoryMatches = activeCategory === "all" || project.category === activeCategory;
      const haystack = [project.name, project.title, project.kind, project.state, project.description]
        .concat(project.features, project.stack, project.diagram ? ["archify", "diagram", "architecture"] : []).join(" ").toLowerCase();
      return categoryMatches && haystack.includes(searchTerm);
    });
  }

  function updateFilterCounts() {
    filters.forEach(button => {
      const countBadge = button.querySelector("[data-filter-count]");
      if (!countBadge) return;
      const category = button.dataset.filter;
      const total = category === "all"
        ? orderedProjects.length
        : orderedProjects.filter(project => project.category === category).length;
      countBadge.textContent = String(total);
    });
  }

  function clearGrid(container) {
    if (revealObserver) {
      container.querySelectorAll("[data-reveal-observed]").forEach(node => revealObserver.unobserve(node));
    }
    container.querySelectorAll(".project-card").forEach(card => {
      if (demoAutoplay) demoAutoplay.unobserve(card);
      stopDemo(card);
    });
    container.replaceChildren();
  }

  function render() {
    const matches = matchingProjects();
    const projectIndexMatches = matches.filter(project => !project.isInProgress || project.showInProjectIndex);
    const progressMatches = matches.filter(project => project.isInProgress);
    const separateProgressMatches = matches.filter(project => project.isInProgress && !project.showInProjectIndex);
    clearGrid(grid);
    clearGrid(progressGrid);
    progressSection.hidden = separateProgressMatches.length === 0;
    refreshSectionNavigation();

    if (!matches.length) {
      const empty = make("div", "no-results");
      add(empty, make("strong", "", "No matching projects."), make("span", "", "Try another search or choose another project area."));
      grid.appendChild(empty);
    } else if (!projectIndexMatches.length) {
      const empty = make("div", "no-results");
      const matchingCount = separateProgressMatches.length;
      const title = matchingCount === 1 ? "Your match is in progress." : "Your matches are in progress.";
      const message = matchingCount === 1
        ? "The matching repository is listed in the In progress section."
        : "The matching repositories are listed in the In progress section.";
      const jumpLink = make("a", "in-progress-result-link", "Jump to in-progress projects ↓");
      jumpLink.href = "#in-progress";
      add(empty, make("strong", "", title), make("span", "", message), jumpLink);
      grid.appendChild(empty);
    } else {
      projectIndexMatches.forEach((project, matchIndex) => {
        grid.appendChild(makeCard(project, matchIndex));
      });
    }
    separateProgressMatches.forEach((project, matchIndex) => {
      progressGrid.appendChild(makeCard(project, matchIndex));
    });
    count.textContent = searchTerm || activeCategory !== "all"
      ? "Showing " + matches.length + " of " + orderedProjects.length + " repositories · " + (matches.length - progressMatches.length) + " completed · " + progressMatches.length + " in progress"
      : orderedProjects.length + " repositories · " + showcaseProjects.length + " completed · " + inProgressProjects.length + " in progress";
    observeReveals();
  }

  sectionLinks.forEach(link => link.addEventListener("click", () => setActiveSection(link.hash.slice(1))));
  scheduleSectionRailBounds();
  window.addEventListener("scroll", scheduleSectionRailBounds, { passive: true });
  window.addEventListener("resize", () => {
    if (sectionRailFrame) window.cancelAnimationFrame(sectionRailFrame);
    sectionRailFrame = window.requestAnimationFrame(() => {
      sectionRailFrame = 0;
      updateSectionRailBounds();
      updateActiveSection();
    });
  }, { passive: true });

  updateFilterCounts();
  renderFeaturedProjects();

  filters.forEach(button => {
    button.addEventListener("click", () => {
      activeCategory = button.dataset.filter;
      filters.forEach(filter => {
        const selected = filter === button;
        filter.classList.toggle("is-active", selected);
        filter.setAttribute("aria-pressed", String(selected));
      });
      render();
    });
  });
  search.addEventListener("input", () => {
    searchTerm = search.value.trim().toLowerCase();
    render();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey && document.activeElement !== search) {
      event.preventDefault();
      search.focus();
    }
    if (event.key === "Escape" && document.activeElement === search) {
      search.value = "";
      searchTerm = "";
      search.blur();
      render();
    }
  });

  render();
})();

(() => {
  "use strict";

  const root = document.documentElement;
  const reduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;
  const finePointer = window.matchMedia ? window.matchMedia("(hover: hover) and (pointer: fine)").matches : false;

  /* --- preloader --- */
  const preloader = document.querySelector(".preloader");
  function finishPreloader() {
    if (!preloader || preloader.classList.contains("is-done")) return;
    preloader.classList.add("is-done");
    root.classList.add("is-booted");
    root.classList.remove("is-booting");
    window.setTimeout(() => {
      if (preloader.parentNode) preloader.parentNode.removeChild(preloader);
    }, 650);
  }

  if (preloader) {
    if (reduce) {
      preloader.remove();
    } else {
      root.classList.add("is-booting");
      const bar = preloader.querySelector(".preloader-bar i");
      const counter = preloader.querySelector(".preloader-count");
      const startedAt = performance.now();
      let progress = 0;
      const tick = () => {
        if (preloader.classList.contains("is-done")) return;
        const elapsed = performance.now() - startedAt;
        const cap = document.readyState === "complete" ? 1 : 0.88;
        progress += (cap - progress) * 0.08;
        if (cap === 1 && elapsed > 950) progress = Math.min(1, progress + 0.06);
        if (bar) bar.style.transform = "scaleX(" + progress + ")";
        if (counter) counter.textContent = String(Math.round(progress * 100)).padStart(2, "0") + "%";
        if (progress >= 1) {
          finishPreloader();
          return;
        }
        window.requestAnimationFrame(tick);
      };
      window.requestAnimationFrame(tick);
      window.addEventListener("load", () => window.setTimeout(finishPreloader, 350), { once: true });
      window.setTimeout(finishPreloader, 4200);
    }
  }

  /* --- custom cursor --- */
  const cursorDot = document.querySelector(".cursor-dot");
  const cursorRing = document.querySelector(".cursor-ring");
  if (cursorDot && cursorRing && finePointer && !reduce) {
    root.classList.add("cursor-on");
    cursorDot.classList.add("is-hidden");
    cursorRing.classList.add("is-hidden");
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let ringX = x;
    let ringY = y;
    let raf = 0;
    const loop = () => {
      ringX += (x - ringX) * 0.16;
      ringY += (y - ringY) * 0.16;
      cursorRing.style.transform = "translate3d(" + (ringX - 14) + "px," + (ringY - 14) + "px,0)";
      if (Math.abs(x - ringX) > 0.3 || Math.abs(y - ringY) > 0.3) raf = window.requestAnimationFrame(loop);
      else raf = 0;
    };
    window.addEventListener("pointermove", event => {
      x = event.clientX;
      y = event.clientY;
      const inField = Boolean(event.target.closest && event.target.closest("input, textarea, select"));
      cursorRing.classList.toggle("is-hidden", inField);
      const onDark = Boolean(event.target.closest && event.target.closest(".hero, .ticker, .orbit-stage, .about-section, .to-top"));
      cursorRing.classList.toggle("is-on-dark", onDark);
      const interactive = !inField && event.target.closest && event.target.closest("a, button, .orbit-chip, .project-card, .skill-card");
      cursorRing.classList.toggle("is-active", Boolean(interactive));
      if (!raf) raf = window.requestAnimationFrame(loop);
    }, { passive: true });
    window.addEventListener("pointerdown", () => cursorRing.classList.add("is-down"));
    window.addEventListener("pointerup", () => cursorRing.classList.remove("is-down"));
    document.documentElement.addEventListener("mouseleave", () => {
      cursorDot.classList.add("is-hidden");
      cursorRing.classList.add("is-hidden");
    });
    document.documentElement.addEventListener("mouseenter", () => {
      cursorDot.classList.remove("is-hidden");
      cursorRing.classList.remove("is-hidden");
    });
  }

  /* --- magnetic elements --- */
  if (finePointer && !reduce) {
    let magnet = null;
    const magneticSelector = ".to-top, .orbit-reset, .site-header .brand";
    document.addEventListener("pointermove", event => {
      const target = event.target.closest ? event.target.closest(magneticSelector) : null;
      if (target !== magnet) {
        if (magnet) {
          magnet.classList.remove("is-magnet");
          magnet.style.setProperty("--mag-x", "0px");
          magnet.style.setProperty("--mag-y", "0px");
        }
        magnet = target;
        if (magnet) magnet.classList.add("is-magnet");
      }
      if (magnet) {
        const bounds = magnet.getBoundingClientRect();
        const ratioX = (event.clientX - (bounds.left + bounds.width / 2)) / Math.max(bounds.width, 1);
        const ratioY = (event.clientY - (bounds.top + bounds.height / 2)) / Math.max(bounds.height, 1);
        magnet.style.setProperty("--mag-x", (ratioX * 6).toFixed(1) + "px");
        magnet.style.setProperty("--mag-y", (ratioY * 5).toFixed(1) + "px");
      }
    }, { passive: true });
  }

  /* --- spotlight cards --- */
  document.addEventListener("pointermove", event => {
    const card = event.target.closest ? event.target.closest(".project-card, .skill-card") : null;
    if (!card) return;
    const bounds = card.getBoundingClientRect();
    card.style.setProperty("--mx", (event.clientX - bounds.left) + "px");
    card.style.setProperty("--my", (event.clientY - bounds.top) + "px");
  }, { passive: true });

  /* --- hero ledger counters --- */
  const counters = Array.from(document.querySelectorAll("[data-counter]"));
  if (counters.length && !reduce) {
    const runCounters = () => counters.forEach(node => {
      const target = Number(node.dataset.counter) || 0;
      const pad = Number(node.dataset.counterPad) || 0;
      const startedAt = performance.now();
      const duration = 950 + Math.random() * 250;
      const step = now => {
        const t = Math.min(1, (now - startedAt) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const value = Math.round(target * eased);
        node.textContent = pad ? String(value).padStart(pad, "0") : String(value);
        if (t < 1) window.requestAnimationFrame(step);
      };
      window.requestAnimationFrame(step);
    });
    window.setTimeout(runCounters, preloader && !preloader.classList.contains("is-done") ? 1150 : 150);
  }

  /* --- rotating hero words --- */
  const heroEm = document.querySelector("#hero-em");
  if (heroEm && !reduce) {
    const words = ["make sense.", "take shape.", "be obvious.", "move fast."];
    let wordIndex = 0;
    window.setInterval(() => {
      if (document.hidden) return;
      wordIndex = (wordIndex + 1) % words.length;
      heroEm.classList.add("is-switching");
      window.setTimeout(() => {
        heroEm.textContent = words[wordIndex];
        heroEm.classList.remove("is-switching");
      }, 230);
    }, 4200);
  }

  /* --- scrolled header + back-to-top with progress --- */
  const toTop = document.querySelector(".to-top");
  let scrollFrame = 0;
  let cursorNearTop = false;
  let headerHideTimer = 0;
  const onScroll = () => {
    scrollFrame = 0;
    const y = window.scrollY || window.pageYOffset || 0;
    const scrolled = y > 14;
    root.classList.toggle("is-scrolled", scrolled);
    if (!scrolled) {
      if (headerHideTimer) {
        window.clearTimeout(headerHideTimer);
        headerHideTimer = 0;
      }
      root.classList.remove("header-hidden");
    } else if (finePointer && !cursorNearTop) {
      root.classList.add("header-hidden");
    }
    if (toTop) {
      root.classList.toggle("show-to-top", y > 620);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      toTop.style.setProperty("--to-top-progress", max > 0 ? String(Math.min(1, y / max)) : "0");
    }
  };
  if (finePointer) {
    window.addEventListener("pointermove", event => {
      if (event.clientY <= 96) {
        cursorNearTop = true;
        if (headerHideTimer) {
          window.clearTimeout(headerHideTimer);
          headerHideTimer = 0;
        }
        root.classList.remove("header-hidden");
      } else {
        cursorNearTop = false;
        if (root.classList.contains("is-scrolled") && !headerHideTimer) {
          headerHideTimer = window.setTimeout(() => {
            headerHideTimer = 0;
            if (!cursorNearTop && root.classList.contains("is-scrolled")) {
              root.classList.add("header-hidden");
            }
          }, 220);
        }
      }
    }, { passive: true });
    document.documentElement.addEventListener("mouseleave", () => {
      cursorNearTop = false;
      if (headerHideTimer) {
        window.clearTimeout(headerHideTimer);
        headerHideTimer = 0;
      }
      if (root.classList.contains("is-scrolled")) {
        root.classList.add("header-hidden");
      }
    });
  }
  window.addEventListener("scroll", () => {
    if (!scrollFrame) scrollFrame = window.requestAnimationFrame(onScroll);
  }, { passive: true });
  scrollFrame = window.requestAnimationFrame(onScroll);
  if (toTop) toTop.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  });

  /* --- language donut hover/focus sync --- */
  const langPanel = document.querySelector(".lang-chart-panel");
  if (langPanel) {
    const slices = Array.from(langPanel.querySelectorAll(".lang-slice"));
    const rows = Array.from(langPanel.querySelectorAll(".lang-row"));
    const centerVal = langPanel.querySelector("[data-donut-value]");
    const centerLabel = langPanel.querySelector("[data-donut-label]");
    const defaultVal = centerVal ? centerVal.textContent : "";
    const defaultLabel = centerLabel ? centerLabel.textContent : "";

    const highlightLang = key => {
      langPanel.classList.toggle("is-filtering", Boolean(key));
      slices.forEach(slice => slice.classList.toggle("is-active", slice.dataset.lang === key));
      rows.forEach(rowEl => rowEl.classList.toggle("is-active", rowEl.dataset.lang === key));
      const activeSlice = key ? slices.find(slice => slice.dataset.lang === key) : null;
      if (centerVal) centerVal.textContent = activeSlice ? activeSlice.dataset.value : defaultVal;
      if (centerLabel) centerLabel.textContent = activeSlice ? activeSlice.dataset.label : defaultLabel;
    };

    [...slices, ...rows].forEach(el => {
      el.addEventListener("pointerenter", () => highlightLang(el.dataset.lang));
      el.addEventListener("focus", () => highlightLang(el.dataset.lang));
      el.addEventListener("pointerleave", () => highlightLang(null));
      el.addEventListener("blur", () => highlightLang(null));
    });
  }
})();
