(() => {
  "use strict";

  const projects = Array.isArray(window.PORTFOLIO_PROJECTS) ? window.PORTFOLIO_PROJECTS : [];
  const showcaseProjects = projects.filter(project => !project.isInProgress);
  const grid = document.querySelector("#project-grid");
  const progressSection = document.querySelector("#in-progress");
  const progressGrid = document.querySelector("#in-progress-grid");
  const count = document.querySelector("#project-count");
  const search = document.querySelector("#project-search");
  const filters = Array.from(document.querySelectorAll(".filter-button"));
  const sectionLinks = Array.from(document.querySelectorAll("[data-section-link]"));
  const sectionRail = document.querySelector(".section-rail");
  const main = document.querySelector("#main");
  const spotlight = document.querySelector(".spotlight");
  const spotlightView = document.querySelector("#spotlight-view");
  const spotlightStage = document.querySelector("#spotlight-stage");
  const spotlightPosition = document.querySelector("#spotlight-position");
  const spotlightKind = document.querySelector("#spotlight-kind");
  const spotlightTitle = document.querySelector("#spotlight-title");
  const spotlightDescription = document.querySelector("#spotlight-description");
  const spotlightStack = document.querySelector("#spotlight-stack");
  const spotlightLink = document.querySelector("#spotlight-link");
  const spotlightPicker = document.querySelector("#spotlight-picker");
  const spotlightKey = "codechen-portfolio-last-featured";
  const prefersMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: no-preference)").matches;
  const demoTimers = new WeakMap();
  let revealObserver = null;
  let sectionObserver = null;
  let sectionRailFrame = 0;
  let selectedSpotlightIndex = -1;
  let spotlightRequest = 0;
  let activeCategory = "all";
  let searchTerm = "";

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

  function setActiveSection(sectionId) {
    sectionLinks.forEach(link => {
      const active = link.hash === "#" + sectionId;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }

  function setupSectionObserver() {
    if (!("IntersectionObserver" in window)) return;
    if (sectionObserver) sectionObserver.disconnect();
    const topInset = Math.round(window.innerHeight * .42);
    const bottomInset = Math.round(window.innerHeight * .5);
    sectionObserver = new IntersectionObserver(entries => {
      const visibleSections = entries.filter(entry => entry.isIntersecting);
      if (!visibleSections.length) return;
      const marker = window.innerHeight * .46;
      const activeEntry = visibleSections.reduce((closest, entry) =>
        Math.abs(entry.boundingClientRect.top - marker) < Math.abs(closest.boundingClientRect.top - marker) ? entry : closest
      );
      setActiveSection(activeEntry.target.id);
    }, { rootMargin: "-" + topInset + "px 0px -" + bottomInset + "px 0px", threshold: 0 });
    sectionLinks.forEach(link => {
      const section = document.querySelector(link.hash);
      if (section && !link.hidden && !section.hidden) sectionObserver.observe(section);
    });
  }

  function updateSectionRailBounds() {
    if (!sectionRail || !main) return;
    const mainBounds = main.getBoundingClientRect();
    const inset = window.innerHeight * .05;
    const bottomLimit = window.innerHeight - inset;
    const top = Math.max(inset, Math.min(mainBounds.top, bottomLimit));
    const bottom = Math.min(bottomLimit, mainBounds.bottom);
    const height = Math.max(0, bottom - top);
    const visibleLinkCount = sectionLinks.filter(link => !link.hidden).length;
    sectionRail.style.setProperty("--section-rail-top", Math.round(top) + "px");
    sectionRail.style.setProperty("--section-rail-height", Math.floor(height) + "px");
    sectionRail.classList.toggle("is-within-main", height >= visibleLinkCount * 36);
  }

  function scheduleSectionRailBounds() {
    if (sectionRailFrame) return;
    sectionRailFrame = window.requestAnimationFrame(() => {
      sectionRailFrame = 0;
      updateSectionRailBounds();
    });
  }

  function refreshSectionNavigation() {
    sectionLinks.forEach(link => {
      const section = document.querySelector(link.hash);
      const available = Boolean(section && !section.hidden);
      link.hidden = !available;
      if (!available) {
        if (section && sectionObserver) sectionObserver.unobserve(section);
        return;
      }
      if (sectionObserver) sectionObserver.observe(section);
    });

    if (!sectionLinks.some(link => !link.hidden && link.classList.contains("is-active"))) {
      const marker = window.innerHeight * .46;
      const nearestSection = sectionLinks
        .filter(link => !link.hidden)
        .map(link => document.querySelector(link.hash))
        .filter(Boolean)
        .sort((left, right) =>
          Math.abs(left.getBoundingClientRect().top - marker) - Math.abs(right.getBoundingClientRect().top - marker)
        )[0];
      if (nearestSection) setActiveSection(nearestSection.id);
    }
    updateSectionRailBounds();
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
    demoTimers.set(scope, window.setTimeout(() => stopDemo(scope), 4800));
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

    if (project.visual === "models") {
      const models = make("div", "art-models");
      [["LR", "Logistic Regression"], ["RF", "Random Forest"], ["HYBRID", "Hybrid model"]].forEach((item, index) => {
        const model = make("div", "art-model");
        add(model, make("b", "", item[0]), make("span", "", item[1]));
        models.appendChild(model);
        if (index < 2) models.appendChild(make("span", "art-link", "→"));
      });
      add(art, models, make("div", "art-outcome", "COMPARE / EXPLAIN"));
    } else if (project.visual === "budget") {
      const budget = make("div", "art-budget");
      [["TRACK", "Expenses"], ["SET", "Category limits"], ["BUILD", "Savings goals"]].forEach(item => {
        const step = make("div", "art-budget-step");
        add(step, make("span", "", item[0]), make("i"), make("strong", "", item[1]));
        budget.appendChild(step);
      });
      art.appendChild(budget);
    } else if (project.visual === "tasks") {
      const list = make("div", "art-task-list");
      [["INBOX", "CAPTURE"], ["TODAY", "TOP 3"], ["CHECKLIST", "NEXT STEP"]].forEach(item => list.appendChild(row("art-task-row", item[0], item[1])));
      art.appendChild(list);
    } else if (project.visual === "parking") {
      const cameras = make("div", "art-cameras");
      const incoming = make("div", "art-camera");
      add(incoming, make("span", "", "IN CAMERA"), make("span", "", "ENTRY FEED"));
      const engine = make("div", "art-engine", "YOLOv8\n+ OCR");
      const outgoing = make("div", "art-camera");
      add(outgoing, make("span", "", "OUT CAMERA"), make("span", "", "EXIT FEED"));
      add(cameras, incoming, engine, outgoing);
      cameras.appendChild(make("div", "art-event", "PLATE TEXT → VEHICLE LOG"));
      art.appendChild(cameras);
    } else if (project.visual === "rental") {
      const cars = make("div", "art-cars");
      const header = make("div", "art-car-header");
      add(header, make("span", "", "AVAILABLE VEHICLES"), make("span", "", "05"));
      const line = make("div", "art-car-line");
      const nodes = make("div", "art-car-nodes");
      ["SELECT", "RENT", "RETURN", "RATE"].forEach(label => nodes.appendChild(make("span", "", label)));
      add(cars, header, line, nodes, make("div", "art-loop", "CREDITS OUT < · > CREDITS BACK"));
      art.appendChild(cars);
    } else if (project.visual === "gymnastics") {
      const routine = make("div", "art-gym");
      const elements = make("div", "art-elements");
      for (let n = 1; n <= 10; n += 1) elements.appendChild(make("i", "", String(n).padStart(2, "0")));
      const score = make("div", "art-score");
      add(score, make("span", "", "ROUTINE COMPLETE"), make("strong", "", "CAP / 20 · −2 ONCE"));
      add(routine, elements, score);
      art.appendChild(routine);
    } else if (project.visual === "scanner") {
      const documentShape = make("div", "art-document");
      const lines = make("div", "art-doc-lines");
      for (let n = 0; n < 4; n += 1) lines.appendChild(make("i"));
      add(documentShape, lines, make("i", "art-scan-beam"));
      const footer = make("div", "art-doc-footer");
      add(footer, make("span", "", "CAPTURE → DETECT"), make("strong", "", "PDF"));
      add(art, documentShape, footer);
    } else if (project.visual === "progress") {
      const panel = make("div", "art-progress-panel");
      const status = make("div", "art-progress-status");
      add(status, make("i"), make("strong", "", "In development"));
      const details = make("div", "art-progress-meta");
      add(details,
        row("art-progress-row", "SOURCE FILES", "NOT PUBLIC YET"),
        row("art-progress-row", "README", "NOT AVAILABLE YET")
      );
      add(panel, status, make("div", "art-progress-divider"), details);
      art.appendChild(panel);
    }
    if (!project.isInProgress) art.appendChild(make("div", "art-demo-progress"));
    return art;
  }

  function saveFeaturedProject(project) {
    try {
      window.localStorage.setItem(spotlightKey, project.name);
    } catch (_) {
      // Storage can be disabled in private browsing; the project picker still works.
    }
  }

  function firstVisitProjectIndex() {
    if (!showcaseProjects.length) return -1;
    let previousName = "";
    try {
      previousName = window.localStorage.getItem(spotlightKey) || "";
    } catch (_) {
      // Fall back to a random selection when storage is unavailable.
    }
    const choices = showcaseProjects
      .map((project, index) => ({ project, index }))
      .filter(entry => showcaseProjects.length < 2 || entry.project.name !== previousName);
    const random = new Uint32Array(1);
    let value = Math.random();
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(random);
      value = random[0] / 4294967296;
    }
    return choices[Math.floor(value * choices.length)].index;
  }

  function buildSpotlightPicker() {
    if (!spotlightPicker) return;
    spotlightPicker.replaceChildren();
    showcaseProjects.forEach((project, index) => {
      const button = make("button", "spotlight-pick");
      button.type = "button";
      button.dataset.projectIndex = String(index);
      button.setAttribute("aria-label", "Feature " + project.title);
      button.setAttribute("aria-pressed", "false");
      add(button,
        make("span", "spotlight-pick-number", String(index + 1).padStart(2, "0")),
        make("span", "spotlight-pick-name", project.title)
      );
      button.addEventListener("click", () => {
        showSpotlight(index, index >= selectedSpotlightIndex ? 1 : -1);
      });
      spotlightPicker.appendChild(button);
    });
  }

  function updateSpotlight(projectIndex) {
    const project = showcaseProjects[projectIndex];
    if (!project || !spotlight) return;
    selectedSpotlightIndex = projectIndex;
    spotlight.dataset.projectTitle = project.title;
    spotlightPosition.textContent = String(projectIndex + 1).padStart(2, "0") + " / " + String(showcaseProjects.length).padStart(2, "0");
    spotlightKind.textContent = project.kind;
    spotlightTitle.textContent = project.title;
    spotlightDescription.textContent = project.description;
    spotlightLink.href = project.repo;
    spotlightLink.setAttribute("aria-label", "Open " + project.name + " on GitHub");
    spotlightStack.replaceChildren();
    project.stack.forEach(label => spotlightStack.appendChild(make("span", "stack-tag", label)));
    spotlightStage.replaceChildren(makeVisual(project));
    const replay = spotlightStage.querySelector(".demo-replay");
    if (replay) replay.addEventListener("click", () => playDemo(spotlight));
    spotlightPicker.querySelectorAll(".spotlight-pick").forEach(button => {
      const selected = Number(button.dataset.projectIndex) === projectIndex;
      button.setAttribute("aria-pressed", String(selected));
      if (selected) button.setAttribute("aria-current", "true");
      else button.removeAttribute("aria-current");
    });
    saveFeaturedProject(project);
  }

  function showSpotlight(projectIndex, direction, initial = false) {
    if (!showcaseProjects.length) return;
    const nextIndex = (projectIndex + showcaseProjects.length) % showcaseProjects.length;
    if (nextIndex === selectedSpotlightIndex && !initial) return;
    const request = ++spotlightRequest;
    selectedSpotlightIndex = nextIndex;
    if (spotlight) stopDemo(spotlight);
    if (initial || !prefersMotion) {
      updateSpotlight(nextIndex);
      return;
    }

    spotlightView.dataset.direction = direction >= 0 ? "next" : "previous";
    if (typeof spotlightView.startViewTransition === "function") {
      const transition = spotlightView.startViewTransition(() => {
        if (request === spotlightRequest) updateSpotlight(nextIndex);
      });
      transition.ready.catch(() => {});
      transition.updateCallbackDone
        .then(() => {
          if (request === spotlightRequest) playDemo(spotlight);
        })
        .catch(() => {});
      return;
    } else {
      updateSpotlight(nextIndex);
      if (typeof Element.prototype.animate === "function") {
        const offset = direction >= 0 ? "18px" : "-18px";
        [spotlightView.querySelector(".spotlight-copy"), spotlightStage].forEach((element, index) => {
          element.animate([
            { opacity: 0, transform: "translateX(" + offset + ")" },
            { opacity: 1, transform: "translateX(0)" }
          ], { duration: index === 0 ? 390 : 500, easing: "cubic-bezier(.2,.75,.25,1)" });
        });
      }
    }
    playDemo(spotlight);
  }

  function playCardDemo(card, project) {
    card.dataset.projectTitle = project.title;
    const replay = card.querySelector(".demo-replay");
    if (replay) replay.addEventListener("click", () => playDemo(card));
  }

  function makeCard(project, index, revealOrder = 0) {
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
    add(topline,
      make("span", "project-number", String(index + 1).padStart(2, "0") + " / " + project.kind),
      make("span", "project-state", project.state)
    );
    const title = make("h3", "", project.title);
    const summary = make("p", "project-description", project.description);
    const features = make("ul", "project-features");
    project.features.forEach(feature => features.appendChild(make("li", "", feature)));
    const stack = make("div", "project-stack");
    stack.setAttribute("aria-label", "Technology stack");
    project.stack.forEach(label => stack.appendChild(make("span", "stack-tag", label)));
    const footer = make("div", "project-footer");
    const note = project.testing || (project.isInProgress ? "Source files and README not public yet." : (project.category === "vision" ? "See the repository README for requirements and setup." : ""));
    const test = make("span", "project-test", note);
    const link = make("a", "repo-link", "View repository");
    link.href = project.repo;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.setAttribute("aria-label", "View " + project.name + " on GitHub");
    link.appendChild(make("span", "", "↗"));
    add(footer, test, link);
    add(content, topline, title, summary);
    if (project.features.length) content.appendChild(features);
    if (project.stack.length) content.appendChild(stack);
    content.appendChild(footer);
    add(article, art, content);
    playCardDemo(article, project);
    return article;
  }

  function matchingProjects() {
    return projects.filter(project => {
      const categoryMatches = activeCategory === "all" || project.category === activeCategory;
      const haystack = [project.name, project.title, project.kind, project.state, project.description]
        .concat(project.features, project.stack).join(" ").toLowerCase();
      return categoryMatches && haystack.includes(searchTerm);
    });
  }

  function clearGrid(container) {
    if (revealObserver) {
      container.querySelectorAll("[data-reveal-observed]").forEach(node => revealObserver.unobserve(node));
    }
    container.querySelectorAll(".project-card").forEach(stopDemo);
    container.replaceChildren();
  }

  function render() {
    const matches = matchingProjects();
    const showcaseMatches = matches.filter(project => !project.isInProgress);
    const progressMatches = matches.filter(project => project.isInProgress);
    clearGrid(grid);
    clearGrid(progressGrid);
    progressSection.hidden = progressMatches.length === 0;
    refreshSectionNavigation();

    if (!matches.length) {
      const empty = make("div", "no-results");
      add(empty, make("strong", "", "No matching projects."), make("span", "", "Try another search or choose another project area."));
      grid.appendChild(empty);
    } else if (!showcaseMatches.length) {
      const empty = make("div", "no-results");
      add(empty, make("strong", "", "No showcase projects match."), make("span", "", "The matching repository appears in the In progress section below."));
      grid.appendChild(empty);
    } else {
      showcaseMatches.forEach((project, matchIndex) => {
        grid.appendChild(makeCard(project, projects.indexOf(project), matchIndex));
      });
    }
    progressMatches.forEach((project, matchIndex) => {
      progressGrid.appendChild(makeCard(project, projects.indexOf(project), matchIndex));
    });
    count.textContent = searchTerm || activeCategory !== "all"
      ? "Showing " + matches.length + " of " + projects.length + " repositories"
      : projects.length + " repositories · " + showcaseMatches.length + " public · " + progressMatches.length + " in progress";
    observeReveals();
  }

  function selectFeatured(index, direction) {
    showSpotlight(index, direction);
  }

  sectionLinks.forEach(link => link.addEventListener("click", () => setActiveSection(link.hash.slice(1))));
  setActiveSection("top");
  setupSectionObserver();
  window.addEventListener("scroll", scheduleSectionRailBounds, { passive: true });
  window.addEventListener("resize", () => {
    if (sectionRailFrame) window.cancelAnimationFrame(sectionRailFrame);
    sectionRailFrame = window.requestAnimationFrame(() => {
      sectionRailFrame = 0;
      setupSectionObserver();
      updateSectionRailBounds();
    });
  }, { passive: true });

  buildSpotlightPicker();
  const initialSpotlightIndex = firstVisitProjectIndex();
  if (initialSpotlightIndex >= 0) {
    updateSpotlight(initialSpotlightIndex);
    playDemo(spotlight);
  }
  document.querySelector("#spotlight-prev").addEventListener("click", () => {
    selectFeatured(selectedSpotlightIndex - 1, -1);
  });
  document.querySelector("#spotlight-next").addEventListener("click", () => {
    selectFeatured(selectedSpotlightIndex + 1, 1);
  });
  spotlight.addEventListener("keydown", event => {
    if (event.target === spotlight || event.target === spotlightView) return;
    if ((event.key === "ArrowLeft" || event.key === "ArrowRight") && !/^(A|BUTTON|INPUT)$/.test(event.target.tagName)) {
      event.preventDefault();
      selectFeatured(selectedSpotlightIndex + (event.key === "ArrowRight" ? 1 : -1), event.key === "ArrowRight" ? 1 : -1);
    }
  });

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
