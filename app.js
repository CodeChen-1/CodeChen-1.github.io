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
  const demoTimers = new WeakMap();
  let revealObserver = null;
  let sectionRailFrame = 0;
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
      updateActiveSection();
    });
  }

  function refreshSectionNavigation() {
    sectionLinks.forEach(link => {
      const section = document.querySelector(link.hash);
      const available = Boolean(section && !section.hidden);
      link.hidden = !available;
    });
    updateSectionRailBounds();
    updateActiveSection();
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
    } else if (project.visual === "data") {
      const dashboard = make("div", "art-data-dashboard");
      dashboard.setAttribute("aria-hidden", "true");
      const header = make("div", "art-data-head");
      add(header, make("strong", "", "AUSTRALIA / ROAD SAFETY"), make("span", "", "2020—24"));

      const panels = make("div", "art-data-panels");
      const mapPanel = make("div", "art-data-panel art-data-map-panel");
      mapPanel.appendChild(make("span", "art-data-label", "STATE MAP"));
      const map = make("div", "art-data-map");
      map.appendChild(make("i", "art-data-land"));
      for (let n = 0; n < 4; n += 1) map.appendChild(make("i", "art-data-pin"));
      mapPanel.appendChild(map);

      const chartPanel = make("div", "art-data-panel art-data-chart-panel");
      chartPanel.appendChild(make("span", "art-data-label", "ENFORCEMENT TRENDS"));
      const chart = make("div", "art-data-chart");
      [["20", 42], ["21", 60], ["22", 48], ["23", 78], ["24", 66]].forEach(([year, height]) => {
        const column = make("div", "art-data-column");
        column.style.setProperty("--bar-height", height + "%");
        add(column, make("i"), make("span", "", year));
        chart.appendChild(column);
      });
      chartPanel.appendChild(chart);
      add(panels, mapPanel, chartPanel);

      const footer = make("div", "art-data-foot", "FINES  /  TESTS  /  DETECTIONS");
      add(dashboard, header, panels, footer);
      art.appendChild(dashboard);
    } else if (project.visual === "progress") {
      const panel = make("div", "art-progress-panel");
      const status = make("div", "art-progress-status");
      add(status, make("i"), make("strong", "", "In development"));
      const details = make("div", "art-progress-meta");
      add(details,
        row("art-progress-row", "SOURCE FILES", project.hasSource ? "PUBLIC" : "NOT PUBLIC YET"),
        row("art-progress-row", "README", project.hasReadme ? "AVAILABLE" : "NOT AVAILABLE YET")
      );
      add(panel, status, make("div", "art-progress-divider"), details);
      art.appendChild(panel);
    }
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
    const footer = make("div", "project-footer");
    const progressNote = project.hasSource
      ? "Public source files; README not available yet."
      : "Source files and README not public yet.";
    const note = project.testing || (project.isInProgress ? progressNote : (project.category === "vision" ? "See the repository README for requirements and setup." : ""));
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
    return orderedProjects.filter(project => {
      const categoryMatches = activeCategory === "all" || project.category === activeCategory;
      const haystack = [project.name, project.title, project.kind, project.state, project.description]
        .concat(project.features, project.stack).join(" ").toLowerCase();
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
      const matchingCount = progressMatches.length;
      const title = matchingCount === 1 ? "Your match is in progress." : "Your matches are in progress.";
      const message = matchingCount === 1
        ? "The matching repository is listed in the In progress section."
        : "The matching repositories are listed in the In progress section.";
      const jumpLink = make("a", "in-progress-result-link", "Jump to in-progress projects ↓");
      jumpLink.href = "#in-progress";
      add(empty, make("strong", "", title), make("span", "", message), jumpLink);
      grid.appendChild(empty);
    } else {
      showcaseMatches.forEach((project, matchIndex) => {
        grid.appendChild(makeCard(project, matchIndex));
      });
    }
    progressMatches.forEach((project, matchIndex) => {
      progressGrid.appendChild(makeCard(project, matchIndex));
    });
    count.textContent = searchTerm || activeCategory !== "all"
      ? "Showing " + matches.length + " of " + orderedProjects.length + " repositories · " + showcaseMatches.length + " completed · " + progressMatches.length + " in progress"
      : orderedProjects.length + " repositories · " + showcaseMatches.length + " completed · " + progressMatches.length + " in progress";
    observeReveals();
  }

  sectionLinks.forEach(link => link.addEventListener("click", () => setActiveSection(link.hash.slice(1))));
  updateActiveSection();
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
