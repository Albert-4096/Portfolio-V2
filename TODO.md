# TODO

Conversion recommendations from "Psychology of a High Converting Website" (Dylan Bindrup, K-Project source 184200, https://www.youtube.com/watch?v=rAUFROXxuVU). Added 2026-11-23. Done in `e38b359`: primary header CTA, fewer hero actions, proof line under the contact CTA.

- [ ] **Booking that works without an email app.** "Book a 20-min call" is a `mailto:` link, so a webmail user gets nothing. Replace it with a booking link (Cal.com or similar), in the hero, the header and Contact. Needs an account.
- [ ] **Intro animation less often.** It plays on every visit and reload and can delay the hero by up to 3 s. Show it once per session (see the inline script in `index.html` and `js/intro.js`).
- [ ] **Offers match the headline.** The hero says AI agents, data platforms, web apps, secure infrastructure. "What I do" lists documents into data, workflows, private AI. Align the two.
- [ ] **One real client quote beside the call button.** Only a real quote with a real name, never an invented one.
- [ ] **Stale Now item.** "Guest check-in and logistics tooling for a live event" (the TEDx check-in was in September). Update or remove it, in `index.html` and `llms.txt`.
