'use strict';
// Draws the pixel-art office on a canvas: the room, the desks and one character per session.
// Everything is drawn with filled rectangles on a 320-pixel-wide grid and scaled up by CSS.
window.PixelOffice = function (canvas) {
  const W = 320; let H = 200;
  const ctx = canvas.getContext('2d');
  const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };

  // ---------- scene constants ----------
  const COLS = [66, 160, 254], ROW_GAP = 58;
  const rowT = r => 96 + r * ROW_GAP;
  const corrY = r => r === 0 ? 73 : rowT(r) - 17;
  const DOOR = { x: 21, y: 62 };
  let desks = [];
  const WIN = [66, 135, 204];
  const P = {
    wall: '#D9E3E1', wallLo: '#C4D2D0', trim2: '#AFC0BE', trim: '#8A9E9E',
    floorA: '#7E95A8', floorB: '#768DA0', frame: '#F4F7F7', frameSh: '#9FB0B0',
    deskTop: '#DBA868', deskTopHi: '#EBC089', deskFront: '#B37D47', deskSh: '#7F532B',
    chair: '#3E4C5E', chairHi: '#56687D', shadow: 'rgba(20,30,40,.2)',
    door: '#9C6B43', doorHi: '#B98556'
  };
  const EYE = '#1E1A20', PINK = '#EE9CB0', BLUSH = 'rgba(232,110,120,.5)', NOSE = '#2A2320';
  const LID = '#4A5563', LID2 = '#5B6672', LIDSH = '#39424E', MUG = '#F4F1EA';

  // ---------- character skins ----------
  const SKINS = {
    human: [
      { fur: '#F2C9A0', hair: '#2B2233', style: 0 }, { fur: '#E0A878', hair: '#6B3E26', style: 1 },
      { fur: '#B97A50', hair: '#1B1B1F', style: 2 }, { fur: '#F6D7B8', hair: '#C98A2B', style: 1 },
      { fur: '#E7B88C', hair: '#8C2F39', style: 0 }, { fur: '#C98F63', hair: '#3A2A22', style: 2 }
    ],
    cat: [
      { fur: '#E89A3C', dark: '#B86A1E', light: '#FFF3E0', tabby: 1 },
      { fur: '#8E99A6', dark: '#5E6873', light: '#F0F3F5', tabby: 1 },
      { fur: '#2D2B33', dark: '#17161B', light: '#4A4753', eye: '#D6E86A' },
      { fur: '#F3E3C6', dark: '#8A5A3C', light: '#FFFFFF' }
    ],
    dog: [
      { fur: '#D9A55B', dark: '#9C6A2E', light: '#F7E7C8' },
      { fur: '#7A4E2D', dark: '#4D2F19', light: '#E0BE94' },
      { fur: '#F4F1EA', dark: '#6B5A4E', light: '#FFFFFF' }
    ],
    bear: [
      { fur: '#8B5E3C', dark: '#5E3D25', light: '#D9B48C' },
      { fur: '#F2F4F6', dark: '#26262B', light: '#FFFFFF', panda: 1, eye: '#FFFFFF', hand: '#26262B' },
      { fur: '#E9EEF2', dark: '#B9C4CC', light: '#FFFFFF' }
    ],
    rabbit: [
      { fur: '#F5F1EC', dark: '#D8CFC4', light: '#FFFFFF' },
      { fur: '#A99B8F', dark: '#7C6F64', light: '#EDE6DF' },
      { fur: '#E7C9A5', dark: '#C19A6B', light: '#FFF4E3' }
    ]
  };
  let skin = 'auto';
  const kindOf = s => skin === 'auto' ? s.kind : skin;
  const colOf = s => { const a = SKINS[kindOf(s)]; return a[s.variant % a.length]; };

  // ---------- drawing: room ----------
  function hand(cx, cy, a, len, c) { for (let i = 1; i <= len; i++) R(cx + Math.round(Math.sin(a) * i), cy - Math.round(Math.cos(a) * i), 1, 1, c); }
  function windowAt(x, y, w, h, mode, t, i) {
    const night = mode === 'night', dusk = mode === 'dusk';
    R(x - 2, y - 2, w + 4, h + 4, P.frame); R(x - 3, y + h + 2, w + 6, 2, P.frameSh);
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    if (!night) {
      R(x, y, w, h, dusk ? '#8D86C9' : '#8FCDEE'); if (dusk) R(x, y + 8, w, 9, '#D98BA6');
      R(x, y + h - 13, w, 13, dusk ? '#F6B26B' : '#BDE4F5');
      if (dusk && i === 2) { R(x + 30, y + h - 13, 8, 6, '#FFE08A'); R(x + 29, y + h - 11, 10, 4, '#FFE08A'); }
      for (let k = 0; k < 2; k++) {
        const cx = x - 16 + ((t * (1.5 + k) + i * 23 + k * 37) % (w + 32)), cy = y + 3 + k * 7 + (i % 2) * 2;
        R(cx, cy + 2, 14, 3, dusk ? '#FFD9C7' : '#FFFFFF'); R(cx + 3, cy, 7, 3, dusk ? '#FFD9C7' : '#FFFFFF');
      }
    } else {
      R(x, y, w, h, '#101A33'); R(x, y + h - 13, w, 13, '#1A2748');
      for (let k = 0; k < 8; k++) if (((t * 1.2 + k * 0.7) % 3) < 2.2) R(x + ((k * 17 + i * 11) % w), y + ((k * 7 + i * 5) % (h - 13)), 1, 1, '#DDE6FF');
      if (i === 1) { R(x + 35, y + 4, 6, 8, '#F6EFC2'); R(x + 34, y + 5, 8, 6, '#F6EFC2'); R(x + 36, y + 6, 2, 2, '#DDD5A0'); }
    }
    for (let b = 0; b < 6; b++) {
      const bx = x + b * 10 - 3, bh = 6 + ((b * 7 + i * 5) % 11);
      R(bx, y + h - bh, 9, bh, night ? '#0A1022' : dusk ? (b % 2 ? '#6B5B95' : '#7D6AA6') : (b % 2 ? '#6FA3C4' : '#86B7D4'));
      if (night) for (let k = 0; k < bh - 3; k += 3) if ((b + k + i) % 2) R(bx + 2 + ((k + b) % 2) * 3, y + h - bh + 2 + k, 1, 1, '#FFD166');
    }
    ctx.restore();
    R(x + w / 2 - 1, y, 2, h, P.frame);
  }
  function room(t, mode) {
    R(0, 0, W, 58, P.wall); R(0, 46, W, 10, P.wallLo); R(0, 45, W, 1, P.trim2); R(0, 56, W, 2, P.trim);
    for (let y = 58, j = 0; y < H; y += 14, j++) for (let x = 0, i = 0; x < W; x += 16, i++) R(x, y, 16, 14, (i + j) % 2 ? P.floorA : P.floorB);
    // door + exit sign
    R(8, 14, 26, 44, P.frameSh); R(10, 16, 22, 42, P.door); R(12, 19, 18, 16, P.doorHi); R(12, 38, 18, 17, P.doorHi); R(28, 37, 2, 2, '#E9C46A');
    R(14, 6, 14, 6, '#2E8B57'); R(16, 8, 3, 2, '#DFF5E6'); R(20, 8, 2, 2, '#DFF5E6'); R(23, 8, 3, 2, '#DFF5E6');
    // clock showing the real time
    const kx = 41, ky = 9, now = new Date();
    R(kx + 2, ky, 7, 11, LIDSH); R(kx, ky + 2, 11, 7, LIDSH); R(kx + 1, ky + 1, 9, 9, LIDSH);
    R(kx + 2, ky + 1, 7, 9, '#FBFBF6'); R(kx + 1, ky + 2, 9, 7, '#FBFBF6');
    hand(kx + 5, ky + 5, (now.getMinutes() / 60) * Math.PI * 2, 4, '#5B6672');
    hand(kx + 5, ky + 5, ((now.getHours() % 12 + now.getMinutes() / 60) / 12) * Math.PI * 2, 2, '#D9662B');
    R(kx + 5, ky + 5, 1, 1, EYE);
    if (mode !== 'night') WIN.forEach((x, i) => windowAt(x, 10, 50, 30, mode, t, i));
    // plant by the door
    R(40, 50, 8, 9, '#B5653A'); R(39, 49, 10, 2, '#C9774A');
    R(38, 37, 12, 12, '#3F9B5E'); R(41, 32, 6, 6, '#3F9B5E'); R(36, 41, 3, 5, '#3F9B5E'); R(49, 39, 3, 5, '#3F9B5E');
    R(40, 39, 3, 3, '#57B877'); R(45, 35, 2, 3, '#57B877'); R(46, 43, 2, 2, '#57B877');
    // coffee counter
    R(266, 41, 46, 19, P.deskFront); R(264, 38, 50, 3, P.deskTop); R(264, 38, 50, 1, P.deskTopHi);
    R(288, 43, 1, 15, P.deskSh); R(283, 49, 2, 3, P.deskSh); R(292, 49, 2, 3, P.deskSh); R(266, 60, 46, 2, P.shadow);
    R(271, 21, 15, 17, LIDSH); R(273, 23, 11, 5, LID2); R(275, 30, 7, 6, '#1E252D'); R(276, 32, 5, 4, MUG); R(283, 24, 1, 1, '#FF5A4F');
    R(292, 33, 4, 5, MUG); R(297, 33, 4, 5, MUG); R(302, 31, 6, 7, '#57B877'); R(303, 29, 4, 2, '#3F9B5E');
  }

  // ---------- drawing: characters ----------
  function head(kind, c, cx, hy, o) {
    const x = cx - 7, eye = c.eye || EYE;
    if (kind === 'human' && c.style === 1) R(x - 1, hy + 2, 16, 12, c.hair);
    if (kind === 'human' && c.style === 2) { R(cx - 3, hy - 4, 6, 5, c.hair); R(cx - 2, hy - 5, 4, 1, c.hair); }
    if (kind === 'cat') {
      R(x + 1, hy - 3, 2, 1, c.fur); R(x, hy - 2, 4, 1, c.fur); R(x, hy - 1, 5, 3, c.fur); R(x + 1, hy - 2, 2, 2, PINK);
      R(x + 11, hy - 3, 2, 1, c.fur); R(x + 10, hy - 2, 4, 1, c.fur); R(x + 9, hy - 1, 5, 3, c.fur); R(x + 11, hy - 2, 2, 2, PINK);
    }
    if (kind === 'bear') {
      const e = c.panda ? c.dark : c.fur;
      R(x, hy - 2, 4, 5, e); R(x + 1, hy - 3, 2, 1, e); R(x + 10, hy - 2, 4, 5, e); R(x + 11, hy - 3, 2, 1, e);
      if (!c.panda) { R(x + 1, hy - 1, 2, 2, c.light); R(x + 11, hy - 1, 2, 2, c.light); }
    }
    if (kind === 'rabbit') {
      R(x + 2, hy - 9, 3, 11, c.fur); R(x + 3, hy - 8, 1, 7, PINK);
      R(x + 9, hy - 9, 3, 11, c.fur); R(x + 10, hy - 8, 1, 7, PINK);
    }
    R(x + 2, hy, 10, 12, c.fur); R(x + 1, hy + 1, 12, 10, c.fur); R(x, hy + 2, 14, 8, c.fur);
    if (kind === 'human') {
      R(x + 2, hy, 10, 1, c.hair); R(x + 1, hy + 1, 12, 1, c.hair); R(x, hy + 2, 14, 2, c.hair);
      R(x, hy + 4, 1, 3, c.hair); R(x + 13, hy + 4, 1, 3, c.hair); R(x + 1, hy + 4, 3, 1, c.hair);
      R(cx - 1, hy + 9, 2, 1, '#A85D52'); R(x + 1, hy + 8, 2, 1, BLUSH); R(x + 11, hy + 8, 2, 1, BLUSH);
    } else if (kind === 'cat') {
      if (c.tabby) { R(cx - 1, hy, 2, 2, c.dark); R(cx - 4, hy, 1, 2, c.dark); R(cx + 3, hy, 1, 2, c.dark); }
      R(cx - 3, hy + 8, 6, 3, c.light); R(cx - 1, hy + 8, 2, 1, PINK);
      R(x - 2, hy + 8, 2, 1, c.light); R(x + 14, hy + 8, 2, 1, c.light); R(x - 2, hy + 10, 2, 1, c.light); R(x + 14, hy + 10, 2, 1, c.light);
    } else if (kind === 'dog') {
      R(x - 1, hy + 1, 3, 8, c.dark); R(x, hy + 9, 2, 1, c.dark); R(x + 12, hy + 1, 3, 8, c.dark); R(x + 12, hy + 9, 2, 1, c.dark);
      R(cx - 3, hy + 7, 6, 5, c.light); R(cx - 1, hy + 7, 2, 2, NOSE);
      if (o.tongue) R(cx - 1, hy + 10, 2, 3, '#E8748A');
    } else if (kind === 'bear') {
      if (c.panda) { R(cx - 5, hy + 4, 4, 4, c.dark); R(cx + 1, hy + 4, 4, 4, c.dark); }
      R(cx - 3, hy + 7, 6, 4, c.light); R(cx - 1, hy + 7, 2, 1, NOSE); R(cx - 1, hy + 9, 2, 1, NOSE);
    } else if (kind === 'rabbit') {
      R(cx - 1, hy + 7, 2, 1, PINK); R(cx - 1, hy + 8, 1, 2, c.dark); R(x + 1, hy + 8, 2, 1, BLUSH); R(x + 11, hy + 8, 2, 1, BLUSH);
    }
    const ey = hy + 5 + (o.down ? 1 : 0);
    if (o.blink) { R(cx - 4, ey + 1, 2, 1, eye); R(cx + 2, ey + 1, 2, 1, eye); }
    else { R(cx - 4, ey, 2, 2, eye); R(cx + 2, ey, 2, 2, eye); }
  }
  const headTop = (s, T, t) => {
    const typing = s.state === 'working' || s.state === 'subagent';
    return T - 21 + (typing && ((t * 1.3 + s.seed) % 3 < 0.25) ? 1 : 0) + (s.state === 'waiting' ? -1 : 0);
  };
  function seated(s, d, t) {
    const { cx, T } = d, k = kindOf(s), c = colOf(s), st = s.state, hc = c.hand || c.fur;
    const typing = st === 'working' || st === 'subagent';
    const hy = headTop(s, T, t), by = T - 9;
    const blink = ((t + s.seed * 1.7) % 3.4) < 0.12;
    if (k === 'cat') { const sw = Math.round(Math.sin(t * 2 + s.seed)); R(cx - 11, T - 6, 2, 6, c.fur); R(cx - 12 - sw, T - 10, 2, 5, c.fur); R(cx - 13 - sw, T - 12, 2, 3, c.dark); }
    if (k === 'dog') { const wag = (st === 'approval' || st === 'waiting') ? Math.round(Math.sin(t * 10)) : 0; R(cx - 10, T - 5, 2, 5, c.fur); R(cx - 12 + wag, T - 8, 3, 4, c.fur); }
    R(cx - 5, by, 10, 10, s.shirt); R(cx - 3, by, 6, 1, 'rgba(0,0,0,.2)');
    R(cx - 8, by + 2, 3, 8, s.shirt);
    if (st !== 'approval') R(cx + 5, by + 2, 3, 8, s.shirt);
    head(k, c, cx, hy, { blink, down: typing || st === 'error', tongue: st === 'waiting' });
    if (st === 'approval') {
      const wv = Math.round(Math.sin(t * 9));
      R(cx + 5, by + 1, 4, 3, s.shirt); R(cx + 7, hy + 1, 3, by + 3 - (hy + 1), s.shirt); R(cx + 7 + wv, hy - 3, 3, 4, hc);
    }
  }
  function deskBody(d) {
    const { cx, T } = d, x = cx - 34;
    R(x + 1, T + 24, 66, 4, P.shadow);
    R(x, T + 24, 3, 3, P.deskSh); R(x + 65, T + 24, 3, 3, P.deskSh);
    R(x, T, 68, 9, P.deskTop); R(x, T, 68, 1, P.deskTopHi);
    R(x, T + 9, 68, 15, P.deskFront); R(x, T + 9, 68, 1, P.deskSh);
    R(cx - 26, T + 11, 52, 11, P.deskSh);
  }
  function deco(d, i) {
    const { cx, T } = d, m = i % 3;
    if (m === 0) { R(cx + 24, T - 1, 5, 4, '#C1663A'); R(cx + 23, T - 6, 7, 5, '#3F9B5E'); R(cx + 25, T - 8, 3, 2, '#57B877'); }
    else if (m === 1) { R(cx + 21, T - 1, 9, 2, '#D5D0C2'); R(cx + 22, T - 3, 9, 2, '#F3F0E6'); R(cx + 21, T + 1, 9, 2, '#F3F0E6'); }
    else { R(cx + 23, T - 6, 7, 8, '#6B4A2E'); R(cx + 24, T - 5, 5, 6, '#BDE4F5'); R(cx + 25, T - 2, 3, 3, '#5BAA6A'); }
  }
  function items(s, d, t) {
    const { cx, T } = d, st = s.state, c = colOf(s), hc = c.hand || c.fur;
    deco(d, s.desk);
    if (s.mode !== 'seated') { R(cx - 7, T + 1, 14, 2, LID2); R(cx - 7, T + 3, 14, 1, LIDSH); return; }
    const on = st !== 'waiting';
    R(cx - 5, T - 6, 10, 9, LID); R(cx - 4, T - 5, 8, 7, LID2); R(cx - 1, T - 3, 2, 2, st === 'error' ? '#E03131' : on ? '#BFE9FF' : LIDSH); R(cx - 6, T + 3, 12, 1, LIDSH);
    if (st === 'working' || st === 'subagent') {
      const f = Math.floor(t * 9 + s.seed) % 2;
      R(cx - 9, T + 1 - (f ? 1 : 0), 3, 2, hc); R(cx + 6, T + 1 - (f ? 0 : 1), 3, 2, hc);
    } else {
      R(cx - 9, T + 1, 3, 2, hc);
    }
    if (st === 'waiting') {
      const hy = headTop(s, T, t), sip = ((t * 0.5 + s.seed) % 4) < 0.9;
      if (sip) {
        const mx = cx, my = hy + 8;
        R(mx, my, 5, 5, MUG); R(mx + 5, my + 1, 1, 3, MUG); R(mx + 3, my + 3, 3, 3, hc); R(cx + 5, T - 8, 3, 4, s.shirt);
      } else {
        R(cx + 10, T - 3, 5, 5, MUG); R(cx + 15, T - 2, 1, 3, MUG); R(cx + 11, T - 3, 3, 1, '#6B4226'); R(cx + 7, T + 1, 3, 2, hc);
        for (let i = 0; i < 2; i++) { const ph = (t * 0.7 + i * 0.5 + s.seed) % 1; R(cx + 11 + i * 2 + Math.round(Math.sin(ph * 6)), T - 5 - ph * 6, 1, 1, 'rgba(255,255,255,' + (0.8 - ph * 0.7).toFixed(2) + ')'); }
      }
    }
    if (st === 'subagent') {
      const bx = cx - 28, hop = Math.floor(t * 5 + s.seed) % 2 ? 0 : -1;
      R(bx, T - 4 + hop, 7, 6, '#FFD84D'); R(bx + 1, T - 5 + hop, 5, 1, '#FFD84D'); R(bx + 1, T - 1 + hop, 3, 2, '#F2BF2B');
      R(bx + 5, T - 3 + hop, 1, 1, EYE); R(bx + 7, T - 2 + hop, 2, 1, '#F08C00');
      R(bx + 1, T + 2, 1, 1, '#F08C00'); R(bx + 4, T + 2, 1, 1, '#F08C00');
      R(bx + 11, T - 2, 5, 4, LID); R(bx + 10, T + 2, 7, 1, LIDSH);
    }
  }
  function walker(s, t) {
    const x = Math.round(s.px), fy = Math.round(s.py), k = kindOf(s), c = colOf(s), hc = c.hand || c.fur;
    const f = Math.floor(t * 8) % 2;
    R(x - 6, fy - 1, 12, 2, P.shadow);
    R(x - 4, fy - 4, 3, f ? 4 : 3, LIDSH); R(x + 1, fy - 4, 3, f ? 3 : 4, LIDSH);
    if (k === 'cat') { R(x - 9, fy - 12, 2, 6, c.fur); R(x - 10, fy - 15, 2, 4, c.dark); }
    if (k === 'dog') R(x - 9, fy - 10, 3, 3, c.fur);
    R(x - 5, fy - 14 + f, 10, 10, s.shirt);
    R(x - 8, fy - 13 + f, 3, 7, s.shirt); R(x + 5, fy - 13 + f, 3, 7, s.shirt);
    R(x - 8, fy - 6 + f, 3, 2, hc); R(x + 5, fy - 6 + f, 3, 2, hc);
    head(k, c, x, fy - 26 + f, { blink: false });
  }
  // A small red "x" bubble for a session whose turn ended with an API error.
  function errorBubble(x, y) {
    const o = EYE, c = '#E03131';
    R(x + 1, y - 1, 9, 12, o); R(x - 1, y + 1, 13, 8, o); R(x, y, 11, 10, o); R(x + 6, y + 10, 4, 2, o); R(x + 8, y + 12, 2, 1, o);
    R(x + 1, y, 9, 10, '#FFFFFF'); R(x, y + 1, 11, 8, '#FFFFFF'); R(x + 7, y + 10, 2, 1, '#FFFFFF');
    for (let i = 0; i < 5; i++) { R(x + 3 + i, y + 3 + i, 1, 1, c); R(x + 7 - i, y + 3 + i, 1, 1, c); }
  }

  // ---------- frame ----------
  // The sky outside follows the real clock, like the wall clock does.
  const skyMode = () => {
    const n = new Date(), h = n.getHours() + n.getMinutes() / 60;
    return (h >= 19.5 || h < 5.5) ? 'night' : (h >= 17.5 || h < 7) ? 'dusk' : 'day';
  };
  function layout(rows) {
    H = 200 + (Math.max(2, rows) - 2) * ROW_GAP;
    canvas.width = W; canvas.height = H; ctx.imageSmoothingEnabled = false;
    desks = [];
    for (let r = 0; r < Math.max(2, rows); r++) COLS.forEach(cx => desks.push({ cx, T: rowT(r), row: r }));
  }
  function draw(visuals, t) {
    const mode = skyMode(), night = mode === 'night';
    const atDesk = new Map(visuals.map(s => [s.desk, s]));
    room(t, mode);
    if (mode === 'dusk') R(0, 0, W, H, 'rgba(255,140,70,.09)');
    const list = [];
    desks.forEach((d, i) => list.push({ y: d.T + 27, desk: d, s: atDesk.get(i) }));
    visuals.forEach(s => { if (s.mode === 'in' || s.mode === 'out') list.push({ y: s.py, walk: s }); });
    list.sort((a, b) => a.y - b.y);
    for (const it of list) {
      if (it.walk) { walker(it.walk, t); continue; }
      const d = it.desk, s = it.s;
      R(d.cx - 7, d.T - 16, 14, 18, P.chair); R(d.cx - 8, d.T - 15, 16, 17, P.chair); R(d.cx - 6, d.T - 14, 12, 2, P.chairHi);
      if (s && s.mode === 'seated') seated(s, d, t);
      deskBody(d); if (s) items(s, d, t);
    }
    if (night) {
      R(0, 0, W, H, 'rgba(12,18,44,.52)');
      WIN.forEach((x, i) => windowAt(x, 10, 50, 30, 'night', t, i));
      R(14, 6, 14, 6, '#3DDC84'); R(16, 8, 3, 2, '#F2FFF7'); R(20, 8, 2, 2, '#F2FFF7'); R(23, 8, 3, 2, '#F2FFF7'); R(283, 24, 1, 1, '#FF5A4F');
    }
    for (const s of visuals) {
      if (s.mode !== 'seated' || !desks[s.desk]) continue;
      const { cx, T } = desks[s.desk], st = s.state;
      if (night && st !== 'waiting') { R(cx - 8, T - 21, 16, 2, 'rgba(150,205,255,.07)'); R(cx - 10, T - 19, 20, 19, 'rgba(150,205,255,.07)'); R(cx - 7, T - 16, 14, 13, 'rgba(170,215,255,.10)'); R(cx - 1, T - 3, 2, 2, st === 'error' ? '#FF8A80' : '#DFF4FF'); }
      if (st === 'working' || st === 'subagent') {
        const cs = ['#7FDBCA', '#FFD166', '#F78FB3'];
        for (let i = 0; i < 3; i++) {
          const ph = (t * 0.7 + s.seed * 0.37 + i / 3) % 1;
          ctx.globalAlpha = 1 - ph;
          R(cx + 11 + ((i * 2 + s.desk) % 5), T - 6 - ph * 18, 3 + ((i + s.desk) % 3), 1, cs[i]);
        }
        ctx.globalAlpha = 1;
      }
      if (st === 'error') errorBubble(cx - 17, T - 37);
    }
  }
  // Which desk (index) is at this point of the canvas, in canvas pixels; -1 when none.
  const deskAt = (x, y) => desks.findIndex(d => Math.abs(x - d.cx) <= 34 && y >= d.T - 34 && y <= d.T + 27);

  layout(2);
  return {
    W, DOOR, corrY, layout, draw, deskAt,
    get H() { return H; },
    get desks() { return desks; },
    setSkin(v) { skin = v; }
  };
};
