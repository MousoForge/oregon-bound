(() => {
  "use strict";

  const GOAL_MILES = 2040;
  const SAVE_KEY = "oregon-bound-save-v1";

  const JOBS = [
    { id: "banker", name: "Banker", cash: 1600, note: "Deep pockets. Lowest score multiplier." },
    { id: "carpenter", name: "Carpenter", cash: 800, note: "Wagon repairs go better." },
    { id: "farmer", name: "Farmer", cash: 400, note: "Hardest start. Highest score multiplier." },
  ];

  const MONTHS = [
    { m: 3, name: "March" },
    { m: 4, name: "April" },
    { m: 5, name: "May" },
    { m: 6, name: "June" },
    { m: 7, name: "July" },
    { m: 8, name: "August" },
  ];

  const GOODS = [
    { id: "oxen", name: "Yoke of oxen", unit: 40, step: 1, hint: "Need at least 2 yokes (4 oxen)." },
    { id: "food", name: "Food (lbs)", unit: 0.2, step: 50, hint: "Plan 150–200 lbs per person." },
    { id: "clothing", name: "Sets of clothing", unit: 10, step: 1, hint: "Cold kills without coats." },
    { id: "ammo", name: "Boxes of bullets", unit: 2, step: 1, hint: "1 box = 20 rounds." },
    { id: "wheels", name: "Wagon wheels", unit: 10, step: 1, hint: "Spares for breakdowns." },
    { id: "axles", name: "Wagon axles", unit: 10, step: 1, hint: "Spares for breakdowns." },
    { id: "tongues", name: "Wagon tongues", unit: 10, step: 1, hint: "Spares for breakdowns." },
  ];

  const LANDMARKS = [
    { miles: 0, name: "Independence, Missouri" },
    { miles: 102, name: "Kansas River crossing" },
    { miles: 304, name: "Fort Kearney" },
    { miles: 554, name: "Chimney Rock" },
    { miles: 640, name: "Fort Laramie" },
    { miles: 830, name: "Independence Rock" },
    { miles: 932, name: "South Pass" },
    { miles: 989, name: "Green River crossing" },
    { miles: 1080, name: "Soda Springs" },
    { miles: 1133, name: "Fort Hall" },
    { miles: 1288, name: "Snake River crossing" },
    { miles: 1455, name: "Fort Boise" },
    { miles: 1648, name: "Blue Mountains" },
    { miles: 1863, name: "The Dalles" },
    { miles: GOAL_MILES, name: "Willamette Valley, Oregon" },
  ];

  const RIVERS = [102, 989, 1288, 1863];

  const PACE = {
    steady: { label: "Steady", miles: 18, wear: 1, health: 0 },
    strenuous: { label: "Strenuous", miles: 24, wear: 1.4, health: -1 },
    grueling: { label: "Grueling", miles: 30, wear: 2, health: -3 },
  };

  const RATIONS = {
    filling: { label: "Filling", food: 3, health: 2 },
    meager: { label: "Meager", food: 2, health: 0 },
    bare: { label: "Bare bones", food: 1, health: -2 },
  };

  const AILMENTS = ["exhaustion", "a fever", "dysentery", "cholera", "a broken bone", "a snakebite"];

  const $ = (id) => document.getElementById(id);
  const screens = {
    title: $("screen-title"),
    setup: $("screen-setup"),
    store: $("screen-store"),
    trail: $("screen-trail"),
    hunt: $("screen-hunt"),
    end: $("screen-end"),
  };

  let state = null;
  let cart = null;
  let hunt = null;

  function show(name) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[name].classList.add("active");
  }

  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) { return null; }
  }

  function living() { return state.party.filter((p) => p.hp > 0); }

  function dateStr() {
    const d = new Date(state.year, state.month - 1, state.day);
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }

  function placeName() {
    let current = LANDMARKS[0];
    for (const lm of LANDMARKS) {
      if (state.miles >= lm.miles) current = lm;
    }
    if (state.miles >= GOAL_MILES) return current.name;
    const next = LANDMARKS.find((l) => l.miles > state.miles);
    if (next && state.miles > 0) return `${current.name} · ${next.miles - state.miles} mi to ${next.name}`;
    return current.name;
  }

  function nextLandmark() {
    return LANDMARKS.find((l) => l.miles > state.miles) || LANDMARKS[LANDMARKS.length - 1];
  }

  function rand(n) { return Math.floor(Math.random() * n); }
  function pick(arr) { return arr[rand(arr.length)]; }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function weatherForMonth(m) {
    if (m <= 3 || m >= 11) return pick(["bitter cold", "snow", "freezing rain", "clear and cold"]);
    if (m === 4 || m === 10) return pick(["cold rain", "wind", "cool and clear", "sleet"]);
    if (m >= 7 && m <= 8) return pick(["hot and dry", "very hot", "dust storm", "clear"]);
    return pick(["rain", "overcast", "fair", "warm and clear"]);
  }

  function isCold(w) { return /cold|snow|freez|sleet/.test(w); }

  function addDays(n) {
    const d = new Date(state.year, state.month - 1, state.day);
    d.setDate(d.getDate() + n);
    state.year = d.getFullYear();
    state.month = d.getMonth() + 1;
    state.day = d.getDate();
    state.weather = weatherForMonth(state.month);
  }

  function log(msg) { state.log = msg; }

  function modal(title, body, actions) {
    $("modal-title").textContent = title;
    $("modal-body").innerHTML = body;
    const box = $("modal-actions");
    box.innerHTML = "";
    (actions || [{ label: "OK", fn: hideModal }]).forEach((a) => {
      const b = document.createElement("button");
      b.className = a.primary ? "btn primary" : "btn";
      b.textContent = a.label;
      b.onclick = () => { hideModal(); if (a.fn) a.fn(); };
      box.appendChild(b);
    });
    $("modal").classList.add("show");
  }

  function hideModal() { $("modal").classList.remove("show"); }

  function renderTrail() {
    $("place-name").textContent = placeName();
    $("stats").innerHTML = [
      ["Date", dateStr()],
      ["Weather", state.weather],
      ["Miles", `${state.miles} / ${GOAL_MILES}`],
      ["Food", `${Math.floor(state.food)} lbs`],
      ["Oxen", String(state.oxen)],
      ["Cash", `$${state.cash.toFixed(0)}`],
      ["Pace", PACE[state.pace].label],
      ["Rations", RATIONS[state.rations].label],
    ].map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`).join("");

    $("party").innerHTML = state.party.map((p) => {
      const cls = p.hp <= 0 ? "dead" : p.status !== "healthy" ? "ill" : "";
      const st = p.hp <= 0 ? "dead" : p.status;
      return `<li class="${cls}"><span>${p.name}</span><span>${st}</span></li>`;
    }).join("");
    $("log").textContent = state.log || "The wagon is packed. The trail waits.";
    $("btn-hunt").disabled = state.ammo <= 0 || living().length === 0;
    $("btn-travel").disabled = living().length === 0;
  }

  function occupySetup() {
    $("job-list").innerHTML = JOBS.map((j) =>
      `<button type="button" class="choice-card" data-job="${j.id}"><strong>${j.name} — $${j.cash}</strong><span>${j.note}</span></button>`
    ).join("");
    $("month").innerHTML = MONTHS.map((m) => `<option value="${m.m}">${m.name} 1848</option>`).join("");
    $("month").value = "4";
    $("job-list").onclick = (e) => {
      const btn = e.target.closest("[data-job]");
      if (!btn) return;
      cart.job = btn.dataset.job;
      [...$("job-list").children].forEach((c) => {
        c.style.borderColor = c === btn ? "var(--gold-bright)" : "var(--line)";
      });
    };
    $("job-list").children[1].click();
  }

  function renderStore() {
    const job = JOBS.find((j) => j.id === cart.job);
    $("store-cash").textContent = `Cash on hand: $${cart.cash.toFixed(2)} · ${job.name}`;
    $("store-list").innerHTML = GOODS.map((g) => {
      const q = cart.buy[g.id] || 0;
      return `<div class="store-item" data-id="${g.id}"><div class="name">${g.name}<div class="muted">${g.hint}</div></div><div class="price">$${g.unit.toFixed(2)}</div><div class="qty-ctrl"><button type="button" data-d="-1">−</button><span>${q}</span><button type="button" data-d="1">+</button></div></div>`;
    }).join("");
  }

  function changeQty(id, dir) {
    const g = GOODS.find((x) => x.id === id);
    const next = Math.max(0, (cart.buy[id] || 0) + dir * g.step);
    const spentOther = GOODS.filter((x) => x.id !== id).reduce((s, x) => s + (cart.buy[x.id] || 0) * x.unit, 0);
    const cost = next * g.unit;
    if (spentOther + cost > cart.cash + 0.001) return;
    cart.buy[id] = next;
    renderStore();
  }

  function startJourney() {
    const job = JOBS.find((j) => j.id === cart.job);
    const leader = ($("leader").value || "Captain").trim().slice(0, 16);
    const mates = [...document.querySelectorAll(".mate")].map((i, n) => (i.value.trim() || `Companion ${n + 1}`).slice(0, 14));
    const names = [leader, ...mates];
    const spent = GOODS.reduce((s, g) => s + (cart.buy[g.id] || 0) * g.unit, 0);
    state = {
      job: job.id,
      cash: Math.max(0, job.cash - spent),
      oxen: (cart.buy.oxen || 0) * 2,
      food: cart.buy.food || 0,
      clothing: cart.buy.clothing || 0,
      ammo: (cart.buy.ammo || 0) * 20,
      wheels: cart.buy.wheels || 0,
      axles: cart.buy.axles || 0,
      tongues: cart.buy.tongues || 0,
      year: 1848,
      month: Number($("month").value),
      day: 1,
      miles: 0,
      pace: "steady",
      rations: "filling",
      weather: "fair",
      broken: null,
      huntsToday: 0,
      party: names.map((name) => ({ name, hp: 100, status: "healthy" })),
      log: "You roll out of Independence. Dust lifts off the Missouri road.",
      scoreParts: 0,
    };
    state.weather = weatherForMonth(state.month);
    save();
    show("trail");
    renderTrail();
    if (state.oxen < 2) {
      modal("Thin team", "You have fewer than two oxen. The wagon will barely move. Buy more next time if you stall out here.", [{ label: "Understood", primary: true }]);
    }
  }

  function consumeFood(days) {
    const eaters = living().length;
    const need = eaters * RATIONS[state.rations].food * days;
    if (state.food >= need) { state.food -= need; return false; }
    state.food = 0;
    return true;
  }

  function hurt(person, amount, status) {
    person.hp = clamp(person.hp - amount, 0, 100);
    if (person.hp <= 0) { person.status = "dead"; log(`${person.name} has died.`); }
    else if (status) person.status = status;
  }

  function healTick(days) {
    const r = RATIONS[state.rations];
    const p = PACE[state.pace];
    living().forEach((person) => {
      let delta = r.health + p.health;
      if (state.food <= 0) delta -= 8;
      if (isCold(state.weather) && state.clothing < living().length) delta -= 4;
      if (state.month >= 11 || state.month <= 2) delta -= 2;
      person.hp = clamp(person.hp + delta * days, 0, 100);
      if (person.hp <= 0) person.status = "dead";
      else if (person.hp > 70 && person.status !== "healthy") person.status = "healthy";
      else if (person.hp < 40 && person.status === "healthy") person.status = "exhausted";
    });
  }

  function checkEnd() {
    if (living().length === 0) {
      endGame(false, "The last member of the company is gone. The wagon stands empty on the plains.");
      return true;
    }
    if (state.miles >= GOAL_MILES) {
      const alive = living().length;
      const mult = state.job === "farmer" ? 3 : state.job === "carpenter" ? 2 : 1;
      const score = Math.floor((alive * 400 + state.food + state.cash + state.oxen * 20) * mult);
      endGame(true, `The Willamette Valley opens in front of you. ${alive} of 5 made it. Score: ${score}.`);
      return true;
    }
    return false;
  }

  function endGame(won, text) {
    try { localStorage.removeItem(SAVE_KEY); } catch (_) {}
    $("end-title").textContent = won ? "Oregon." : "The trail wins.";
    $("end-text").textContent = text;
    show("end");
  }

  function breakdown() {
    const part = pick(["wheels", "axles", "tongues"]);
    const label = part === "wheels" ? "a wheel" : part === "axles" ? "an axle" : "the wagon tongue";
    if (state[part] > 0) {
      state[part] -= 1;
      const carpenter = state.job === "carpenter";
      addDays(carpenter ? 1 : 2);
      consumeFood(carpenter ? 1 : 2);
      log(`You broke ${label}. A spare is fitted${carpenter ? " quickly" : ""} and you roll on.`);
      return;
    }
    state.broken = part;
    log(`You broke ${label} and have no spare. You cannot travel until it is replaced or abandoned.`);
    modal("Broken wagon", `You broke ${label} and have no spare part. Rest and hope a traveler sells one, or abandon the wagon and walk (most will not survive).`, [
      { label: "Wait for help (3 days)", fn: () => waitForPart(part) },
      { label: "Abandon wagon and walk", fn: abandonWagon },
    ]);
  }

  function waitForPart(part) {
    addDays(3);
    consumeFood(3);
    healTick(3);
    if (Math.random() < 0.55) {
      if (state.cash >= 15) {
        state.cash -= 15; state[part] += 1; state.broken = null;
        log("A trader had a spare. You paid $15 and repaired the wagon.");
      } else if (Math.random() < 0.4) {
        state[part] += 1; state.broken = null;
        log("A missionary train gifted you a spare part.");
      } else log("No help came. The wagon still sits.");
    } else log("The prairie stays empty. The wagon is still broken.");
    afterTravel();
  }

  function abandonWagon() {
    state.oxen = 0; state.broken = null;
    log("You leave the wagon. On foot the mountains will be cruel.");
    afterTravel();
  }

  function riverEvent(miles) {
    const names = { 102: "Kansas River", 989: "Green River", 1288: "Snake River", 1863: "Columbia River at The Dalles" };
    const depth = 2 + rand(5);
    const name = names[miles] || "the river";
    modal(name, `The water is ${depth} feet. Current is ${depth >= 5 ? "swift" : "moderate"}. How do you cross?`, [
      { label: "Ford it", fn: () => crossRiver("ford", depth) },
      { label: "Caulk the wagon and float", fn: () => crossRiver("caulk", depth) },
      { label: "Hire a ferry ($8)", fn: () => crossRiver("ferry", depth) },
    ]);
  }

  function crossRiver(method, depth) {
    addDays(1); consumeFood(1);
    if (method === "ferry") {
      if (state.cash >= 8) { state.cash -= 8; log("The ferry takes you across without incident."); }
      else { log("You cannot pay the ferryman. You ford instead."); return crossRiver("ford", depth); }
      afterTravel(); return;
    }
    let risk = method === "ford" ? depth * 0.08 : 0.18;
    if (depth >= 6 && method === "ford") risk = 0.65;
    if (Math.random() < risk) {
      const lossFood = Math.min(state.food, 40 + rand(80));
      state.food -= lossFood;
      if (Math.random() < 0.35 && living().length) {
        const p = pick(living());
        hurt(p, 40 + rand(50), "drowned scare");
        log(`The wagon swamps. You lose ${Math.floor(lossFood)} lbs of food. ${p.name} is thrown into the current.`);
      } else log(`The wagon takes water. You lose ${Math.floor(lossFood)} lbs of food.`);
    } else log("You reach the far bank, soaked but whole.");
    afterTravel();
  }

  function randomEvent() {
    const roll = Math.random();
    if (roll < 0.08 && state.oxen > 0) { state.oxen -= 1; log("An ox dies in harness. You cut it out and keep moving."); return; }
    if (roll < 0.16) { breakdown(); return; }
    if (roll < 0.28 && living().length) {
      const p = pick(living()); const ail = pick(AILMENTS);
      hurt(p, 15 + rand(25), ail); log(`${p.name} has ${ail}.`); return;
    }
    if (roll < 0.34) {
      const steal = Math.min(state.food, 20 + rand(40));
      state.food -= steal; log(`Thieves hit camp in the night. ${Math.floor(steal)} lbs of food are gone.`); return;
    }
    if (roll < 0.4) { addDays(1); consumeFood(1); log("A wagon train shares a fire. You lose a day talking and trading news."); return; }
    if (roll < 0.46 && state.cash >= 5) {
      modal("Trader", "A trader offers 50 lbs of food for $10, or a spare wheel for $12.", [
        { label: "Buy food ($10)", fn: () => { if (state.cash >= 10) { state.cash -= 10; state.food += 50; log("You bought 50 lbs of food."); } renderTrail(); save(); } },
        { label: "Buy wheel ($12)", fn: () => { if (state.cash >= 12) { state.cash -= 12; state.wheels += 1; log("You bought a spare wheel."); } renderTrail(); save(); } },
        { label: "Pass", fn: () => {} },
      ]);
      return;
    }
    if (roll < 0.52) {
      log(pick([
        "You pass graves beside the ruts. No names.",
        "Antelope watch from a ridge and vanish.",
        "The wind never stops.",
        "A child in another train waves. You wave back.",
        "Thunder walks the horizon all afternoon.",
      ]));
    }
  }

  function afterTravel() {
    if (state.oxen <= 0 && state.miles < GOAL_MILES) log("With no oxen the wagon is a sled. You make almost no miles.");
    healTick(1); save(); renderTrail(); checkEnd();
  }

  function travel() {
    if (checkEnd()) return;
    if (state.broken) {
      modal("Wagon disabled", "The wagon is broken. Wait for a part or abandon it.", [
        { label: "Wait 3 days", primary: true, fn: () => waitForPart(state.broken) },
        { label: "Abandon wagon", fn: abandonWagon },
      ]);
      return;
    }
    const pace = PACE[state.pace];
    let days = 4;
    let miles = pace.miles * days;
    if (state.oxen <= 0) miles = 3 * days;
    else if (state.oxen < 4) miles *= 0.6;
    if (/snow|dust|rain/.test(state.weather)) miles *= 0.75;
    miles = Math.round(miles);
    const next = nextLandmark();
    const toNext = next.miles - state.miles;
    if (miles >= toNext) {
      days = Math.max(1, Math.round(days * (toNext / Math.max(miles, 1))));
      miles = toNext;
    }
    addDays(days);
    const starved = consumeFood(days);
    state.miles = Math.min(GOAL_MILES, state.miles + miles);
    if (starved) log("The food is gone. The company weakens.");
    else log(`You cover ${miles} miles in ${days} days.`);
    if (RIVERS.includes(state.miles)) { healTick(days); renderTrail(); riverEvent(state.miles); return; }
    if (state.miles === next.miles && next.miles !== GOAL_MILES && miles > 0) log(`You reach ${next.name}.`);
    if (Math.random() < 0.55) randomEvent();
    afterTravel();
  }

  function rest() {
    addDays(2); consumeFood(2);
    living().forEach((p) => { p.hp = clamp(p.hp + 8, 0, 100); if (p.hp > 65) p.status = "healthy"; });
    state.huntsToday = 0;
    log("You rest two days. The sick ease a little. The oxen graze.");
    afterTravel();
  }

  function startHunt() {
    if (state.ammo <= 0) return;
    if (state.huntsToday >= 2) { modal("No game", "The animals have scattered. Rest or travel before hunting again."); return; }
    state.huntsToday += 1;
    show("hunt");
    const canvas = $("hunt-canvas");
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    hunt = { running: true, ammo0: state.ammo, foodGained: 0, animals: [], t: 0, last: performance.now() };
    for (let i = 0; i < 6; i++) spawnAnimal();

    function spawnAnimal() {
      const kinds = [
        { name: "rabbit", food: 2, speed: 2.4, r: 8 },
        { name: "deer", food: 18, speed: 1.6, r: 12 },
        { name: "bison", food: 50, speed: 1.1, r: 16 },
      ];
      const k = Math.random() < 0.55 ? kinds[0] : Math.random() < 0.7 ? kinds[1] : kinds[2];
      hunt.animals.push({ ...k, x: Math.random() < 0.5 ? -20 : w + 20, y: 40 + rand(h - 60), dir: Math.random() < 0.5 ? 1 : -1 });
    }

    function frame(now) {
      if (!hunt || !hunt.running) return;
      const dt = Math.min(32, now - hunt.last) / 16.67;
      hunt.last = now; hunt.t += dt;
      ctx.fillStyle = "#2d4a28"; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#3d5c30"; ctx.fillRect(0, h - 28, w, 28);
      hunt.animals.forEach((a) => {
        a.x += a.dir * a.speed * dt * 1.6;
        if (a.x < -30 || a.x > w + 30) { a.x = a.dir > 0 ? -20 : w + 20; a.y = 40 + rand(h - 60); }
        ctx.fillStyle = a.name === "bison" ? "#5a4030" : a.name === "deer" ? "#8a6230" : "#c4b090";
        ctx.beginPath(); ctx.ellipse(a.x, a.y, a.r, a.r * 0.7, 0, 0, Math.PI * 2); ctx.fill();
      });
      $("hunt-score").textContent = `Rounds: ${state.ammo} · Meat this hunt: ${hunt.foodGained} lbs`;
      if (hunt.t > 60 * 8) { stopHunt(); return; }
      requestAnimationFrame(frame);
    }

    canvas.onclick = (ev) => {
      if (!hunt || !hunt.running || state.ammo <= 0) return;
      const rect = canvas.getBoundingClientRect();
      const x = ((ev.clientX - rect.left) / rect.width) * w;
      const y = ((ev.clientY - rect.top) / rect.height) * h;
      state.ammo -= 1;
      let hit = null;
      hunt.animals.forEach((a) => {
        const dx = a.x - x, dy = a.y - y;
        if (dx * dx + dy * dy < (a.r + 10) * (a.r + 10)) hit = a;
      });
      if (hit) { hunt.foodGained += hit.food; hunt.animals = hunt.animals.filter((a) => a !== hit); spawnAnimal(); }
      $("hunt-score").textContent = `Rounds: ${state.ammo} · Meat this hunt: ${hunt.foodGained} lbs`;
      if (state.ammo <= 0) stopHunt();
    };
    requestAnimationFrame(frame);
  }

  function stopHunt() {
    if (!hunt) return;
    hunt.running = false;
    const gained = Math.min(hunt.foodGained, 100);
    state.food += gained;
    const shots = hunt.ammo0 - state.ammo;
    log(`Hunt over. ${shots} rounds fired. ${gained} lbs of meat dressed and loaded.`);
    hunt = null; show("trail"); afterTravel();
  }

  function choosePace() {
    modal("Pace", "Faster travel wears the company and the wagon.", [
      { label: "Steady", fn: () => setPace("steady") },
      { label: "Strenuous", fn: () => setPace("strenuous") },
      { label: "Grueling", fn: () => setPace("grueling") },
    ]);
  }
  function setPace(p) { state.pace = p; log(`Pace set to ${PACE[p].label}.`); renderTrail(); save(); }
  function chooseRations() {
    modal("Rations", "Less food today means more miles of supply — and weaker people.", [
      { label: "Filling", fn: () => setRations("filling") },
      { label: "Meager", fn: () => setRations("meager") },
      { label: "Bare bones", fn: () => setRations("bare") },
    ]);
  }
  function setRations(r) { state.rations = r; log(`Rations set to ${RATIONS[r].label}.`); renderTrail(); save(); }

  function resetToTitle() {
    state = null;
    $("btn-continue").hidden = !load();
    show("title");
  }

  $("btn-new").onclick = () => {
    const job = JOBS[1];
    cart = { job: job.id, cash: job.cash, buy: { oxen: 3, food: 800, clothing: 5, ammo: 3, wheels: 1, axles: 1, tongues: 1 } };
    occupySetup(); show("setup");
  };
  $("btn-continue").onclick = () => {
    const saved = load(); if (!saved) return;
    state = saved; show("trail"); renderTrail();
  };
  $("btn-setup-back").onclick = resetToTitle;
  $("btn-to-store").onclick = () => {
    const job = JOBS.find((j) => j.id === cart.job);
    cart.cash = job.cash; renderStore(); show("store");
  };
  $("btn-store-back").onclick = () => show("setup");
  $("store-list").onclick = (e) => {
    const item = e.target.closest(".store-item");
    const btn = e.target.closest("button");
    if (!item || !btn) return;
    changeQty(item.dataset.id, Number(btn.dataset.d));
  };
  $("btn-leave-town").onclick = startJourney;
  $("btn-travel").onclick = travel;
  $("btn-rest").onclick = rest;
  $("btn-hunt").onclick = startHunt;
  $("btn-leave-hunt").onclick = stopHunt;
  $("btn-pace").onclick = choosePace;
  $("btn-rations").onclick = chooseRations;
  $("btn-again").onclick = resetToTitle;

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
  resetToTitle();
})();
