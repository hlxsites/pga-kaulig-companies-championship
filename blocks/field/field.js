import { decorateIcons, fetchPlaceholders, readBlockConfig } from '../../scripts/scripts.js';

function toggleView(e) {
  const button = e.target.closest('button');
  const block = button.closest('.block');
  const toggle = button.getAttribute('data-toggle');
  // update button
  const buttons = block.querySelectorAll('.button-container > button');
  buttons.forEach((btn) => btn.setAttribute('aria-selected', false));
  button.setAttribute('aria-selected', true);
  // toggle view
  const view = block.querySelector('ul');
  if (toggle.includes('table')) {
    view.classList.remove('field-view-list');
    view.classList.add('field-view-table');
  } else if (toggle.includes('list')) {
    view.classList.remove('field-view-table');
    view.classList.add('field-view-list');
  }
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  block.textContent = '';
  const placeholders = await fetchPlaceholders();

  const year = config.year || new Date().getFullYear();
  const feedURL = `https://statdata-api-prod.pgatour.com/api/clientfile/Field?T_CODE=${placeholders.tourCode}&T_NUM=${placeholders.tournamentId}&YEAR=${year}&format=json`;

  // setup controls
  const controls = document.createElement('div');
  controls.className = 'field-controls';
  // setup toggle
  const toggle = document.createElement('div');
  toggle.className = 'button-container';
  const buttons = ['table', 'list'];
  buttons.forEach((b, i) => {
    const button = document.createElement('button');
    button.innerHTML = `<span class="icon icon-${b}"></span>`;
    button.setAttribute('aria-selected', !i); // first button is default view
    button.setAttribute('role', 'tab');
    button.setAttribute('data-toggle', b);
    button.addEventListener('click', toggleView);
    toggle.append(button);
  });
  decorateIcons(toggle);
  // setup dropdown
  const dropdown = document.createElement('select');
  dropdown.innerHTML = '<option disabled selected>Select Player</option>';
  dropdown.addEventListener('change', () => {
    const { value } = dropdown;
    const selected = document.getElementById(value);
    if (selected) {
      selected.scrollIntoView({ behavior: 'smooth' });
      selected.classList.add('selected');
      setTimeout(() => selected.classList.remove('selected'), 1000 * 3);
    }
  });
  // setup wrapper
  const wrapper = document.createElement('ul');
  wrapper.classList.add('field-view-table');

  // fetch field feed
  const resp = await fetch(feedURL);
  if (resp.ok) {
    const json = await resp.json();
    const tournament = json.Tournament;
    if (tournament && tournament.Players) {
      let latestInitial = '';
      const players = tournament.Players.sort((a, b) => {
        if (a.PlayerLastName.toUpperCase() < b.PlayerLastName.toUpperCase()) return -1;
        if (a.PlayerLastName.toUpperCase() > b.PlayerLastName.toUpperCase()) return 1;
        return 0;
      });
      players.forEach((player) => {
        // setup option
        const option = document.createElement('option');
        option.value = player.TournamentPlayerId;
        option.textContent = player.PlayerName;
        dropdown.append(option);
        // setup card
        const card = document.createElement('li');
        const lastInitial = player.PlayerLastName.charAt(0);
        if (latestInitial !== lastInitial) card.setAttribute('data-last', lastInitial);
        latestInitial = lastInitial;
        card.id = player.TournamentPlayerId;
        card.innerHTML = `<img src="https://pga-tour-res.cloudinary.com/image/upload/c_fill,dpr_2.0,f_auto,q_auto,r_max,g_face:center,d_headshots_default.png,h_190,w_190/headshots_${player.TournamentPlayerId}.png" alt="${player.PlayerFirstName} ${player.PlayerLastName}" />
          <p>${player.PlayerName}</p>`;
        wrapper.append(card);
      });
      controls.append(toggle, dropdown);
      block.append(controls, wrapper);
    }
  }
}
