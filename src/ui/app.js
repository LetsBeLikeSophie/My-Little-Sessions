'use strict';
// Keeps the office in step with the app's state: who is here, what they are doing,
// and which permission requests are waiting for an answer.
(() => {
  const TEXT = {
    en: {
      characters: 'Characters', mix: 'Mixed', human: 'People', cat: 'Cats', dog: 'Dogs', bear: 'Bears', rabbit: 'Rabbits',
      approveHere: 'Approve or deny here', onTop: 'Always on top', sessions: 'Sessions',
      canvas: 'Pixel-art office. Claude Code sessions sit together at one desk per project; the session list below describes every state in text.',
      empty: 'Nobody is in yet. A Claude Code session walks in as soon as it does something.',
      working: 'Working', subagent: 'Intern at work', approval: 'Needs approval', waiting: 'Waiting for you', sleeping: 'Asleep', error: 'Error', arriving: 'Arriving', leaving: 'Leaving',
      allow: 'Approve', deny: 'Deny', pass: 'Answer in Claude', answerInClaude: 'Answer this one in Claude.', more: n => `+${n} more`,
      dismiss: 'Clear desk', needsYou: 'Needs your answer', info: 'What the icons mean',
      legend: { laptop: 'Hard at work', chick: 'Intern chick on duty', bang: 'Needs your OK!', coffee: 'Coffee break · your turn', zzz: 'Snoozing · left alone 5 min', oops: 'Oops, an error',
        headset: 'Remote Control on', headsetOff: 'Remote off · click to copy the command', leave: 'Clear the desk', addPerson: 'Add a teammate (new session)', folder: 'Click a desk to see its folder' },
      newSession: name => `Start a new session in ${name}`, newFail: 'Could not open the Claude desktop app.',
      rcOn: 'Remote on', rcOff: 'Remote off', rcOnTip: 'Remote Control is on', rcOffTip: 'Remote Control is off. Click to copy /remote-control',
      copied: 'Copied. Paste it into that session and press Enter.', copyFail: 'Could not copy. Type /remote-control in that session.',
      connectNone: 'Not connected to Claude Code yet. Connecting adds hooks to your Claude Code settings file (the original is backed up first), and sessions show up here whenever they do something.',
      connectOutdated: 'The hooks in your Claude Code settings are from an older version or incomplete. Connect again to bring them up to date.',
      connectBtn: 'Connect to Claude Code', reconnectBtn: 'Connect again',
      connected: 'Connected to Claude Code', notConnected: 'Not connected', disconnect: 'Disconnect',
      connectWarn: 'Heads-up: connecting changes your Claude Code settings, and sessions with Remote Control turned on may drop that connection. If one does, run /remote-control in that session again, or turn it back on with the Remote Control icon at the top of the session.',
      didConnect: 'Connected. Each session walks in the next time it does something. If a Remote Control session just disconnected, run /remote-control in it again, or use the Remote Control icon at the top of the session.',
      didDisconnect: 'Disconnected, and the hooks were removed from your settings. If a Remote Control session just disconnected, run /remote-control in it again.',
      ok: 'Got it',
      lost: 'Lost contact with the app. Close this window and start it again.'
    },
    ko: {
      characters: '캐릭터', mix: '섞어서', human: '사람', cat: '고양이', dog: '강아지', bear: '곰', rabbit: '토끼',
      approveHere: '여기서 승인/거절', onTop: '항상 위에', sessions: '세션',
      canvas: '픽셀아트 사무실. Claude Code 세션이 프로젝트별로 한 책상에 모여 앉아 있고, 상태는 아래 세션 목록에 글로 나옵니다.',
      empty: '아직 출근한 세션이 없어요. Claude Code 세션이 움직이면 문으로 걸어 들어와요.',
      working: '작업 중', subagent: '인턴 투입', approval: '승인 대기', waiting: '입력 대기', sleeping: '자는 중', error: '오류', arriving: '출근 중', leaving: '퇴근 중',
      allow: '승인', deny: '거절', pass: 'Claude에서 답하기', answerInClaude: '이 요청은 Claude에서 답해 주세요.', more: n => `외 ${n}건`,
      dismiss: '자리 치우기', needsYou: '확인이 필요해요', info: '아이콘 설명',
      legend: { laptop: '열일 중', chick: '인턴 병아리 출동', bang: '허락해 주세요!', coffee: '커피 타임 · 내 차례', zzz: '쿨쿨 · 5분 넘게 조용', oops: '앗, 오류',
        headset: '원격 켜짐', headsetOff: '원격 꺼짐 · 누르면 명령어 복사', leave: '자리 치우기', addPerson: '팀원(새 세션) 추가', folder: '책상을 누르면 폴더가 보여요' },
      newSession: name => `${name}에서 새 세션 시작`, newFail: 'Claude 데스크톱 앱을 열지 못했어요.',
      rcOn: '원격 켜짐', rcOff: '원격 꺼짐', rcOnTip: '리모트 컨트롤 켜짐', rcOffTip: '리모트 컨트롤 꺼짐. 누르면 /remote-control을 복사해요',
      copied: '복사했어요. 그 세션에 붙여 넣고 Enter를 누르세요.', copyFail: '복사하지 못했어요. 그 세션에서 /remote-control을 직접 입력해 주세요.',
      connectNone: '아직 Claude Code와 연결되지 않았어요. 연결하면 Claude Code 설정 파일에 훅이 추가되고(원래 파일은 먼저 백업해요), 세션이 움직일 때마다 여기에 나타나요.',
      connectOutdated: 'Claude Code 설정에 있는 훅이 예전 버전이거나 일부만 있어요. 다시 연결하면 최신 상태로 맞춰져요.',
      connectBtn: 'Claude Code에 연결', reconnectBtn: '다시 연결',
      connected: 'Claude Code 연결됨', notConnected: '연결 안 됨', disconnect: '연결 해제',
      connectWarn: '미리 알려드려요. 연결하면 Claude Code 설정이 바뀌면서, 리모트 컨트롤을 켜 둔 세션의 원격 연결이 끊길 수 있어요. 끊기면 그 세션에서 /remote-control을 다시 실행하거나, 세션 위쪽의 리모트 컨트롤 아이콘을 눌러 다시 켜 주세요.',
      didConnect: '연결했어요. 세션이 다음에 움직일 때 걸어 들어와요. 방금 원격 연결이 끊긴 세션이 있다면 그 세션에서 /remote-control을 다시 실행하거나, 세션 위쪽의 리모트 컨트롤 아이콘을 눌러 주세요.',
      didDisconnect: '연결을 해제하고 설정 파일에서 훅을 지웠어요. 방금 원격 연결이 끊긴 세션이 있다면 그 세션에서 /remote-control을 다시 실행해 주세요.',
      ok: '확인',
      lost: '앱과 연결이 끊겼어요. 창을 닫고 다시 실행해 주세요.'
    }
  };
  const lang = (navigator.language || 'en').toLowerCase().startsWith('ko') ? 'ko' : 'en';
  const T = TEXT[lang];
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-t]').forEach(el => { el.textContent = T[el.dataset.t]; });

  const $ = id => document.getElementById(id);
  const key = location.hash.slice(1);
  history.replaceState(null, '', location.pathname);

  const stage = $('stage'), canvas = $('office'), listEl = $('list'), emptyEl = $('empty'), card = $('card'), deskCard = $('deskcard');
  canvas.setAttribute('aria-label', T.canvas);
  emptyEl.textContent = T.empty;
  $('disconnect').textContent = T.disconnect;
  $('connect-warn').textContent = T.connectWarn;
  $('notice-ok').textContent = T.ok;

  const office = window.PixelOffice(canvas);
  const KINDS = ['human', 'cat', 'dog', 'bear', 'rabbit'];
  const SHIRTS = ['#E4572E', '#3A86C8', '#5BAA6A', '#8E6BBF', '#E2B23A', '#D96C9B'];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const visuals = new Map();   // session id -> what is drawn and its DOM
  const desks = new Map();     // "team#n" -> one desk on screen, shared by the sessions of one project
  let snapshot = null, first = true, time = 0, rows = 2, cardFor = null, deskFor = null, toastTimer = 0, fillers = [];
  let doorFree = 0;   // when the next character may go through the door, so a crowd walks in single file

  // ---------- talking to the app ----------
  async function post(path, body) {
    try {
      const res = await fetch(path, { method: 'POST', headers: { 'x-mls-key': key }, body: JSON.stringify(body) });
      return await res.json();
    } catch (e) { return { ok: false }; }
  }
  // A message that stays until the person has read it.
  function notice(text) { $('notice-text').textContent = text; $('notice').hidden = false; }
  $('notice-ok').addEventListener('click', () => { $('notice').hidden = true; });
  function toast(text) {
    const el = $('toast');
    el.textContent = text; el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 4000);
  }

  // ---------- pixel icons ----------
  const ICONS = {
    headset: [[3, 1, 6, 1, 'a'], [2, 2, 1, 1, 'a'], [9, 2, 1, 1, 'a'], [1, 3, 1, 3, 'a'], [10, 3, 1, 3, 'a'], [0, 6, 3, 4, 'd'], [9, 6, 3, 4, 'd'], [1, 7, 1, 2, 'a'], [10, 7, 1, 2, 'a'], [2, 10, 1, 1, 'd'], [3, 11, 4, 1, 'd'], [7, 11, 1, 1, 'a']],
    leave: [[1, 1, 7, 10, '#9C6B43'], [2, 2, 5, 3, '#B98556'], [2, 6, 5, 4, '#B98556'], [6, 6, 1, 1, '#E9C46A'], [7, 5, 4, 2, '#E8590C'], [9, 3, 1, 6, '#E8590C'], [10, 4, 1, 4, '#E8590C'], [11, 5, 1, 2, '#E8590C']],
    addPerson: [[1, 1, 5, 1, '#2B2233'], [1, 2, 5, 3, '#F2C9A0'], [2, 3, 1, 1, '#1E1A20'], [4, 3, 1, 1, '#1E1A20'], [0, 6, 7, 5, '#3A86C8'], [9, 2, 2, 6, '#2F9E7A'], [7, 4, 6, 2, '#2F9E7A']],
    folder: [[0, 2, 5, 2, '#C9952B'], [0, 4, 12, 7, '#E2B23A'], [0, 4, 12, 1, '#C9952B']],
    laptop: [[1, 1, 10, 7, '#4A5563'], [2, 2, 8, 5, '#2B2F38'], [3, 3, 3, 1, '#7FDBCA'], [3, 5, 5, 1, '#FFD166'], [0, 9, 12, 2, '#39424E']],
    chick: [[3, 2, 6, 1, '#FFD84D'], [2, 3, 8, 6, '#FFD84D'], [3, 6, 4, 2, '#F2BF2B'], [7, 4, 1, 1, '#1E1A20'], [10, 5, 2, 1, '#F08C00'], [4, 9, 1, 2, '#F08C00'], [7, 9, 1, 2, '#F08C00']],
    bang: [[1, 1, 10, 10, '#F0A202'], [5, 3, 2, 4, '#1E1A10'], [5, 8, 2, 2, '#1E1A10']],
    coffee: [[1, 3, 9, 9, '#39424E'], [2, 4, 7, 7, '#F4F1EA'], [3, 4, 5, 2, '#6B4226'], [10, 5, 2, 1, '#39424E'], [11, 6, 1, 3, '#39424E'], [10, 9, 2, 1, '#39424E'], [4, 0, 1, 2, '#8A96A0'], [7, 1, 1, 2, '#8A96A0']],
    zzz: [[1, 1, 5, 1, '#5E87A8'], [4, 2, 1, 1, '#5E87A8'], [3, 3, 1, 1, '#5E87A8'], [2, 4, 1, 1, '#5E87A8'], [1, 5, 5, 1, '#5E87A8'], [7, 7, 4, 1, '#5E87A8'], [9, 8, 1, 1, '#5E87A8'], [8, 9, 1, 1, '#5E87A8'], [7, 10, 4, 1, '#5E87A8']],
    oops: [[1, 1, 10, 10, '#E03131'], [3, 3, 2, 2, '#FFFFFF'], [7, 3, 2, 2, '#FFFFFF'], [5, 5, 2, 2, '#FFFFFF'], [3, 7, 2, 2, '#FFFFFF'], [7, 7, 2, 2, '#FFFFFF']]
  };
  function icon(name, off) {
    const c = document.createElement('canvas');
    c.width = 12; c.height = 12; c.className = 'ico';
    const g = c.getContext('2d');
    for (const [x, y, w, h, col] of ICONS[name]) {
      g.fillStyle = col === 'a' ? (off ? '#8A96A0' : '#1FB89A') : col === 'd' ? (off ? '#6B7780' : '#2B2F38') : col;
      g.fillRect(x, y, w, h);
    }
    if (off) { g.fillStyle = '#E03131'; for (let i = 0; i < 10; i++) g.fillRect(1 + i, 10 - i, 2, 1); }
    return c;
  }
  $('card-dismiss').append(icon('leave'));
  $('card-dismiss').title = T.dismiss; $('card-dismiss').setAttribute('aria-label', T.dismiss);
  $('desk-new').append(icon('addPerson'));

  // The little guide behind the "i" next to the title: one line per picture.
  const infoBtn = $('info-btn'), legend = $('legend');
  infoBtn.title = T.info; infoBtn.setAttribute('aria-label', T.info);
  for (const name of ['laptop', 'chick', 'bang', 'coffee', 'zzz', 'oops', 'headset', 'headsetOff', 'folder', 'addPerson', 'leave']) {
    const li = document.createElement('li'), text = document.createElement('span');
    text.textContent = T.legend[name];
    li.append(name === 'headsetOff' ? icon('headset', true) : icon(name), text);
    legend.append(li);
  }
  const showLegend = on => { legend.hidden = !on; infoBtn.setAttribute('aria-expanded', String(on)); };
  infoBtn.addEventListener('click', e => { e.stopPropagation(); showLegend(legend.hidden); });
  document.addEventListener('click', e => { if (!legend.hidden && !legend.contains(e.target)) showLegend(false); });

  // ---------- characters and desks ----------
  const PITCH = office.PITCH, SEATS_PER_DESK = 6;
  const teamSeen = new Map();   // team -> when it first appeared, so desks keep their place as people come and go
  let teamCount = 0;
  const byTeamThenStart = (a, b) => teamSeen.get(a.team) - teamSeen.get(b.team) || a.order - b.order;
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    return h >>> 0;
  }
  function makeDesk(team) {
    const tag = document.createElement('button');
    tag.type = 'button'; tag.className = 'tag';
    const d = { team, tag, deco: hash(team) % 3, cur: null, tgt: null, row: 0, slots: [], name: '', project: '' };
    tag.addEventListener('click', () => (deskFor === d ? closeCards() : openDeskCard(d)));
    stage.append(tag);
    return d;
  }

  // Decides who sits where. Sessions of one project share a desk, in the order they started.
  // A desk is never narrower than two seats, so its nameplate stays readable; someone sitting
  // alone sits in the middle. Returns how many rows are in use.
  function arrange() {
    const groups = new Map();
    for (const v of visuals.values()) if (!teamSeen.has(v.team)) teamSeen.set(v.team, teamCount++);
    for (const team of [...teamSeen.keys()]) if (![...visuals.values()].some(v => v.team === team)) teamSeen.delete(team);
    const present = [...visuals.values()].filter(v => v.mode !== 'out').sort(byTeamThenStart);
    for (const v of present) { if (!groups.has(v.team)) groups.set(v.team, []); groups.get(v.team).push(v); }
    const wanted = new Map();
    for (const [team, members] of groups) {
      const slots = members;
      for (let n = 0; n * SEATS_PER_DESK < slots.length; n++) {
        wanted.set(team + '#' + n, { team, name: members[0].session.projectName, project: members[0].session.project, slots: slots.slice(n * SEATS_PER_DESK, (n + 1) * SEATS_PER_DESK) });
      }
    }
    for (const [k, d] of [...desks]) if (!wanted.has(k)) { if (deskFor === d) closeCards(); d.tag.remove(); desks.delete(k); }

    const ends = [];
    let x = office.ROW_X, row = 0;
    for (const [k, w] of wanted) {
      const width = Math.max(2, w.slots.length) * PITCH, pad = (width - w.slots.length * PITCH) / 2;
      if (x > office.ROW_X && x + width > office.ROW_END) { row++; x = office.ROW_X; }
      let d = desks.get(k);
      const tgt = { x, T: office.rowT(row), w: width, pad };
      if (!d) { d = makeDesk(w.team); d.cur = { x: tgt.x, T: tgt.T, w: PITCH, pad: 0 }; }
      desks.delete(k); desks.set(k, d);   // keep the map in seating order
      d.tgt = tgt; d.row = row; d.slots = w.slots; d.name = w.name; d.project = w.project;
      d.tag.textContent = w.name;
      w.slots.forEach((v, i) => {
        if (v.desk !== d) { v.desk = d; v.si = i; }
        v.slot = i;
        v.shirt = SHIRTS[teamSeen.get(v.team) % SHIRTS.length];   // teammates wear the same colour
      });
      x += width + office.DESK_GAP;
      ends[row] = x;
    }
    // Empty two-seat desks fill whatever room is left, so the office never looks bare.
    const used = Math.max(2, wanted.size ? row + 1 : 0);
    fillers = [];
    for (let r = 0; r < used; r++) {
      for (let fx = ends[r] || office.ROW_X; fx + 2 * PITCH <= office.ROW_END; fx += 2 * PITCH + office.DESK_GAP) fillers.push({ x: fx, T: office.rowT(r), w: 2 * PITCH });
    }
    return used;
  }
  function refresh() {
    const need = arrange();
    if (need !== rows) { rows = need; office.layout(rows); closeCards(); }
    stage.style.aspectRatio = `${office.W} / ${office.H}`;
    emptyEl.hidden = visuals.size > 0;
  }
  // Desks slide and grow toward where they belong; everyone at a desk moves with it.
  function animate(dt) {
    const k = reduce ? 1 : 1 - Math.exp(-dt * 9);
    for (const d of desks.values()) for (const p of ['x', 'T', 'w', 'pad']) {
      const gap = d.tgt[p] - d.cur[p];
      d.cur[p] = Math.abs(gap) < 0.05 ? d.tgt[p] : d.cur[p] + gap * k;
    }
    for (const v of visuals.values()) {
      if (!v.desk || v.mode === 'out') continue;
      const gap = v.slot - v.si;
      v.si = Math.abs(gap) < 0.01 ? v.slot : v.si + gap * k;
      v.cx = v.desk.cur.x + v.desk.cur.pad + PITCH / 2 + v.si * PITCH; v.T = v.desk.cur.T;
    }
  }
  // Writes a style only when it changed, so an idle office causes no layout work at all.
  const setStyle = (el, prop, value) => { const memo = el._mls || (el._mls = {}); if (memo[prop] !== value) { memo[prop] = value; el.style[prop] = value; } };
  function place() {
    const W = office.W, H = office.H, pct = n => (n * 100).toFixed(2) + '%';
    for (const d of desks.values()) {
      const c = d.cur;
      setStyle(d.tag, 'left', pct((c.x + c.w / 2) / W)); setStyle(d.tag, 'top', pct((c.T + 16.5) / H));
      setStyle(d.tag, 'maxWidth', pct(Math.max(0, c.w - 20) / W));
    }
    for (const v of visuals.values()) {
      if (v.ask.hidden || !v.desk) continue;
      setStyle(v.ask, 'left', pct(Math.min(0.84, Math.max(0.16, v.cx / W)))); setStyle(v.ask, 'top', pct((v.T - 26) / H));
    }
  }
  function scene() {
    const list = [];
    for (const d of desks.values()) {
      const base = d.cur.x + d.cur.pad + PITCH / 2;
      list.push({
        x: d.cur.x, T: d.cur.T, w: d.cur.w, deco: d.deco,
        chairs: d.slots.map(v => base + v.si * PITCH),
        seated: d.slots.filter(v => v.mode === 'seated'),
        closed: d.slots.filter(v => v.mode === 'in').map(v => base + v.slot * PITCH),
        decoAt: d.slots.length === 1 ? d.cur.x + d.cur.w - 11 : null   // room for an ornament only beside someone sitting alone
      });
    }
    for (const f of fillers) list.push({ x: f.x, T: f.T, w: f.w, chairs: [f.x + PITCH / 2, f.x + PITCH * 1.5], seated: [], closed: [], decoAt: null });
    // someone still waiting outside to come in is not drawn yet; their seat already has a closed laptop
    return { desks: list, walkers: [...visuals.values()].filter(v => v.mode === 'out' || (v.mode === 'in' && time >= v.walkAt)) };
  }

  function startWalk(v, dir) {
    const door = { x: office.DOOR.x, y: office.DOOR.y };
    let pts;
    if (dir === 'in') {
      const d = v.desk, cy = office.corrY(d.row);
      pts = [door, { x: door.x, y: cy }, { x: d.tgt.x + d.tgt.pad + PITCH / 2 + v.slot * PITCH, y: cy }];
    } else {
      const cy = office.corrY(v.desk ? v.desk.row : 0);
      pts = [{ x: v.cx, y: cy }, { x: door.x, y: cy }, door];
      v.desk = null;
    }
    v.mode = dir; v.path = pts; v.px = pts[0].x; v.py = pts[0].y; v.pi = 1;
    v.walkAt = Math.max(time, doorFree); doorFree = v.walkAt + 0.7;
    if (reduce) endWalk(v);
  }
  function endWalk(v) {
    if (v.mode === 'in') { v.mode = 'seated'; v.si = v.slot; sync(v); }
    else remove(v);
  }
  function step(dt) {
    for (const v of [...visuals.values()]) {
      if ((v.mode !== 'in' && v.mode !== 'out') || time < v.walkAt) continue;   // waiting for a turn at the door
      let left = 46 * dt;
      while (left > 0 && v.pi < v.path.length) {
        const p = v.path[v.pi], dx = p.x - v.px, dy = p.y - v.py, dist = Math.hypot(dx, dy);
        if (dist <= left) { v.px = p.x; v.py = p.y; v.pi++; left -= dist; }
        else { v.px += dx / dist * left; v.py += dy / dist * left; left = 0; }
      }
      if (v.pi >= v.path.length) endWalk(v);
    }
  }

  // ---------- DOM for one session ----------
  function mount(v) {
    const ask = document.createElement('div');
    ask.className = 'ask'; ask.hidden = true; ask.setAttribute('role', 'group');
    ask.innerHTML = '<button type="button" class="ask-req" aria-expanded="false"><span class="clamp"><b></b><em></em></span></button>'
      + '<span class="ask-more" hidden></span><span class="ask-note" hidden></span>'
      + '<span class="ask-btns"><button type="button" class="yes"></button><button type="button" class="no"></button><button type="button" class="pass"></button></span>';
    const q = sel => ask.querySelector(sel);
    q('.yes').textContent = T.allow; q('.no').textContent = T.deny; q('.pass').textContent = T.pass;
    q('.ask-note').textContent = T.answerInClaude;
    q('.ask-req').addEventListener('click', () => q('.ask-req').setAttribute('aria-expanded', String(ask.classList.toggle('open'))));
    q('.yes').addEventListener('click', () => decide(v, 'allow'));
    q('.no').addEventListener('click', () => decide(v, 'deny'));
    q('.pass').addEventListener('click', () => decide(v, 'pass'));
    stage.appendChild(ask); v.ask = ask;

    const li = document.createElement('li');
    li.className = 'row';
    li.innerHTML = '<span class="sw"></span><span class="nm"><span class="nmtxt"></span><span class="rc" hidden></span></span><span class="pill"><i></i><span class="pilltxt"></span></span><span class="ev"></span>'
      + '<span class="acts"><button type="button" class="yes"></button><button type="button" class="no"></button><button type="button" class="x icon"></button></span>';
    const r = sel => li.querySelector(sel);
    r('.yes').textContent = T.allow; r('.no').textContent = T.deny;
    r('.x').append(icon('leave')); r('.x').setAttribute('aria-label', T.dismiss); r('.x').title = T.dismiss;
    r('.yes').addEventListener('click', () => decide(v, 'allow'));
    r('.no').addEventListener('click', () => decide(v, 'deny'));
    r('.x').addEventListener('click', () => post('/api/dismiss', { session: v.id }));
    listEl.appendChild(li); v.row = li;
  }
  function sync(v) {
    const s = v.session;
    const shown = v.mode === 'in' ? 'arriving' : v.mode === 'out' ? 'leaving' : s.state;
    const pending = v.mode === 'seated' ? s.pending : [];
    const p = pending[0];
    v.state = s.state;
    v.remote = s.remote;
    v.row.dataset.st = shown;
    v.row.querySelector('.sw').style.background = v.shirt;
    v.row.querySelector('.nmtxt').textContent = v.label;
    v.row.querySelector('.nm').title = s.cwd;
    const chip = v.row.querySelector('.rc');
    chip.hidden = typeof s.remote !== 'boolean';
    chip.textContent = s.remote ? T.rcOn : T.rcOff; chip.dataset.on = String(s.remote === true);
    v.row.querySelector('.pilltxt').textContent = T[shown];
    v.row.querySelector('.ev').textContent = s.ev;
    const canDecide = Boolean(p && p.canDecide);
    v.row.querySelector('.yes').hidden = v.row.querySelector('.no').hidden = !canDecide;
    if (cardFor === v) fillCard(v);

    v.ask.hidden = !p;
    if (p) {
      v.ask.setAttribute('aria-label', `${v.label}: ${T.needsYou}`);
      v.ask.querySelector('b').textContent = p.tool || T.needsYou;
      v.ask.querySelector('em').textContent = p.text ? ' ' + p.text : '';
      const more = v.ask.querySelector('.ask-more');
      more.hidden = pending.length < 2; more.textContent = T.more(pending.length - 1);
      v.ask.querySelector('.ask-btns').hidden = !canDecide;
      v.ask.querySelector('.ask-note').hidden = canDecide;
      if (cardFor === v) closeCards();
    } else {
      v.ask.classList.remove('open');
      v.ask.querySelector('.ask-req').setAttribute('aria-expanded', 'false');
    }
  }
  function remove(v) {
    if (cardFor === v) closeCards();
    v.ask.remove(); v.row.remove();
    visuals.delete(v.id);
    refresh();
  }
  // Teammates whose sessions share a name get a number, and the list follows the seating order.
  function relabel() {
    const seen = new Map(), rowsInOrder = [];
    const everyone = [...visuals.values()].sort((a, b) => (a.mode === 'out') - (b.mode === 'out') || byTeamThenStart(a, b));
    const byTeam = new Map();
    for (const v of everyone) { if (!byTeam.has(v.team)) byTeam.set(v.team, []); byTeam.get(v.team).push(v); }
    for (const members of byTeam.values()) {
      for (const v of members) seen.set(v.team + '\n' + v.session.name, (seen.get(v.team + '\n' + v.session.name) || 0) + 1);
      const count = new Map();
      for (const v of members) {
        const key = v.team + '\n' + v.session.name, n = (count.get(key) || 0) + 1;
        count.set(key, n);
        v.label = seen.get(key) > 1 ? `${v.session.name} #${n}` : v.session.name;
        rowsInOrder.push(v.row);
      }
    }
    if (rowsInOrder.some((row, i) => listEl.children[i] !== row)) rowsInOrder.forEach(row => listEl.appendChild(row));
  }

  // ---------- actions ----------
  async function decide(v, decision) {
    const p = v.session.pending.find(x => x.canDecide);
    if (p) await post('/api/decide', { pending: p.id, decision });
  }
  async function newSession(team) {
    const res = await post('/api/new', { team });
    if (!res.ok) toast(T.newFail);
  }
  function closeCards() { cardFor = null; deskFor = null; card.hidden = true; deskCard.hidden = true; }
  // The card for one character: its name, what it is doing, and two icon buttons.
  function fillCard(v) {
    const s = v.session, rc = $('card-rc');
    $('card-name').textContent = v.label;
    $('card-info').textContent = T[s.state];
    rc.hidden = typeof s.remote !== 'boolean';
    rc.replaceChildren(icon('headset', s.remote === false));
    rc.disabled = s.remote !== false;
    rc.title = s.remote ? T.rcOnTip : T.rcOffTip; rc.setAttribute('aria-label', rc.title);
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* fall back below */ }
    const area = document.createElement('textarea');
    area.value = text; document.body.appendChild(area); area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    area.remove();
    return ok;
  }
  const cardSpot = (el, x, T) => {
    el.style.left = Math.min(80, Math.max(20, x / office.W * 100)) + '%';
    el.style.top = (T / office.H * 100) + '%';
    el.hidden = false;
  };
  function openCard(v) {
    closeCards();
    cardFor = v;
    fillCard(v);
    cardSpot(card, v.cx, v.T - 26);
  }
  // The card for a desk: where the project lives, and a button that adds a teammate.
  function openDeskCard(d) {
    closeCards();
    deskFor = d;
    $('desk-name').textContent = d.name;
    $('desk-path').replaceChildren(icon('folder'), document.createTextNode(d.project));
    $('desk-new').hidden = !(snapshot && snapshot.canNew);   // only the desktop app can open Claude
    $('desk-new').title = T.newSession(d.name); $('desk-new').setAttribute('aria-label', T.newSession(d.name));
    cardSpot(deskCard, d.cur.x + d.cur.w / 2, d.cur.T - 26);
  }
  // What is under the pointer: a seated character (above the desk top) or the desk itself.
  const targetAt = e => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * office.W, y = (e.clientY - r.top) / r.height * office.H;
    const v = [...visuals.values()].find(c => c.mode === 'seated' && Math.abs(x - c.cx) <= 20 && y >= c.T - 34 && y < c.T + 3);
    if (v) return { v };
    const d = [...desks.values()].find(k => x >= k.cur.x && x <= k.cur.x + k.cur.w && y >= k.cur.T && y <= k.cur.T + 27);
    return d ? { d } : null;
  };
  canvas.addEventListener('click', e => {
    const hit = targetAt(e);
    if (!hit) return closeCards();
    if (hit.d) return hit.d === deskFor ? closeCards() : openDeskCard(hit.d);
    if (hit.v === cardFor || hit.v.session.pending.length) return closeCards();
    openCard(hit.v);
  });
  canvas.addEventListener('mousemove', e => { canvas.style.cursor = targetAt(e) ? 'pointer' : 'default'; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeCards(); showLegend(false); } });
  $('card-rc').addEventListener('click', async () => { toast(await copyText('/remote-control') ? T.copied : T.copyFail); });
  $('card-dismiss').addEventListener('click', () => { if (cardFor) post('/api/dismiss', { session: cardFor.id }); closeCards(); });
  $('desk-new').addEventListener('click', () => { if (deskFor) newSession(deskFor.team); closeCards(); });

  $('skin').addEventListener('change', e => post('/api/settings', { skin: e.target.value }));
  $('approvals').addEventListener('change', e => post('/api/settings', { approvals: e.target.checked }));
  $('ontop').addEventListener('change', e => post('/api/settings', { onTop: e.target.checked }));
  $('connect-btn').addEventListener('click', async () => {
    const res = await post('/api/hooks', { action: 'install' });
    if (res.ok) notice(T.didConnect); else toast(res.message || T.lost);
  });
  $('disconnect').addEventListener('click', async () => {
    const res = await post('/api/hooks', { action: 'uninstall' });
    if (res.ok) notice(T.didDisconnect); else toast(res.message || T.lost);
  });

  // ---------- applying a new state from the app ----------
  function apply(next) {
    snapshot = next;
    $('skin').value = next.settings.skin; office.setSkin(next.settings.skin);
    $('approvals').checked = next.settings.approvals;
    $('ontop').checked = next.settings.onTop;
    $('ontop-wrap').hidden = !next.desktop;   // only the desktop window can stay on top
    $('version').textContent = 'v' + next.version;

    const hooks = next.hooks.state;
    $('connect').hidden = hooks === 'connected';
    $('connect-text').textContent = hooks === 'error' ? next.hooks.message : hooks === 'outdated' ? T.connectOutdated : T.connectNone;
    $('connect-text').title = next.hooks.path;
    $('connect-btn').textContent = hooks === 'outdated' ? T.reconnectBtn : T.connectBtn;
    $('connect-btn').hidden = hooks === 'error';
    $('connect-warn').hidden = hooks === 'error';
    $('hook-state').textContent = hooks === 'connected' ? T.connected : T.notConnected;
    $('hook-state').title = next.hooks.path;
    $('disconnect').hidden = hooks === 'none' || hooks === 'error';

    const live = new Set(next.sessions.map(s => s.id));
    const arriving = [];
    next.sessions.forEach((s, order) => {
      let v = visuals.get(s.id);
      if (!v) {
        const h = hash(s.id);
        v = { id: s.id, team: s.team, kind: KINDS[h % 5], variant: (h >>> 4) % 12, shirt: SHIRTS[0], seed: (h % 997) / 100,
          label: s.name, state: s.state, remote: s.remote, mode: 'seated', desk: null, slot: 0, si: 0, cx: 0, T: 0, px: 0, py: 0, path: null, pi: 0 };
        visuals.set(s.id, v);
        mount(v);
        if (!first) arriving.push(v);   // sessions already here when the window opens are simply at their desks
      } else if (v.mode === 'out') {
        v.mode = 'seated'; arriving.push(v);   // came back before reaching the door
      }
      v.session = s; v.order = order;
    });
    for (const v of [...visuals.values()]) {
      if (live.has(v.id) || v.mode === 'out') continue;
      if (v.mode === 'seated') { v.session = { ...v.session, pending: [] }; startWalk(v, 'out'); }
      else remove(v);
    }
    refresh();
    arriving.forEach(v => startWalk(v, 'in'));
    relabel();
    for (const v of visuals.values()) sync(v);
    animate(first ? 1000 : 0);
    const waiting = next.sessions.filter(s => s.pending.length).length;
    document.title = (waiting ? `(${waiting}) ` : '') + 'My Little Sessions';
    first = false;
  }

  const stream = new EventSource('/api/events?k=' + encodeURIComponent(key));
  stream.onmessage = e => apply(JSON.parse(e.data));
  stream.onerror = () => { if (stream.readyState === EventSource.CLOSED) toast(T.lost); };

  // ---------- drawing loop ----------
  refresh();
  office.draw(scene(), 0);
  if (reduce) {
    setInterval(() => { time += 0.6; animate(1); place(); office.draw(scene(), time); }, 600);
  } else {
    // Pixel art does not need 60 fps. Walking and sliding desks get 30; everything else (typing,
    // coffee, zzz) is drawn 12 times a second, which keeps the app light while it sits in a corner.
    const busy = () => {
      for (const v of visuals.values()) if (v.mode === 'in' || v.mode === 'out' || (v.desk && v.si !== v.slot)) return true;
      for (const d of desks.values()) if (d.cur.x !== d.tgt.x || d.cur.T !== d.tgt.T || d.cur.w !== d.tgt.w || d.cur.pad !== d.tgt.pad) return true;
      return false;
    };
    let last = performance.now();
    const frame = now => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now; time += dt;
      step(dt); animate(dt); place();
      office.draw(scene(), time);
      const wait = 1000 / (busy() ? 30 : 12) - (performance.now() - now);
      setTimeout(() => requestAnimationFrame(frame), Math.max(0, wait));
    };
    requestAnimationFrame(frame);
  }
})();
