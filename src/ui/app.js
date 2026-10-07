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
      dismiss: 'Clear desk', needsYou: 'Needs your answer',
      newSession: name => `Start a new session in ${name}`, newFail: 'Could not open the Claude desktop app.',
      rcOn: 'Remote on', rcOff: 'Remote off', rcOnLong: 'Remote Control is connected.', rcOffLong: 'Remote Control is off for this session.',
      copyRc: 'Copy /remote-control', copied: 'Copied. Paste it into that session and press Enter.', copyFail: 'Could not copy. Type /remote-control in that session.',
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
      dismiss: '자리 치우기', needsYou: '확인이 필요해요',
      newSession: name => `${name}에서 새 세션 시작`, newFail: 'Claude 데스크톱 앱을 열지 못했어요.',
      rcOn: '원격 켜짐', rcOff: '원격 꺼짐', rcOnLong: '리모트 컨트롤이 연결돼 있어요.', rcOffLong: '이 세션은 리모트 컨트롤이 꺼져 있어요.',
      copyRc: '/remote-control 복사', copied: '복사했어요. 그 세션에 붙여 넣고 Enter를 누르세요.', copyFail: '복사하지 못했어요. 그 세션에서 /remote-control을 직접 입력해 주세요.',
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

  const stage = $('stage'), canvas = $('office'), listEl = $('list'), emptyEl = $('empty'), card = $('card');
  canvas.setAttribute('aria-label', T.canvas);
  emptyEl.textContent = T.empty;
  $('card-dismiss').textContent = T.dismiss;
  $('card-copy').textContent = T.copyRc;
  $('disconnect').textContent = T.disconnect;
  $('connect-warn').textContent = T.connectWarn;
  $('notice-ok').textContent = T.ok;

  const office = window.PixelOffice(canvas);
  const KINDS = ['human', 'cat', 'dog', 'bear', 'rabbit'];
  const SHIRTS = ['#E4572E', '#3A86C8', '#5BAA6A', '#8E6BBF', '#E2B23A', '#D96C9B'];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const visuals = new Map();   // session id -> what is drawn and its DOM
  const desks = new Map();     // "team#n" -> one desk on screen, shared by the sessions of one project
  let snapshot = null, first = true, time = 0, rows = 2, cardFor = null, toastTimer = 0, fillers = [];

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
    const tag = document.createElement('span');
    tag.className = 'tag';
    const plus = document.createElement('button');
    plus.type = 'button'; plus.className = 'plus'; plus.textContent = '+'; plus.hidden = true;
    plus.addEventListener('click', async () => {
      const res = await post('/api/new', { team });
      if (!res.ok) toast(T.newFail);
    });
    stage.append(tag, plus);
    return { team, tag, plus, deco: hash(team) % 3, cur: null, tgt: null, row: 0, slots: [], name: '' };
  }

  // Decides who sits where. Sessions of one project share a desk, in the order they started, and
  // each team gets one spare chair that starts a new session. Returns how many rows are in use.
  function arrange() {
    const groups = new Map();
    for (const v of visuals.values()) if (!teamSeen.has(v.team)) teamSeen.set(v.team, teamCount++);
    for (const team of [...teamSeen.keys()]) if (![...visuals.values()].some(v => v.team === team)) teamSeen.delete(team);
    const present = [...visuals.values()].filter(v => v.mode !== 'out').sort(byTeamThenStart);
    for (const v of present) { if (!groups.has(v.team)) groups.set(v.team, []); groups.get(v.team).push(v); }
    const wanted = new Map();
    for (const [team, members] of groups) {
      const slots = [...members, null];   // the spare chair
      for (let n = 0; n * SEATS_PER_DESK < slots.length; n++) {
        wanted.set(team + '#' + n, { team, name: members[0].session.projectName, slots: slots.slice(n * SEATS_PER_DESK, (n + 1) * SEATS_PER_DESK) });
      }
    }
    for (const [k, d] of [...desks]) if (!wanted.has(k)) { d.tag.remove(); d.plus.remove(); desks.delete(k); }

    const ends = [];
    let x = office.ROW_X, row = 0;
    for (const [k, w] of wanted) {
      const width = w.slots.length * PITCH;
      if (x > office.ROW_X && x + width > office.ROW_END) { row++; x = office.ROW_X; }
      let d = desks.get(k);
      const tgt = { x, T: office.rowT(row), w: width };
      if (!d) { d = makeDesk(w.team); d.cur = { x: tgt.x, T: tgt.T, w: Math.min(width, PITCH) }; }
      desks.delete(k); desks.set(k, d);   // keep the map in seating order
      d.tgt = tgt; d.row = row; d.slots = w.slots; d.name = w.name;
      d.tag.textContent = w.name;
      d.plus.title = T.newSession(w.name); d.plus.setAttribute('aria-label', T.newSession(w.name));
      w.slots.forEach((v, i) => {
        if (!v) return;
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
    if (need !== rows) { rows = need; office.layout(rows); closeCard(); }
    stage.style.aspectRatio = `${office.W} / ${office.H}`;
    emptyEl.hidden = visuals.size > 0;
  }
  // Desks slide and grow toward where they belong; everyone at a desk moves with it.
  function animate(dt) {
    const k = reduce ? 1 : 1 - Math.exp(-dt * 9);
    for (const d of desks.values()) for (const p of ['x', 'T', 'w']) {
      const gap = d.tgt[p] - d.cur[p];
      d.cur[p] = Math.abs(gap) < 0.05 ? d.tgt[p] : d.cur[p] + gap * k;
    }
    for (const v of visuals.values()) {
      if (!v.desk || v.mode === 'out') continue;
      const gap = v.slot - v.si;
      v.si = Math.abs(gap) < 0.01 ? v.slot : v.si + gap * k;
      v.cx = v.desk.cur.x + PITCH / 2 + v.si * PITCH; v.T = v.desk.cur.T;
    }
  }
  function place() {
    const W = office.W, H = office.H, pct = n => n * 100 + '%';
    for (const d of desks.values()) {
      const c = d.cur, at = d.slots.indexOf(null);
      d.tag.style.left = pct((c.x + c.w / 2) / W); d.tag.style.top = pct((c.T + 16.5) / H);
      d.tag.style.maxWidth = pct(Math.max(0, c.w - 20) / W);
      d.plus.hidden = at < 0 || !(snapshot && snapshot.canNew);   // only the desktop app can open Claude
      if (at >= 0) { d.plus.style.left = pct((c.x + PITCH / 2 + at * PITCH) / W); d.plus.style.top = pct((c.T - 9) / H); }
    }
    for (const v of visuals.values()) {
      if (v.ask.hidden || !v.desk) continue;
      v.ask.style.left = pct(Math.min(0.84, Math.max(0.16, v.cx / W))); v.ask.style.top = pct((v.T - 26) / H);
    }
  }
  function scene() {
    const list = [];
    for (const d of desks.values()) {
      const base = d.cur.x + PITCH / 2, at = d.slots.indexOf(null);
      list.push({
        x: d.cur.x, T: d.cur.T, w: d.cur.w, deco: d.deco,
        chairs: d.slots.map((v, i) => base + (v ? v.si : i) * PITCH),
        seated: d.slots.filter(v => v && v.mode === 'seated'),
        closed: d.slots.filter(v => v && v.mode === 'in').map(v => base + v.slot * PITCH),
        decoAt: at < 0 ? null : base + at * PITCH + 12
      });
    }
    for (const f of fillers) list.push({ x: f.x, T: f.T, w: f.w, chairs: [f.x + PITCH / 2, f.x + PITCH * 1.5], seated: [], closed: [], decoAt: null });
    return { desks: list, walkers: [...visuals.values()].filter(v => v.mode === 'in' || v.mode === 'out') };
  }

  function startWalk(v, dir) {
    const door = { x: office.DOOR.x, y: office.DOOR.y };
    let pts;
    if (dir === 'in') {
      const d = v.desk, cy = office.corrY(d.row);
      pts = [door, { x: door.x, y: cy }, { x: d.tgt.x + PITCH / 2 + v.slot * PITCH, y: cy }];
    } else {
      const cy = office.corrY(v.desk ? v.desk.row : 0);
      pts = [{ x: v.cx, y: cy }, { x: door.x, y: cy }, door];
      v.desk = null;
    }
    v.mode = dir; v.path = pts; v.px = pts[0].x; v.py = pts[0].y; v.pi = 1;
    if (reduce) endWalk(v);
  }
  function endWalk(v) {
    if (v.mode === 'in') { v.mode = 'seated'; v.si = v.slot; sync(v); }
    else remove(v);
  }
  function step(dt) {
    for (const v of [...visuals.values()]) {
      if (v.mode !== 'in' && v.mode !== 'out') continue;
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
      + '<span class="acts"><button type="button" class="yes"></button><button type="button" class="no"></button><button type="button" class="x">×</button></span>';
    const r = sel => li.querySelector(sel);
    r('.yes').textContent = T.allow; r('.no').textContent = T.deny;
    r('.x').setAttribute('aria-label', T.dismiss); r('.x').title = T.dismiss;
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
      if (cardFor === v) closeCard();
    } else {
      v.ask.classList.remove('open');
      v.ask.querySelector('.ask-req').setAttribute('aria-expanded', 'false');
    }
  }
  function remove(v) {
    if (cardFor === v) closeCard();
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
  function closeCard() { cardFor = null; card.hidden = true; }
  function fillCard(v) {
    const known = typeof v.session.remote === 'boolean';
    $('card-name').textContent = v.label;
    $('card-path').textContent = v.session.cwd;
    $('card-rc').hidden = !known;
    $('card-rc').textContent = v.session.remote ? T.rcOnLong : T.rcOffLong;
    $('card-copy').hidden = v.session.remote !== false;
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
  function openCard(v) {
    cardFor = v;
    fillCard(v);
    card.style.left = Math.min(78, Math.max(22, v.cx / office.W * 100)) + '%';
    card.style.top = ((v.T - 26) / office.H * 100) + '%';
    card.hidden = false;
  }
  const visualAt = e => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width * office.W, y = (e.clientY - r.top) / r.height * office.H;
    return [...visuals.values()].find(v => v.mode === 'seated' && Math.abs(x - v.cx) <= 20 && y >= v.T - 34 && y <= v.T + 27) || null;
  };
  canvas.addEventListener('click', e => {
    const v = visualAt(e);
    if (!v || v === cardFor || v.session.pending.length) return closeCard();
    openCard(v);
  });
  canvas.addEventListener('mousemove', e => { canvas.style.cursor = visualAt(e) ? 'pointer' : 'default'; });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCard(); });
  $('card-copy').addEventListener('click', async () => { toast(await copyText('/remote-control') ? T.copied : T.copyFail); });
  $('card-dismiss').addEventListener('click', () => { if (cardFor) post('/api/dismiss', { session: cardFor.id }); closeCard(); });

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
    let last = performance.now();
    const frame = now => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now; time += dt;
      step(dt); animate(dt); place();
      office.draw(scene(), time);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
})();
