/* ---------- utilidades ---------- */
export const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
export const lerp=(a,b,t)=>a+(b-a)*t;
export const range=(p,a,b)=>clamp((p-a)/(b-a));
export const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
export const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
