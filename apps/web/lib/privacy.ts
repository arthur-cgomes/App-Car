export const PRIVACY_KEY = "placar-privacy";

export const PRIVACY_BOOTSTRAP_SCRIPT = `(function(){try{if(localStorage.getItem("${PRIVACY_KEY}")==="on")document.documentElement.setAttribute("data-privacy","on")}catch(e){}})()`;

export function readPrivacy() {
  return document.documentElement.getAttribute("data-privacy") === "on";
}

export function applyPrivacy(on: boolean) {
  if (on) document.documentElement.setAttribute("data-privacy", "on");
  else document.documentElement.removeAttribute("data-privacy");
  try {
    if (on) localStorage.setItem(PRIVACY_KEY, "on");
    else localStorage.removeItem(PRIVACY_KEY);
  } catch {}
  window.dispatchEvent(new Event(PRIVACY_KEY));
}
