"use strict";
(() => {
  // src/ts/dom.ts
  var PROPS = /* @__PURE__ */ new Set(["value", "checked", "disabled", "selected", "hidden"]);
  function append(el, children) {
    for (const c of children) {
      if (c === null || c === void 0 || c === false) continue;
      if (Array.isArray(c)) append(el, c);
      else el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    }
  }
  function h(tag2, attrs = null, ...children) {
    const el = document.createElement(tag2);
    const deferred = [];
    for (const [k, v] of Object.entries(attrs ?? {})) {
      if (v === void 0 || v === null) continue;
      if (k === "class") el.className = String(v);
      else if (k === "dataset") Object.assign(el.dataset, v);
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (PROPS.has(k)) deferred.push([k, v]);
      else if (k.startsWith("aria-")) el.setAttribute(k, String(v));
      else if (v === false) continue;
      else el.setAttribute(k, v === true ? "" : String(v));
    }
    append(el, children);
    for (const [k, v] of deferred) el[k] = v;
    return el;
  }
  var go = (hash) => {
    location.hash = hash;
  };
  function keepFocus(fn) {
    const key = document.activeElement?.dataset?.key;
    fn();
    if (key) document.querySelector(`[data-key="${key}"]`)?.focus();
  }
  var timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
  var dayFmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
  var startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  function dayLabel(ts, now = Date.now()) {
    const diff = Math.round((startOfDay(new Date(ts)) - startOfDay(new Date(now))) / 864e5);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    return dayFmt.format(ts);
  }
  var fmtWhen = (start, end) => `${dayLabel(start)}, ${timeFmt.format(start)} to ${timeFmt.format(end)}`;
  function fmtAgo(ts, now = Date.now()) {
    const m = Math.round((now - ts) / 6e4);
    if (m < 1) return "just now";
    if (m < 60) return `${m} min ago`;
    if (m < 60 * 24) return `${Math.round(m / 60)} h ago`;
    return `${Math.round(m / 1440)} days ago`;
  }
  var firstName = (name) => name.trim().split(/\s+/)[0] || name;
  var initials = (name) => name.trim().charAt(0).toUpperCase();
  function avatar(user, size = "") {
    return h("span", { class: `avatar${size ? " avatar--" + size : ""}`, style: `background:${user.avatarColor}`, title: user.name, "aria-hidden": "true" }, initials(user.name));
  }
  function tag(text, extra = "") {
    return h("span", { class: `tag ${extra}`.trim() }, text);
  }
  function toast(message) {
    const region = document.getElementById("toast-region");
    if (!region) return;
    const t = h("div", { class: "toast", role: "status" }, message);
    region.append(t);
    setTimeout(() => t.remove(), 3600);
  }
  var renderer = null;
  var backdrop = null;
  var returnFocus = null;
  function openModal(render9) {
    closeModal();
    renderer = render9;
    returnFocus = document.activeElement;
    const body = h("div", { class: "modal__body" });
    const modal = h(
      "div",
      { class: "modal", role: "dialog", "aria-modal": "true", "aria-label": "Invite details", tabindex: -1 },
      h("button", { class: "btn btn--text modal__close", type: "button", onClick: () => closeModal() }, "Close"),
      body
    );
    backdrop = h("div", { class: "modal-backdrop", onClick: (e) => {
      if (e.target === backdrop) closeModal();
    } }, modal);
    document.getElementById("modal-root").append(backdrop);
    refreshModal();
    modal.focus();
  }
  function refreshModal() {
    if (!backdrop || !renderer) return;
    const content = renderer();
    if (!content) {
      closeModal();
      return;
    }
    const body = backdrop.querySelector(".modal__body");
    keepFocus(() => body.replaceChildren(content));
  }
  function closeModal() {
    backdrop?.remove();
    backdrop = null;
    renderer = null;
    returnFocus?.focus?.();
    returnFocus = null;
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  // src/ts/data.ts
  var HOUR = 36e5;
  var venues = [
    {
      id: "v-boulder",
      name: "Boulder House",
      kind: "gym",
      area: "Downtown",
      x: 48,
      y: 52,
      hours: "Daily 10am-10pm",
      sportIds: ["bouldering"],
      rentals: ["Climbing shoes", "Chalk"],
      info: "Indoor bouldering gym with beginner walls and an intro orientation."
    },
    {
      id: "v-beacon",
      name: "Beacon Hill Park Fields",
      kind: "field",
      area: "James Bay",
      x: 42,
      y: 80,
      hours: "Dawn to dusk",
      sportIds: ["soccer", "running", "baseball"],
      rentals: [],
      info: "Large public grass fields. No lights, no bookings needed."
    },
    {
      id: "v-uvic",
      name: "UVic Stadium Field",
      kind: "field",
      area: "Gordon Head",
      x: 80,
      y: 28,
      hours: "Dawn to 9pm",
      sportIds: ["soccer", "running"],
      rentals: [],
      info: "Turf field with lights on weeknights. Check campus signage for bookings."
    },
    {
      id: "v-windsor",
      name: "Windsor Park Courts",
      kind: "court",
      area: "Oak Bay",
      x: 88,
      y: 62,
      hours: "Dawn to dusk",
      sportIds: ["tennis", "basketball"],
      rentals: [],
      info: "Two tennis courts and a half basketball court. First come, first served."
    },
    {
      id: "v-cages",
      name: "Home Run Batting Cages",
      kind: "cages",
      area: "Saanich",
      x: 28,
      y: 38,
      hours: "Mon-Fri 3-9pm, Sat-Sun 10am-8pm",
      sportIds: ["baseball"],
      rentals: ["Bats", "Helmets", "Gloves ($3)"],
      info: "6 cages, up to 2 people per cage. About $2 per 15 pitches."
    },
    {
      id: "v-goose",
      name: "Galloping Goose Trailhead",
      kind: "trail",
      area: "Vic West",
      x: 20,
      y: 62,
      hours: "Always open",
      sportIds: ["running", "cycling"],
      rentals: [],
      info: "Paved multi-use trail. Flat and good for all levels."
    },
    {
      id: "v-vicwest",
      name: "Vic West Outdoor Court",
      kind: "court",
      area: "Vic West",
      x: 34,
      y: 50,
      hours: "Dawn to dusk",
      sportIds: ["basketball"],
      rentals: [],
      info: "Full-length outdoor court with two hoops."
    }
  ];
  var sports = [
    {
      id: "soccer",
      name: "Soccer",
      tagline: "Team sport, easy to start",
      typicalGroup: "6-22 players",
      soloFriendly: false,
      motivations: ["exercise", "social", "competition"],
      description: "Two teams try to put the ball in the other goal. Pickup games are common and flexible about numbers.",
      gear: [
        { item: "Cleats or running shoes", required: true, note: "Cleats help on grass, not required for casual games" },
        { item: "Shin guards", required: false, note: "Recommended for competitive games" },
        { item: "Water bottle", required: true, note: "Bring your own" }
      ],
      howToStart: ["Join a Casual, Beginner-friendly invite", "Show up 10 minutes early", "Ask the host about team colours"]
    },
    {
      id: "bouldering",
      name: "Bouldering",
      tagline: "Solo sport, better with company",
      typicalGroup: "2-6 climbers",
      soloFriendly: true,
      motivations: ["exercise", "challenge", "learn"],
      description: "Climbing short routes without ropes over padded floors. Everyone climbs at their own pace, so groups take turns and cheer each other on.",
      gear: [
        { item: "Climbing shoes", required: true, note: "Rentable at most gyms" },
        { item: "Chalk", required: false, note: "Rentable or shareable" },
        { item: "Comfortable clothes", required: true, note: "Anything stretchy" }
      ],
      howToStart: ["Do the gym orientation", "Rent shoes first, buy later", "Start on the easiest-graded problems"]
    },
    {
      id: "baseball",
      name: "Baseball",
      tagline: "Start small with batting and catch",
      typicalGroup: "2-18 players",
      soloFriendly: false,
      motivations: ["social", "learn", "exercise"],
      description: "Bat-and-ball game. A full game needs many people, but a small group can do batting cages, catch, or pepper.",
      gear: [
        { item: "Glove", required: true, note: "Fit matters more than brand. Often shareable" },
        { item: "Bat", required: false, note: "Cages provide rental bats" },
        { item: "Helmet", required: false, note: "Provided at batting cages" }
      ],
      howToStart: ["Try a batting cage invite first", "Borrow a glove before buying one", "Work up to small-sided games"]
    },
    {
      id: "running",
      name: "Running",
      tagline: "Solo sport, social pace groups",
      typicalGroup: "2-10 runners",
      soloFriendly: true,
      motivations: ["exercise", "challenge", "social"],
      description: "Group runs set a shared pace so nobody runs alone. Pick a distance and pace that suits you.",
      gear: [{ item: "Running shoes", required: true, note: "Any comfortable trainers" }, { item: "Water", required: false, note: "Recommended for runs over 5 km" }],
      howToStart: ["Choose a Casual run", "Start with 3-5 km", "Walk breaks are fine"]
    },
    {
      id: "cycling",
      name: "Cycling",
      tagline: "Solo sport, group rides",
      typicalGroup: "2-8 riders",
      soloFriendly: true,
      motivations: ["exercise", "challenge", "social"],
      description: "Group rides on trails or roads at a pace the host announces.",
      gear: [{ item: "Bike", required: true, note: "Check the invite for borrowing options" }, { item: "Helmet", required: true, note: "Required by law in BC" }, { item: "Lock", required: false, note: "For caf\xE9 stops" }],
      howToStart: ["Pick a trail ride first", "Check your tyres and brakes", "Tell the host your comfortable pace"]
    },
    {
      id: "basketball",
      name: "Basketball",
      tagline: "Pickup games, small groups",
      typicalGroup: "4-10 players",
      soloFriendly: false,
      motivations: ["exercise", "competition", "social"],
      description: "Half-court 3v3 or full-court 5v5 pickup games, usually self-organised.",
      gear: [{ item: "Court shoes", required: true, note: "Non-marking soles for indoor courts" }, { item: "Basketball", required: false, note: "Hosts often bring one" }],
      howToStart: ["Join a Casual run", "Call next on the sideline", "Learn the local rules (make-it-take-it?)"]
    },
    {
      id: "tennis",
      name: "Tennis",
      tagline: "Rallies with a partner",
      typicalGroup: "2-4 players",
      soloFriendly: false,
      motivations: ["exercise", "competition", "learn"],
      description: "Singles or doubles on a hard court. Beginners can start with rallying.",
      gear: [{ item: "Racket", required: true, note: "Often shareable" }, { item: "Tennis balls", required: true, note: "Host usually brings a can" }],
      howToStart: ["Try a Beginner rally", "Borrow a racket first", "Learn basic scoring later"]
    }
  ];
  var palette = ["#e07a5f", "#3d85c6", "#81b29a", "#f2cc8f", "#9b72cf", "#e56b9f", "#4aa3a2", "#c98b3b"];
  function seedUsers() {
    const mk = (id, name, i, area, cur, friends) => ({
      id,
      name,
      avatarColor: palette[i % palette.length],
      area,
      motivations: ["exercise", "social"],
      currentSports: cur.map(([sportId, skill]) => ({ sportId, skill })),
      desiredSports: [],
      calendar: null,
      friendIds: friends
    });
    const list = [
      {
        id: "u-demo",
        name: "Alex (demo)",
        avatarColor: palette[1],
        area: "Fairfield",
        motivations: ["exercise", "social", "learn"],
        currentSports: [{ sportId: "soccer", skill: "Intermediate" }, { sportId: "bouldering", skill: "Beginner" }],
        desiredSports: ["baseball", "running"],
        calendar: [
          { day: 1, startHour: 9, endHour: 15, label: "Classes" },
          { day: 3, startHour: 9, endHour: 15, label: "Classes" },
          { day: 5, startHour: 9, endHour: 17, label: "Work" }
        ],
        friendIds: ["u-maya", "u-tom"]
      },
      mk("u-maya", "Maya", 0, "James Bay", [["soccer", "Intermediate"]], ["u-demo"]),
      mk("u-chen", "Chen", 2, "Gordon Head", [["soccer", "Advanced"]], []),
      mk("u-priya", "Priya", 4, "Downtown", [["bouldering", "Intermediate"]], []),
      mk("u-tom", "Tom", 3, "Saanich", [["baseball", "Intermediate"]], ["u-demo"]),
      mk("u-lena", "Lena", 5, "Vic West", [["running", "Advanced"]], []),
      mk("u-omar", "Omar", 6, "Oak Bay", [["bouldering", "Beginner"], ["tennis", "Beginner"]], []),
      mk("u-sofia", "Sofia", 7, "Saanich", [["baseball", "Beginner"], ["running", "Intermediate"]], []),
      mk("u-dev", "Dev", 1, "Vic West", [["basketball", "Intermediate"]], [])
    ];
    return Object.fromEntries(list.map((u) => [u.id, u]));
  }
  function seedInvites(now) {
    const at = (h2) => now + h2 * HOUR;
    const loc = (venueId) => {
      const v = venues.find((x) => x.id === venueId);
      return { label: v.name, x: v.x, y: v.y, venueId };
    };
    const nogear = { available: false, description: "" };
    const base = { recurring: false, notes: "" };
    return [
      {
        ...base,
        id: "i-1",
        hostId: "u-chen",
        memberIds: ["u-chen", "u-maya", "u-priya", "u-dev", "u-lena", "u-omar"],
        sportId: "soccer",
        location: loc("v-uvic"),
        start: at(3),
        end: at(4.5),
        capacity: 14,
        skill: "Intermediate",
        vibe: "Casual",
        visibility: "open",
        gear: { available: true, description: "2 spare pinnies and a ball" },
        notes: "Pickup 7v7, bring a dark and a light shirt."
      },
      {
        ...base,
        id: "i-2",
        hostId: "u-priya",
        memberIds: ["u-priya", "u-omar"],
        sportId: "bouldering",
        location: loc("v-boulder"),
        start: at(5),
        end: at(7),
        capacity: 4,
        skill: "Beginner",
        vibe: "Casual",
        visibility: "open",
        gear: { available: true, description: "Chalk to share" },
        notes: "Happy to show newcomers the basics."
      },
      {
        ...base,
        id: "i-3",
        hostId: "u-tom",
        memberIds: ["u-tom"],
        sportId: "baseball",
        location: loc("v-cages"),
        start: at(26),
        end: at(27.5),
        capacity: 4,
        skill: "Beginner",
        vibe: "Casual",
        visibility: "friends",
        gear: { available: true, description: "One spare glove" },
        notes: "Friends warm-up session."
      },
      {
        ...base,
        id: "i-4",
        hostId: "u-lena",
        memberIds: ["u-lena", "u-sofia"],
        sportId: "running",
        location: loc("v-goose"),
        start: at(18),
        end: at(19),
        capacity: 6,
        skill: "All levels",
        vibe: "Casual",
        visibility: "open",
        gear: nogear,
        notes: "5 km easy pace, coffee after."
      },
      {
        ...base,
        id: "i-5",
        hostId: "u-dev",
        memberIds: ["u-dev"],
        sportId: "basketball",
        location: loc("v-vicwest"),
        start: at(8),
        end: at(9.5),
        capacity: 8,
        skill: "Intermediate",
        vibe: "Competitive",
        visibility: "open",
        gear: { available: true, description: "I bring a ball" },
        notes: ""
      },
      {
        ...base,
        id: "i-6",
        hostId: "u-maya",
        memberIds: ["u-maya", "u-chen"],
        sportId: "soccer",
        location: loc("v-beacon"),
        start: at(50),
        end: at(51.5),
        capacity: 12,
        skill: "Intermediate",
        vibe: "Competitive",
        visibility: "open",
        gear: nogear,
        notes: "Weekly informal team looking for new players. Everyone gets a tryout game.",
        recurring: true
      },
      // Full: must NOT appear on the map
      {
        ...base,
        id: "i-7",
        hostId: "u-sofia",
        memberIds: ["u-sofia", "u-omar", "u-dev", "u-lena"],
        sportId: "tennis",
        location: loc("v-windsor"),
        start: at(30),
        end: at(31.5),
        capacity: 4,
        skill: "Beginner",
        vibe: "Casual",
        visibility: "open",
        gear: nogear,
        notes: "Doubles."
      },
      {
        ...base,
        id: "i-8",
        hostId: "u-omar",
        memberIds: ["u-omar"],
        sportId: "cycling",
        location: loc("v-goose"),
        start: at(72),
        end: at(75),
        capacity: 6,
        skill: "Advanced",
        vibe: "Competitive",
        visibility: "open",
        gear: nogear,
        notes: "40 km ride, brisk pace."
      },
      {
        ...base,
        id: "i-9",
        hostId: "u-chen",
        memberIds: ["u-chen"],
        sportId: "soccer",
        location: loc("v-beacon"),
        start: at(96),
        end: at(97.5),
        capacity: 10,
        skill: "Beginner",
        vibe: "Casual",
        visibility: "open",
        gear: nogear,
        notes: "First timers welcome."
      },
      {
        ...base,
        id: "i-10",
        hostId: "u-sofia",
        memberIds: ["u-sofia", "u-dev"],
        sportId: "baseball",
        location: loc("v-cages"),
        start: at(28),
        end: at(29.5),
        capacity: 6,
        skill: "Beginner",
        vibe: "Casual",
        visibility: "open",
        gear: { available: true, description: "Gloves and a bat to share" },
        notes: "Learning together, no experience needed."
      },
      // Alex's own upcoming invite (demo user hosts)
      {
        ...base,
        id: "i-11",
        hostId: "u-demo",
        memberIds: ["u-demo", "u-maya", "u-chen"],
        sportId: "soccer",
        location: loc("v-beacon"),
        start: at(20),
        end: at(21.5),
        capacity: 8,
        skill: "Intermediate",
        vibe: "Casual",
        visibility: "open",
        gear: nogear,
        notes: ""
      },
      // Past invite (shows in Activity)
      {
        ...base,
        id: "i-12",
        hostId: "u-demo",
        memberIds: ["u-demo", "u-maya", "u-chen"],
        sportId: "soccer",
        location: loc("v-beacon"),
        start: at(-48),
        end: at(-46.5),
        capacity: 8,
        skill: "Intermediate",
        vibe: "Casual",
        visibility: "open",
        gear: nogear,
        notes: ""
      }
    ];
  }
  var areas = ["Downtown", "James Bay", "Fairfield", "Vic West", "Saanich", "Oak Bay", "Gordon Head"];
  var motivationOptions = [
    { id: "exercise", label: "Exercise", hint: "Stay active" },
    { id: "challenge", label: "Challenge", hint: "Push myself" },
    { id: "competition", label: "Competition", hint: "Play to win" },
    { id: "social", label: "Social", hint: "Meet people" },
    { id: "learn", label: "Learn", hint: "Try something new" }
  ];
  var sampleCalendar = [
    { day: 1, startHour: 9, endHour: 15, label: "Classes" },
    { day: 2, startHour: 12, endHour: 16, label: "Work" },
    { day: 3, startHour: 9, endHour: 15, label: "Classes" },
    { day: 4, startHour: 12, endHour: 16, label: "Work" },
    { day: 5, startHour: 9, endHour: 17, label: "Work" }
  ];

  // src/ts/state.ts
  var st;
  var counter = 1e3;
  var listeners = /* @__PURE__ */ new Set();
  var nid = (p) => `${p}-${++counter}`;
  var ok = (id) => ({ ok: true, id });
  var fail = (error2) => ({ ok: false, error: error2 });
  var MIN_CAPACITY = 2;
  var MAX_CAPACITY = 30;
  function initState(now = Date.now()) {
    st = { currentUserId: null, users: seedUsers(), invites: seedInvites(now), notifications: [], activity: [] };
    notify("u-demo", "i-11", "Maya joined your Soccer meetup", now - 2 * 36e5);
    notify("u-demo", "i-11", "Chen joined your Soccer meetup", now - 1 * 36e5);
    log("u-demo", "You hosted Soccer at Beacon Hill Park Fields", now - 48 * 36e5, "i-12");
    emit();
  }
  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }
  function emit() {
    listeners.forEach((fn) => fn());
  }
  function notify(userId, inviteId, text, createdAt = Date.now()) {
    st.notifications.unshift({ id: nid("n"), userId, inviteId, text, createdAt, read: false });
  }
  function log(userId, text, at = Date.now(), inviteId = null) {
    st.activity.unshift({ id: nid("a"), userId, text, at, inviteId });
  }
  var getUser = (id) => st.users[id];
  var currentUser = () => st.currentUserId ? st.users[st.currentUserId] ?? null : null;
  var getInvite = (id) => st.invites.find((i) => i.id === id);
  var getSport = (id) => sports.find((s) => s.id === id);
  var getVenue = (id) => venues.find((v) => v.id === id);
  var isFull = (inv) => inv.memberIds.length >= inv.capacity;
  var isPast = (inv, now = Date.now()) => inv.end < now;
  var spotsLeft = (inv) => inv.capacity - inv.memberIds.length;
  var tagsLocked = (inv) => inv.memberIds.length > 1;
  function canSee(inv, userId) {
    if (inv.memberIds.includes(userId)) return true;
    if (inv.visibility === "open") return true;
    const host = st.users[inv.hostId];
    return !!host && host.friendIds.includes(userId);
  }
  function mapInvites(userId, now = Date.now()) {
    return st.invites.filter((i) => !isPast(i, now) && !isFull(i) && canSee(i, userId));
  }
  function myUpcoming(userId, now = Date.now()) {
    return st.invites.filter((i) => i.memberIds.includes(userId) && !isPast(i, now)).sort((a, b) => a.start - b.start);
  }
  function myPast(userId, now = Date.now()) {
    return st.invites.filter((i) => i.memberIds.includes(userId) && isPast(i, now)).sort((a, b) => b.start - a.start);
  }
  var notificationsFor = (userId) => st.notifications.filter((n) => n.userId === userId);
  var unreadCount = (userId, inviteId) => st.notifications.filter((n) => n.userId === userId && !n.read && (inviteId === void 0 || n.inviteId === inviteId)).length;
  var activityFor = (userId) => st.activity.filter((a) => a.userId === userId);
  function canAddFriend(otherId) {
    const me = currentUser();
    if (!me || me.id === otherId || me.friendIds.includes(otherId)) return false;
    return st.invites.some((i) => i.memberIds.includes(me.id) && i.memberIds.includes(otherId));
  }
  function loginDemo() {
    st.currentUserId = "u-demo";
    emit();
  }
  function logout() {
    st.currentUserId = null;
    emit();
  }
  function completeOnboarding(profile) {
    if (!profile.name.trim()) return fail("Please enter a name.");
    if (!profile.area.trim()) return fail("Please choose where you are located.");
    if (profile.motivations.length === 0) return fail("Pick at least one motivation.");
    const id = nid("u");
    const colors = ["#e07a5f", "#3d85c6", "#81b29a", "#9b72cf", "#4aa3a2"];
    st.users[id] = { ...profile, id, avatarColor: colors[counter % colors.length], friendIds: [] };
    st.currentUserId = id;
    emit();
    return ok(id);
  }
  function updateProfile(patch) {
    const me = currentUser();
    if (!me) return fail("Not signed in.");
    Object.assign(me, patch);
    emit();
    return ok();
  }
  function createInvite(input, now = Date.now()) {
    const me = currentUser();
    if (!me) return fail("Not signed in.");
    if (!getSport(input.sportId)) return fail("Choose a sport.");
    if (!input.location || !input.location.label) return fail("Choose a location.");
    if (!Number.isInteger(input.capacity) || input.capacity < MIN_CAPACITY) return fail(`Capacity must be at least ${MIN_CAPACITY} (including you).`);
    if (input.capacity > MAX_CAPACITY) return fail(`Capacity can be at most ${MAX_CAPACITY}.`);
    if (!(input.start > now)) return fail("Start time must be in the future.");
    if (!(input.end > input.start)) return fail("End time must be after the start time.");
    if (input.gear.available && !input.gear.description.trim()) return fail("Describe the gear you can share, or untick the box.");
    const inv = { ...input, id: nid("i"), hostId: me.id, memberIds: [me.id] };
    st.invites.push(inv);
    log(me.id, `You created a ${getSport(inv.sportId).name} invite at ${inv.location.label}`, now, inv.id);
    emit();
    return ok(inv.id);
  }
  function acceptInvite(inviteId, now = Date.now()) {
    const me = currentUser();
    const inv = getInvite(inviteId);
    if (!me) return fail("Not signed in.");
    if (!inv) return fail("This invite no longer exists.");
    if (isPast(inv, now)) return fail("This invite has already happened.");
    if (inv.memberIds.includes(me.id)) return fail("You already joined this invite.");
    if (!canSee(inv, me.id)) return fail("This invite is for the host's friends only.");
    if (isFull(inv)) return fail("This invite is full.");
    inv.memberIds.push(me.id);
    const sport = getSport(inv.sportId).name;
    inv.memberIds.filter((id) => id !== me.id).forEach((id) => notify(id, inv.id, `${me.name} joined your ${sport} meetup`, now));
    if (isFull(inv)) inv.memberIds.forEach((id) => notify(id, inv.id, `Your ${sport} meetup is now full`, now));
    log(me.id, `You joined ${sport} at ${inv.location.label}`, now, inv.id);
    emit();
    return ok(inv.id);
  }
  function leaveInvite(inviteId, now = Date.now()) {
    const me = currentUser();
    const inv = getInvite(inviteId);
    if (!me || !inv) return fail("Invite not found.");
    if (!inv.memberIds.includes(me.id)) return fail("You are not in this invite.");
    const sport = getSport(inv.sportId).name;
    const wasHost = inv.hostId === me.id;
    inv.memberIds = inv.memberIds.filter((id) => id !== me.id);
    log(me.id, `You left ${sport} at ${inv.location.label}`, now, inv.id);
    if (inv.memberIds.length === 0) {
      st.invites = st.invites.filter((i) => i.id !== inv.id);
    } else {
      if (wasHost) {
        inv.hostId = inv.memberIds[0];
        notify(inv.hostId, inv.id, `${me.name} left. You are now the host of ${sport}`, now);
      }
      inv.memberIds.filter((id) => id !== inv.hostId || !wasHost).forEach((id) => notify(id, inv.id, `${me.name} left your ${sport} meetup`, now));
    }
    emit();
    return ok();
  }
  function editInviteTags(inviteId, edit) {
    const me = currentUser();
    const inv = getInvite(inviteId);
    if (!me || !inv) return fail("Invite not found.");
    if (inv.hostId !== me.id) return fail("Only the host can edit this invite.");
    if (tagsLocked(inv)) return fail("Tags are locked once someone has joined.");
    Object.assign(inv, edit);
    emit();
    return ok();
  }
  function addFriend(otherId) {
    const me = currentUser();
    const other = getUser(otherId);
    if (!me || !other) return fail("User not found.");
    if (!canAddFriend(otherId)) return fail("You can add people you have shared a meetup with.");
    me.friendIds.push(otherId);
    other.friendIds.push(me.id);
    notify(otherId, null, `${me.name} added you as a friend`);
    log(me.id, `You added ${other.name} as a friend`);
    emit();
    return ok();
  }
  function markInviteRead(inviteId) {
    const me = currentUser();
    if (!me) return;
    st.notifications.forEach((n) => {
      if (n.userId === me.id && n.inviteId === inviteId) n.read = true;
    });
    emit();
  }
  initState();

  // src/ts/components/mapWidget.ts
  var SVG = `<svg class="map__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
  <rect class="map__water" width="100" height="100"/>
  <path class="map__land" d="M6 20 C10 8,30 6,48 10 C70 6,90 10,96 24 L97 70 C94 84,80 92,60 94 C40 96,20 92,10 82 C4 70,8 40,6 20 Z"/>
  <path class="map__water" d="M56 95 C57 82,60 74,58 64 L63 64 C65 74,63 84,66 95 Z"/>
  <ellipse class="map__park" cx="42" cy="80" rx="12" ry="8"/>
  <ellipse class="map__park" cx="80" cy="28" rx="9" ry="7"/>
  <ellipse class="map__park" cx="88" cy="62" rx="6" ry="5"/>
  <ellipse class="map__park" cx="28" cy="38" rx="6" ry="5"/>
  <path class="map__road" d="M8 45 C30 40,50 58,96 44"/>
  <path class="map__road" d="M45 12 C46 40,40 60,44 94"/>
  <path class="map__road" d="M12 70 C40 66,70 74,95 66"/>
  <path class="map__road" d="M70 10 C72 30,82 45,90 80"/>
</svg>`;
  var AREAS = [
    { n: "Gordon Head", x: 78, y: 16 },
    { n: "Saanich", x: 24, y: 24 },
    { n: "Vic West", x: 18, y: 54 },
    { n: "Downtown", x: 50, y: 42 },
    { n: "Oak Bay", x: 86, y: 74 },
    { n: "James Bay", x: 30, y: 88 }
  ];
  function mapWidget(o) {
    const el = h("div", { class: `map ${o.onPick ? "map--pick" : ""} ${o.className ?? ""}`.trim() });
    el.innerHTML = SVG;
    AREAS.forEach((a) => el.append(h("span", { class: "map__area", style: `left:${a.x}%;top:${a.y}%` }, a.n)));
    for (const p of o.pins) {
      const selected = p.id === o.selectedId;
      el.append(h("button", {
        type: "button",
        class: ["pin", p.variant ? `pin--${p.variant}` : "", selected ? "pin--selected" : ""].join(" ").trim(),
        style: `left:${p.x}%;top:${p.y}%`,
        "aria-label": p.label,
        "aria-pressed": selected,
        title: p.label,
        dataset: { key: `pin-${p.id}`, pin: p.id },
        onClick: (e) => {
          e.stopPropagation();
          o.onSelect?.(p.id);
        }
      }, p.glyph ?? ""));
    }
    if (o.onPick) {
      el.addEventListener("click", (e) => {
        if (e.target.closest(".pin")) return;
        const r = el.getBoundingClientRect();
        o.onPick(Math.round((e.clientX - r.left) / r.width * 1e3) / 10, Math.round((e.clientY - r.top) / r.height * 1e3) / 10);
      });
    }
    if (o.hint) el.append(h("div", { class: "map__hint" }, o.hint));
    if (o.legend) el.append(h("div", { class: "map__legend" }, h("span", {}, "Open to everyone"), h("span", { class: "is-friends" }, "Friends only"), h("span", { class: "is-match" }, "Matches you")));
    return el;
  }

  // src/ts/components/seg.ts
  function seg(key, options, current, onPick, locked = false) {
    return h(
      "div",
      { class: `seg ${locked ? "seg--locked" : ""}`.trim(), role: "group" },
      options.map((o) => h("button", {
        type: "button",
        "aria-pressed": o.value === current,
        disabled: locked,
        dataset: { key: `${key}-${o.value}` },
        onClick: () => onPick(o.value)
      }, o.label))
    );
  }

  // src/ts/views/create.ts
  var form = null;
  var formUser = "";
  var error = "";
  var pad = (n) => String(n).padStart(2, "0");
  var dateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  var timeStr = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  function defaults() {
    const me = currentUser();
    const t = new Date(Date.now() + 2 * 36e5);
    t.setMinutes(0, 0, 0);
    const e = new Date(t.getTime() + 90 * 6e4);
    const sportId = me.currentSports[0]?.sportId ?? me.desiredSports[0] ?? sports[0].id;
    return {
      sportId,
      location: null,
      spotName: "",
      date: dateStr(t),
      start: timeStr(t),
      end: dateStr(e) === dateStr(t) ? timeStr(e) : "23:59",
      capacity: 4,
      skill: me.currentSports.find((s) => s.sportId === sportId)?.skill ?? "Beginner",
      vibe: "Casual",
      visibility: "open",
      gearOn: false,
      gearText: "",
      notes: "",
      recurring: false
    };
  }
  function ensureForm() {
    const me = currentUser();
    if (!form || formUser !== me.id) {
      form = defaults();
      formUser = me.id;
      error = "";
    }
    return form;
  }
  function presetSport(sportId) {
    ensureForm().sportId = sportId;
  }
  function render() {
    const f = ensureForm();
    const root = h("div", {});
    function submit() {
      if (!f.date || !f.start || !f.end) {
        error = "Choose a date, a start time and an end time.";
        return draw(true);
      }
      const res = createInvite({
        sportId: f.sportId,
        location: f.location,
        start: (/* @__PURE__ */ new Date(`${f.date}T${f.start}`)).getTime(),
        end: (/* @__PURE__ */ new Date(`${f.date}T${f.end}`)).getTime(),
        capacity: f.capacity,
        skill: f.skill,
        vibe: f.vibe,
        visibility: f.visibility,
        gear: { available: f.gearOn, description: f.gearText.trim() },
        notes: f.notes.trim(),
        recurring: f.recurring
      });
      if (!res.ok) {
        error = res.error;
        return draw(true);
      }
      form = null;
      error = "";
      toast("Invite created. It is now on the map.");
      go(`#/map/${res.id}`);
    }
    function where() {
      const sorted = [...venues].sort((a, b) => Number(b.sportIds.includes(f.sportId)) - Number(a.sportIds.includes(f.sportId)));
      const venue = f.location?.venueId ? getVenue(f.location.venueId) : void 0;
      const pins = venues.map((v) => ({ id: `v:${v.id}`, x: v.x, y: v.y, label: v.name, variant: "venue" }));
      if (f.location && !f.location.venueId) pins.push({ id: "draft", x: f.location.x, y: f.location.y, label: "Your pin", variant: "draft" });
      return h(
        "section",
        { class: "card sticky-col", "aria-labelledby": "where-h" },
        h("h2", { id: "where-h" }, "Where"),
        h("div", { class: "venue-list" }, sorted.map((v) => h("button", {
          type: "button",
          class: "venue-option",
          "aria-pressed": f.location?.venueId === v.id,
          dataset: { key: `venue-${v.id}` },
          onClick: () => {
            f.location = { label: v.name, x: v.x, y: v.y, venueId: v.id };
            draw();
          }
        }, h("strong", {}, v.name), h("small", {}, `${v.area}${v.sportIds.includes(f.sportId) ? ", good for " + getSport(f.sportId).name : ""}`)))),
        mapWidget({
          className: "create-map",
          pins,
          selectedId: f.location?.venueId ? `v:${f.location.venueId}` : f.location ? "draft" : null,
          hint: "Pick a venue, or click the map to drop your own pin",
          onSelect: (id) => {
            const v = getVenue(id.replace("v:", ""));
            if (v) {
              f.location = { label: v.name, x: v.x, y: v.y, venueId: v.id };
              draw();
            }
          },
          onPick: (x, y) => {
            f.location = { label: f.spotName.trim() || "Custom pin", x, y };
            draw();
          }
        }),
        f.location && !f.location.venueId ? h(
          "label",
          { class: "field" },
          h("span", { class: "field__label" }, "Name this spot (optional)"),
          h("input", {
            class: "input",
            type: "text",
            value: f.spotName,
            placeholder: "e.g. Field behind the library",
            dataset: { key: "spot" },
            onInput: (e) => {
              f.spotName = e.target.value;
              f.location.label = f.spotName.trim() || "Custom pin";
            }
          })
        ) : null,
        venue ? h(
          "div",
          { class: "venue-card" },
          h("h4", {}, venue.name),
          h("dl", {}, h("dt", {}, "Hours"), h("dd", {}, venue.hours), h("dt", {}, "Rentals"), h("dd", {}, venue.rentals.length ? venue.rentals.join(", ") : "None on site")),
          h("p", { class: "card__meta" }, venue.info)
        ) : null,
        !f.location ? h("p", { class: "field__hint" }, "Required. Choose where people should meet.") : null
      );
    }
    function draw(scrollToError = false) {
      keepFocus(() => {
        root.replaceChildren();
        append(root, [
          h("div", { class: "page-head" }, h("div", {}, h("h1", {}, "Create an invite"), h("p", {}, "Choose a sport, a place and a time. People nearby can join straight away."))),
          error ? h("p", { class: "notice notice--error form-error", role: "alert", id: "form-error" }, error) : null,
          h(
            "div",
            { class: "cols" },
            h(
              "div",
              { class: "create-form" },
              h(
                "section",
                { class: "card" },
                h("h2", {}, "What and when"),
                h(
                  "label",
                  { class: "field" },
                  h("span", { class: "field__label" }, "Sport"),
                  h(
                    "select",
                    { class: "select", value: f.sportId, dataset: { key: "sport" }, onChange: (e) => {
                      f.sportId = e.target.value;
                      draw();
                    } },
                    sports.map((s) => h("option", { value: s.id }, s.name))
                  ),
                  h("a", { href: `#/sport/${f.sportId}`, class: "field__hint" }, `Gear and how to start ${getSport(f.sportId).name}`)
                ),
                h(
                  "div",
                  { class: "field-row" },
                  h("label", { class: "field" }, h("span", { class: "field__label" }, "Date"), h("input", { class: "input", type: "date", value: f.date, min: dateStr(/* @__PURE__ */ new Date()), dataset: { key: "date" }, onChange: (e) => {
                    f.date = e.target.value;
                  } })),
                  h("label", { class: "field" }, h("span", { class: "field__label" }, "Starts"), h("input", { class: "input", type: "time", value: f.start, dataset: { key: "start" }, onChange: (e) => {
                    f.start = e.target.value;
                  } })),
                  h("label", { class: "field" }, h("span", { class: "field__label" }, "Ends"), h("input", { class: "input", type: "time", value: f.end, dataset: { key: "end" }, onChange: (e) => {
                    f.end = e.target.value;
                  } }))
                )
              ),
              h(
                "section",
                { class: "card" },
                h("h2", {}, "Who can join"),
                h(
                  "div",
                  { class: "field" },
                  h("span", { class: "field__label" }, "How many people, including you"),
                  h(
                    "div",
                    { class: "stepper-row" },
                    h("button", { class: "btn btn--secondary", type: "button", "aria-label": "Fewer people", disabled: f.capacity <= MIN_CAPACITY, dataset: { key: "cap-" }, onClick: () => {
                      f.capacity--;
                      draw();
                    } }, "\u2212"),
                    h("output", { "aria-live": "polite" }, String(f.capacity)),
                    h("button", { class: "btn btn--secondary", type: "button", "aria-label": "More people", disabled: f.capacity >= MAX_CAPACITY, dataset: { key: "cap+" }, onClick: () => {
                      f.capacity++;
                      draw();
                    } }, "+")
                  )
                ),
                h(
                  "div",
                  { class: "field" },
                  h("span", { class: "field__label" }, "Skill level"),
                  seg("skill", ["Beginner", "Intermediate", "Advanced", "All levels"].map((v) => ({ value: v, label: v })), f.skill, (v) => {
                    f.skill = v;
                    draw();
                  })
                ),
                h(
                  "div",
                  { class: "field" },
                  h("span", { class: "field__label" }, "Vibe"),
                  seg("vibe", [{ value: "Casual", label: "Casual" }, { value: "Competitive", label: "Competitive" }], f.vibe, (v) => {
                    f.vibe = v;
                    draw();
                  })
                ),
                h(
                  "div",
                  { class: "field" },
                  h("span", { class: "field__label" }, "Who can see it"),
                  seg("vis", [{ value: "open", label: "Open to everyone" }, { value: "friends", label: "Friends only" }], f.visibility, (v) => {
                    f.visibility = v;
                    draw();
                  }),
                  h("span", { class: "field__hint" }, f.visibility === "friends" ? "Only your friends will see this on the map." : "Anyone nearby can see it on the map.")
                ),
                h(
                  "label",
                  { class: "check" },
                  h("input", { type: "checkbox", checked: f.recurring, dataset: { key: "rec" }, onChange: (e) => {
                    f.recurring = e.target.checked;
                  } }),
                  h("span", { class: "check__text" }, "Repeat every week", h("small", {}, "Good for an informal team or regular group."))
                )
              ),
              h(
                "section",
                { class: "card" },
                h("h2", {}, "Extras"),
                h(
                  "label",
                  { class: "check" },
                  h("input", { type: "checkbox", checked: f.gearOn, dataset: { key: "gear" }, onChange: (e) => {
                    f.gearOn = e.target.checked;
                    draw();
                  } }),
                  h("span", { class: "check__text" }, "I have gear to share", h("small", {}, "Helps newcomers who do not own any yet."))
                ),
                f.gearOn ? h("div", { class: "gear-fields" }, h(
                  "label",
                  { class: "field" },
                  h("span", { class: "field__label" }, "What can you share?"),
                  h("input", { class: "input", type: "text", value: f.gearText, placeholder: "e.g. One spare glove and a bat", dataset: { key: "geartext" }, onInput: (e) => {
                    f.gearText = e.target.value;
                  } })
                )) : null,
                h(
                  "label",
                  { class: "field" },
                  h("span", { class: "field__label" }, "Notes (optional)"),
                  h("textarea", { class: "textarea", value: f.notes, placeholder: "Anything people should know before they come", dataset: { key: "notes" }, onInput: (e) => {
                    f.notes = e.target.value;
                  } })
                )
              ),
              h(
                "div",
                { class: "create-form__actions" },
                h("button", { class: "btn btn--primary", type: "button", onClick: submit }, "Create invite"),
                h("a", { class: "btn btn--secondary", href: "#/home" }, "Cancel")
              )
            ),
            where()
          )
        ]);
      });
      if (scrollToError) document.getElementById("form-error")?.scrollIntoView({ block: "center" });
    }
    draw();
    return root;
  }

  // src/ts/match.ts
  var DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var dayPart = (hour) => hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  function busyConflict(inv, calendar) {
    const s = new Date(inv.start), e = new Date(inv.end);
    const from = s.getHours() + s.getMinutes() / 60;
    const to = e.toDateString() === s.toDateString() ? e.getHours() + e.getMinutes() / 60 : 24;
    return calendar.find((b) => b.day === s.getDay() && b.startHour < to && b.endHour > from) ?? null;
  }
  function matchInvite(inv, user) {
    const keys = /* @__PURE__ */ new Set();
    const sport = getSport(inv.sportId);
    const current = user.currentSports.find((s) => s.sportId === inv.sportId);
    const wanted = user.desiredSports.includes(inv.sportId);
    if (!sport || !current && !wanted) return { score: 0, keys, why: "" };
    let score = 0;
    const bits = [];
    keys.add("sport");
    score += current ? 4 : 3;
    bits.push(current ? `you play ${sport.name}` : `${sport.name} is on your want-to-try list`);
    if (inv.skill === "All levels") {
      keys.add("skill");
      score += 2;
      bits.push("all levels are welcome");
    } else if (current && current.skill === inv.skill) {
      keys.add("skill");
      score += 3;
      bits.push(`${inv.skill} level, like you`);
    } else if (!current && inv.skill === "Beginner") {
      keys.add("skill");
      score += 3;
      bits.push("beginner friendly");
    }
    if (user.calendar) {
      const conflict = busyConflict(inv, user.calendar);
      if (conflict) score -= 3;
      else {
        keys.add("schedule");
        score += 2;
        const d = new Date(inv.start);
        bits.push(`you're free ${DAYS[d.getDay()]} ${dayPart(d.getHours())}`);
      }
    }
    const friends = inv.memberIds.filter((id) => user.friendIds.includes(id)).map((id) => getUser(id).name);
    if (friends.length) {
      keys.add("friends");
      score += 2;
      bits.push(friends.length === 1 ? `${friends[0]} is going` : `${friends[0]} and ${friends.length - 1} more friend${friends.length > 2 ? "s are" : " is"} going`);
    }
    const wantsCompete = user.motivations.some((m) => m === "competition" || m === "challenge");
    const wantsSocial = user.motivations.some((m) => m === "social" || m === "learn");
    if (inv.vibe === "Competitive" && wantsCompete || inv.vibe === "Casual" && wantsSocial) {
      keys.add("vibe");
      score += 1;
    }
    if (inv.gear.available && wanted && !current) {
      keys.add("gear");
      score += 1;
      bits.push("gear is shared, so you can start without your own");
    }
    const venue = inv.location.venueId ? getVenue(inv.location.venueId) : void 0;
    if (venue && venue.area === user.area) {
      keys.add("area");
      score += 1;
      bits.push(`it's in ${user.area}`);
    }
    const sentence = bits.length > 1 ? `${bits.slice(0, -1).join(", ")}, and ${bits[bits.length - 1]}` : bits[0];
    return { score, keys, why: sentence.charAt(0).toUpperCase() + sentence.slice(1) + "." };
  }
  function recommend(user, limit = 6) {
    return mapInvites(user.id).filter((i) => !i.memberIds.includes(user.id)).map((invite) => ({ invite, match: matchInvite(invite, user) })).filter((r) => r.match.score > 0).sort((a, b) => b.match.score - a.match.score || a.invite.start - b.invite.start).slice(0, limit);
  }

  // src/ts/components/inviteCard.ts
  function inviteTags(inv, user, m = matchInvite(inv, user)) {
    const sport = getSport(inv.sportId);
    const hl = (k, extra = "") => `${m.keys.has(k) ? "tag--match" : ""} ${extra}`.trim();
    return h(
      "div",
      { class: "tags" },
      tag(sport.name, hl("sport")),
      tag(inv.skill, hl("skill")),
      tag(inv.vibe, hl("vibe")),
      m.keys.has("schedule") ? tag("Fits your schedule", "tag--match") : null,
      inv.gear.available ? tag("Gear shared", hl("gear", "tag--gear")) : null,
      inv.visibility === "friends" ? tag("Friends only", "tag--friends") : null,
      inv.recurring ? tag("Weekly") : null,
      isFull(inv) ? tag("Full", "tag--full") : null
    );
  }
  function inviteCard(inv, user, o) {
    const sport = getSport(inv.sportId);
    const host = getUser(inv.hostId);
    const m = matchInvite(inv, user);
    const members = inv.memberIds.map((id) => getUser(id));
    return h(
      "article",
      { class: `card rec-card ${o.selected ? "card--selected" : ""}`.trim(), dataset: { invite: inv.id } },
      h(
        "div",
        { class: "rec-card__top" },
        h(
          "div",
          {},
          h("h3", { class: "card__title" }, sport.name),
          h("p", { class: "rec-card__when" }, fmtWhen(inv.start, inv.end)),
          h("p", { class: "card__meta" }, `${inv.location.label}, hosted by ${host.name}`)
        ),
        h("div", { class: "avatar-stack" }, members.slice(0, 4).map((u) => avatar(u, "sm")))
      ),
      inviteTags(inv, user, m),
      o.showWhy && m.why ? h("p", { class: "card__why" }, m.why) : null,
      h(
        "div",
        { class: "rec-card__foot" },
        h("span", { class: "rec-card__spots" }, isFull(inv) ? "Full" : `${inv.memberIds.length} of ${inv.capacity} going, ${spotsLeft(inv)} spot${spotsLeft(inv) === 1 ? "" : "s"} left`),
        h(
          "div",
          { class: "row" },
          o.onShowMap ? h("button", { class: "btn btn--secondary btn--sm", type: "button", onClick: o.onShowMap }, "Show on map") : null,
          h("button", { class: "btn btn--primary btn--sm", type: "button", onClick: o.onOpen }, "View details")
        )
      )
    );
  }

  // src/ts/views/inviteDetail.ts
  function openInvite(id) {
    const me = currentUser();
    if (me && unreadCount(me.id, id) > 0) markInviteRead(id);
    openModal(() => view(id));
  }
  function view(id) {
    const inv = getInvite(id);
    const me = currentUser();
    if (!inv || !me) return null;
    const sport = getSport(inv.sportId);
    const isMember = inv.memberIds.includes(me.id);
    const isHost = inv.hostId === me.id;
    const past = isPast(inv);
    const editable = isHost && !tagsLocked(inv) && !past;
    const venue = inv.location.venueId ? getVenue(inv.location.venueId) : void 0;
    const m = matchInvite(inv, me);
    const run = (r, success) => {
      if (!r.ok) toast(r.error ?? "Something went wrong.");
      else if (success) toast(success);
    };
    const skillOpts = ["Beginner", "Intermediate", "Advanced", "All levels"].map((v) => ({ value: v, label: v }));
    const tagsBlock = editable ? h(
      "div",
      { class: "stack-sm" },
      h("p", { class: "locked-note" }, "You can change these until someone joins."),
      seg("edit-skill", skillOpts, inv.skill, (v) => run(editInviteTags(inv.id, { skill: v }))),
      seg("edit-vibe", [{ value: "Casual", label: "Casual" }, { value: "Competitive", label: "Competitive" }], inv.vibe, (v) => run(editInviteTags(inv.id, { vibe: v }))),
      seg("edit-vis", [{ value: "open", label: "Open to everyone" }, { value: "friends", label: "Friends only" }], inv.visibility, (v) => run(editInviteTags(inv.id, { visibility: v })))
    ) : h("div", { class: "stack-sm" }, inviteTags(inv, me, m), isHost && tagsLocked(inv) && !past ? h("p", { class: "locked-note" }, "Tags are locked because someone has joined.") : null);
    const place = venue ? h(
      "div",
      { class: "venue-card" },
      h("h4", {}, venue.name),
      h(
        "dl",
        {},
        h("dt", {}, "Area"),
        h("dd", {}, venue.area),
        h("dt", {}, "Hours"),
        h("dd", {}, venue.hours),
        h("dt", {}, "Rentals"),
        h("dd", {}, venue.rentals.length ? venue.rentals.join(", ") : "None on site")
      ),
      h("p", { class: "card__meta" }, venue.info)
    ) : h("div", { class: "venue-card" }, h("h4", {}, inv.location.label), h("p", { class: "card__meta" }, "A custom pin. No venue details are available for it."));
    const people = inv.memberIds.map((uid) => {
      const u = getUser(uid);
      const level = u.currentSports.find((s) => s.sportId === inv.sportId)?.skill;
      return h(
        "li",
        { class: "attendee" },
        avatar(u),
        h(
          "div",
          { class: "grow" },
          h("div", { class: "attendee__name" }, uid === me.id ? `${u.name} (you)` : u.name),
          h("div", { class: "attendee__role" }, [uid === inv.hostId ? "Host" : "Going", level ? level : null].filter(Boolean).join(", "))
        ),
        canAddFriend(uid) ? h("button", { class: "btn btn--secondary btn--sm", type: "button", onClick: () => run(addFriend(uid), `${u.name} is now your friend.`) }, "Add friend") : me.friendIds.includes(uid) ? tag("Friend", "tag--friends") : null
      );
    });
    let actions;
    if (past) actions = h("p", { class: "notice" }, "This meetup has already happened.");
    else if (isMember) {
      const cancel = isHost && inv.memberIds.length === 1;
      actions = h("div", { class: "detail__actions" }, h("button", {
        class: "btn btn--danger",
        type: "button",
        onClick: () => {
          run(leaveInvite(inv.id), cancel ? "Invite cancelled." : "You left the meetup.");
          closeModal();
        }
      }, cancel ? "Cancel invite" : "Leave meetup"));
    } else {
      const blocked = isFull(inv) || !canSee(inv, me.id);
      actions = h("div", { class: "detail__actions" }, h("button", {
        class: "btn btn--primary",
        type: "button",
        disabled: blocked,
        dataset: { key: "join" },
        onClick: () => run(acceptInvite(inv.id), "You are in. The host and other members have been told.")
      }, isFull(inv) ? "This meetup is full" : "Join this meetup"));
    }
    return h(
      "div",
      { class: "detail" },
      h("div", { class: "detail__head" }, h(
        "div",
        { class: "grow" },
        h("h2", {}, sport.name),
        h("p", { class: "detail__when" }, fmtWhen(inv.start, inv.end)),
        h("p", { class: "card__meta" }, inv.recurring ? "Repeats weekly" : "One time")
      )),
      tagsBlock,
      !isMember && m.why ? h("p", { class: "card__why" }, `Why this fits you: ${m.why}`) : null,
      h("section", {}, h("h3", {}, "Where"), place),
      inv.gear.available ? h("div", { class: "gear-box" }, `Gear to share: ${inv.gear.description}`) : null,
      inv.notes ? h("section", {}, h("h3", {}, "Notes from the host"), h("p", {}, inv.notes)) : null,
      h(
        "section",
        {},
        h("h3", {}, `Who is going (${inv.memberIds.length} of ${inv.capacity})`),
        h("p", { class: "card__meta" }, isFull(inv) ? "Full" : `${spotsLeft(inv)} spot${spotsLeft(inv) === 1 ? "" : "s"} left`),
        h("ul", { class: "attendee-list" }, people)
      ),
      h("a", { href: `#/sport/${sport.id}`, onClick: () => closeModal() }, `New to ${sport.name}? See gear and how to start`),
      actions
    );
  }

  // src/ts/views/home.ts
  function render2() {
    const me = currentUser();
    const hour = (/* @__PURE__ */ new Date()).getHours();
    const part = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
    const recs = recommend(me, 5);
    const nearby = mapInvites(me.id);
    const activity = activityFor(me.id).slice(0, 5);
    const pins = nearby.map((i) => ({
      id: i.id,
      x: i.location.x,
      y: i.location.y,
      glyph: getSport(i.sportId).name.charAt(0),
      label: `${getSport(i.sportId).name} at ${i.location.label}`,
      variant: matchInvite(i, me).keys.has("sport") ? "match" : i.visibility === "friends" ? "friends" : void 0
    }));
    return h(
      "div",
      {},
      h("div", { class: "greeting" }, h("h1", {}, `Good ${part}, ${firstName(me.name)}`), h("p", {}, "Games happening around Victoria that fit what you told us.")),
      h(
        "div",
        { class: "cols" },
        h(
          "section",
          { "aria-labelledby": "rec-h" },
          h("div", { class: "section-head" }, h("h2", { id: "rec-h" }, "Suggested for you")),
          recs.length ? h("div", { class: "rec-list" }, recs.map((r) => inviteCard(r.invite, me, {
            showWhy: true,
            onOpen: () => openInvite(r.invite.id),
            onShowMap: () => go(`#/map/${r.invite.id}`)
          }))) : h(
            "div",
            { class: "empty" },
            h("h3", {}, "No matching games yet"),
            h("p", {}, "Nobody has posted a game for your sports. Start one and others will find it."),
            h("a", { class: "btn btn--primary", href: "#/create" }, "Create an invite")
          )
        ),
        h(
          "div",
          { class: "stack" },
          h(
            "section",
            { "aria-labelledby": "near-h" },
            h("div", { class: "section-head" }, h("h2", { id: "near-h" }, "Invites nearby"), h("a", { href: "#/map" }, "Open full map")),
            h("div", { class: "mini-map" }, mapWidget({ pins, legend: false, onSelect: (id) => go(`#/map/${id}`) }))
          ),
          h(
            "section",
            { "aria-labelledby": "act-h" },
            h("div", { class: "section-head" }, h("h2", { id: "act-h" }, "Recent activity")),
            activity.length ? h("ul", { class: "card activity-list" }, activity.map((a) => h("li", {}, h("span", {}, a.text), h("time", {}, fmtAgo(a.at))))) : h("div", { class: "empty" }, "Nothing yet. Join an invite and it will show up here.")
          )
        )
      )
    );
  }

  // src/ts/views/map.ts
  var filters = { sport: "all", time: "any", gear: "any" };
  var DAY = 864e5;
  function passesTime(inv) {
    const start = /* @__PURE__ */ new Date();
    start.setHours(0, 0, 0, 0);
    const days = Math.floor((inv.start - start.getTime()) / DAY);
    if (filters.time === "today") return days === 0;
    if (filters.time === "tomorrow") return days === 1;
    if (filters.time === "week") return days >= 0 && days < 7;
    return true;
  }
  function render3(args) {
    const me = currentUser();
    let selected = args[0] ?? null;
    const root = h("div", {});
    function select(label, key, opts) {
      return h(
        "label",
        { class: "field" },
        h("span", { class: "sr-only" }, label),
        h(
          "select",
          {
            class: "select",
            value: filters[key],
            "aria-label": label,
            dataset: { key: `f-${key}` },
            onChange: (e) => {
              filters[key] = e.target.value;
              selected = null;
              draw();
            }
          },
          opts.map(([v, l]) => h("option", { value: v }, l))
        )
      );
    }
    function draw() {
      const list = mapInvites(me.id).filter((i) => (filters.sport === "all" || i.sportId === filters.sport) && passesTime(i) && (filters.gear === "any" || i.gear.available));
      if (selected && !list.some((i) => i.id === selected)) selected = null;
      const sel = list.find((i) => i.id === selected);
      const mapEl = mapWidget({
        legend: true,
        selectedId: selected,
        onSelect: (id) => {
          selected = selected === id ? null : id;
          draw();
        },
        pins: list.map((i) => ({
          id: i.id,
          x: i.location.x,
          y: i.location.y,
          glyph: getSport(i.sportId).name.charAt(0),
          label: `${getSport(i.sportId).name} at ${i.location.label}`,
          variant: matchInvite(i, me).keys.has("sport") ? "match" : i.visibility === "friends" ? "friends" : void 0
        }))
      });
      if (sel) {
        const side = sel.location.x > 60 ? "map-pop--left" : sel.location.x < 20 ? "map-pop--right" : sel.location.y < 30 ? "map-pop--below" : "";
        mapEl.append(h(
          "div",
          { class: `map-pop ${side}`.trim(), style: `left:${sel.location.x}%;top:${sel.location.y}%` },
          h("strong", {}, getSport(sel.sportId).name),
          h("span", { class: "card__meta" }, fmtWhen(sel.start, sel.end)),
          inviteTags(sel, me),
          h("button", { class: "btn btn--primary btn--sm", type: "button", onClick: () => openInvite(sel.id) }, "View details")
        ));
      }
      keepFocus(() => root.replaceChildren(
        h("div", { class: "page-head" }, h("div", {}, h("h1", {}, "Map"), h("p", {}, `${list.length} open invite${list.length === 1 ? "" : "s"}. Full meetups are hidden.`))),
        h(
          "div",
          { class: "map-filters" },
          select("Sport", "sport", [["all", "All sports"], ...sports.map((s) => [s.id, s.name])]),
          select("Time", "time", [["any", "Any time"], ["today", "Today"], ["tomorrow", "Tomorrow"], ["week", "Next 7 days"]]),
          select("Gear", "gear", [["any", "Gear: any"], ["shared", "Gear shared"]]),
          filters.sport !== "all" || filters.time !== "any" || filters.gear !== "any" ? h("button", { class: "btn btn--text", type: "button", onClick: () => {
            filters.sport = "all";
            filters.time = "any";
            filters.gear = "any";
            draw();
          } }, "Clear filters") : null
        ),
        h(
          "div",
          { class: "map-layout" },
          mapEl,
          h("div", { class: "map-side" }, list.length ? list.map((i) => inviteCard(i, me, { selected: i.id === selected, onOpen: () => openInvite(i.id), onShowMap: () => {
            selected = i.id;
            draw();
          } })) : h(
            "div",
            { class: "empty" },
            h("h3", {}, "No invites match"),
            h("p", {}, "Try another sport or time, or start the game yourself."),
            h("a", { class: "btn btn--primary", href: "#/create" }, "Create an invite")
          ))
        )
      ));
    }
    draw();
    return root;
  }

  // src/ts/components/profileFields.ts
  var SKILLS = ["Beginner", "Intermediate", "Advanced"];
  var blankDraft = () => ({ name: "", area: "", motivations: [], current: {}, desired: [], calendar: null });
  var draftFromUser = (u) => ({
    name: u.name,
    area: u.area,
    motivations: [...u.motivations],
    current: Object.fromEntries(u.currentSports.map((s) => [s.sportId, s.skill])),
    desired: [...u.desiredSports],
    calendar: u.calendar ? u.calendar.map((b) => ({ ...b })) : null
  });
  var draftToProfile = (d) => ({
    name: d.name.trim(),
    area: d.area,
    motivations: d.motivations,
    currentSports: Object.entries(d.current).map(([sportId, skill]) => ({ sportId, skill })),
    desiredSports: d.desired.filter((id) => !(id in d.current)),
    calendar: d.calendar
  });
  function identityFields(d) {
    return h(
      "div",
      { class: "stack" },
      h(
        "label",
        { class: "field" },
        h("span", { class: "field__label" }, "Your name"),
        h("input", { class: "input", type: "text", value: d.name, autocomplete: "given-name", dataset: { key: "name" }, onInput: (e) => {
          d.name = e.target.value;
        } })
      ),
      h(
        "label",
        { class: "field" },
        h("span", { class: "field__label" }, "Where do you usually play?"),
        h(
          "select",
          { class: "select", value: d.area, dataset: { key: "area" }, onChange: (e) => {
            d.area = e.target.value;
          } },
          h("option", { value: "" }, "Choose a neighbourhood"),
          areas.map((a) => h("option", { value: a }, a))
        ),
        h("span", { class: "field__hint" }, "Used to show games close to you.")
      )
    );
  }
  function motivationField(d, redraw) {
    return h(
      "fieldset",
      {},
      h("legend", {}, "What are you looking for? Pick any."),
      h("div", { class: "choice-grid" }, motivationOptions.map((m) => h("button", {
        type: "button",
        class: "choice",
        "aria-pressed": d.motivations.includes(m.id),
        dataset: { key: `mot-${m.id}` },
        onClick: () => {
          d.motivations = d.motivations.includes(m.id) ? d.motivations.filter((x) => x !== m.id) : [...d.motivations, m.id];
          redraw();
        }
      }, h("strong", {}, m.label), h("small", {}, m.hint))))
    );
  }
  function currentSportsField(d, redraw) {
    const chosen = Object.keys(d.current);
    return h(
      "div",
      { class: "stack" },
      h("div", { class: "choice-grid" }, sports.map((s) => h("button", {
        type: "button",
        class: "choice",
        "aria-pressed": s.id in d.current,
        dataset: { key: `cur-${s.id}` },
        onClick: () => {
          if (s.id in d.current) delete d.current[s.id];
          else {
            d.current[s.id] = "Beginner";
            d.desired = d.desired.filter((x) => x !== s.id);
          }
          redraw();
        }
      }, h("strong", {}, s.name), h("small", {}, s.tagline)))),
      chosen.length ? h(
        "div",
        {},
        h("p", { class: "field__label" }, "Your skill level in each"),
        chosen.map((id) => h(
          "div",
          { class: "skill-row" },
          h("span", {}, sports.find((s) => s.id === id).name),
          seg(`skill-${id}`, SKILLS.map((k) => ({ value: k, label: k })), d.current[id], (v) => {
            d.current[id] = v;
            redraw();
          })
        ))
      ) : null
    );
  }
  function desiredSportsField(d, redraw) {
    return h("div", { class: "choice-grid" }, sports.filter((s) => !(s.id in d.current)).map((s) => h("button", {
      type: "button",
      class: "choice",
      "aria-pressed": d.desired.includes(s.id),
      dataset: { key: `want-${s.id}` },
      onClick: () => {
        d.desired = d.desired.includes(s.id) ? d.desired.filter((x) => x !== s.id) : [...d.desired, s.id];
        redraw();
      }
    }, h("strong", {}, s.name), h("small", {}, s.tagline))));
  }
  var DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var hr = (n) => n === 12 ? "12 pm" : n > 12 ? `${n - 12} pm` : `${n} am`;
  function calendarField(d, redraw) {
    const on = d.calendar !== null;
    const order = [1, 2, 3, 4, 5, 6, 0];
    const grid = on ? h(
      "div",
      { class: "calendar-grid", role: "img", "aria-label": "Weekly calendar with busy times shaded" },
      h("span", {}),
      order.map((day) => h("strong", {}, DAY_NAMES[day].slice(0, 3))),
      Array.from({ length: 13 }, (_, i) => i + 8).map((hour) => [
        h("span", {}, hr(hour)),
        order.map((day) => h("span", { class: `cell ${d.calendar.some((b) => b.day === day && b.startHour <= hour && hour < b.endHour) ? "cell--busy" : ""}`.trim() }))
      ])
    ) : null;
    return h(
      "div",
      { class: "stack" },
      h(
        "label",
        { class: "check" },
        h("input", { type: "checkbox", checked: on, dataset: { key: "cal" }, onChange: (e) => {
          d.calendar = e.target.checked ? sampleCalendar.map((b) => ({ ...b })) : null;
          redraw();
        } }),
        h("span", { class: "check__text" }, "Sync my calendar", h("small", {}, "Demo only: adds a made-up class and work schedule. We use it to suggest games when you are free."))
      ),
      grid,
      on ? h("ul", { class: "stack-sm muted" }, d.calendar.map((b) => h("li", {}, `${DAY_NAMES[b.day]} ${hr(b.startHour)} to ${hr(b.endHour)}: ${b.label}`))) : null
    );
  }

  // src/ts/views/onboarding.ts
  function render4() {
    const d = blankDraft();
    let step = 0;
    let error2 = "";
    const root = h("div", { class: "onboarding" });
    const LAST = 3;
    const titles = [
      ["Welcome to Pickup", "Tell us a little about you and we will suggest games that fit. It takes about a minute."],
      ["What do you play now?", "Pick your sports and your level in each. Skip this if you are brand new."],
      ["What do you want to try?", "We will show games for these, with gear sharing when it is offered."],
      ["Add your schedule", "Optional. Connect a calendar so suggestions match when you are free."]
    ];
    function body() {
      if (step === 0) return h("div", { class: "stack" }, identityFields(d), motivationField(d, draw));
      if (step === 1) return currentSportsField(d, draw);
      if (step === 2) return desiredSportsField(d, draw);
      return calendarField(d, draw);
    }
    function next() {
      error2 = "";
      if (step === 0) {
        if (!d.name.trim()) error2 = "Enter your name to continue.";
        else if (!d.area) error2 = "Choose where you usually play.";
        else if (d.motivations.length === 0) error2 = "Pick at least one thing you are looking for.";
        if (error2) return draw();
      }
      if (step < LAST) {
        step++;
        return draw();
      }
      const res = completeOnboarding(draftToProfile(d));
      if (!res.ok) {
        error2 = res.error;
        return draw();
      }
      toast(`Welcome, ${firstName(d.name)}. Here are games that fit you.`);
      go("#/home");
    }
    function draw() {
      keepFocus(() => root.replaceChildren(
        h(
          "div",
          { class: "card onboarding__card" },
          h(
            "div",
            { class: "stepper", role: "progressbar", "aria-valuemin": 1, "aria-valuemax": LAST + 1, "aria-valuenow": step + 1, "aria-label": `Step ${step + 1} of ${LAST + 1}` },
            titles.map((_, i) => h("span", { class: "stepper__step", dataset: { state: i < step ? "done" : i === step ? "current" : "todo" } }))
          ),
          h("h1", {}, titles[step][0]),
          h("p", { class: "onboarding__lede" }, titles[step][1]),
          error2 ? h("p", { class: "notice notice--error", role: "alert" }, error2) : null,
          body(),
          h(
            "div",
            { class: "onboarding__actions" },
            step > 0 ? h("button", { class: "btn btn--secondary", type: "button", onClick: () => {
              error2 = "";
              step--;
              draw();
            } }, "Back") : h("span"),
            h("button", { class: "btn btn--primary", type: "button", dataset: { key: "next" }, onClick: next }, step === LAST ? "Finish setup" : "Continue")
          )
        ),
        h("p", { class: "onboarding__skip" }, h("button", { class: "btn btn--text", type: "button", onClick: () => {
          loginDemo();
          go("#/home");
        } }, "Skip with demo user"))
      ));
    }
    draw();
    return root;
  }

  // src/ts/views/profile.ts
  var SECTIONS = [["profile", "Your profile"], ["activity", "Activity"], ["personalization", "Personalization"], ["help", "Help"], ["about", "About us"]];
  function editor(kind) {
    const me = currentUser();
    const d = draftFromUser(me);
    let error2 = "";
    const root = h("div", {});
    function save() {
      if (kind === "profile" && (!d.name.trim() || !d.area)) {
        error2 = "Add your name and neighbourhood.";
        return draw();
      }
      if (kind === "profile" && d.motivations.length === 0) {
        error2 = "Pick at least one motivation.";
        return draw();
      }
      const p = draftToProfile(d);
      const res = updateProfile(kind === "profile" ? { name: p.name, area: p.area, motivations: p.motivations } : { currentSports: p.currentSports, desiredSports: p.desiredSports, calendar: p.calendar });
      toast(res.ok ? "Changes saved. Your suggestions are updated." : res.error);
    }
    function draw() {
      keepFocus(() => root.replaceChildren(h(
        "div",
        { class: "card stack" },
        error2 ? h("p", { class: "notice notice--error", role: "alert" }, error2) : null,
        kind === "profile" ? [identityFields(d), motivationField(d, draw)] : [h("div", {}, h("h3", {}, "Sports you play"), currentSportsField(d, draw)), h("div", {}, h("h3", {}, "Sports you want to try"), desiredSportsField(d, draw)), h("div", {}, h("h3", {}, "Calendar"), calendarField(d, draw))],
        h("div", {}, h("button", { class: "btn btn--primary", type: "button", onClick: save }, "Save changes"))
      )));
    }
    draw();
    return root;
  }
  function render5(args) {
    const me = currentUser();
    const section = SECTIONS.some(([id]) => id === args[0]) ? args[0] : "profile";
    const count = myUpcoming(me.id).length + myPast(me.id).length;
    let content;
    if (section === "profile" || section === "personalization") content = editor(section);
    else if (section === "activity") {
      const up = myUpcoming(me.id), past = myPast(me.id), log2 = activityFor(me.id);
      content = h(
        "div",
        { class: "stack" },
        h("section", {}, h("h2", {}, "Upcoming"), up.length ? h("div", { class: "rec-list" }, up.map((i) => inviteCard(i, me, { onOpen: () => openInvite(i.id) }))) : h("p", { class: "muted" }, "Nothing planned.")),
        h("section", {}, h("h2", {}, "Past meetups"), past.length ? h("div", { class: "rec-list" }, past.map((i) => inviteCard(i, me, { onOpen: () => openInvite(i.id) }))) : h("p", { class: "muted" }, "No past meetups yet.")),
        h("section", {}, h("h2", {}, "History"), log2.length ? h("ul", { class: "card activity-list" }, log2.map((a) => h("li", {}, h("span", {}, a.text), h("time", {}, fmtAgo(a.at))))) : h("p", { class: "muted" }, "No activity yet."))
      );
    } else if (section === "help") {
      content = h(
        "div",
        { class: "card stack" },
        h("h2", {}, "Help"),
        h("p", {}, h("strong", {}, "Find a game: "), "Open Map or Home. Yellow tags show what matches your profile."),
        h("p", {}, h("strong", {}, "Start a game: "), "Use Create invite. Sport, place, time and number of people are required."),
        h("p", {}, h("strong", {}, "Need gear? "), 'Look for the green "Gear shared" tag, or open a sport page to see rentals.'),
        h("p", {}, h("strong", {}, "Make friends: "), "Add people from a meetup you joined. Friends-only invites show just to friends.")
      );
    } else content = h("div", { class: "card stack" }, h("h2", {}, "About us"), h("p", {}, "Pickup helps people play sports together on short notice, or plan ahead. This is a course prototype with made-up data."));
    return h(
      "div",
      {},
      h("div", { class: "profile-head" }, avatar(me, "xl"), h("div", {}, h("h1", {}, me.name), h("p", { class: "muted" }, `${count} meetup${count === 1 ? "" : "s"}`))),
      h(
        "div",
        { class: "profile-layout" },
        h(
          "nav",
          { class: "card menu-list", "aria-label": "Profile sections" },
          SECTIONS.map(([id, label]) => h("a", { href: id === "profile" ? "#/profile" : `#/profile/${id}`, "aria-current": id === section ? "page" : null }, label)),
          h("button", { class: "is-danger", type: "button", onClick: () => {
            logout();
            go("#/home");
            toast("You are logged out.");
          } }, "Log out")
        ),
        content
      )
    );
  }

  // src/ts/views/social.ts
  var bell = () => {
    const s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("aria-hidden", "true");
    s.innerHTML = '<path d="M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15zM10 21h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>';
    return s;
  };
  function render6() {
    const me = currentUser();
    const upcoming = myUpcoming(me.id);
    const updates = notificationsFor(me.id).slice(0, 8);
    const friends = me.friendIds.map((id) => getUser(id));
    const met = /* @__PURE__ */ new Set();
    [...upcoming, ...myPast(me.id)].forEach((i) => i.memberIds.forEach((id) => {
      if (canAddFriend(id)) met.add(id);
    }));
    return h(
      "div",
      {},
      h("div", { class: "page-head" }, h("div", {}, h("h1", {}, "Social"), h("p", {}, "Your meetups, updates and friends."))),
      h(
        "div",
        { class: "cols" },
        h(
          "div",
          { class: "stack" },
          h(
            "section",
            {},
            h("div", { class: "section-head" }, h("h2", {}, "My meetups")),
            upcoming.length ? h("div", { class: "meetup-list" }, upcoming.map((i) => {
              const n = unreadCount(me.id, i.id);
              return h(
                "article",
                { class: "card meetup-row" },
                h(
                  "div",
                  { class: "grow" },
                  h("h3", { class: "card__title" }, getSport(i.sportId).name),
                  h("p", { class: "card__meta" }, fmtWhen(i.start, i.end)),
                  h("p", { class: "card__meta" }, `${i.location.label}, ${i.memberIds.length} of ${i.capacity} going`)
                ),
                h("div", { class: "avatar-stack" }, i.memberIds.slice(0, 4).map((id) => avatar(getUser(id), "sm"))),
                h("button", { class: "bell", type: "button", "aria-label": n ? `${n} new update${n === 1 ? "" : "s"}, open details` : "Open details", onClick: () => openInvite(i.id) }, bell(), n ? h("span", { class: "badge" }, String(n)) : null),
                h("button", { class: "btn btn--secondary btn--sm", type: "button", onClick: () => openInvite(i.id) }, "View details")
              );
            })) : h("div", { class: "empty" }, h("h3", {}, "No meetups yet"), h("p", {}, "Join a game from the map or create your own."), h("a", { class: "btn btn--primary", href: "#/map" }, "Find a game"))
          ),
          h(
            "section",
            {},
            h("div", { class: "section-head" }, h("h2", {}, "Updates")),
            updates.length ? h("ul", { class: "response-list" }, updates.map((u) => h(
              "li",
              { class: `response ${u.read ? "" : "response--unread"}`.trim() },
              h("span", { class: "grow" }, u.text),
              h("span", { class: "muted" }, fmtAgo(u.createdAt)),
              u.inviteId ? h("button", { class: "btn btn--secondary btn--sm", type: "button", onClick: () => openInvite(u.inviteId) }, "View") : null
            ))) : h("div", { class: "empty" }, "When people join your meetups, you will see it here.")
          )
        ),
        h(
          "div",
          { class: "stack" },
          h(
            "section",
            {},
            h("div", { class: "section-head" }, h("h2", {}, "Friends")),
            friends.length ? h("div", { class: "friend-strip" }, friends.map((f) => h("div", { class: "friend" }, avatar(f, "lg"), f.name))) : h("div", { class: "empty" }, "No friends yet. Add people you meet in a game.")
          ),
          h(
            "section",
            {},
            h("div", { class: "section-head" }, h("h2", {}, "People you have played with")),
            met.size ? h("ul", { class: "response-list" }, [...met].map((id) => {
              const u = getUser(id);
              return h(
                "li",
                { class: "response" },
                avatar(u, "sm"),
                h("span", { class: "grow" }, u.name),
                h("button", { class: "btn btn--secondary btn--sm", type: "button", onClick: () => {
                  const r = addFriend(id);
                  toast(r.ok ? `${u.name} is now your friend.` : r.error);
                } }, "Add friend")
              );
            })) : h("p", { class: "muted" }, "Everyone you have met is already a friend, or you have not joined a meetup yet.")
          )
        )
      )
    );
  }

  // src/ts/views/sport.ts
  function render7(args) {
    const me = currentUser();
    const sport = getSport(args[0] ?? "");
    if (!sport) return h("div", { class: "empty" }, h("h3", {}, "Sport not found"), h("a", { class: "btn btn--primary", href: "#/home" }, "Back to home"));
    const live = mapInvites(me.id).filter((i) => i.sportId === sport.id);
    const borrow = live.filter((i) => i.gear.available);
    const places = venues.filter((v) => v.sportIds.includes(sport.id));
    const cards = (list) => list.map((i) => inviteCard(i, me, { showWhy: false, onOpen: () => openInvite(i.id), onShowMap: () => go(`#/map/${i.id}`) }));
    return h(
      "div",
      {},
      h(
        "div",
        { class: "sport-hero" },
        h("h1", {}, sport.name),
        h("p", {}, sport.description),
        h("div", { class: "tags" }, tag(sport.typicalGroup), tag(sport.soloFriendly ? "Individual sport, done together" : "Team or partner game")),
        h("div", {}, h("button", { class: "btn btn--primary", type: "button", onClick: () => {
          presetSport(sport.id);
          go("#/create");
        } }, `Create a ${sport.name} invite`))
      ),
      h(
        "div",
        { class: "cols" },
        h(
          "div",
          { class: "stack" },
          h(
            "section",
            {},
            h("div", { class: "section-head" }, h("h2", {}, "What you need")),
            h("ul", { class: "gear-list" }, sport.gear.map((g) => h(
              "li",
              { class: "gear-item" },
              h("span", { class: "gear-item__name" }, g.item),
              tag(g.required ? "Needed" : "Optional", g.required ? "tag--match" : ""),
              h("span", { class: "gear-item__note" }, g.note)
            )))
          ),
          h(
            "section",
            {},
            h("div", { class: "section-head" }, h("h2", {}, "Where to rent or borrow")),
            h(
              "ul",
              { class: "gear-list" },
              places.filter((v) => v.rentals.length).map((v) => h("li", { class: "gear-item" }, h("span", { class: "gear-item__name" }, v.name), tag("Rent on site", "tag--gear"), h("span", { class: "gear-item__note" }, `${v.rentals.join(", ")}. ${v.hours}.`))),
              borrow.length ? h("li", { class: "gear-item" }, h("span", { class: "gear-item__name" }, "Borrow from another player"), tag("Free", "tag--gear"), h("span", { class: "gear-item__note" }, `${borrow.length} upcoming invite${borrow.length === 1 ? "" : "s"} with gear to share. See below.`)) : null,
              !places.some((v) => v.rentals.length) && !borrow.length ? h("li", { class: "empty" }, "No rentals or shared gear for this sport right now.") : null
            )
          ),
          h("section", {}, h("div", { class: "section-head" }, h("h2", {}, "How to start")), h("ol", { class: "steps" }, sport.howToStart.map((s) => h("li", {}, s))))
        ),
        h(
          "section",
          { class: "stack" },
          h("div", { class: "section-head" }, h("h2", {}, `Open ${sport.name} invites`)),
          borrow.length ? h("div", { class: "stack-sm" }, h("h3", {}, "With gear to share"), cards(borrow)) : null,
          live.length ? h("div", { class: "stack-sm" }, borrow.length ? h("h3", {}, "All invites") : null, cards(live)) : h("div", { class: "empty" }, h("h3", {}, "No open invites"), h("p", {}, `Be the first to start a ${sport.name} game.`))
        )
      )
    );
  }

  // src/ts/main.ts
  var routes = {
    home: { render: () => render2(), live: true, tab: "home", title: "Home" },
    map: { render: render3, live: true, tab: "map", title: "Map" },
    create: { render: () => render(), live: false, tab: "create", title: "Create invite" },
    social: { render: () => render6(), live: true, tab: "social", title: "Social" },
    profile: { render: render5, live: true, tab: "profile", title: "Profile" },
    sport: { render: render7, live: false, tab: null, title: "Sport" }
  };
  var app = document.getElementById("app");
  var mode = null;
  var lastPath = "";
  function parse() {
    const [name, ...args] = (location.hash.replace(/^#\/?/, "") || "home").split("/");
    return { name: name in routes ? name : "home", args };
  }
  function updateChrome() {
    const me = currentUser();
    document.body.dataset.auth = me ? "in" : "out";
    const chip = document.getElementById("user-chip");
    chip.replaceChildren(...me ? [avatar(me, "sm"), h("span", {}, firstName(me.name))] : []);
    const badge = document.getElementById("social-badge");
    const n = me ? unreadCount(me.id) : 0;
    badge.hidden = n === 0;
    badge.textContent = String(n);
    badge.setAttribute("aria-label", `${n} unread updates`);
  }
  function render8(fromState = false) {
    updateChrome();
    const me = currentUser();
    if (!me) {
      if (mode !== "onboarding") {
        mode = "onboarding";
        document.title = "Welcome | Pickup";
        app.replaceChildren(render4());
      }
      return;
    }
    mode = "app";
    const { name, args } = parse();
    const route = routes[name];
    const path = `${name}/${args.join("/")}`;
    const scrollY = window.scrollY;
    app.replaceChildren(route.render(args));
    document.title = `${route.title} | Pickup`;
    document.querySelectorAll(".tab").forEach((t) => {
      if (t.dataset.tab === route.tab) t.setAttribute("aria-current", "page");
      else t.removeAttribute("aria-current");
    });
    if (fromState && path === lastPath) window.scrollTo(0, scrollY);
    else {
      window.scrollTo(0, 0);
      if (!fromState) app.focus({ preventScroll: true });
    }
    lastPath = path;
  }
  subscribe(() => {
    const me = currentUser();
    if (!me || mode !== "app") {
      render8(true);
      return;
    }
    updateChrome();
    if (routes[parse().name].live) keepFocus(() => render8(true));
    refreshModal();
  });
  window.addEventListener("hashchange", () => render8());
  render8();
})();
