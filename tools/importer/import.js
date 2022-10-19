/* global WebImporter */
/* eslint-disable no-console, class-methods-use-this */

const reorganiseHero = (main, document) => {
  const articleBodyText = document.querySelector('.articleBodyText');
  if (articleBodyText) {
    main.prepend(articleBodyText);
  }

  const heroLegend = document.querySelector('.image-autor');
  if (heroLegend) {
    const p = document.createElement('p');
    const em = document.createElement('em');
    em.innerHTML = heroLegend.innerHTML;
    p.append(em);
    main.prepend(p);
    heroLegend.remove();
  }

  const mainImage = document.querySelector('.main-image');
  if (mainImage) {
    main.prepend(mainImage);
  }

  const video = document.querySelector('.hero-module .video-container');
  if (video) {
    let ref = video.getAttribute('data-video-link-url');
    if (!ref) {
      ref = video.getAttribute('data-video-id');
    } else {
      const a = document.createElement('a');
      a.href = ref;
      a.innerHTML = ref;
      ref = a;
    }
    if (ref) {
      const cells = [['Video'], [ref]];
      const table = WebImporter.DOMUtils.createTable(cells, document);
      main.prepend(table);
    }
  }

  const subtitle = document.querySelector('.subtitle');
  if (subtitle) {
    main.prepend(subtitle);
  }

  const h1 = document.querySelector('h1');
  if (h1 && h1.textContent.trim() !== '') {
    main.prepend(h1);

    const heroImage = document.querySelector('.hero-image');
    if (heroImage) {
      h1.before(heroImage);
    }

    const hr = document.createElement('hr');
    h1.after(hr);
  }
};

const createMetadata = (main, document) => {
  const meta = {};

  const title = document.querySelector('title');
  if (title) {
    meta.Title = title.innerHTML.replace(/[\n\t]/gm, '');
  }

  const desc = document.querySelector('[property="og:description"]');
  if (desc) {
    meta.Description = desc.content;
  }

  const img = document.querySelector('[property="og:image"]');
  if (img) {
    const el = document.createElement('img');
    el.src = img.content;
    meta.Image = el;
  }

  const block = WebImporter.Blocks.getMetadataBlock(document, meta);
  main.append(block);

  return meta;
};

const createRelatedStoriesBlock = (main, document) => {
  const related = document.querySelectorAll('.relatedStories .thumb');
  if (related && related.length > 0) {
    const cells = [];
    cells.push(['Related Stories']);
    const p = document.createElement('p');
    related.forEach((r) => {
      // eslint-disable-next-line no-param-reassign
      let ref = r.getAttribute('href');
      if (!ref) {
        ref = r.getAttribute('data-video-link');
      }
      const a = document.createElement('a');
      a.href = ref;
      a.innerHTML = ref;
      p.append(a);
      p.append(document.createElement('br'));
    });
    cells.push([p]);
    const table = WebImporter.DOMUtils.createTable(cells, document);
    main.append(table);
  }
};

const ticketSummaryToColumnsBlock = (main, document) => {
  const items = document.querySelectorAll('.ticketSummary .item');
  if (items && items.length > 0) {
    const cells = [];
    cells.push(['Columns']);
    let lastItem = null;
    items.forEach((item, index) => {
      const media = item.querySelector('.media');
      const info = item.querySelector('.info');

      const title = info.querySelector('.info-title');
      if (title) {
        const h2 = document.createElement('h2');
        h2.innerHTML = title.innerHTML;
        title.replaceWith(h2);
      }

      if (item.classList.contains('flipped')) {
        cells.push([info, media]);
      } else {
        cells.push([media, info]);
      }

      if (index === items.length - 1) {
        lastItem = item;
      } else {
        item.remove();
      }
    });
    const table = WebImporter.DOMUtils.createTable(cells, document);
    lastItem.replaceWith(table);
  }
};

const makeAbsoluteLinks = (main, host, base) => {
  main.querySelectorAll('a').forEach((a) => {
    if (a.href.startsWith('/')) {
      const ori = a.href;
      const u = new URL(a.href, host);
      if (base && u.pathname.startsWith(base)) {
        u.pathname = u.pathname.substring(base.length);
      }
      u.pathname = u.pathname.replace(/\.html$/, '').toLocaleLowerCase();
      a.href = u.toString();

      if (a.textContent === ori) {
        a.textContent = a.href;
      }
    }
  });
};

const makeProxySrcs = (main, host) => {
  main.querySelectorAll('img').forEach((img) => {
    if (img.src.startsWith('/')) {
      // make absolute
      const cu = new URL(host);
      img.src = `${cu.origin}${img.src}`;
    }
    try {
      const u = new URL(img.src);
      if (u.origin === host) {
        u.searchParams.append('host', u.origin);
        img.src = `http://localhost:3001${u.pathname}${u.search}`;
      }
    } catch (error) {
      console.warn(`Unable to make proxy src for ${img.src}: ${error.message}`);
    }
  });
};

export default {
  /**
   * Apply DOM operations to the provided document and return
   * the root element to be then transformed to Markdown.
   * @param {HTMLDocument} document The document
   * @returns {HTMLElement} The root element
   */
  transformDOM: ({ document, params }) => {
    const main = document.querySelector('.page-container') || document.querySelector('.page');

    reorganiseHero(main, document);
    createRelatedStoriesBlock(main, document);
    createMetadata(main, document);
    ticketSummaryToColumnsBlock(main, document);

    WebImporter.DOMUtils.remove(main, [
      '.hero-module',
      '.relatedStories',
      '.headerIParsys',
    ]);

    // remove the empty li / ul and replace by divs
    main.querySelectorAll('ul').forEach((l) => {
      if (l.textContent.trim() === '') {
        l.remove();
      } else {
        const div = document.createElement('div');
        div.innerHTML = l.outerHTML
          .replace(/<li/gm, '<div')
          .replace(/<\/li>/gm, '</div>')
          .replace(/<ul/gm, '<div')
          .replace(/<\/ul>/gm, '</div>');
        l.replaceWith(div);
      }
    });

    const u = new URL(params.originalURL);
    makeProxySrcs(main, u.origin);

    if (u.pathname.startsWith('/tournaments/sentry-tournament-of-champions')) {
      makeAbsoluteLinks(main, 'https://main--pga-sentry-tournament-of-champions--hlxsites.hlx.page', '/tournaments/sentry-tournament-of-champions');
    } else if (u.pathname.startsWith('/tournaments/wgc-dell-technologies-match-play')) {
      makeAbsoluteLinks(main, 'https://main--pga-wgc-dell-technologies-match-play--hlxsites.hlx.page', '/tournaments/wgc-dell-technologies-match-play');
    } else if (u.pathname.startsWith('/tournaments/fedex-st-jude-championship')) {
      makeAbsoluteLinks(main, 'https://main--pga-fedex-st-jude-championship--hlxsites.hlx.page', '/tournaments/fedex-st-jude-championship');
    } else if (u.pathname.startsWith('/tournaments/tour-championship')) {
      makeAbsoluteLinks(main, 'https://main--pga-tour-championship--hlxsites.hlx.page', '/tournaments/tour-championship');
    } else if (u.pathname.startsWith('/tournaments/the-cj-cup')) {
      makeAbsoluteLinks(main, 'https://main--pga-the-cj-cup--hlxsites.hlx.page', '/tournaments/the-cj-cup');
    } else if (u.pathname.startsWith('/tournaments/mitsubishi-electric-championship-at-hualalai')) {
      makeAbsoluteLinks(main, 'https://main--pga-mitsubishi-electric-championship--hlxsites.hlx.page', '/champions/tournaments/mitsubishi-electric-championship-at-hualalai');
    } else if (u.pathname.startsWith('/tournaments/bridgestone-senior-players-championship')) {
      makeAbsoluteLinks(main, 'https://main--pga-kaulig-companies-championship--hlxsites.hlx.page', '/champions/tournaments/kaulig-companies-championship');
    } else if (u.pathname.startsWith('/tournaments/dominion-energy-charity-classic')) {
      makeAbsoluteLinks(main, 'https://main--pga-dominion-energy-charity-classic--hlxsites.hlx.page', '/champions/tournaments/dominion-energy-charity-classic');
    } else if (u.pathname.startsWith('/tournaments/charles-schwab-cup-championship')) {
      makeAbsoluteLinks(main, 'https://main--pga-charles-schwab-cup-championship--hlxsites.hlx.page', '/champions/tournaments/charles-schwab-cup-championship');
    } else {
      makeAbsoluteLinks(main, 'https://www.theplayers.com/');
    }

    return main;
  },

  /**
   * Return a path that describes the document being transformed (file name, nesting...).
   * The path is then used to create the corresponding Word document.
   * @param {String} url The url of the document being transformed.
   * @param {HTMLDocument} document The document
   */
  // eslint-disable-next-line arrow-body-style
  generateDocumentPath: ({ url }) => {
    return new URL(url).pathname.replace(/\.html$/, '').toLocaleLowerCase();
  },
};
