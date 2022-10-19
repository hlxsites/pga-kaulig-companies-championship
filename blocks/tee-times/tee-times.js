import { readBlockConfig, decorateIcons } from '../../scripts/scripts.js';

function convertTime(serial) {
  const fractionalDay = serial - Math.floor(serial) + 0.0000001;

  let totalSeconds = Math.floor(86400 * fractionalDay);
  const seconds = totalSeconds % 60;
  totalSeconds -= seconds;

  let hours = Math.floor(totalSeconds / (60 * 60));
  if (hours === 0) hours = 12;
  const minutes = (Math.floor(totalSeconds / 60) % 60).toString().padStart(2, '0');

  return { hours, minutes };
}

function formatTeeTimesData(data) {
  const teeTimes = {};
  data.forEach((player) => {
    const { hours, minutes } = convertTime(player.time);
    const timeStr = `${hours}_${minutes}`;
    if (!teeTimes[player.round]) {
      // if round doesn't exist, create round > time > tee > player(s)
      teeTimes[player.round] = { // set round
        [timeStr]: { // set time
          [player.tee]: [player], // set tee and push player
        },
      };
    } else if (!teeTimes[player.round][timeStr]) {
      // if round exists but time doesn't, create time > tee > player(s)
      teeTimes[player.round][timeStr] = { // set time
        [player.tee]: [player], // set tee and push player
      };
    } else if (!teeTimes[player.round][timeStr][player.tee]) {
      // if round and time exist but tee doesn't, create tee > player(s)
      teeTimes[player.round][timeStr][player.tee] = [player]; // set tee and push player
    } else if (teeTimes[player.round][timeStr][player.tee]) {
      // round, time, and tee exist, push player into tee
      teeTimes[player.round][timeStr][player.tee].push(player);
    }
  });
  return teeTimes;
}

export default async function decorate(block) {
  const config = readBlockConfig(block);
  block.textContent = '';

  if (config.source) {
    const source = config.source.endsWith('.json') ? config.source : `${config.source}.json`;
    const resp = await fetch(source);
    if (resp.ok) {
      const json = await resp.json();
      if (json.data) {
        const data = formatTeeTimesData(json.data);
        // setup dropdown
        const header = document.createElement('div');
        header.className = 'tee-times-header';
        header.innerHTML = '<p>All tee times are local</p>';
        const dropdown = document.createElement('select');
        dropdown.addEventListener('change', () => {
          const { value } = dropdown;
          const allTimes = document.querySelectorAll('.tee-times-time');
          allTimes.forEach((time) => time.classList.add('filtered'));
          const selectedRounds = [...allTimes].filter((time) => time.getAttribute('data-round') === value);
          selectedRounds.forEach((time) => time.classList.remove('filtered'));
        });
        header.append(dropdown);
        block.prepend(header);
        let currentRound = '';
        Object.keys(data).forEach((round) => { // iterate through rounds
          // populate round dropdown
          if (round !== currentRound) {
            const option = document.createElement('option');
            option.value = round;
            option.textContent = `Round ${round}`;
            dropdown.append(option);
            // reset current round
            currentRound = round;
          }
          Object.keys(data[round]).forEach((time) => { // iterate through times
            const timeWrapper = document.createElement('div');
            timeWrapper.className = 'tee-times-time filtered';
            const [hours, minutes] = time.split('_');
            timeWrapper.setAttribute('data-round', round);
            timeWrapper.setAttribute('data-hours', hours);
            timeWrapper.setAttribute('data-minutes', minutes);
            timeWrapper.innerHTML = `<h3>
              <span class="tee-times-hour">${hours > 12 ? hours - 12 : hours}</span>:<span class="tee-times-minute">${minutes}</span>
              <span class="tee-times-suffix">${hours >= 12 ? 'pm' : 'am'}</span>
            </h3>`;
            Object.keys(data[round][time]).forEach((tee) => { // iterate through tees
              const teeWrapper = document.createElement('div');
              teeWrapper.className = 'tee-times-tee';
              teeWrapper.innerHTML = `<h4>Tee #${tee}</h4>`;
              data[round][time][tee].forEach((player) => { // iterate through players
                const playerWrapper = document.createElement('div');
                playerWrapper.className = 'tee-times-player';
                playerWrapper.innerHTML = `<img
                    src="https://pga-tour-res.cloudinary.com/image/upload/f_auto,q_auto,c_fill,r_max,dpr_2.0,g_face:center,h_190,w_190,d_headshots_default.png/headshots_${player.playerId}.png"
                    alt="${player.playerName}"
                  />
                  <p>
                    <span class="icon icon-flag-${player.playerFlag.toLowerCase()}"></span>
                    ${player.playerName}
                  </p>`;
                teeWrapper.append(playerWrapper);
              });
              timeWrapper.append(teeWrapper);
            });
            decorateIcons(timeWrapper);
            block.append(timeWrapper);
          });
        });
        // set default view to current round
        dropdown.value = currentRound;
        block.querySelectorAll(`[data-round="${currentRound}"]`).forEach((time) => time.classList.remove('filtered'));
      }
    }
  }
}
