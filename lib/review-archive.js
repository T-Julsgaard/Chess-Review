import {monthStart, playerArchive} from './review-archive-source.js';
import {ProfileAccountNotFoundError} from './profile/sources.js';

const sites = {chesscom: 'Chess.com', lichess: 'Lichess'};
const format = options => new Intl.DateTimeFormat(undefined, {...options, timeZone: 'UTC'});
const monthLabel = format({month: 'long', year: 'numeric'});
const dayLabel = format({weekday: 'short', month: 'short', day: 'numeric'});
const clockLabel = format({hour: 'numeric', minute: '2-digit'});

export function createReviewArchive({ui, el, icon, openGame, renderControls, settings}) {
  const doc = ui.movesBody.ownerDocument;
  let site = settings.profileSite === 'lichess' ? 'lichess' : 'chesscom';
  const drafts = {...settings.profileAccounts};
  let account, loadMonth, request, month, count, lastDay, opening = false;
  const input = el('input', {id: 'archive-username', class: 'profile-input', type: 'text',
    maxlength: '30', autocomplete: 'off', spellcheck: 'false', autocapitalize: 'none'});
  const label = el('label', {class: 'archive-title', for: input.id}, 'Find a game');
  const error = el('p', {id: 'archive-input-error', class: 'profile-setup-error', role: 'alert', hidden: true});
  input.setAttribute('aria-describedby', error.id);
  function clearError() {
    input.removeAttribute('aria-invalid');
    input.classList.remove('invalid');
    error.hidden = true;
  }
  const selector = el('div', {class: 'profile-seg profile-seg-lg archive-sites', role: 'group', 'aria-label': 'Chess site'});
  function chooseSite(key) {
    site = key;
    selector.dataset.site = key;
    for (const button of selector.children) button.setAttribute('aria-pressed', String(button.dataset.site === key));
    input.placeholder = sites[key] + ' username';
    input.setAttribute('aria-label', input.placeholder);
    input.value = drafts[key] || '';
    clearError();
  }
  for (const [key, name] of Object.entries(sites)) selector.append(el('button', {type: 'button', 'data-site': key,
    onclick: () => chooseSite(key)}, name));
  chooseSite(site);
  input.addEventListener('input', () => { drafts[site] = input.value; clearError(); });
  const submit = el('button', {type: 'submit', class: 'archive-submit'}, 'Find games', icon('next'));
  const form = el('form', {class: 'archive-form', 'aria-label': 'Find a game', onsubmit: event => {
    event.preventDefault();
    if (opening) return;
    const name = input.value.trim();
    if (!/^[\w-]{2,30}$/.test(name)) {
      error.textContent = name ? 'Use 2–30 letters, numbers, underscores or hyphens.' : 'Enter a username to find games.';
      error.hidden = false; input.classList.add('invalid'); input.setAttribute('aria-invalid', 'true'); input.focus();
      return;
    }
    account = name;
    loadMonth = playerArchive(site, name);
    void browse(monthStart(new Date()));
    if (doc.defaultView.innerWidth < 820) heading.focus();
  }}, el('div', {class: 'archive-form-head'}, label, selector),
  el('div', {class: 'archive-input-row'}, input, submit), error);

  const heading = el('h3', {tabindex: '-1'});
  const counter = el('span', {class: 'archive-count'});
  const header = el('div', {class: 'archive-head', hidden: true}, heading, counter);
  const rows = el('div', {class: 'archive-rows'});
  const status = el('div', {class: 'archive-status', role: 'status'});
  const retry = el('button', {type: 'button', class: 'archive-retry', hidden: true, onclick: () => browse(month)}, 'Try again');
  ui.movesBody.classList.add('archive-list');
  ui.movesBody.replaceChildren(header, rows, status, retry);

  const previous = el('button', {type: 'button', 'aria-label': 'Previous month', onclick: () => step(-1)}, icon('prev'));
  const next = el('button', {type: 'button', 'aria-label': 'Next month', onclick: () => step(1)}, icon('next'));
  const period = el('span', {class: 'archive-period'});
  function step(delta) {
    if (opening || !month) return;
    const target = monthStart(month, delta);
    if (target <= monthStart(new Date())) void browse(target);
  }
  function syncControls() {
    if (!month) return false;
    if (previous.parentNode !== ui.controls) ui.controls.replaceChildren(previous, period, next);
    period.textContent = monthLabel.format(month);
    period.title = 'Calendar month in UTC';
    previous.disabled = opening;
    next.disabled = opening || +month >= +monthStart(new Date());
    return true;
  }
  function gameRow(game, ordinal) {
    const black = game.black.toLowerCase() === account.toLowerCase();
    const opponent = black ? game.white : game.black;
    const outcome = game.result === 'd' ? 'Draw' : game.result === (black ? 'b' : 'w') ? 'Win' : 'Loss';
    const detail = [game.speed, black ? 'as Black' : 'as White'].filter(Boolean).join(' · ');
    const button = el('button', {type: 'button', class: 'archive-game', 'data-outcome': outcome, 'data-enter': ordinal < 8,
      style: {'--delay': Math.min(ordinal, 7) * 26 + 'ms'}, onclick: async () => {
        if (opening) return;
        opening = true; submit.disabled = true; syncControls();
        button.setAttribute('aria-busy', 'true');
        try {
          await openGame({pgn: game.pgn, meta: {...game.meta, flip: black}, source: 'archive'});
        } catch {
          status.hidden = false; status.textContent = 'This game could not be opened. Choose another game or try again.';
        } finally {
          opening = false; submit.disabled = false; button.removeAttribute('aria-busy');
          if (form.isConnected) syncControls();
        }
      }}, el('span', {class: 'archive-result'}, outcome),
      el('span', {class: 'archive-match'}, el('strong', {}, opponent), el('small', {}, detail)),
      el('span', {class: 'archive-time', title: 'UTC'}, game.date ? clockLabel.format(game.date * 1000) : ''));
    return button;
  }
  async function browse(target) {
    request?.abort();
    request = new AbortController();
    const {signal} = request;
    month = target; count = 0; lastDay = null;
    renderControls();
    heading.textContent = account;
    header.hidden = false;
    counter.textContent = '';
    status.hidden = false; status.textContent = 'Loading games…'; retry.hidden = true;
    rows.replaceChildren(); ui.movesBody.scrollTop = 0;
    try {
      await loadMonth(month, signal, batch => {
        if (signal.aborted) return;
        const fragment = doc.createDocumentFragment();
        for (const game of batch) {
          const day = game.date ? dayLabel.format(game.date * 1000) : 'Date unknown';
          if (day !== lastDay) fragment.append(el('h3', {class: 'archive-day'}, day));
          lastDay = day;
          fragment.append(gameRow(game, count++));
        }
        rows.append(fragment);
        if (count) counter.textContent = count + (count === 1 ? ' game' : ' games');
      });
      if (signal.aborted) return;
      status.hidden = !!count;
      status.textContent = count ? '' : 'No games this month. Try another month or search for another player.';
    } catch (cause) {
      if (signal.aborted) return;
      status.textContent = cause instanceof ProfileAccountNotFoundError ? cause.message
        : /429/.test(cause.message) ? 'Too many requests. Give it a moment and try again.' : 'Couldn’t load these games. Check your connection and try again.';
      retry.hidden = false;
    }
  }
  return {form, syncControls, dispose() {
    request?.abort();
    form.remove(); ui.movesBody.replaceChildren(); ui.movesBody.classList.remove('archive-list');
    ui.controlRefs = null;
  }};
}
