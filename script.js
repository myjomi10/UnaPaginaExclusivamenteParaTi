'use strict';

/* =========================================================
   1. Navegación entre páginas
   ========================================================= */

const DEFAULT_PAGE = 'pag1';
const GAME_PAGE = 'pag-juego';
const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

const PAGE_TITLES = {
  'pag1': 'Para Paula — algo especial ♡',
  'pag2': 'Esto es para ti — Para Paula',
  'pag-sobres': 'Un sobre para ti — Para Paula',
  'pag-carta': 'Unas palabras — Para Paula',
  'pag-juego': 'El laberinto del corazón — Para Paula',
  'pag-fotos': 'Nuestros recuerdos — Para Paula',
  'pag-final': 'Para ti, Paula ♡'
};

function isGameActive() {
  const page = document.getElementById(GAME_PAGE);
  return Boolean(page && page.classList.contains('active'));
}

function showPage(pageId, options = {}) {
  const page = document.getElementById(pageId);
  if (!page || !page.classList.contains('page')) return;

  const { push = true, focus = true, smooth = true } = options;
  const current = document.querySelector('.page.active');

  if (current !== page) {
    if (current) current.classList.remove('active');
    page.classList.add('active');
  }

  if (push && location.hash !== '#' + pageId) {
    try {
      history.pushState({ page: pageId }, '', '#' + pageId);
    } catch (error) {
      location.hash = pageId;
    }
  }

  // Respetamos la preferencia de reducir movimiento también aquí, porque
  // el CSS por sí solo no puede anular un scroll suave lanzado desde JS.
  window.scrollTo({ top: 0, behavior: smooth && !reduceMotionQuery.matches ? 'smooth' : 'auto' });

  // El minijuego solo avanza mientras su página está abierta.
  if (pageId === GAME_PAGE) resumeGame();
  else pauseGame();

  if (PAGE_TITLES[pageId] && document.title !== PAGE_TITLES[pageId]) {
    document.title = PAGE_TITLES[pageId];
  }

  // Llevamos el foco al título nuevo para que el teclado y los lectores
  // de pantalla no se queden en el botón que acaba de ocultarse.
  if (focus) {
    const heading = page.querySelector('h1');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }
}

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-page]');
  if (!trigger) return;
  event.preventDefault();
  showPage(trigger.dataset.page);
});

window.addEventListener('popstate', () => {
  const id = location.hash.replace('#', '');
  const target = document.getElementById(id);
  showPage(target && target.classList.contains('page') ? id : DEFAULT_PAGE, { push: false });
});

window.addEventListener('hashchange', () => {
  const id = location.hash.replace('#', '');
  const target = document.getElementById(id);
  if (target && target.classList.contains('page') && !target.classList.contains('active')) {
    showPage(id, { push: false });
  }
});

/* =========================================================
   2. Portada: botones "Sí" y "No"
   ========================================================= */

const btnSi = document.getElementById('btn-si');
const btnNo = document.getElementById('btn-no');

if (btnSi && btnNo) {
  let scale = 1;

  btnNo.addEventListener('click', () => {
    scale = Math.min(scale + 0.07, 1.4);
    btnSi.style.transform = `scale(${scale})`;
    btnNo.textContent = scale > 1.2 ? '¿Segura, Paula? 🥺' : '¿De verdad?';
  });

  btnSi.addEventListener('click', () => showPage('pag2'));
}

/* =========================================================
   3. Contador de días
   ========================================================= */

const startDate = document.getElementById('start-date');
const daysCount = document.getElementById('days-count');

if (startDate && daysCount) {
  const today = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  startDate.max = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  startDate.addEventListener('change', () => {
    if (!startDate.value) {
      daysCount.textContent = 'Elige una fecha para empezar ✨';
      return;
    }

    // Comparamos en UTC para que el cambio de hora no descuadre la cuenta.
    const [year, month, day] = startDate.value.split('-').map(Number);
    const selected = Date.UTC(year, month - 1, day);
    const now = new Date();
    const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const days = Math.round((todayUTC - selected) / 86400000);

    if (days < 0) {
      daysCount.textContent = 'Esa fecha todavía no ha llegado 💫';
    } else if (days === 0) {
      daysCount.textContent = '¡Es hoy! Un día para recordar. ♡';
    } else {
      daysCount.textContent = `${days} ${days === 1 ? 'día' : 'días'} desde esa fecha ♡`;
    }
  });
}

/* =========================================================
   4. Sobres con mensajes
   ========================================================= */

const envelopeButtons = Array.from(document.querySelectorAll('.envelope'));
const messageReveal = document.getElementById('envelope-message');

if (messageReveal) {
  envelopeButtons.forEach((envelope) => {
    envelope.addEventListener('click', () => {
      envelopeButtons.forEach((item) => item.classList.remove('opened'));
      envelope.classList.add('opened');

      const mark = document.createElement('span');
      mark.className = 'reveal-mark';
      mark.textContent = '♡';

      const text = document.createElement('p');
      text.textContent = envelope.dataset.message || '';

      const note = document.createElement('small');
      note.textContent = 'UN MENSAJE SOLO PARA PAULA';

      messageReveal.replaceChildren(mark, text, note);
      messageReveal.classList.remove('reveal-animate');
      void messageReveal.offsetWidth;
      messageReveal.classList.add('reveal-animate');
    });
  });
}

/* =========================================================
   5. Minijuego: laberinto del corazón
   ========================================================= */

const mazeLayout = [
  '###########',
  '#S..#....E#',
  '#.#.#.##..#',
  '#.#...#...#',
  '#.###.#.#.#',
  '#...#...#.#',
  '###.#.###.#',
  '#.........#',
  '###########'
];

const ROWS = mazeLayout.length;
const COLS = mazeLayout[0].length;
const TOTAL_HEARTS = 8;
const START = { x: 1, y: 1 };
const ENEMY_START = { x: 9, y: 1 };
const EXIT = { x: 9, y: 7 };
const HEART_CELLS = ['2,1', '3,1', '5,1', '6,1', '7,1', '8,2', '4,3', '2,5'];
const ENEMY_TICK = 900;
const INITIAL_MESSAGE = 'Usa las flechas o WASD para moverte, o desliza el dedo sobre el laberinto. Recoge los corazones y evita al fantasma.';

const mazeArea = document.getElementById('game-area');
const mazeGrid = document.getElementById('maze-grid');
const playerEl = document.getElementById('maze-player');
const enemyEl = document.getElementById('maze-enemy');
const goalEl = document.getElementById('maze-goal');
const scoreEl = document.getElementById('game-score');
const messageEl = document.getElementById('game-message');
const levelEl = document.getElementById('game-level');
const resetButton = document.getElementById('reset-game');
const retryButton = document.getElementById('retry-game');
const resultEl = document.getElementById('game-result');
const resultMessage = document.getElementById('game-result-message');
const directionButtons = Array.from(document.querySelectorAll('[data-direction]'));

const cells = [];
const walls = new Set();
const hearts = new Set(HEART_CELLS);
const DIRECTIONS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

let playerPos = { ...START };
let enemyPos = { ...ENEMY_START };
let collectedHearts = 0;
let gameOver = false;
let enemyTimer = null;

const cellKey = (x, y) => `${x},${y}`;
const isWall = (x, y) => walls.has(cellKey(x, y));

function setMessage(text) {
  if (messageEl) messageEl.textContent = text;
}

/* Las celdas y los personajes viven en la misma rejilla CSS: cada uno ocupa
   su casilla con grid-area, así que no hay que medir píxeles ni depender de
   que la sección esté visible. */
function buildMaze() {
  if (!mazeGrid) return;

  const fragment = document.createDocumentFragment();

  mazeLayout.forEach((row, y) => {
    Array.from(row).forEach((cell, x) => {
      const node = document.createElement('div');
      node.className = 'maze-cell';
      node.style.gridArea = `${y + 1} / ${x + 1}`;

      if (cell === '#') {
        node.classList.add('wall');
        node.setAttribute('aria-hidden', 'true');
        walls.add(cellKey(x, y));
      }

      cells.push(node);
      fragment.appendChild(node);
    });
  });

  mazeGrid.prepend(fragment);
}

function render() {
  if (playerEl) playerEl.style.gridArea = `${playerPos.y + 1} / ${playerPos.x + 1}`;
  if (enemyEl) enemyEl.style.gridArea = `${enemyPos.y + 1} / ${enemyPos.x + 1}`;
  if (goalEl) goalEl.style.gridArea = `${EXIT.y + 1} / ${EXIT.x + 1}`;

  cells.forEach((cell, index) => {
    const x = index % COLS;
    const y = Math.floor(index / COLS);
    const hasHeart = hearts.has(cellKey(x, y));
    cell.classList.toggle('heart-cell', hasHeart);
    cell.textContent = hasHeart ? '♥' : '';
  });

  if (scoreEl) scoreEl.textContent = String(collectedHearts);
}

function startEnemy() {
  if (enemyTimer || gameOver || document.hidden) return;
  enemyTimer = window.setInterval(moveEnemy, ENEMY_TICK);
}

function stopEnemy() {
  if (!enemyTimer) return;
  window.clearInterval(enemyTimer);
  enemyTimer = null;
}

function pauseGame() {
  stopEnemy();
}

function resumeGame() {
  if (isGameActive()) startEnemy();
}

function moveEnemy() {
  if (gameOver || !isGameActive()) {
    stopEnemy();
    return;
  }

  const options = [[0, -1], [0, 1], [-1, 0], [1, 0]]
    .map(([dx, dy]) => ({ x: enemyPos.x + dx, y: enemyPos.y + dy }))
    .filter(({ x, y }) => x >= 0 && x < COLS && y >= 0 && y < ROWS && !isWall(x, y));

  if (!options.length) return;

  const distance = (pos) => Math.abs(pos.x - playerPos.x) + Math.abs(pos.y - playerPos.y);
  options.sort((a, b) => distance(a) - distance(b));

  // Casi siempre se acerca a Paula, pero de vez en cuando improvisa.
  enemyPos = Math.random() < 0.68 ? options[0] : options[Math.floor(Math.random() * options.length)];
  render();

  if (enemyPos.x === playerPos.x && enemyPos.y === playerPos.y) finishGame(false);
}

function movePlayer(direction) {
  if (gameOver || !isGameActive()) return;

  const delta = DIRECTIONS[direction];
  if (!delta) return;

  const x = playerPos.x + delta[0];
  const y = playerPos.y + delta[1];
  if (x < 0 || x >= COLS || y < 0 || y >= ROWS || isWall(x, y)) return;

  playerPos = { x, y };

  if (hearts.delete(cellKey(x, y))) {
    collectedHearts += 1;
    setMessage(collectedHearts >= TOTAL_HEARTS
      ? '¡Ya tienes todos los corazones! Ahora llega a la salida dorada. ✨'
      : '¡Un corazón más! Sigue avanzando, Paula. ♥');
  }

  render();

  if (playerPos.x === enemyPos.x && playerPos.y === enemyPos.y) {
    finishGame(false);
    return;
  }

  if (playerPos.x === EXIT.x && playerPos.y === EXIT.y) {
    if (collectedHearts >= TOTAL_HEARTS) {
      finishGame(true);
    } else {
      const missing = TOTAL_HEARTS - collectedHearts;
      setMessage(`Te ${missing === 1 ? 'falta 1 corazón' : `faltan ${missing} corazones`} para abrir la salida. ♥`);
    }
  }
}

function finishGame(won) {
  if (gameOver) return;

  gameOver = true;
  stopEnemy();

  if (mazeArea) mazeArea.classList.add('game-finished');
  if (playerEl) playerEl.style.opacity = won ? '1' : '.35';
  if (enemyEl) enemyEl.style.opacity = won ? '.4' : '1';
  if (resultEl) resultEl.hidden = false;
  if (resultMessage) {
    resultMessage.textContent = won
      ? 'Muy bien, yo confiaba en ti. ♥ Sabía que podías conseguirlo.'
      : 'Vuelve a intentarlo, yo sé que puedes. ♡ No te rindas.';
  }
  if (levelEl) levelEl.textContent = won ? '¡LO CONSEGUISTE!' : 'FIN DEL JUEGO';

  setMessage(won ? '¡Has completado el reto!' : 'El fantasma te ha atrapado…');
}

function resetGame() {
  stopEnemy();

  gameOver = false;
  collectedHearts = 0;
  playerPos = { ...START };
  enemyPos = { ...ENEMY_START };
  hearts.clear();
  HEART_CELLS.forEach((cell) => hearts.add(cell));

  if (mazeArea) mazeArea.classList.remove('game-finished');
  if (playerEl) playerEl.style.opacity = '1';
  if (enemyEl) enemyEl.style.opacity = '1';
  if (resultEl) resultEl.hidden = true;
  if (levelEl) levelEl.textContent = 'BUSCA LA SALIDA';

  setMessage(INITIAL_MESSAGE);
  render();
  resumeGame();
}

if (mazeArea && mazeGrid && playerEl && enemyEl && goalEl) {
  buildMaze();
  resetGame();

  document.addEventListener('keydown', (event) => {
    const keyMap = {
      ArrowUp: 'up', w: 'up', W: 'up',
      ArrowDown: 'down', s: 'down', S: 'down',
      ArrowLeft: 'left', a: 'left', A: 'left',
      ArrowRight: 'right', d: 'right', D: 'right'
    };

    const direction = keyMap[event.key];
    if (!direction || !isGameActive()) return;

    event.preventDefault();
    movePlayer(direction);
  });

  directionButtons.forEach((button) => {
    button.addEventListener('click', () => movePlayer(button.dataset.direction));
  });

  if (resetButton) resetButton.addEventListener('click', resetGame);
  if (retryButton) retryButton.addEventListener('click', resetGame);

  // Deslizar el dedo sobre el tablero en móvil.
  let touchOrigin = null;

  mazeArea.addEventListener('touchstart', (event) => {
    const touch = event.changedTouches[0];
    touchOrigin = { x: touch.clientX, y: touch.clientY };
  }, { passive: true });

  mazeArea.addEventListener('touchend', (event) => {
    if (!touchOrigin) return;

    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchOrigin.x;
    const dy = touch.clientY - touchOrigin.y;
    touchOrigin = null;

    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;

    const direction = Math.abs(dx) > Math.abs(dy)
      ? (dx > 0 ? 'right' : 'left')
      : (dy > 0 ? 'down' : 'up');

    movePlayer(direction);
  }, { passive: true });
}

// Si la pestaña pasa a segundo plano, el fantasma se detiene.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopEnemy();
  } else if (isGameActive() && !gameOver) {
    startEnemy();
  }
});

/* =========================================================
   6. Fotos de los recuerdos
   ========================================================= */

const PHOTO_STORAGE_KEY = 'paula-premium-fotos';
const photoInputs = Array.from(document.querySelectorAll('.photo-upload'));
const photoRemoveButtons = Array.from(document.querySelectorAll('.photo-remove'));
const photoNote = document.querySelector('.photo-note');

function readSavedPhotos() {
  try {
    return JSON.parse(localStorage.getItem(PHOTO_STORAGE_KEY) || '{}') || {};
  } catch (error) {
    return {};
  }
}

const savedPhotos = readSavedPhotos();

function applyPhoto(input, dataUrl) {
  const card = input.closest('.memory-photo');
  if (!card || !dataUrl) return;

  card.style.backgroundImage = `linear-gradient(0deg, rgba(8,7,11,.92), rgba(8,7,11,.05) 70%), url("${dataUrl}")`;
  card.classList.add('has-photo');

  const icon = card.querySelector('.photo-placeholder-icon');
  if (icon) icon.textContent = '✓';

  const removeButton = card.querySelector('.photo-remove');
  if (removeButton) removeButton.hidden = false;
}

/* Quita la foto de la tarjeta y del almacenamiento del navegador. */
function clearPhoto(input) {
  const card = input.closest('.memory-photo');

  delete savedPhotos[input.id];
  persistPhotos();

  if (!card) return;

  card.style.backgroundImage = '';
  card.classList.remove('has-photo');

  const icon = card.querySelector('.photo-placeholder-icon');
  if (icon) icon.textContent = '＋';

  const removeButton = card.querySelector('.photo-remove');
  if (removeButton) removeButton.hidden = true;

  input.value = '';
}

function persistPhotos() {
  try {
    localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(savedPhotos));
    return true;
  } catch (error) {
    return false;
  }
}

function warnPhotosNotSaved() {
  if (!photoNote || photoNote.querySelector('.photo-warning')) return;

  const warning = document.createElement('span');
  warning.className = 'photo-warning';
  warning.textContent = ' Este navegador no ha permitido guardar la foto: se verá solo hasta que recargues la página.';
  photoNote.appendChild(warning);
}

/* Reduce la foto antes de guardarla para no llenar el almacenamiento. */
function shrinkImage(file, maxSide = 1400, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      context.fillStyle = '#15131a';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo leer la imagen'));
    };

    image.src = objectUrl;
  });
}

photoInputs.forEach((input) => {
  if (savedPhotos[input.id]) applyPhoto(input, savedPhotos[input.id]);

  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    if (!file || !file.type.startsWith('image/')) return;

    try {
      const dataUrl = await shrinkImage(file);
      savedPhotos[input.id] = dataUrl;
      applyPhoto(input, dataUrl);
      if (!persistPhotos()) warnPhotosNotSaved();
      input.value = '';
    } catch (error) {
      console.warn('No se pudo procesar la imagen:', error);
    }
  });
});

photoRemoveButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.photo);
    if (input) clearPhoto(input);
  });
});

/* =========================================================
   7. Sorpresa final
   ========================================================= */

const surpriseButton = document.getElementById('surprise-button');
const surpriseMessage = document.getElementById('surprise-message');
const heartsLayer = document.getElementById('hearts-layer');
let surpriseShown = false;

function launchHearts() {
  if (!heartsLayer) return;

  const symbols = ['♥', '♡', '✦', '❤'];
  const total = reduceMotionQuery.matches ? 8 : 34;

  for (let i = 0; i < total; i += 1) {
    const heart = document.createElement('span');
    heart.className = 'floating-heart';
    heart.textContent = symbols[Math.floor(Math.random() * symbols.length)];
    heart.style.left = `${Math.random() * 100}%`;
    heart.style.animationDelay = `${Math.random() * 1.8}s`;
    heart.style.animationDuration = `${2.5 + Math.random() * 2.2}s`;

    heartsLayer.appendChild(heart);
    heart.addEventListener('animationend', () => heart.remove(), { once: true });
    window.setTimeout(() => heart.remove(), 7000);
  }
}

if (surpriseButton && surpriseMessage) {
  surpriseButton.addEventListener('click', () => {
    launchHearts();

    surpriseMessage.textContent = surpriseShown
      ? 'Y por si no te lo había dicho suficiente: te quiero mucho. ♡'
      : 'Espero haberte sacado una sonrisa. Eres una persona muy especial para mí. Te quiero mucho mucho mucho. ♥';

    surpriseMessage.classList.add('visible');
    surpriseShown = true;
    surpriseButton.innerHTML = 'Otra lluvia de cariño <span>♥</span>';
  });
}

/* =========================================================
   8. Arranque
   ========================================================= */

const initialPage = location.hash.replace('#', '');
const initialTarget = document.getElementById(initialPage);

if (initialTarget && initialTarget.classList.contains('page')) {
  showPage(initialPage, { push: false, focus: false, smooth: false });
}
