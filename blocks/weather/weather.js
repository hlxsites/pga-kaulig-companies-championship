import {
  toClassName,
  createOptimizedPicture,
  decorateIcons,
  fetchPlaceholders,
} from '../../scripts/scripts.js';

function toggleWeather(e) {
  const button = e.target.closest('button');
  const block = button.closest('.block');
  const toggle = button.getAttribute('data-toggle');
  // update button
  const buttons = block.querySelectorAll('.button-container > button');
  buttons.forEach((btn) => btn.setAttribute('aria-selected', false));
  button.setAttribute('aria-selected', true);
  // toggle table view
  const table = block.querySelector('.weather-table-body');
  if (toggle.includes('hourly')) {
    table.classList.remove('weather-table-10-days-forecast');
    table.classList.add('weather-table-hourly');
  } else if (toggle.includes('10-days-forecast')) {
    table.classList.remove('weather-table-hourly');
    table.classList.add('weather-table-10-days-forecast');
  }
}

function buildRow(data) {
  const cell = document.createElement('div');
  cell.innerHTML = data;
  return cell;
}

export default async function decorate(block) {
  const blockClasses = [...block.classList];
  const placeholders = await fetchPlaceholders();
  const tournament = `${placeholders.tourCode}${placeholders.tournamentId}`;
  const weatherPrefix = 'https://little-forest-58aa.david8603.workers.dev/?url=https://www.pgatour.com/bin/data/feeds';
  if (blockClasses.includes('forecast')) {
    block.parentNode.classList.add('forecast-wrapper');
    // fetch weather
    try {
      const hourlyResp = await fetch(`${weatherPrefix}/hourly.json/${tournament}`);
      const dailyResp = await fetch(`${weatherPrefix}/forecast10day.json/${tournament}`);
      if (hourlyResp.ok && dailyResp.ok) {
        const { hourly_forecast: hourlyData } = await hourlyResp.json();
        const { forecast } = await dailyResp.json();
        const dailyData = forecast.simpleforecast.forecastday;
        // setup toggle
        const toggle = ['Hourly', '10 Days Forecast'];
        const container = document.createElement('div');
        container.classList.add('button-container', 'weather-toggle');
        toggle.forEach((t, i) => {
          const button = document.createElement('button');
          button.textContent = t;
          button.setAttribute('aria-selected', !i); // first toggle is default view
          button.setAttribute('role', 'tab');
          button.setAttribute('data-toggle', toClassName(t));
          button.addEventListener('click', toggleWeather);
          container.append(button);
        });
        block.prepend(container);
        // build table
        const table = document.createElement('div');
        table.classList.add('weather-table');
        // setup table titles column
        const titleCol = document.createElement('div');
        titleCol.classList.add('weather-table-titles');
        const rowNames = [' ', 'Wind', 'Conditions', 'Temp', 'Humidity', 'Chance of Rain'];
        rowNames.forEach((name) => titleCol.append(buildRow(name)));
        table.append(titleCol);
        // setup table body
        const body = document.createElement('div');
        body.classList.add('weather-table-body', 'weather-table-hourly');
        // populate hourly forecast
        hourlyData.forEach((hour) => {
          const col = document.createElement('div');
          col.className = 'weather-col-hourly';
          col.append(
            buildRow(hour.FCTTIME.civil),
            buildRow(`${hour.wspd.english} mp/h ${hour.wdir.dir}`),
            buildRow(`<img src="${hour.icon_url.replace('.gif', '.png')}" alt="${hour.condition}" /> ${hour.condition.replaceAll('/', '/<wbr>')}`),
            buildRow(`<span class="weather-temp">${hour.temp.english}</span>`),
            buildRow(`<span class="weather-humidity">${hour.humidity}</span>`),
            buildRow(`<span class="weather-chance-of-rain">${hour.pop}</span>`),
          );
          body.append(col);
        });
        // populate 10 day forecast
        dailyData.forEach((day) => {
          const col = document.createElement('div');
          col.className = 'weather-col-10-days-forecast';
          col.append(
            buildRow(day.date.weekday),
            buildRow(`${day.avewind.mph} mp/h ${day.avewind.dir}`),
            buildRow(`<img src="${day.icon_url.replace('.gif', '.png')}" alt="${day.conditions}" /> ${day.conditions.replaceAll('/', '/<wbr>')}`),
            buildRow(`<span class="weather-temp">${day.high.fahrenheit}</span>`),
            buildRow(`<span class="weather-humidity">${day.avehumidity}</span>`),
            buildRow(`<span class="weather-chance-of-rain">${day.pop}</span>`),
          );
          body.append(col);
        });
        table.append(body);
        block.append(table);
      } else block.parentNode.remove();
    } catch (error) {
      block.parentNode.remove();
      // eslint-disable-next-line no-console
      console.warn('Could not load weather', error);
    }
  } else {
    try {
      // fetch weather
      const resp = await fetch(`${weatherPrefix}/weather.json/${tournament}`);
      if (resp.ok) {
        const { current_observation: weatherData } = await resp.json();
        // setup title
        const location = weatherData.display_location.full;
        const title = block.querySelector('h2');
        if (title) {
          title.textContent = `${title.textContent} | ${location}`;
        } else {
          const h2 = document.createElement('h2');
          h2.textContent = location;
          h2.id = toClassName(location);
          block.prepend(h2);
        }
        // add bg image
        let condition = weatherData.weather.toLowerCase();
        if (condition.includes('cloud')) {
          condition = 'cloudy';
        } else if (condition.includes('shower') || condition.includes('rain')) {
          condition = 'rain';
        } else if (condition.includes('thunder') || condition.includes('storm')) {
          condition = 'thunderstorm';
        }
        const bgConditions = ['cloudy', 'fair', 'fog', 'rain', 'snow', 'sunny', 'thunderstorm'];
        let bgImg;
        if (bgConditions.includes(condition)) {
          bgImg = createOptimizedPicture(`/blocks/weather/weather-${condition}.png`);
        } else {
          bgImg = createOptimizedPicture('/blocks/weather/weather-fair.png');
        }
        bgImg.className = 'weather-background';
        block.prepend(bgImg);
        const weatherGrid = document.createElement('div');
        weatherGrid.className = 'weather-grid';
        // temperature
        const temperature = document.createElement('div');
        temperature.className = 'weather-temp';
        temperature.innerHTML = `
        <p class="weather-data"><span>${weatherData.temp_f}</span></p>
        <p class="weather-desc">Temperature</p>`;
        // conditions
        const conditions = document.createElement('div');
        conditions.className = 'weather-conditions';
        conditions.innerHTML = `
        <p class="weather-data"><img src="${weatherData.icon_url.replace('.gif', '.png').replace(/_50/g, '_100')}" alt="${weatherData.weather}" /></p>
        <p class="weather-desc">Conditions</p>`;
        // wind speed
        const wind = document.createElement('div');
        wind.className = 'weather-wind';
        wind.innerHTML = `
        <p class="weather-data"><span class="icon icon-wind"></span>${weatherData.wind_mph}<span>mp/h<br />${weatherData.wind_dir}</span></p>
        <p class="weather-desc">Wind Speed</p>`;
        // humidity
        const humidity = document.createElement('div');
        humidity.className = 'weather-humidity';
        humidity.innerHTML = `
        <p class="weather-data"><span class="icon icon-humidity"></span><span>${weatherData.relative_humidity.replace('%', '')}</span></p>
        <p class="weather-desc">Humidity</p>`;
        weatherGrid.append(temperature, conditions, wind, humidity);
        decorateIcons(weatherGrid);
        block.append(weatherGrid);
      } else block.parentNode.remove();
    } catch (error) {
      block.parentNode.remove();
      // eslint-disable-next-line no-console
      console.warn('Could not load weather', error);
    }
  }
}
