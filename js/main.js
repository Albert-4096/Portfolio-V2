/* ─── Currently building ────────────────────────────────
   Edit this array, save, redeploy. Nothing else to touch.
   Each entry: { status, name, note, link? }
   status shows as the green dot label — keep it short
   ("active", "shipping", "paused", a date, whatever). */
const BUILDING = [
  {
    status: "active",
    name: "SOC Dashboard",
    note: "Personal intelligence dashboard pulling telemetry from the homelab.",
    link: "https://dash-demo.albertg.site",
  },
  {
    status: "active",
    name: "Qobuz Web Platform",
    note: "Hi-res music downloader with an MCP server so AI assistants can run it.",
  },
  {
    status: "shipped",
    name: "This site",
    note: "The rebuild you're reading. Self-hosted, like everything else.",
  },
];

const list = document.getElementById("building-list");
for (const item of BUILDING) {
  const li = document.createElement("li");
  li.className = "building-item";

  const status = document.createElement("span");
  status.className = "building-status";
  status.textContent = item.status;

  const body = document.createElement("p");
  body.className = "building-note";
  const name = document.createElement("span");
  name.className = "building-name";
  if (item.link) {
    const a = document.createElement("a");
    a.href = item.link;
    a.rel = "noopener";
    a.textContent = item.name;
    name.append(a);
  } else {
    name.textContent = item.name;
  }
  body.append(name, " — " + item.note);

  li.append(status, body);
  list.append(li);
}
