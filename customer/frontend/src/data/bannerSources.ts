export type BannerFiles=Record<string,string>;
export type BannerPair={name:string;desktop?:string;mobile?:string};
export function pairBannerFiles(files:BannerFiles):BannerPair[]{
 const pairs=new Map<string,BannerPair>();
 for(const [path,url] of Object.entries(files).sort(([a],[b])=>a.localeCompare(b))){
  const name=path.split('/').pop()||path;const stem=name.replace(/\.[^.]+$/,'');
  const match=stem.match(/^(.*?)[_-](desktop|mobile)$/i);const key=match?.[1]||stem;const pair=pairs.get(key)||{name:key};
  if(match?.[2].toLowerCase()==='mobile')pair.mobile=url;else pair.desktop=url;
  pairs.set(key,pair);
 }
 return [...pairs.values()].sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
}
export function selectBannerSource(pair:BannerPair|undefined,isMobile:boolean):string|undefined{return pair?(isMobile?(pair.mobile||pair.desktop):(pair.desktop||pair.mobile)):undefined}
