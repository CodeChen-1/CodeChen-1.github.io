(() => {
  "use strict";

  const projects = Array.isArray(window.PORTFOLIO_PROJECTS) ? window.PORTFOLIO_PROJECTS : [];
  const grid = document.querySelector("#project-grid");
  const count = document.querySelector("#project-count");
  const search = document.querySelector("#project-search");
  const filters = Array.from(document.querySelectorAll(".filter-button"));
  let activeCategory = "all";
  let searchTerm = "";

  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const add = (parent, ...children) => children.forEach(child => child && parent.appendChild(child));
  const row = (className, left, right) => {
    const node = make("div", className);
    add(node, make("span", "", left), make("span", "", right));
    return node;
  };

  function makeVisual(project) {
    const art = make("div", "project-art project-art--" + project.visual);
    art.setAttribute("role", "img");
    art.setAttribute("aria-label", project.visualLabel);
    const kicker = make("div", "art-kicker");
    add(kicker, make("span", "", project.visual === "empty" ? "REPOSITORY STATE" : "FEATURE MAP"));
    if (project.visual !== "empty") add(kicker, make("span", "", "SOURCE / WORKFLOW"));
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
      documentShape.appendChild(lines);
      const footer = make("div", "art-doc-footer");
      add(footer, make("span", "", "CAPTURE → DETECT"), make("strong", "", "PDF"));
      add(art, documentShape, footer);
    } else {
      const folder = make("div", "art-empty-folder");
      add(folder, make("strong", "", "No files found"), document.createTextNode("No source or README available yet."));
      const empty = make("div", "art-empty");
      empty.appendChild(folder);
      art.appendChild(empty);
    }
    return art;
  }

  function makeCard(project, index) {
    const article = make("article", "project-card" + (index === 0 ? " is-featured" : "") + (project.isEmpty ? " is-empty" : ""));
    article.dataset.category = project.category;
    article.dataset.name = project.name;
    const art = makeVisual(project);
    const content = make("div", "project-content");
    const topline = make("div", "project-topline");
    add(topline,
      make("span", "project-number", String(index + 1).padStart(2, "0") + " / " + project.kind),
      make("span", "project-state", project.state)
    );
    const title = make("h3", "", project.title);
    const summary = make("p", "project-description" + (project.isEmpty ? " empty-copy" : ""), project.description);
    const features = make("ul", "project-features");
    project.features.forEach(feature => features.appendChild(make("li", "", feature)));
    const stack = make("div", "project-stack");
    stack.setAttribute("aria-label", "Technology stack");
    project.stack.forEach(label => stack.appendChild(make("span", "stack-tag", label)));
    const footer = make("div", "project-footer");
    const note = project.testing || (project.isEmpty ? "No source files on the default branch." : (project.category === "vision" ? "See the repository README for requirements and setup." : ""));
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
    return article;
  }

  function matchingProjects() {
    return projects.filter(project => {
      const categoryMatches = activeCategory === "all" || project.category === activeCategory;
      const haystack = [project.name, project.title, project.kind, project.description].concat(project.features, project.stack).join(" ").toLowerCase();
      return categoryMatches && haystack.includes(searchTerm);
    });
  }
  function render() {
    const matches = matchingProjects();
    grid.replaceChildren();
    if (!matches.length) {
      const empty = make("div", "no-results");
      add(empty, make("strong", "", "No matching projects."), make("span", "", "Try a different search or choose another project area."));
      grid.appendChild(empty);
    } else {
      matches.forEach(project => grid.appendChild(makeCard(project, projects.indexOf(project))));
    }
    count.textContent = searchTerm || activeCategory !== "all"
      ? "Showing " + matches.length + " of " + projects.length + " public repositories"
      : projects.length + " public repositories · " + projects.filter(project => !project.isEmpty).length + " with source";
  }

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