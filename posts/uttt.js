(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.UTTT = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const LINES = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];

  function lineWinner(cells) {
    for (let i = 0; i < LINES.length; i++) {
      const a = LINES[i][0];
      const b = LINES[i][1];
      const c = LINES[i][2];
      if (cells[a] && cells[a] === cells[b] && cells[b] === cells[c]) {
        return cells[a];
      }
    }
    return 0;
  }

  function miniResult(board) {
    const winner = lineWinner(board);
    if (winner) return winner;
    for (let i = 0; i < 9; i++) {
      if (board[i] === 0) return 0;
    }
    return 3;
  }

  function majorityWinner(miniBoards) {
    let x = 0;
    let o = 0;
    for (let i = 0; i < 9; i++) {
      if (miniBoards[i] === 1) x += 1;
      if (miniBoards[i] === 2) o += 1;
    }
    if (x > o) return 1;
    if (o > x) return 2;
    return 3;
  }

  function createGame(preset) {
    const cells = [];
    const mini = [];
    let nextMini;
    let player;
    let result;

    function reset() {
      for (let m = 0; m < 9; m++) {
        cells[m] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
        mini[m] = 0;
      }
      nextMini = -1;
      player = 1;
      result = 0;
    }

    function playableMinis() {
      if (result) return [];
      if (nextMini === -1 || mini[nextMini] !== 0) {
        const open = [];
        for (let i = 0; i < 9; i++) {
          if (mini[i] === 0) open.push(i);
        }
        return open;
      }
      return [nextMini];
    }

    function hasLegalMove() {
      const allowed = playableMinis();
      for (let i = 0; i < allowed.length; i++) {
        const board = cells[allowed[i]];
        for (let c = 0; c < 9; c++) {
          if (board[c] === 0) return true;
        }
      }
      return false;
    }

    function scoreWinner() {
      return majorityWinner(mini);
    }

    function evaluate() {
      const macro = lineWinner(mini.map(function (value) {
        return value === 1 || value === 2 ? value : 0;
      }));
      if (macro) {
        result = macro;
        return;
      }
      if (!hasLegalMove()) {
        result = scoreWinner();
        return;
      }
      result = 0;
    }

    function play(m, c) {
      if (result) return false;
      if (m < 0 || m > 8 || c < 0 || c > 8) return false;
      if (cells[m][c] !== 0 || mini[m] !== 0) return false;
      const allowed = playableMinis();
      if (allowed.indexOf(m) === -1) return false;

      cells[m][c] = player;
      mini[m] = miniResult(cells[m]);
      nextMini = mini[c] === 0 ? c : -1;
      evaluate();
      if (!result) player = player === 1 ? 2 : 1;
      return true;
    }

    function snapshot() {
      return {
        cells: cells.map(function (board) { return board.slice(); }),
        mini: mini.slice(),
        nextMini: nextMini,
        player: player,
        result: result,
        playable: playableMinis()
      };
    }

    reset();
    if (preset) {
      if (preset.cells) {
        for (let m = 0; m < 9; m++) cells[m] = preset.cells[m].slice();
      }
      if (preset.mini) {
        for (let m = 0; m < 9; m++) mini[m] = preset.mini[m];
      }
      if (typeof preset.nextMini === "number") nextMini = preset.nextMini;
      if (preset.player) player = preset.player;
      evaluate();
    }
    return { play: play, reset: reset, state: snapshot };
  }

  function mark(player) {
    return player === 1 ? "X" : "O";
  }

  function statusText(state) {
    if (state.result === 1) return "X wins";
    if (state.result === 2) return "O wins";
    if (state.result === 3) return "Draw";
    if (state.nextMini === -1 || state.mini[state.nextMini] !== 0) {
      return mark(state.player) + " to play · free move";
    }
    return mark(state.player) + " to play";
  }

  function mount(root) {
    const game = createGame();

    root.innerHTML =
      '<div class="uttt-toolbar">' +
        '<p class="uttt-status" aria-live="polite"></p>' +
        '<button type="button" class="uttt-reset">Reset</button>' +
      "</div>" +
      '<div class="uttt-board" role="grid" aria-label="Ultimate Tic-Tac-Toe"></div>'

    const statusEl = root.querySelector(".uttt-status");
    const boardEl = root.querySelector(".uttt-board");
    const resetEl = root.querySelector(".uttt-reset");
    const minis = [];
    const buttons = [];

    for (let m = 0; m < 9; m++) {
      const miniEl = document.createElement("div");
      miniEl.className = "uttt-mini";
      miniEl.setAttribute("role", "group");
      buttons[m] = [];
      for (let c = 0; c < 9; c++) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "uttt-cell";
        btn.addEventListener("click", function () {
          if (game.play(m, c)) render();
        });
        miniEl.appendChild(btn);
        buttons[m][c] = btn;
      }
      const overlay = document.createElement("div");
      overlay.className = "uttt-overlay";
      overlay.setAttribute("aria-hidden", "true");
      miniEl.appendChild(overlay);
      boardEl.appendChild(miniEl);
      minis[m] = miniEl;
    }

    function render() {
      const state = game.state();
      const allowed = {};
      for (let i = 0; i < state.playable.length; i++) {
        allowed[state.playable[i]] = true;
      }

      for (let m = 0; m < 9; m++) {
        minis[m].classList.toggle("active", Boolean(allowed[m]));
        minis[m].classList.toggle("won-x", state.mini[m] === 1);
        minis[m].classList.toggle("won-o", state.mini[m] === 2);
        minis[m].classList.toggle("drawn", state.mini[m] === 3);
        const overlay = minis[m].querySelector(".uttt-overlay");
        overlay.textContent =
          state.mini[m] === 1 ? "X" : state.mini[m] === 2 ? "O" : state.mini[m] === 3 ? "–" : "";

        for (let c = 0; c < 9; c++) {
          const value = state.cells[m][c];
          const btn = buttons[m][c];
          btn.textContent = value === 1 ? "X" : value === 2 ? "O" : "";
          btn.classList.toggle("x", value === 1);
          btn.classList.toggle("o", value === 2);
          btn.disabled = Boolean(state.result) || value !== 0 || !allowed[m];
        }
      }

      statusEl.textContent = statusText(state);
    }

    resetEl.addEventListener("click", function () {
      game.reset();
      render();
    });

    render();
    return game;
  }

  return { createGame: createGame, mount: mount, statusText: statusText, majorityWinner: majorityWinner };
});

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", function () {
    const root = document.getElementById("uttt");
    if (root && window.UTTT) window.UTTT.mount(root);
  });
}
