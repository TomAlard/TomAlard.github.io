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

  const LINE = "#2c2c2e";
  const LINE_FADED = "rgba(44, 44, 46, 0.38)";
  const X_COLOR = "#2563eb";
  const O_COLOR = "#dc2626";
  const DRAW_COLOR = "#6b7280";

  function relRect(el, origin) {
    const r = el.getBoundingClientRect();
    return {
      x: r.left - origin.left,
      y: r.top - origin.top,
      w: r.width,
      h: r.height
    };
  }

  function withAlpha(color, alpha) {
    if (color.charAt(0) !== "#" || color.length !== 7) return color;
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return "rgba(" + r + ", " + g + ", " + b + ", " + alpha + ")";
  }

  function strokeOpts(extra) {
    return Object.assign({
      disableMultiStroke: true,
      roughness: 1.35,
      bowing: 0.9,
      maxRandomnessOffset: 2.2
    }, extra);
  }

  function drawX(rc, box, stroke, strokeWidth, seed) {
    const pad = Math.min(box.w, box.h) * 0.22;
    rc.line(box.x + pad, box.y + pad, box.x + box.w - pad, box.y + box.h - pad, strokeOpts({
      stroke: stroke,
      strokeWidth: strokeWidth,
      seed: seed
    }));
    rc.line(box.x + box.w - pad, box.y + pad, box.x + pad, box.y + box.h - pad, strokeOpts({
      stroke: stroke,
      strokeWidth: strokeWidth,
      seed: seed + 17
    }));
  }

  function drawO(rc, box, stroke, strokeWidth, seed) {
    const size = Math.min(box.w, box.h) * 0.58;
    rc.circle(box.x + box.w / 2, box.y + box.h / 2, size, strokeOpts({
      stroke: stroke,
      strokeWidth: strokeWidth,
      seed: seed
    }));
  }

  function drawSketch(canvas, boardEl, minis, buttons, state) {
    if (!window.rough) return;
    const origin = boardEl.getBoundingClientRect();
    if (origin.width < 8 || origin.height < 8) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(origin.width * dpr);
    canvas.height = Math.round(origin.height * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, origin.width, origin.height);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const rc = window.rough.canvas(canvas);
    const allowed = {};
    for (let i = 0; i < state.playable.length; i++) {
      allowed[state.playable[i]] = true;
    }

    const miniBoxes = [];
    for (let m = 0; m < 9; m++) {
      miniBoxes[m] = relRect(minis[m], origin);
    }

    const macro = strokeOpts({
      stroke: LINE,
      strokeWidth: 2.6,
      roughness: 1.15,
      bowing: 0.85,
      maxRandomnessOffset: 3.5
    });
    for (let col = 0; col < 2; col++) {
      const left = miniBoxes[col];
      const right = miniBoxes[col + 1];
      const bottom = miniBoxes[col + 6];
      const x = (left.x + left.w + right.x) / 2;
      rc.line(x, left.y, x, bottom.y + bottom.h, Object.assign({ seed: 11 + col }, macro));
    }
    for (let row = 0; row < 2; row++) {
      const top = miniBoxes[row * 3];
      const bottom = miniBoxes[row * 3 + 3];
      const right = miniBoxes[row * 3 + 2];
      const y = (top.y + top.h + bottom.y) / 2;
      rc.line(top.x, y, right.x + right.w, y, Object.assign({ seed: 21 + row }, macro));
    }

    for (let m = 0; m < 9; m++) {
      const faded = !state.result && !allowed[m];
      const stroke = faded ? LINE_FADED : LINE;
      const cells = [];
      for (let c = 0; c < 9; c++) {
        cells[c] = relRect(buttons[m][c], origin);
      }

      const inner = strokeOpts({
        stroke: stroke,
        strokeWidth: 1.25,
        roughness: 1.0,
        bowing: 0.6,
        maxRandomnessOffset: 1.65
      });
      for (let col = 0; col < 2; col++) {
        const x = (cells[col].x + cells[col].w + cells[col + 1].x) / 2;
        rc.line(x, cells[col].y, x, cells[col + 6].y + cells[col + 6].h, Object.assign({
          seed: 100 + m * 10 + col
        }, inner));
      }
      for (let row = 0; row < 2; row++) {
        const y = (cells[row * 3].y + cells[row * 3].h + cells[row * 3 + 3].y) / 2;
        rc.line(cells[row * 3].x, y, cells[row * 3 + 2].x + cells[row * 3 + 2].w, y, Object.assign({
          seed: 200 + m * 10 + row
        }, inner));
      }

      for (let c = 0; c < 9; c++) {
        const value = state.cells[m][c];
        if (!value || state.mini[m]) continue;
        const color = value === 1 ? X_COLOR : O_COLOR;
        const markStroke = faded ? withAlpha(color, 0.42) : color;
        if (value === 1) {
          drawX(rc, cells[c], markStroke, 1.7, 300 + m * 9 + c);
        } else {
          drawO(rc, cells[c], markStroke, 1.7, 500 + m * 9 + c);
        }
      }

      if (state.mini[m] === 1) {
        drawX(rc, miniBoxes[m], faded ? withAlpha(X_COLOR, 0.55) : X_COLOR, 3.4, 600 + m);
      } else if (state.mini[m] === 2) {
        drawO(rc, miniBoxes[m], faded ? withAlpha(O_COLOR, 0.55) : O_COLOR, 3.4, 700 + m);
      } else if (state.mini[m] === 3) {
        const box = miniBoxes[m];
        const padX = box.w * 0.28;
        const y = box.y + box.h / 2;
        rc.line(box.x + padX, y, box.x + box.w - padX, y, strokeOpts({
          stroke: faded ? withAlpha(DRAW_COLOR, 0.55) : DRAW_COLOR,
          strokeWidth: 3.2,
          seed: 800 + m
        }));
      }
    }
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
      '<div class="uttt-board" role="grid" aria-label="Ultimate Tic-Tac-Toe">' +
        '<div class="uttt-minis"></div>' +
        '<canvas class="uttt-sketch" aria-hidden="true"></canvas>' +
      "</div>";

    const statusEl = root.querySelector(".uttt-status");
    const boardEl = root.querySelector(".uttt-board");
    const minisEl = root.querySelector(".uttt-minis");
    const canvas = root.querySelector(".uttt-sketch");
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
      minisEl.appendChild(miniEl);
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
      drawSketch(canvas, boardEl, minis, buttons, state);
    }

    resetEl.addEventListener("click", function () {
      game.reset();
      render();
    });

    if (window.ResizeObserver) {
      new window.ResizeObserver(function () {
        drawSketch(canvas, boardEl, minis, buttons, game.state());
      }).observe(boardEl);
    }

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
