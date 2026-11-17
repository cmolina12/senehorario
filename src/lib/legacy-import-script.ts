// The app used to live at cmolina.xyz/senehorario/, and localStorage is per
// origin. The redirect page left there forwards a visitor's saved session and
// plans in the URL fragment (#import=...), which never reaches a server. This
// script runs in <head> before the app loads, stores that data without
// overwriting anything saved here, and strips the fragment from the URL.
// The app validates the data again when it reads it (see storage.ts).

export const LEGACY_IMPORT_SCRIPT = `(function(){var h=location.hash;if(h.indexOf("#import=")!==0)return;try{var d=JSON.parse(decodeURIComponent(h.slice(8)));if(d&&typeof d==="object"){if(d.planningState&&typeof d.planningState==="object"&&!localStorage.getItem("planningState")){localStorage.setItem("planningState",JSON.stringify(d.planningState))}if(d.savedPlans&&typeof d.savedPlans==="object"){var c={};try{c=JSON.parse(localStorage.getItem("savedPlans")||"{}")||{}}catch(e){}for(var k in d.savedPlans){if(Object.prototype.hasOwnProperty.call(d.savedPlans,k)&&!Object.prototype.hasOwnProperty.call(c,k)){c[k]=d.savedPlans[k]}}localStorage.setItem("savedPlans",JSON.stringify(c))}}}catch(e){}try{history.replaceState(null,"",location.pathname+location.search)}catch(e){}})();`;
