import { fetchPlaceholders, readBlockConfig, decorateIcons } from '../../scripts/scripts.js';

const PGATOUR_URL = 'https://www.pgatour.com';

async function buildReqUrl(param) {
  const placeholders = await fetchPlaceholders();
  return `${PGATOUR_URL}/tournaments/${placeholders.adsS3}/past-results/jcr:content/mainParsys/pastresults.selectedYear.${param}.html`;
}

async function refreshResults(block, param) {
  const reqUrl = await buildReqUrl(param);
  const resp = await fetch(`https://little-forest-58aa.david8603.workers.dev/?url=${encodeURIComponent(reqUrl)}`);
  if (resp.ok) {
    const html = await resp.text();
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const tempTable = temp.querySelector('table');
    // setup accordions
    temp.querySelectorAll('.print-hidden .note-item').forEach((note, i) => {
      const button = note.querySelector('button');
      button.id = `notetitle${i + 1}`;
      button.setAttribute('aria-expanded', false);
      button.setAttribute('aria-controls', `note${i + 1}`);
      button.addEventListener('click', () => {
        const expanded = button.getAttribute('aria-expanded') === 'true';
        if (expanded) { // close
          button.setAttribute('aria-expanded', false);
          button.nextElementSibling.hidden = true;
        } else { // open
          button.setAttribute('aria-expanded', true);
          button.nextElementSibling.hidden = false;
        }
      });
      const content = note.querySelector('.note-content');
      content.id = `note${i + 1}`;
      content.hidden = true;
      content.setAttribute('aria-labelledby', `notetitle${i + 1}`);
    });
    // setup year dropdown
    const yearDropdown = temp.querySelector('select[name="year"]');
    if (yearDropdown) {
      yearDropdown.addEventListener('change', (e) => {
        refreshResults(block, e.target.value);
      });
    }
    // setup rounds dropdown
    const roundsDropdown = temp.querySelector('select[name="rounds"]');
    if (roundsDropdown) {
      roundsDropdown.addEventListener('change', (e) => {
        const table = block.querySelector('table');
        table.setAttribute('data-display-rounds', e.target.value);
      });
    }
    // setup score switch
    const scoreSwitch = temp.querySelector('input.switch-input');
    if (scoreSwitch && tempTable) {
      scoreSwitch.addEventListener('change', (e) => {
        const table = block.querySelector('table');
        if (e.target.checked) {
          table.setAttribute('data-display-score', 'total-score');
        } else {
          table.setAttribute('data-display-score', 'to-par');
        }
      });
    }
    // setup print button
    const printButton = temp.querySelector('.button-print');
    if (printButton) {
      const text = printButton.textContent;
      printButton.innerHTML = `<span>${text}</span><span class="icon icon-print"></span>`;
      decorateIcons(printButton);
    }
    // setup table sorting
    if (tempTable) {
      tempTable.setAttribute('data-display-score', 'total-score'); // default to total score
      tempTable.querySelectorAll('.sortable').forEach((th) => {
        const data = tempTable.querySelector('.table-data');
        const rows = [...data.querySelectorAll('tr')];
        th.addEventListener('click', () => {
          let alreadySorted = 1;
          const currentRound = block.querySelector('select[name="rounds"]').value;
          const thClasses = [...th.classList];
          // selected field is already sorted
          if (thClasses.includes('arrow')) {
            if (thClasses.includes('down')) {
              alreadySorted = -1;
              th.classList.remove('down');
              th.classList.add('up');
            }
            if (thClasses.includes('up')) {
              th.classList.remove('up');
              th.classList.add('down');
            }
          } else {
            // clear other sorting arrows
            const currentSort = tempTable.querySelector('.arrow');
            if (currentSort) currentSort.classList.remove('arrow', 'down', 'up');
            // set new sorting arrow
            th.classList.add('arrow', 'down');
          }
          const sortBy = th.getAttribute('data-sort-by');
          const sortableFields = data.querySelectorAll(`[data-sort-${sortBy}]`);
          const sortableFieldsByRound = data.querySelectorAll(`[data-sort-${sortBy}-${currentRound}]`);
          if (sortableFields.length) { // total score, official money, points
            rows.sort((a, b) => {
              const getVal = (el) => parseInt(el.querySelector(`[data-sort-${sortBy}]`).textContent.replace(/\$|,/g, ''), 10);
              // a is second, b is the one before
              const aVal = getVal(a);
              const bVal = getVal(b);
              if (aVal > bVal) return (alreadySorted * -1);
              if (bVal > aVal) return (alreadySorted * 1);
              return 0;
            });
          } else if (sortableFieldsByRound.length) { // pos, to par
            rows.sort((a, b) => {
              const getVal = (el) => {
                const text = el.querySelector(`[data-sort-${sortBy}-${currentRound}]`).textContent.replace('T', '');
                if (text === 'E') return 0; // e is equal to par, 0
                return parseInt(text, 10);
              };
              const aVal = getVal(a);
              const bVal = getVal(b);
              // console.log(aVal, bVal);
              if (aVal > bVal) return (alreadySorted * 1);
              if (bVal > aVal) return (alreadySorted * -1);
              return 0;
            });
          } else { // rounds
            const currentDisplay = block.querySelector('table').getAttribute('data-display-score') === 'total-score' ? 'total' : 'par';
            rows.sort((a, b) => {
              const getVal = (el) => {
                const text = el.querySelector(`[data-sort-${sortBy}-${currentDisplay}] > [class*=${currentDisplay}]`).textContent;
                if (text === 'E') return 0; // e is equal to par, 0
                return parseInt(text, 10);
              };
              const aVal = getVal(a);
              const bVal = getVal(b);
              if (aVal > bVal) return (alreadySorted * 1);
              if (bVal > aVal) return (alreadySorted * -1);
              return 0;
            });
          }
          data.innerHTML = '';
          rows.forEach((row) => data.append(row));
        });
      });
    }
    // rewrite player links
    temp.querySelectorAll('a.player-link').forEach((a) => {
      a.href = `${PGATOUR_URL}${new URL(a.href).pathname}`;
    });
    block.innerHTML = '';
    block.append(temp);
  }
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  block.innerHTML = '';
  const placeholders = await fetchPlaceholders();
  const year = config['current-year'] || new Date().getFullYear();
  refreshResults(block, `${year}.${placeholders.tournamentId}`);
}
