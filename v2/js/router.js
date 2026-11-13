export function parseHash(hash = location.hash) {
  const raw = (hash || "").replace(/^#/, "") || "/dashboard";
  const [pathPart, queryPart = ""] = raw.split("?");
  const parts = pathPart.split("/").filter(Boolean).map(decodeURIComponent);
  const query = Object.fromEntries(new URLSearchParams(queryPart));
  const head = parts[0] || "dashboard";
  if (head === "dashboard") return { name: "dashboard", query };
  if (head === "calendar") return { name: "calendar", query };
  if (head === "revision") return { name: "revision", query };
  if (head === "search") return { name: "search", query };
  if (head === "settings") return { name: "settings", query };
  if (head === "library") return { name: "library", bookId: parts[1] || "", chapterId: parts[2] || "", query };
  if (head === "course" && parts[1]) {
    return {
      name: "course",
      courseId: parts[1],
      section: parts[2] || "home",
      id: parts[3] || "",
      query
    };
  }
  return { name: "dashboard", query };
}

export function currentRoute() {
  return parseHash(location.hash);
}

export function go(hash) {
  if (location.hash === hash) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    return;
  }
  location.hash = hash;
}
