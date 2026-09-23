# liammackenzie.net

Hi, I'm Liam, a product designer in Calgary. This is the code behind my
portfolio at [liammackenzie.net](https://liammackenzie.net).

It's a small, hand-built site: plain HTML, CSS and a little JavaScript. No
framework and no build step, so what's in these files is exactly what your
browser gets.

## What's in here

- The homepage, plus three case studies in `work/`: the Proposify pricing
  catalog, the Proposify proposal editor, and home reservations at Ownly.
- A few smaller pages: freelance, about, contact, and sound, which is my
  music project, Metro Syndicate.
- One stylesheet (`css/styles.css`) and one script (`js/main.js`) that every
  page shares, with images and icons in `assets/`.

Most of the product screens in the case studies aren't screenshots. They're
built in HTML and CSS, and a couple are interactive: try the Build & Price
configurator on the Ownly page, or the optional line item in the editor's
pricing table.

## Running it locally

The pages link to files like `/css/styles.css`, so they need a small local
server instead of being opened straight from the folder. From this folder:

```sh
python3 -m http.server 8000
```

Then visit <http://localhost:8000>. In VS Code, the Live Server extension does
the same thing.

## Publishing

Anything pushed to `main` goes live through GitHub Pages in about a minute.

## Say hi

If you're hiring, or have a project in mind, the best way to reach me is
through [liammackenzie.net/contact](https://liammackenzie.net/contact/).
