import { readBlockConfig } from '../../scripts/scripts.js';

function buildCell(col, rowNum) {
  const cell = rowNum > 0 ? document.createElement('td') : document.createElement('th');
  cell.innerHTML = typeof col === 'object' ? col.innerHTML : col;
  if (rowNum) {
    // eslint-disable-next-line eqeqeq
    if (cell.textContent == parseInt(cell.textContent, 10)) {
      // if cell contents are only numerical
      cell.classList.add('table-cell-num');
    }
  }
  return cell;
}

async function buildDataTable(table, head, body, src, config) {
  const resp = await fetch(src);
  if (resp.ok) {
    const { tours } = await resp.json();
    if (
      tours && tours[0]
      && tours[0].years && tours[0].years && tours[0].years[0]
      && tours[0].years[0].stats && tours[0].years[0].stats[0]
    ) {
      const stats = tours[0].years[0].stats[0];
      // build table head
      const headData = [
        'Rank This Week',
        'Rank Last Week',
        'Player Name',
        stats.rndOrEvt,
        ...Object.values(stats.statTitles).slice(1),
      ];
      headData.forEach((hd) => head.append(buildCell(hd)));
      // build table body
      for (let i = 0; i < 5; i += 1) { // display top five
        const player = stats.details[i];
        const playerLink = document.createElement('p');
        playerLink.innerHTML = `<a
          href="https://www.pgatour.com/players/player.${player.plrNum}.${player.plrName.first}-${player.plrName.last}.html">
            ${player.plrName.first} ${player.plrName.last}
          </a>`;
        const rowData = [
          player.curRank,
          player.prevRank,
          playerLink,
          ...Object.values(player.statValues),
        ];
        const row = document.createElement('tr');
        rowData.forEach((rd) => row.append(buildCell(rd, i + 1)));
        body.append(row);
      }
      table.append(head, body);
      // build caption
      if (stats.statName) {
        const caption = document.createElement('caption');
        caption.innerHTML = `${config.year || new Date().getFullYear()} <strong>${stats.statName}</strong>`;
        table.prepend(caption);
      }
    }
  }
  return table;
}

function buildStatsURL(config) {
  return `https://statdata.pgatour.com/r/stats/${config.year || new Date().getFullYear}/${config['stat-id']}.json`;
}

export default async function decorate(block) {
  const table = document.createElement('table');
  const head = document.createElement('thead');
  const body = document.createElement('tbody');
  if (block.className.includes('stats')) {
    const config = readBlockConfig(block);
    block.innerHTML = '';
    if (config['stat-id']) {
      const observer = new IntersectionObserver(async (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          const statsTable = await buildDataTable(table, head, body, buildStatsURL(config), config);
          block.innerHTML = statsTable.outerHTML;
        }
      }, { threshold: 0 });

      observer.observe(block);
    }
  } else {
    // build rows
    block.querySelectorAll(':scope > div').forEach((row, i) => {
      const tr = document.createElement('tr');
      // build cells
      row.querySelectorAll('div').forEach((col) => {
        tr.append(buildCell(col, i));
      });
      if (i > 0) body.append(tr);
      else head.append(tr);
    });
    // populate table
    table.append(head, body);
  }
  block.innerHTML = table.outerHTML;
}
