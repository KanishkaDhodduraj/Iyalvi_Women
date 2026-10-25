export type Diary={displayName:string;caption:string;shopTo:'/sarees'|'/kurtis';focus?:string};
export const diaries:Diary[]=[
  {displayName:'Ilakkiya Senthil',caption:'A little colour made an ordinary afternoon feel special.',shopTo:'/sarees'},
  {displayName:'Madhumitha Raj',caption:'Soft cotton and a quiet moment to feel like myself.',shopTo:'/kurtis'},
  {displayName:'Yazhini Balan',caption:'This joyful drape came along for a day full of laughter.',shopTo:'/sarees'},
  {displayName:'Kayalvizhi Murugan',caption:'A favourite kurti for all the little things in my day.',shopTo:'/kurtis'},
  {displayName:'Sowmiya Arul',caption:'A touch of tradition made this gathering feel warmer.',shopTo:'/sarees'},
];

export const DIARY_OFFSETS=[-2,-1,0,1,2] as const;
export const DIARY_MOBILE_OFFSETS=[-1,0,1] as const;

export function wrapDiaryIndex(index:number,count:number):number{return count>0?((index%count)+count)%count:0}
export function getVisibleDiaryPositions(activeIndex:number,count:number,offsets:readonly number[]=DIARY_OFFSETS){return count<1?[]:offsets.map(offset=>({offset,index:wrapDiaryIndex(activeIndex+offset,count)}))}
