var i=Symbol("NotFound"),N=1e3,C=60*N,j=60*C,m=24*j,D=7*m;import*as r from"fs";import*as g from"path";var f=class{constructor(n={}){this.cache=n}get(n,t){let e=this.cache[n];return e?Date.now()-e.timestamp>t?i:e.value:i}set(n,t){this.cache[n]={timestamp:Date.now(),value:t}}save(){}};var p=class extends f{constructor(t={}){super();this.opts=t;this.cacheFile=t.path??"cache.json",this.autoSave=t.autoSave??!0;try{if(!r.existsSync(this.cacheFile))return;let e=r.readFileSync(this.cacheFile,"utf8");super.cache=JSON.parse(e)}catch{}}set(t,e){super.set(t,e),this.autoSave&&this.save()}async save(){for(let[t,e]of Object.entries(this.cache))e.value instanceof Promise&&(this.cache[t].value=await e.value);r.mkdirSync(g.dirname(this.cacheFile),{recursive:!0}),r.writeFileSync(this.cacheFile,JSON.stringify(this.cache))}};function k(s,n,t,e,c,a=""){if(e[a])return e[a];let x=new Proxy(s,{get(d,l){let o=a+"/"+l.toString(),u=d[l];if(typeof u=="function"){if(c[o])return c[o];let F=u.bind(d),{defaultExpire:O=1*m,pathExpire:T={},onHit:E=()=>{},onMiss:w=()=>{}}=t,P=T[o]??O,S=function(...h){let y=o+": "+JSON.stringify(h),v=n.get(y,P);if(v!==i)return E(y,h),v;let b=F(...h);return n.set(y,b),w(y,h),b};return c[o]=S,S}return u instanceof Object?k(d[l],n,t,e,c,o):u}});return e[a]=x,x}function q(s,n={}){let{cacheStore:t=new p}=n;return k(s,t,n,{},{})}export{q as cacheProxy};
//# sourceMappingURL=index.js.map
