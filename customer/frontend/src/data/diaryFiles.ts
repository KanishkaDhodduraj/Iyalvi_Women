export type StoryFile={story:number;n:number;url:string};
export function groupDiaryFiles(files:Record<string,string>):Record<number,StoryFile[]>{return Object.entries(files).reduce((a,[path,url])=>{const m=path.match(/(\d+)-(\d+)\.[^.]+$/);if(m){const story=Number(m[1]);(a[story]??=[]).push({story,n:Number(m[2]),url})}return a},{} as Record<number,StoryFile[]>)}

export const DIARY_CAROUSEL={intervalMs:4500,desktopVisible:3,mobileVisible:1,mobileCardWidth:80,equalCards:true,peekNext:true} as const
