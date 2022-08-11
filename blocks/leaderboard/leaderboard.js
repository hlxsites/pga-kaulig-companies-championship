import { readBlockConfig, decorateIcons } from '../../scripts/scripts.js';

let TRACKING_ID;
let CONFIG;
let BLOCK;

function generateUserTrackingId() {
  TRACKING_ID = window.pgatour.setTrackingUserId(`id${TRACKING_ID}`);
}

function loadScript(url, callback, type) {
  const head = document.querySelector('head');
  if (!head.querySelector(`script[src="${url}"]`)) {
    const script = document.createElement('script');
    script.src = url;
    if (type) script.setAttribute('type', type);
    head.append(script);
    script.onload = callback;
    return script;
  }
  return head.querySelector(`script[src="${url}"]`);
}

function buildCell() {
  return document.createElement('td');
}

function buildRow() {
  return document.createElement('tr');
}

function buildLeaderboardTable() {
  const table = document.createElement('table');
  const head = document.createElement('thead');
  const headRow = buildRow();
  const cols = [' ', 'POS', 'TP', 'Country', 'Total', 'Thru'];
  cols.forEach((col) => {
    const cell = document.createElement('th');
    if (col !== 'TP') {
      cell.textContent = col;
    } else {
      cell.innerHTML = '<p><span class="icon icon-up"></span><span class="icon icon-down"></span></p>';
    }
    headRow.append(cell);
  });
  head.append(headRow);
  table.append(head);
  const body = document.createElement('tbody');
  return [table, body];
}

function calculateTP(start, current) {
  // eslint-disable-next-line no-param-reassign
  start = parseInt(start.replace('T', ''), 10);
  // eslint-disable-next-line no-param-reassign
  current = parseInt(current.replace('T', ''), 10);
  const tp = start - current;
  return { tp: Math.abs(tp), posMove: tp > 0 };
}

async function populateLeaderboard() {
  generateUserTrackingId();
  // fetch leaderboard content
  const resp = await fetch(`https://statdata.pgatour.com/r/011/leaderboard-top5.json?userTrackingId=${TRACKING_ID}`);
  if (resp.ok) {
    const json = await resp.json();
    if (json.leaderboard && json.leaderboard.players) {
      const { players } = json.leaderboard;
      const [table, body] = buildLeaderboardTable();
      const buttons = document.createElement('div');
      buttons.className = 'button-container';
      buttons.innerHTML = '<a href="/tee-times" class="button secondary">Tee Times</a>';
      const leaderWrapper = document.createElement('div');
      players.forEach((player, i) => {
        const bio = player.player_bio;
        const { tp, posMove } = calculateTP(player.start_position, player.current_position);
        if (!i) { // setup leader info for leaderboard leader
          const leader = document.createElement('div');
          leader.className = 'leaderboard-leader';
          leader.innerHTML = `
          <div class="leaderboard-leader-img">
            <img
              src="https://pga-tour-res.cloudinary.com/image/upload/f_auto,q_auto,c_fill,r_max,dpr_2.0,g_face:center,h_260,w_260,d_headshots_default.png/headshots_35891.png"
              alt="${bio.first_name} ${bio.last_name}"
            />
          </div>
          <div class="leaderboard-leader-body">
            <p class="leaderboard-leader-body-title">${bio.first_name} ${bio.last_name}</p>
            <div class="leaderboard-leader-stats">
              <div>
                <span class="icon icon-flag-${bio.country.toLowerCase()}"></span>
              </div>
              <div>
                <p class="leaderboard-leader-stats-title">Total</p>
                <p class="leaderboard-leader-stats-stat">${player.total}</p>
              </div>
              <div>
                <p class="leaderboard-leader-stats-title">Thru</p>
                <p class="leaderboard-leader-stats-stat">${player.thru < 18 ? player.thru : 'F'}</p>
              </div>
            </div>
          </div>`;
          const scorecard = document.createElement('a');
          scorecard.className = 'button primary';
          scorecard.textContent = 'View full scorecard';
          scorecard.href = `https://www.pgatour.com/players/player.${player.player_id}.${bio.first_name}-${bio.last_name}.html/scorecards/${json.tournament_id}`.toLowerCase();
          buttons.prepend(scorecard);
          decorateIcons(leader);
          leader.append(buttons);
          leaderWrapper.append(leader);
          BLOCK.append(leaderWrapper);
        }
        const row = buildRow();
        const favoriteButtonCell = buildCell();
        favoriteButtonCell.innerHTML = `<button data-tour="${json.leaderboard.tour_code}" data-id="${player.player_id}">
          <span class="icon icon-plus"></span>
        </button>`;
        row.append(favoriteButtonCell);
        const playerData = [
          player.current_position,
          `<p><span class="icon icon-${posMove ? 'up' : 'down'}"></span> ${tp}</p>`,
          `<p class="leaderboard-player"><span class="icon icon-flag-${bio.country.toLowerCase()}"></span> ${bio.first_name} ${bio.last_name}</p>`,
          player.total,
          player.thru < 18 ? player.thru : 'F',
        ];
        playerData.forEach((d) => {
          const cell = buildCell();
          cell.innerHTML = d;
          if (typeof d === 'string' && d.includes('flag')) decorateIcons(cell);
          row.append(cell);
        });
        body.append(row);
      });
      /* setup footer */
      const footer = document.createElement('div');
      footer.className = 'leaderboard-footer';
      footer.innerHTML = `<div class="button-container">
        <a href="${CONFIG.leaderboard}" class="button primary">View full leaderboard</a>
      </div>`;
      /* setup sponsors */
      const sponsors = document.createElement('div');
      sponsors.className = 'leaderboard-sponsors';
      footer.prepend(sponsors);
      /* setup table column */
      const tableWrapper = document.createElement('div');
      table.append(body);
      tableWrapper.append(table, footer);
      BLOCK.append(tableWrapper);
    }
  }
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  TRACKING_ID = config.id;
  CONFIG = config;
  BLOCK = block;
  block.textContent = '';

  loadScript('https://microservice.pgatour.com/js', populateLeaderboard);
}
