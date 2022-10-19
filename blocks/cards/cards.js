import { createOptimizedPicture, readBlockConfig, lookupPages } from '../../scripts/scripts.js';

function decorateChampionCardsFeed(champions, block) {
  block.classList.add('two-cols');
  // eslint-disable-next-line no-param-reassign
  champions = champions.sort((a, b) => {
    const aYear = parseInt(a.title.split(' ').pop(), 10);
    const bYear = parseInt(b.title.split(' ').pop(), 10);
    return (aYear > bYear) ? -1 : 1;
  });
  champions.forEach((champion) => {
    const year = champion.title.split(' ').pop();
    const name = champion.title.replace('THE PLAYERS Championship:', '').replace(year, '').trim();
    const card = document.createElement('div');
    card.innerHTML = `<div>
        <a href="${champion.path}">${createOptimizedPicture(champion.image).outerHTML}</a>
      </div>
      <div>${year ? `<p class="cards-card-bubble-wrapper"><u class="cards-card-bubble">${year}</u></p>` : ''}<h3><a href="${champion.path}">${name}</a></h3></div>`;
    block.append(card);
  });
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  if (config.source && config.type) {
    block.innerHTML = '';
    const pages = await lookupPages();
    const items = pages.filter((e) => e.path.startsWith(config.source));
    if (items) {
      const type = config.type.toLowerCase();
      if (type === 'champions') decorateChampionCardsFeed(items, block);
    }
  }

  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.innerHTML = row.innerHTML;
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-card-image';
      else {
        div.className = 'cards-card-body';
        const bubble = div.querySelector('u');
        if (bubble) {
          bubble.className = 'cards-card-bubble';
          bubble.closest('p').className = 'cards-card-bubble-wrapper';
        }
        const subtitle = div.querySelector('h2 + p > strong');
        if (subtitle && subtitle.parentNode.textContent === subtitle.textContent) {
          const title = div.querySelector('h2');
          const titleWrapper = document.createElement('div');
          titleWrapper.className = 'cards-card-title';
          titleWrapper.append(title.cloneNode(true), subtitle.parentNode);
          title.replaceWith(titleWrapper);
        }
        const country = div.querySelector('.icon[class*=icon-flag-]');
        if (country) {
          country.closest('p').classList.add('cards-card-country');
          div.classList.add('cards-card-country-wrapper');
        }
        const list = div.querySelector('ul, ol');
        if (list) {
          const links = document.createElement('div');
          links.className = 'cards-card-links';
          links.append(list);
          div.after(links);
        }
      }
    });
    ul.append(li);
  });
  ul.querySelectorAll('img').forEach((img) => img.closest('picture').replaceWith(createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }])));
  block.textContent = '';
  block.append(ul);
}
