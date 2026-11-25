# CodeChen-1 — Software portfolio

A static, responsive portfolio for the public repositories owned by [CodeChen-1](https://github.com/CodeChen-1). Each project card summarizes its purpose and main workflows from the repository README; the empty Smart-Download-Manager repository is included with its current status.

## Preview locally

Open index.html in a browser, or serve the folder over HTTP with:

    py -m http.server 4173

Then open http://localhost:4173.

## Publish

This is a static HTML, CSS, and JavaScript site. It can be published from the root of the main branch with GitHub Pages. A user site repository named CodeChen-1.github.io publishes at https://CodeChen-1.github.io.

## Files

- index.html — page structure and metadata
- styles.css — responsive visual system and project diagrams
- projects.js — project descriptions and repository links
- app.js — rendering, category filters, search, and card tilt
- hero-3d.js — procedural Three.js hero backdrop (loaded as an ES module)
- orbit-3d.js — interactive 3D project constellation map (loaded as an ES module)
- favicon.svg — compact portfolio mark
- .nojekyll — tells Pages to serve this as plain static files