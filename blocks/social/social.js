import {
  readBlockConfig,
  decorateIcons,
  fetchPlaceholders,
  updateExternalLinks,
} from '../../scripts/scripts.js';

const TWITTER_URL = 'https://twitter.com/';
const INSTAGRAM_URL = 'https://instagram.com/';
const FACEBOOK_URL = 'https://facebook.com/';

function buildProfilesTile(config) {
  const profiles = document.createElement('li');
  profiles.className = 'social-tile-profiles';
  const socialProfiles = document.createElement('div');
  socialProfiles.innerHTML = '<h3>Follow Us</h3><p class="button-container"></p>';
  Object.keys(config).forEach((key) => {
    if (key === 'newsletter') {
      const newsletter = document.createElement('div');
      newsletter.innerHTML = `<h3>Get Updates</h3>
      <p class="button-container">
        <a href="${config[key]}" class="button social-profile"><span class="icon icon-email"></span></a>
      </p>`;
      profiles.append(newsletter);
    } else if (config[key].startsWith('http')) {
      const a = document.createElement('a');
      a.className = 'button social-profile';
      a.href = config[key];
      a.innerHTML = `<span class="icon icon-${key}"></span>`;
      socialProfiles.querySelector('.button-container').append(a);
    }
  });
  if (socialProfiles.querySelector('a')) profiles.append(socialProfiles);
  decorateIcons(profiles);
  return profiles;
}

function wrapInLinks(tweet) {
  const words = tweet.textContent.replace(/\n/g, ' ').split(' ').filter((w) => w);
  words.forEach((word, i) => {
    if (word.startsWith('#')) { // setup hashtag
      words[i] = `<a href="${TWITTER_URL}search?=${word.replace('#', '')}">${word}</a>`;
    } else if (word.startsWith('@')) { // setup mention
      words[i] = `<a href="${TWITTER_URL}${word.replace('@', '')}">${word}</a>`;
    } else if (word.startsWith('.@')) { // setup mention at beginning of tweet
      words[i] = `.<a href="${TWITTER_URL}${word.replace('.@', '')}">${word.replace('.', '')}</a>`;
    } else if (word.startsWith('http')) { // setup link
      words[i] = `<a href="${word}">${word}</a>`;
    }
  });
  tweet.innerHTML = words.join(' ');
}

function writeDate(timestamp) {
  const date = new Date(timestamp);
  const month = date.toString().substring(4, 7);
  const day = date.getDate().toString().padStart(2, '0');
  return `${day} ${month}`;
}

function buildSocialTile(tile, data, network) {
  const profileURL = data.user.profileUrl;
  const grid = document.createElement('div');
  grid.className = `social-tile-grid social-tile social-tile-${network}`;
  // setup header
  const head = document.createElement('div');
  head.className = `social-header social-${network}-header`;
  head.innerHTML = `<a href="${profileURL}" class="social-img social-${network}-img"><img src="${data.user.img.url}" alt="${data.user.name} profile picture" /></a>
     <p class="social-username social-${network}-username"><a href="${profileURL}">${data.user.name}</a></p>
     <a href="${FACEBOOK_URL}" class="social-network social-${network}-network"><span class="icon icon-${network}"></span></a>
     <p class="social-screenname social-${network}-screenname"><a href="${profileURL}">${data.user.handle}</a></p>
     <p class="social-date social-${network}-date">${writeDate(data.created_time)}</p>`;
  grid.append(head);
  // setup  post
  const post = document.createElement('div');
  post.className = `social-post social-${network}-post`;
  post.innerHTML = `<div class="social-post-body social-${network}-post-body">
    <p>${data.message ? data.message : ''}</p>
  </div>`;
  wrapInLinks(post.querySelector('.social-post-body'));
  if (data.media && data.media.src) {
    const img = document.createElement('img');
    img.className = 'social-post-img';
    img.src = data.media.src;
    post.prepend(img);
  }
  grid.append(post);
  tile.append(grid);
}

function buildFacebookTile(tile, data) {
  const { from } = data;
  const profileURL = from.link;
  buildSocialTile(tile, {
    user: {
      profileUrl: profileURL,
      name: from.name,
      handle: from.broadcast_name,
      img: {
        url: from.picture.data.url,
      },
    },
    created_time: data.created_time,
    message: data.message,
    media: {
      src: data?.attachments?.data[0]?.media?.image?.src,
    },
  }, 'facebook');

  // setup facebook footer
  const foot = document.createElement('div');
  foot.className = 'social-tile-footer';
  foot.innerHTML = '';
  tile.append(foot);
}

function buildTwitterTile(tile, data) {
  const { user } = data;
  const profileURL = `${TWITTER_URL}${user.screen_name}`;
  buildSocialTile(tile, {
    user: {
      profileUrl: profileURL,
      name: user.name,
      handle: user.screen_name,
      img: {
        url: user.profile_image_url_https,
      },
    },
    created_time: data.created_at,
    message: data.text,
    media: {
      src: data?.extended_entities?.media[0]?.media_url_https,
    },
  }, 'twitter');

  // setup twitter footer
  const foot = document.createElement('div');
  foot.className = 'social-tile-footer';
  foot.innerHTML = `<a href="${TWITTER_URL}intent/tweet?in_reply_to=${data.id_str}"><span class="icon icon-reply"></span></a>
    <a href="${TWITTER_URL}intent/retweet?tweet_id=${data.id_str}"><span class="icon icon-retweet"></span></a>
    <a href="${TWITTER_URL}intent/favorite?tweet_id=${data.id_str}"><span class="icon icon-like"></span></a>`;
  tile.append(foot);
}

function buildImageTile(tile, data) {
  tile.innerHTML = `<a href="${data.postUrl}"></a>`;
  const a = tile.querySelector('a');
  const image = document.createElement('div');
  image.className = 'social-tile-img';
  image.innerHTML = `<img src="${data.imageUrl}" />`;
  const body = document.createElement('div');
  body.className = 'social-tile-body';
  body.innerHTML = `<p><a href="${data.profileUrl}"><span class="icon icon-${data.network}"></span></a></p>
    <p class="social-tile-screenname"><a href="${data.profileUrl}" target="_blank">${data.username}</span></a></p>`;
  a.append(image, body);
  decorateIcons(tile);
  return tile;
}

function refreshImageTiles(wrapper, available, onPage) {
  setInterval(() => {
    const randomIndex = (max) => Math.floor(Math.random() * (max + 1));
    const tiles = wrapper.children;
    const toRefreshIndex = randomIndex(tiles.length);
    const tileToRefresh = tiles[toRefreshIndex];
    if (tileToRefresh) {
      const refreshIndex = randomIndex(available.length);
      const newTile = available[refreshIndex];
      if (newTile) {
        available.splice(refreshIndex, 1);
        available.push(tileToRefresh);
        onPage.splice(toRefreshIndex, 1);
        onPage.push(newTile);
        tileToRefresh.replaceWith(newTile);
        updateExternalLinks(wrapper);
      }
    }
  }, 3 * 1000);
}

async function buildImageFeed(wrapper, config) {
  const resp = await fetch(`https://api.massrelevance.com/6krq3qgxx2/${config.stream}.json?limit=40&tweet_mode=extended`);
  const availableTiles = [];
  const tilesOnPage = [];
  if (resp.ok) {
    const stream = await resp.json();
    let index = 0;
    stream.forEach((item, i) => {
      const tile = document.createElement('li');
      const { network } = item;
      let username;
      let profileUrl;
      let postUrl;
      let imageUrl;
      if (network === 'twitter') {
        username = item.user.screen_name;
        profileUrl = `${TWITTER_URL}${username}/`;
        postUrl = item.full_text.split(' ').pop();
        imageUrl = item.entities.media[0].media_url_https;
      } else if (network === 'instagram') {
        username = item.user.username;
        profileUrl = `${INSTAGRAM_URL}${username}/`;
        postUrl = item.link;
        imageUrl = item.images.low_resolution.url;
      }
      if (network === 'twitter' || network === 'instagram') {
        const imageTile = buildImageTile(tile, {
          network, username, profileUrl, postUrl, imageUrl,
        });
        if (tilesOnPage.length < 10 && i % 2 === 0) { // attempt to avoid duplicates
          [...wrapper.children][index].replaceWith(tile);
          tilesOnPage.push(tile);
          index += 1;
        } else {
          availableTiles.push(imageTile);
        }
      }
    });
    refreshImageTiles(wrapper, availableTiles, tilesOnPage);
  }
}

async function buildSocialFeed(wrapper, config) {
  const placeholders = await fetchPlaceholders();
  // setup profiles tile
  const profilesTile = buildProfilesTile(config);
  // fetch social feed
  wrapper.append(profilesTile);
  const tournament = `${placeholders.tourCode}${placeholders.tournamentId}`;
  const resp = await fetch(`https://api.massrelevance.com/brgyan07p/tournament_${tournament}.json`);
  if (resp.ok) {
    const feed = await resp.json();
    feed.forEach((item) => {
      const tile = document.createElement('li');
      if (item.network === 'twitter') buildTwitterTile(tile, item);
      if (item.network === 'facebook') buildFacebookTile(tile, item);
      decorateIcons(tile);
      wrapper.append(tile);
    });
    updateExternalLinks(wrapper);
  }
}

function revealRows(wrapper, rows, moreButton, lessButton) {
  let perRow = 1;
  const minRows = 2;
  const large = window.matchMedia('(min-width: 1200px)');
  const mid = window.matchMedia('(min-width: 900px)');
  const small = window.matchMedia('(min-width: 700px)');
  if (small.matches) {
    perRow = 2;
  }
  if (mid.matches) {
    perRow = 3;
  }
  if (large.matches) {
    perRow = 4;
  }

  let rowsToShow = rows;
  if (rows < minRows) {
    rowsToShow = minRows;
  }
  wrapper.dataset.rows = rowsToShow;

  let all = true;
  wrapper.querySelectorAll('li').forEach((item, idx) => {
    if (idx >= (perRow * rowsToShow)) {
      item.style.display = 'none';
      all = false;
    } else {
      item.style.display = 'flex';
    }
  });

  if (rows <= minRows) {
    lessButton.style.display = 'none';
  } else {
    lessButton.style.display = 'block';
  }

  if (all) {
    moreButton.style.display = 'none';
  } else {
    moreButton.style.display = 'block';
  }
}

function alterRows(wrapper, offset, moreButton, lessButton) {
  let rows = parseInt(wrapper.dataset.rows, 10);

  // when on mobile we add/remove 4 rows per click
  const small = window.matchMedia('(min-width: 700px)');
  if (small.matches) {
    rows += offset;
  } else {
    rows += (offset * 4);
  }

  revealRows(wrapper, rows, moreButton, lessButton);
}

function initCollapsing(wrapper) {
  wrapper.classList.add('collapsible');

  const buttonContainer = document.createElement('p');
  buttonContainer.classList.add('button-container');

  const moreButton = document.createElement('a');
  moreButton.classList.add('button', 'primary', 'more');
  moreButton.innerText = 'Show More';
  moreButton.href = '#';
  moreButton.title = 'More';

  const lessButton = document.createElement('a');
  lessButton.classList.add('button', 'primary', 'less');
  lessButton.innerText = 'Show Less';
  lessButton.href = '#';
  lessButton.title = 'Less';

  moreButton.addEventListener('click', (e) => {
    e.preventDefault();
    alterRows(wrapper, 1, moreButton, lessButton);
  });
  lessButton.addEventListener('click', (e) => {
    e.preventDefault();
    alterRows(wrapper, -1, moreButton, lessButton);
  });

  buttonContainer.appendChild(moreButton);
  buttonContainer.appendChild(lessButton);

  revealRows(wrapper, -1, moreButton, lessButton);
  window.addEventListener('resize', () => {
    revealRows(wrapper, wrapper.dataset.rows, moreButton, lessButton);
  });

  return buttonContainer;
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  block.innerHTML = '';

  const wrapper = document.createElement('ul');

  // setup placeholder content
  if (block.className.includes('image-feed')) {
    block.parentElement.classList.add('image-feed-wrapper');
    block.parentElement.parentElement.classList.add('image-feed-container');
    for (let i = 0; i < 10; i += 1) {
      const placeholder = document.createElement('li');
      placeholder.className = 'social-placeholder';
      wrapper.append(placeholder);
    }
  }

  const observer = new IntersectionObserver(async (entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();

      if (block.className.includes('image-feed')) {
        await buildImageFeed(wrapper, config);
      } else {
        await buildSocialFeed(wrapper, config);
        const collapsible = typeof config.collapsible !== 'undefined' && config.collapsible.toLowerCase() === 'true';
        if (collapsible) {
          const buttonContainer = initCollapsing(wrapper);
          block.append(buttonContainer);
        }
      }

      block.prepend(wrapper);
      block.classList.add('loaded');
    }
  }, { threshold: 0 });

  observer.observe(block);
}
