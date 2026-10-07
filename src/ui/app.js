'use strict';
// Keeps the office in step with the app's state: who is here, what they are doing,
// and which permission requests are waiting for an answer.
(() => {
  const TEXT = {
    en: {
      characters: 'Characters', mix: 'Mixed', human: 'People', cat: 'Cats', dog: 'Dogs', bear: 'Bears', rabbit: 'Rabbits',
      approveHere: 'Approve or deny here', onTop: 'Always on top', sessions: 'Sessions',
      canvas: 'Pixel-art office. Each Claude Code session sits at a desk; the session list below describes every state in text.',
      empty: 'Nobody is in yet. A Claude Code session walks in as soon as it does something.',
      working: 'Working', subagent: 'Intern at work', approval: 'Needs approval', waiting: 'Waiting for you', sleeping: 'Asleep', error: 'Error', arriving: 'Arriving', leaving: 'Leaving',
      allow: 'Approve', deny: 'Deny', pass: 'Answer in Claude', answerInClaude: 'Answer this one in Claude.', more: n => `+${n} more`,
      dismiss: 'Clear desk', needsYou: 'Needs your answer',
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
      canvas: '픽셀아트 사무실. Claude Code 세션마다 책상에 앉아 있고, 상태는 아래 세션 목록에 글로 나옵니다.',
      empty: '아직 출근한 세션이 없어요. Claude Code 세션이 움직이면 문으로 걸어 들어와요.',
      working: '작업 중', subagent: '인턴 투입', approval: '승인 대기', waiting: '입력 대기', sleeping: '자는 중', error: '오류', arriving: '출근 중', leaving: '퇴근 중',
      allow: '승인', deny: '거절', pass: 'Claude에서 답하기', answerInClaude: '이 요청은 Claude에서 답해 주세요.', more: n => `외 ${n}건`,
      dismiss: '자리 치우기', needsYou: '확인이 필요해요',
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
  let snapshot = null, first = true, time = 0, rows = 2, cardFor = null, toastTimer = 0;

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

  // ---------- characters ----------
  function hash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
    h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
    return h >>> 0;
  }
  function freeDesk() {
    const taken = new Set([...visuals.values()].map(v => v.desk));
    let i = 0; while (taken.has(i)) i++;
    return i;
  }
  function startWalk(v, dir) {
    const d = office.desks[v.desk], cy = office.corrY(d.row);
    const pts = [{ x: office.DOOR.x, y: office.DOOR.y }, { x: office.DOOR.x, y: cy }, { x: d.cx, y: cy }];
    if (dir === 'out') pts.reverse();
    v.mode = dir; v.path = pts; v.px = pts[0].x; v.py = pts[0].y; v.pi = 1;
    if (reduce) endWalk(v);
  }
  function endWalk(v) {
    if (v.mode === 'in') { v.mode = 'seated'; sync(v); }
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
    const tag = document.createElement('span');
    tag.className = 'tag';
    stage.appendChild(tag); v.tag = tag;

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
    r('.sw').style.background = v.shirt;
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
    v.tag.textContent = s.name;
    v.tag.classList.toggle('off', v.mode !== 'seated');
    v.row.dataset.st = shown;
    v.remote = s.remote;
    v.row.querySelector('.nmtxt').textContent = s.name;
    const chip = v.row.querySelector('.rc');
    chip.hidden = typeof s.remote !== 'boolean';
    chip.textContent = s.remote ? T.rcOn : T.rcOff; chip.dataset.on = String(s.remote === true);
    if (cardFor === v) fillCard(v);
    v.row.querySelector('.nm').title = s.cwd;
    v.row.querySelector('.pilltxt').textContent = T[shown];
    v.row.querySelector('.ev').textContent = s.ev;
    const canDecide = Boolean(p && p.canDecide);
    v.row.querySelector('.yes').hidden = v.row.querySelector('.no').hidden = !canDecide;

    v.ask.hidden = !p;
    if (p) {
      v.ask.setAttribute('aria-label', `${s.name}: ${T.needsYou}`);
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
  function place(v) {
    const d = office.desks[v.desk];
    v.tag.style.left = (d.cx / office.W * 100) + '%'; v.tag.style.top = ((d.T + 16.5) / office.H * 100) + '%';
    v.ask.style.left = (d.cx / office.W * 100) + '%'; v.ask.style.top = ((d.T - 26) / office.H * 100) + '%';
  }
  function remove(v) {
    if (cardFor === v) closeCard();
    v.tag.remove(); v.ask.remove(); v.row.remove();
    visuals.delete(v.id);
    relayout();
  }
  function relayout() {
    let top = -1;
    for (const v of visuals.values()) top = Math.max(top, v.desk);
    const need = Math.max(2, Math.ceil((top + 1) / 3));
    if (need !== rows) { rows = need; office.layout(rows); closeCard(); }
    stage.style.aspectRatio = `${office.W} / ${office.H}`;
    for (const v of visuals.values()) place(v);
    emptyEl.hidden = visuals.size > 0;
  }

  // ---------- actions ----------
  async function decide(v, decision) {
    const p = v.session.pending.find(x => x.canDecide);
    if (p) await post('/api/decide', { pending: p.id, decision });
  }
  function closeCard() { cardFor = null; card.hidden = true; }
  function fillCard(v) {
    const known = typeof v.session.remote === 'boolean';
    $('card-name').textContent = v.session.name;
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
    const d = office.desks[v.desk];
    card.style.left = Math.min(78, Math.max(22, d.cx / office.W * 100)) + '%';
    card.style.top = ((d.T - 26) / office.H * 100) + '%';
    card.hidden = false;
  }
  const visualAt = e => {
    const r = canvas.getBoundingClientRect();
    const i = office.deskAt((e.clientX - r.left) / r.width * office.W, (e.clientY - r.top) / r.height * office.H);
    return [...visuals.values()].find(v => v.desk === i && v.mode === 'seated') || null;
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
    for (const s of next.sessions) {
      let v = visuals.get(s.id);
      if (!v) {
        const h = hash(s.id);
        v = { id: s.id, session: s, desk: freeDesk(), kind: KINDS[h % 5], variant: (h >>> 4) % 12, shirt: SHIRTS[(h >>> 9) % 6], seed: (h % 997) / 100, state: s.state, remote: s.remote, mode: 'seated', px: 0, py: 0, path: null, pi: 0 };
        visuals.set(s.id, v);
        mount(v);
        relayout();
        if (!first) startWalk(v, 'in');   // sessions already here when the window opens are simply at their desks
      } else if (v.mode === 'out') {
        startWalk(v, 'in');               // came back before reaching the door
      }
      v.session = s;
      if (visuals.has(s.id)) sync(v);
    }
    for (const v of [...visuals.values()]) {
      if (live.has(v.id) || v.mode === 'out') continue;
      if (v.mode === 'seated') { v.session = { ...v.session, pending: [] }; startWalk(v, 'out'); if (visuals.has(v.id)) sync(v); }
      else remove(v);
    }
    relayout();
    const waiting = next.sessions.filter(s => s.pending.length).length;
    document.title = (waiting ? `(${waiting}) ` : '') + 'My Little Sessions';
    first = false;
  }

  const stream = new EventSource('/api/events?k=' + encodeURIComponent(key));
  stream.onmessage = e => apply(JSON.parse(e.data));
  stream.onerror = () => { if (stream.readyState === EventSource.CLOSED) toast(T.lost); };

  // ---------- drawing loop ----------
  relayout();
  office.draw([], 0);
  if (reduce) {
    setInterval(() => { time += 0.6; office.draw([...visuals.values()], time); }, 600);
  } else {
    let last = performance.now();
    const frame = now => {
      const dt = Math.min(0.1, (now - last) / 1000); last = now; time += dt;
      step(dt);
      office.draw([...visuals.values()], time);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
})();
