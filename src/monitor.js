export const EVENT_ID = "seattle-active-courses";

export const monitor = {
  id: EVENT_ID,
  name: "Seattle ActiveCommunities courses",
  readySelector: ".activity-card__cornerMark",
  url: "https://anc.apm.activecommunities.com/seattle/activity/search?onlineSiteId=0&site_ids=3&activity_keyword=18%2B%201.0&viewMode=list"
};

export function extract(document) {
  return [...document.querySelectorAll(".activity-card__cornerMark")].map((statusMark) => {
    const container = statusMark.closest(".activity-container");
    const card = container?.querySelector(".activity-card") || statusMark.closest(".activity-card");
    const scope = container || card || statusMark;
    const text = (selector) =>
      scope.querySelector(selector)?.textContent?.replace(/\s+/g, " ").trim() || "";
    const lines = (scope.innerText || "")
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const link = scope.querySelector('a[href*="/Activity_Search/"]');
    const openingsText = text(".activity-card-info__openings");
    const openingMatch = openingsText.match(/Openings\s+(\d+)/i);
    const propsText = text(".activity-card-info__props");
    const idMatch = propsText.match(/#(\d+)/);

    return {
      availability: statusMark.textContent?.replace(/\s+/g, " ").trim() || "",
      date: text(".activity-card-info__dateRange span") ||
        lines.find((line) => /\b\d{4}\b/.test(line) && /\bto\b/i.test(line)) ||
        "",
      id: idMatch?.[1] || "",
      name: link?.textContent?.replace(/\s+/g, " ").trim() || "",
      openings: openingMatch ? Number(openingMatch[1]) : null,
      openingsText,
      location: lines.find((line) => /Ctr|Center|Pool|Park|Gym|AYTC/i.test(line)) || "",
      time: lines.find((line) => /\b(?:AM|PM)\b/i.test(line)) || "",
      href: link?.href || ""
    };
  });
}

export function getItemKey(item) {
  return item.date || "";
}

export function isAvailable(item) {
  if (/full/i.test(item.availability || "")) return false;
  if (item.openings === 0) return false;
  if (Number(item.openings) > 0) return true;
  return Boolean(item.availability);
}
