/* =========================================================
   Liam Mackenzie - portfolio
   Shared behaviour for every page. Loaded with `defer`, so the
   document is parsed before this runs. No framework, no build step.
   ========================================================= */

/* The site used to be one page with #page-<name> links (e.g. /#page-cpq).
   Send those to the real page, so a link shared before the split still
   lands in the right place. */
(function () {
  var routes = {
    home: '/', cpq: '/work/proposify-cpq/', editor: '/work/proposify-editor/',
    ownly: '/work/ownly/', freelance: '/freelance/', sound: '/sound/',
    about: '/about/', contact: '/contact/'
  };
  var m = (location.hash || '').match(/^#page-([a-z]+)$/);
  if (m && routes[m[1]]) location.replace(routes[m[1]]);
})();

document.addEventListener('DOMContentLoaded', () => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const revealAll = () => {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
    document.querySelectorAll('.rw').forEach((el) => el.classList.add('in'));
  };

  // Failsafe: if anything below throws, or an observer never fires,
  // force everything visible rather than leaving a blank page.
  window.addEventListener('error', revealAll);
  setTimeout(() => {
    document.querySelectorAll('.reveal:not(.in)').forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('in');
    });
    document.querySelectorAll('.rw:not(.in)').forEach((el) => {
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('in');
    });
  }, 2500);

  try {

  /* ---------- word-by-word reveal ----------
     Walks text nodes so inline children (e.g. a gradient <span>)
     survive the split. Only generated .w spans get animated. */
  const splitWords = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode);

    texts.forEach((node) => {
      if (!node.nodeValue.trim()) return;
      const frag = document.createDocumentFragment();
      node.nodeValue.split(/(\s+)/).forEach((chunk) => {
        if (!chunk) return;
        if (/^\s+$/.test(chunk)) {
          frag.appendChild(document.createTextNode(chunk));
        } else {
          const s = document.createElement('span');
          s.className = 'w';
          s.textContent = chunk;
          frag.appendChild(s);
        }
      });
      node.parentNode.replaceChild(frag, node);
    });

    root.querySelectorAll('.w').forEach((w, i) => {
      w.style.setProperty('--wd', `${i * 42}ms`);
    });
  };

  document.querySelectorAll('.rw').forEach((el) => {
    splitWords(el);
    if (reduced || !('IntersectionObserver' in window)) {
      el.classList.add('in');
      return;
    }
    if (el.dataset.rwNow !== undefined) {
      requestAnimationFrame(() => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); }
      });
    }, { threshold: 0.25 });
    io.observe(el);
  });

  /* ---------- spotlight cards ----------
     Pointer position is written to --mx/--my, which drives both the
     radial wash and the bright segment of the top hairline, so the two
     read as one light source rather than two effects.

     The rect is measured once on enter rather than on every move: a
     getBoundingClientRect per pointermove is a layout read per frame,
     and there is nothing about a hover that can change the card's box.
     If this never runs the card is still a perfectly readable bordered
     card, and the hairline simply centres itself. */
  if (!reduced && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.sc').forEach((card) => {
      let rect = null;
      card.addEventListener('pointerenter', () => {
        rect = card.getBoundingClientRect();
      });
      card.addEventListener('pointerleave', () => {
        rect = null;
      });
      card.addEventListener('pointermove', (e) => {
        if (!rect) rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
        card.style.setProperty('--my', `${e.clientY - rect.top}px`);
      });
    });
  }

  /* ---------- the crate: the pointer is a light source ----------
     The lattice itself is CSS. This adds the interaction the Kallax
     lab's crate variant is built around: cubes near the cursor light
     up. Cell centres are computed once per layout and cached, and a
     move only writes one custom property per cube inside a rAF, so
     there is no layout read per frame and no work at all when the
     pointer is elsewhere on the page. */
  if (!reduced && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.hero-crate').forEach((crate) => {
      const hero = crate.parentElement;
      if (!hero) return;

      const cell = parseInt(getComputedStyle(crate).getPropertyValue('--cell'), 10) || 128;
      let cubes = [], cx = [], cy = [], rect = null, raf = 0;
      let px = -1e5, py = -1e5;

      // Before first layout the crate can measure 0x0, and building at
      // that size yields a single cube stuck in the corner. Only build at
      // a real size; the observer below catches the first real layout
      // and builds then.
      const build = () => {
        const r = crate.getBoundingClientRect();
        if (!r.width || !r.height) {
          cubes = []; cx = []; cy = [];
          crate.textContent = '';
          return;
        }
        const cols = Math.ceil(r.width / cell) + 1;
        const rows = Math.ceil(r.height / cell) + 1;
        const frag = document.createDocumentFragment();
        cubes = []; cx = []; cy = [];
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const c = document.createElement('i');
            c.className = 'cube';
            c.style.left = (x * cell) + 'px';
            c.style.top = (y * cell) + 'px';
            frag.appendChild(c);
            cubes.push(c);
            cx.push(x * cell + cell / 2);
            cy.push(y * cell + cell / 2);
          }
        }
        crate.textContent = '';
        crate.appendChild(frag);
      };

      // Proximity falls off over roughly two cubes, so a handful light
      // at once and the pool moves with the cursor rather than blinking
      // cube to cube.
      const reach = cell * 2.4;
      const paint = () => {
        raf = 0;
        for (let i = 0; i < cubes.length; i++) {
          const dx = cx[i] - px, dy = cy[i] - py;
          const d = Math.sqrt(dx * dx + dy * dy);
          cubes[i].style.setProperty('--p', d > reach ? '0' : (1 - d / reach).toFixed(3));
        }
      };
      const schedule = () => { if (!raf) raf = requestAnimationFrame(paint); };

      hero.addEventListener('pointerenter', () => { rect = crate.getBoundingClientRect(); });
      hero.addEventListener('pointerleave', () => {
        rect = null; px = py = -1e5; schedule();
      });
      hero.addEventListener('pointermove', (e) => {
        if (!rect) rect = crate.getBoundingClientRect();
        px = e.clientX - rect.left;
        py = e.clientY - rect.top;
        schedule();
      });

      // One code path covers both reasons the crate changes size: the
      // window resizing, and the crate going from 0x0 to its real size
      // on first layout. The first real measurement
      // builds immediately, so the cubes are live before the pointer
      // can reach them; every later change debounces as before.
      let resizeTimer = 0;
      const rebuild = () => {
        if (!cubes.length) { build(); rect = null; return; }
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { build(); rect = null; }, 200);
      };
      if ('ResizeObserver' in window) {
        new ResizeObserver(rebuild).observe(crate);
      } else {
        window.addEventListener('resize', rebuild);
      }

      build();
    });
  }

  /* ---------- staggered scroll reveal ---------- */
  const items = document.querySelectorAll('.reveal');
  if (items.length) {
    if (reduced || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('in'));
    } else {
      const io = new IntersectionObserver((entries) => {
        entries.filter((e) => e.isIntersecting).forEach((entry, i) => {
          entry.target.style.setProperty('--d', `${Math.min(i, 4) * 90}ms`);
          entry.target.classList.add('in');
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      items.forEach((el) => io.observe(el));
    }
  }

  /* ---------- reading progress on case studies ----------
     The bar is animated by a CSS scroll timeline, so this only has to
     put the element on the page. No scroll listener, no per-frame work. */
  if (document.querySelector('.study-hero')) {
    const bar = document.createElement('div');
    bar.className = 'progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
  }

  /* ---------- helpers ---------- */
  const money = (n) => '$' + n.toLocaleString('en-US');
  const bump = (el) => {
    if (reduced || !el) return;
    el.classList.remove('bump');
    void el.offsetWidth; // restart the transition
    el.classList.add('bump');
    setTimeout(() => el.classList.remove('bump'), 320);
  };

  /* ---------- live Build & Price configurator ---------- */
  document.querySelectorAll('.mock-config[data-interactive]').forEach((cfg) => {
    const base = parseInt(cfg.dataset.base, 10) || 0;
    const out = cfg.querySelector('.price-total .num');

    const recalc = () => {
      let total = base;
      cfg.querySelectorAll('.option-row.selected').forEach((row) => {
        total += parseInt(row.dataset.price, 10) || 0;
      });
      out.textContent = money(total);
      bump(out);
    };

    cfg.querySelectorAll('.option-group').forEach((group) => {
      group.querySelectorAll('.option-row').forEach((row) => {
        row.setAttribute('role', 'button');
        row.setAttribute('tabindex', '0');
        const choose = () => {
          group.querySelectorAll('.option-row').forEach((r) => r.classList.remove('selected'));
          row.classList.add('selected');
          recalc();
        };
        row.addEventListener('click', choose);
        row.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(); }
        });
      });
    });

    recalc();
  });

  /* ---------- toggleable optional line items (pricing table) ---------- */
  document.querySelectorAll('table[data-pricing]').forEach((table) => {
    const out = table.parentElement.querySelector('.subtotal-val');
    if (!out) return;
    const discount = parseFloat(table.dataset.discount || '0');

    const recalc = () => {
      let sum = 0;
      table.querySelectorAll('tr[data-price]').forEach((row) => {
        const optional = row.hasAttribute('data-optional');
        if (!optional || row.classList.contains('on')) {
          sum += parseInt(row.dataset.price, 10) || 0;
        }
      });
      out.textContent = 'Subtotal ' + money(Math.round(sum * (1 - discount)));
      bump(out);
    };

    table.querySelectorAll('tr[data-optional]').forEach((row) => {
      row.setAttribute('role', 'button');
      row.setAttribute('tabindex', '0');
      const toggle = () => {
        row.classList.toggle('on');
        const on = row.classList.contains('on');
        // The line always shows what it would cost. Only whether it counts
        // toward the subtotal changes, which the unselected styling carries.
        recalc();
      };
      row.addEventListener('click', toggle);
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });

    recalc();
  });

  } catch (err) {
    // Never let a scripting failure hide the content.
    revealAll();
    console.error('portfolio init failed:', err);
  }
});

/* About dropdown: click/tap toggles, Escape or a click elsewhere closes,
   and following any link closes it so it never lingers over a new page. */
(function () {
  var dds = document.querySelectorAll('.site-nav .dd');
  function closeAll(except) {
    dds.forEach(function (dd) {
      if (dd === except) return;
      dd.classList.remove('open');
      dd.querySelector('.dd-btn').setAttribute('aria-expanded', 'false');
    });
  }
  dds.forEach(function (dd) {
    var btn = dd.querySelector('.dd-btn');
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = !dd.classList.contains('open');
      closeAll(dd);
      dd.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
    dd.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { closeAll(); if (document.activeElement) document.activeElement.blur(); });
    });
  });
  document.addEventListener('click', function () { closeAll(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeAll(); }
  });
  window.addEventListener('hashchange', function () { closeAll(); });
})();

/* Mail links. Hosted as its own page, a mailto: link opens the visitor's
   mail app and this stays out of the way apart from also copying the
   address. Inside a sandboxed frame (the Claude preview is one) the frame
   is not allowed to hand off to a mail app, and following the link
   blanks the page instead. There the navigation is cancelled and the
   address is copied, so a click is never a dead end or a blank screen. */
(function () {
  var toast, timer;
  function show(addr, framed) {
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }
    toast.innerHTML = (framed ? 'Email address copied: ' : 'Opening your mail app. Address copied: ') + '<b></b>';
    toast.querySelector('b').textContent = addr;
    toast.classList.add('show');
    clearTimeout(timer);
    timer = setTimeout(function () { toast.classList.remove('show'); }, 3200);
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="mailto:"]');
    if (!a) return;
    var addr = decodeURIComponent(a.getAttribute('href').slice(7).split('?')[0]);
    var framed = false;
    try { framed = window.self !== window.top; } catch (err) { framed = true; }
    if (framed) e.preventDefault();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(addr).catch(function () {});
      }
    } catch (err) {}
    show(addr, framed);
  });
})();
