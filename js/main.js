/**
 * Movie Ranking Game Engine
 */

// Глобальное состояние игры
const state = {
  player1Name: "Kirill",
  player2Name: "Osman",
  totalLevels: 5,
  currentPlayer: 1, // 1 или 2
  p1Movies: [],
  p2Movies: [],
  p1Ranks: {}, // { levelNumber: movieTitle }
  p2Ranks: {}, // { levelNumber: movieTitle }
  p1CurrentIndex: 0,
  p2CurrentIndex: 0,
  p1SelectedRank: null,
  p2SelectedRank: null,
};

/**
 * Парсер строк формата:
 * "The Twilight Saga: New Moon (2009) -> https://boxd.it/1Hj2"
 */
function parseMovieLine(line) {
  if (!line || !line.trim()) return null;

  // Отсекаем ссылку и всё после '->'
  const cleanTitle = line.split("->")[0].trim();
  return cleanTitle || null;
}

/**
 * Загрузка списка фильмов из .txt файла
 */
async function fetchWatchedList(filename) {
  try {
    const response = await fetch(`watched/${filename}`);
    if (!response.ok) {
      throw new Error(`Не удалось загрузить watched/${filename}`);
    }
    const text = await response.text();

    return text
      .split("\n")
      .map(parseMovieLine)
      .filter((title) => title !== null);
  } catch (error) {
    console.warn(`Ошибка при чтении watched/${filename}:`, error);
    return [];
  }
}

/**
 * Перемешивание массива (Fisher-Yates Shuffle)
 */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Формирование персональной выборки для игрока:
 * (N/2 + 1) из общего + остаток из личного
 */
function generatePlayerPool(commonList, personalList, totalCount) {
  const commonNeeded = Math.floor(totalCount / 2) + 1;
  const personalNeeded = totalCount - commonNeeded;

  const shuffledCommon = shuffle(commonList);
  const shuffledPersonal = shuffle(personalList);

  const selectedCommon = shuffledCommon.slice(0, commonNeeded);
  const selectedPersonal = shuffledPersonal.slice(0, personalNeeded);

  const combined = [...selectedCommon, ...selectedPersonal];

  // Если в файлах не хватило уникальных фильмов, добираем из остатка общего списка
  if (combined.length < totalCount) {
    const extraNeeded = totalCount - combined.length;
    const remainingCommon = shuffledCommon.slice(
      commonNeeded,
      commonNeeded + extraNeeded,
    );
    combined.push(...remainingCommon);
  }

  return shuffle(combined);
}

/**
 * Обработчик старта игры (вызывается из form onsubmit в HTML)
 */
async function handleStartGame(event) {
  if (event) event.preventDefault();

  const p1Input = document.getElementById("player1-name");
  const p2Input = document.getElementById("player2-name");
  const levelsSelect = document.getElementById("levels-count");

  state.player1Name = p1Input?.value.trim() || "Kirill";
  state.player2Name = p2Input?.value.trim() || "Osman";
  state.totalLevels = parseInt(levelsSelect?.value, 10) || 5;

  // Загрузка списков
  const commonList = await fetchWatchedList("common-watched.txt");
  const kirillList = await fetchWatchedList("kirill-watched.txt");
  const osmanList = await fetchWatchedList("osman-watched.txt");

  // Генерация наборов фильмов
  state.p1Movies = generatePlayerPool(
    commonList,
    kirillList,
    state.totalLevels,
  );
  state.p2Movies = generatePlayerPool(commonList, osmanList, state.totalLevels);

  // Сброс состояний
  state.currentPlayer = 1;
  state.p1Ranks = {};
  state.p2Ranks = {};
  state.p1CurrentIndex = 0;
  state.p2CurrentIndex = 0;
  state.p1SelectedRank = null;
  state.p2SelectedRank = null;

  // Обновление имен в UI
  document.getElementById("p1-display-name").childNodes[2].textContent =
    ` ${state.player1Name}`;
  document.getElementById("p2-display-name").childNodes[2].textContent =
    ` ${state.player2Name}`;

  // Переключение секций
  document.getElementById("setup-section")?.classList.add("hidden");
  document.getElementById("summary-section")?.classList.add("hidden");
  document.getElementById("gameplay-section")?.classList.remove("hidden");

  // Активация хода
  activateTurn(1);
}

/**
 * Активация UI под текущего игрока
 */
function activateTurn(playerNum) {
  state.currentPlayer = playerNum;

  const board1 = document.getElementById("board-player-1");
  const board2 = document.getElementById("board-player-2");
  const activeArea1 = document.getElementById("p1-active-area");
  const activeArea2 = document.getElementById("p2-active-area");

  if (playerNum === 1) {
    board1?.classList.remove("opacity-60");
    board2?.classList.add("opacity-60");

    activeArea1?.classList.remove("hidden");
    activeArea2?.classList.add("hidden");

    renderCurrentMovie(1);
    renderSlots(1);
  } else {
    board2?.classList.remove("opacity-60");
    board1?.classList.add("opacity-60");

    activeArea2?.classList.remove("hidden");
    activeArea1?.classList.add("hidden");

    renderCurrentMovie(2);
    renderSlots(2);
  }
}

/**
 * Отрисовка текущего карточки фильма
 */
function renderCurrentMovie(playerNum) {
  const isP1 = playerNum === 1;
  const index = isP1 ? state.p1CurrentIndex : state.p2CurrentIndex;
  const movies = isP1 ? state.p1Movies : state.p2Movies;

  const titleElem = document.getElementById(
    isP1 ? "p1-current-title" : "p2-current-title",
  );
  const posterElem = document.getElementById(
    isP1 ? "p1-current-poster" : "p2-current-poster",
  );
  const badgeElem = document.getElementById(
    isP1 ? "p1-progress-badge" : "p2-progress-badge",
  );

  const movie = movies[index] || "Фильмы закончились";

  if (titleElem) titleElem.textContent = movie;
  if (badgeElem) badgeElem.textContent = `${index} / ${state.totalLevels}`;

  if (posterElem) {
    const encoded = encodeURIComponent(movie);
    posterElem.src = `https://placehold.co/180x270/282832/E2E2E6?text=${encoded}`;
  }
}

/**
 * Отрисовка слотов для позиций
 */
function renderSlots(playerNum) {
  const isP1 = playerNum === 1;
  const container = document.getElementById(
    isP1 ? "p1-slots-container" : "p2-slots-container",
  );
  const ranks = isP1 ? state.p1Ranks : state.p2Ranks;
  const selectedRank = isP1 ? state.p1SelectedRank : state.p2SelectedRank;
  const confirmBtn = document.getElementById(
    isP1 ? "p1-confirm-btn" : "p2-confirm-btn",
  );

  if (!container) return;
  container.innerHTML = "";

  if (confirmBtn) confirmBtn.disabled = selectedRank === null;

  for (let level = 1; level <= state.totalLevels; level++) {
    const isFilled = ranks[level] !== undefined;
    const isSelected = selectedRank === level;

    const slot = document.createElement("div");
    slot.className = `p-3 rounded-xl border flex items-center justify-between text-sm transition cursor-pointer ${
      isFilled
        ? "bg-muted-cardLight/50 border-muted-border/50 text-muted-subtext cursor-not-allowed"
        : isSelected
          ? "bg-burgundy-900/80 border-burgundy-500 text-white shadow-lg"
          : "bg-muted-card border-muted-border hover:border-burgundy-600/50 text-muted-text"
    }`;

    const leftSpan = document.createElement("span");
    leftSpan.className = "font-bold w-6 text-center text-burgundy-400";
    leftSpan.textContent = level;

    const rightSpan = document.createElement("span");
    rightSpan.className = "flex-1 ml-3 truncate";
    rightSpan.textContent = isFilled ? ranks[level] : "— Свободно —";

    slot.appendChild(leftSpan);
    slot.appendChild(rightSpan);

    if (!isFilled && state.currentPlayer === playerNum) {
      slot.addEventListener("click", () => {
        if (isP1) state.p1SelectedRank = level;
        else state.p2SelectedRank = level;
        renderSlots(playerNum);
      });
    }

    container.appendChild(slot);
  }
}

/**
 * Подтверждение выбора позиции (вызывается из onclick="confirmPlacement(1/2)" в HTML)
 */
function confirmPlacement(playerNum) {
  const isP1 = playerNum === 1;
  const selectedRank = isP1 ? state.p1SelectedRank : state.p2SelectedRank;

  if (!selectedRank) return;

  const currentIndex = isP1 ? state.p1CurrentIndex : state.p2CurrentIndex;
  const movies = isP1 ? state.p1Movies : state.p2Movies;
  const currentMovie = movies[currentIndex];

  if (isP1) {
    state.p1Ranks[selectedRank] = currentMovie;
    state.p1CurrentIndex++;
    state.p1SelectedRank = null;

    if (state.p1CurrentIndex < state.totalLevels) {
      renderCurrentMovie(1);
      renderSlots(1);
    } else {
      // Переход к Игроку 2
      activateTurn(2);
    }
  } else {
    state.p2Ranks[selectedRank] = currentMovie;
    state.p2CurrentIndex++;
    state.p2SelectedRank = null;

    if (state.p2CurrentIndex < state.totalLevels) {
      renderCurrentMovie(2);
      renderSlots(2);
    } else {
      // Игра завершена
      showSummary();
    }
  }
}

/**
 * Вывод итога игры
 */
function showSummary() {
  document.getElementById("gameplay-section")?.classList.add("hidden");
  const summarySection = document.getElementById("summary-section");
  summarySection?.classList.remove("hidden");

  const container = document.getElementById("summary-comparison");
  if (!container) return;

  const buildListHTML = (name, ranks) => {
    let items = "";
    for (let i = 1; i <= state.totalLevels; i++) {
      items += `
                <li class="flex items-center gap-3 p-2.5 rounded-lg bg-muted-cardLight border border-muted-border/60">
                    <span class="w-6 text-center font-bold text-burgundy-400">#${i}</span>
                    <span class="text-sm text-white truncate">${ranks[i] || "—"}</span>
                </li>
            `;
    }
    return `
            <div class="bg-muted-card p-4 rounded-xl border border-muted-border space-y-3">
                <h3 class="font-bold text-lg text-white border-b border-muted-border pb-2">${name}</h3>
                <ul class="space-y-2">${items}</ul>
            </div>
        `;
  };

  container.innerHTML =
    buildListHTML(state.player1Name, state.p1Ranks) +
    buildListHTML(state.player2Name, state.p2Ranks);
}

/**
 * Полный сброс игры (вызывается из onclick="clearFullReset()" в HTML)
 */
function clearFullReset() {
  state.p1Movies = [];
  state.p2Movies = [];
  state.p1Ranks = {};
  state.p2Ranks = {};
  state.p1CurrentIndex = 0;
  state.p2CurrentIndex = 0;
  state.p1SelectedRank = null;
  state.p2SelectedRank = null;

  document.getElementById("gameplay-section")?.classList.add("hidden");
  document.getElementById("summary-section")?.classList.add("hidden");
  document.getElementById("setup-section")?.classList.remove("hidden");
}
