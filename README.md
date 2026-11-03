# Kickoff

**Spontaneous sports invites.** Kickoff helps people who want to learn a sport, or get back into one, find a casual game nearby and join it with one tap. You can also post an invite yourself and let others join.

This is a medium-fidelity prototype built for a Human-Computer Interaction course by **Nolan MacFarlane, Daniaal Mahmood, Sriram Palavajjhala and David Gromadzki**. The design comes from a preliminary user study with six people who wanted to learn or return to sports, and was shaped by usability heuristics and HCI design principles.

> **It's a prototype.** There is no backend. Everything runs in the browser, all the people and invites are made up, and reloading the page resets everything. Fake users react to what you do (accepting friend requests, joining your invites, chatting) so the app feels lived in.

## Features

- **Onboarding.** A five-step setup asks for your area and how far you'll travel, why you want to play (exercise, social, competition, challenge, learning), the sports you play or want to try, and optionally your weekly schedule (a synced calendar, or just when you're usually free). The last step suggests people to add as friends: people who play your sports (at your level first) or a sport you want to try, or who live in your area, within your travel distance. You can choose **Skip with demo user** on any step to sign in as *Alex (demo)*, who already has friends, chats and history.
- **Home.** Up to three suggested invites, a map of what's nearby, what your friends are going to, and recent activity.
- **Map.** A full-screen map of open invites with filters. Invites at the same venue share one pin with a count.
- **Create invite.** Pick a sport, place, time, capacity and skill levels. Vibe (casual or competitive), visibility (open or friends only) and gear notes are optional. Your usual choices can be saved as defaults.
- **Invite details.** Join instantly, leave, see who's going, share the invite, chat with the group, or show it on the map.
- **Social.** Your invites, what friends are going to, friend requests, your friends list, and messages (direct chats plus one group chat per invite).
- **Profile.** Edit your onboarding answers. Settings cover theme (system, light or dark), 12- or 24-hour time, the first day of the week, km or miles, how far away invites can be, where the map opens, default invite details, and which notifications you get.
- **Help.** An "About this sport" page for each of the 15 sports. Open it from the **(?)** next to any sport name.

### Rules the prototype enforces

- Invites that are **full** or **already over** disappear from the map.
- **Friends-only** invites can only be seen by the host's friends and by people already going.
- The host can change an invite's skill levels, vibe and visibility **only until someone else joins**. After that the tags are locked so nobody's expectations change after they sign up.
- If the host leaves, the **earliest joiner becomes the host**. If everyone leaves, the invite and its chat are deleted.
- When you join or create an invite that **overlaps** with another invite you're going to, you're asked to confirm first.

### How suggestions are ranked

Suggestions are scored in [src/ts/match.ts](src/ts/match.ts). An invite gets points for a sport you play or want to try, a matching skill level (beginner-friendly invites count if you're new to the sport), fitting your schedule (your synced calendar, or the times you said you're usually free), friends who are going, a vibe that suits your goals, gear you can borrow, and a venue in your area. It loses points if it clashes with your schedule. The tags that matched are highlighted on the invite card so you can see why it was suggested.

## Getting started

You need [Node.js](https://nodejs.org/) 18 or newer.

```sh
git clone https://github.com/nolanmacfarlane/Kickoff.git
cd Kickoff
npm install

# Map tile settings. May need to get your own API key from CARTO
cp src/ts/components/tiles.example.ts src/ts/components/tiles.ts

npm run build
```

Then open `public/index.html` in a browser. No server is needed because the app works straight from a `file://` path. You can also serve the `public/` folder with any static server, for example `npx serve public`.

You need an internet connection for the map tiles and the Google Fonts.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run build` | Bundles `src/ts/main.ts` into `public/app.js` with esbuild |
| `npm run watch` | Rebuilds every time you save |
| `npm run typecheck` | Type-checks the project with `tsc` (no output files) |
| `npm test` | Runs the rule checks in [tests/rules.test.ts](tests/rules.test.ts) |

### Map tiles

The default tiles come from [CARTO basemaps](https://carto.com/basemaps), which use OpenStreetMap data and need no key. To use a different provider, change the URLs, options and attribution in your local `src/ts/components/tiles.ts`. Don't point it at `tile.openstreetmap.org`, because OpenStreetMap's server blocks pages opened from `file://`. Any key you add is visible to anyone who opens the page, so use a restricted free-tier key.

## Project structure

```
public/
  index.html          Page shell: top bar, tabs and the #app container
  app.js              Build output (gitignored)
  css/                tokens -> base -> layout -> components -> one file per screen
src/ts/
  main.ts             Router (hash-based), theme, notification badge, unsaved-changes guard
  state.ts            Single source of truth. Views read via selectors and change data only via actions;
                      all invite and friend rules live here
  data.ts             Seed data: sports, venues, users and invites
  types.ts            Shared types
  match.ts            Suggestion scoring
  bots.ts             Demo-only fake users who react to what you do
  geo.ts              Distance helpers
  dom.ts              Small DOM helper (h()), dialogs, toasts, time formatting
  nav.ts              Leave-guard and in-place refresh hooks
  icons.ts            Generated sport and UI icons (see tools/make-icons.py)
  views/              One file per screen (home, map, create, social, messages, profile, ...)
  components/         Reusable pieces (invite card, map widget, save bar, ...)
tests/
  rules.test.ts       Plain-assert checks of the rules in state.ts and match.ts
tools/
  make-icons.py       Regenerates icons.ts from Phosphor Icons
```

The UI is plain TypeScript and DOM, with no framework. Views are functions that return an `HTMLElement`. When state changes, `main.ts` re-renders the current screen. Screens with a form, like Create invite and onboarding, aren't rebuilt while you type, so input is never lost.

### Adding a sport icon

Add the sport id and the [Phosphor](https://phosphoricons.com) icon name to `SPORTS` in [tools/make-icons.py](tools/make-icons.py), then run:

```sh
npm i --no-save @phosphor-icons/core && python3 tools/make-icons.py
```

## About the data

The geography is real (Greater Victoria, BC), but the people, invites and opening hours are invented, as are several venue names. Venue coordinates are approximate. Address lookup is faked: it looks for a known neighbourhood name in the text you type (Downtown, James Bay, Fairfield, Vic West, Saanich, Oak Bay, Gordon Head) and falls back to Downtown.

## Credits

- Maps: [Leaflet](https://leafletjs.com) (BSD-2-Clause), tiles © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors © [CARTO](https://carto.com/attributions)
- Icons: [Phosphor Icons](https://phosphoricons.com) (MIT). The licence is in [public/licenses/](public/licenses/)
- Fonts: [Bricolage Grotesque](https://fonts.google.com/specimen/Bricolage+Grotesque) and [Figtree](https://fonts.google.com/specimen/Figtree) via Google Fonts (OFL)

## License

[MIT](LICENSE) © 2026 Nolan MacFarlane, Daniaal Mahmood, Sriram Palavajjhala, David Gromadzki
