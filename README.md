Project: Static multilingual portfolio site for artist Tatyana Zarapina

Live stack: HTML + CSS + Vanilla JS (no backend). Multilingual via JSON. Gallery data in data/artworks.json. Ready for GitHub Pages.

Structure
- index.html — home page with sections: Home, Selected works, About, Contacts
- gallery.html — dedicated Gallery page with lightbox
- assets/css/styles.css — styles (includes scroll reveal animations)
- assets/js/app.js — i18n, gallery rendering, lightbox, scroll-triggered animations
- locales/en.json, pl.json, ru.json — UI translations
- data/artworks.json — artworks list (filename + featured flag)
- images/ — put your images here (already provided list)
- robots.txt, sitemap.xml — SEO files (update your domain)
- .nojekyll — ensures GitHub Pages doesn’t process with Jekyll

Quick start
1) Place images into images/ as specified.
2) Open index.html locally to preview the homepage; open gallery.html to preview the gallery.
3) Edit locales/*.json to adjust texts in three languages.
4) Edit data/artworks.json to add/remove works. Only two fields are required:
   - id: number (just increment)
   - filename: path to image (e.g., images/photo_2025-...jpg)
   - featured: true/false (optional; shows on the home Selected works block)

Notes
- There are no captions, titles, years, mediums, or categories. All images are shown without textual descriptions.
- Images are lazy-loaded. Keep image sizes optimized (<= 2000px longest side, JPEG quality ~80) to ensure fast load.
- Lightbox supports keyboard arrows and Esc.
- Scroll-triggered animations are IntersectionObserver-based and light-weight.

Deploy to GitHub Pages
- Create a new repository and push all files.
- In repository Settings → Pages → select Branch: main (or master), folder: /root.
- Wait for publish. Your site will be available at https://<username>.github.io/<repo>/
- Update robots.txt and sitemap.xml with the published URL.

How to add a new work
1) Add image file to images/ (WebP recommended additionally if you have it; current setup uses provided JPEGs).
2) Append an object entry to data/artworks.json with the required fields (see existing entries for example).
3) No build step required; just refresh the page.
