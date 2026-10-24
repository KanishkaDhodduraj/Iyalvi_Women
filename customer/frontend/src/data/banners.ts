import{pairBannerFiles}from'./bannerSources';
const homeFiles=import.meta.glob('../assets/banners/home/*',{eager:true,query:'?url',import:'default'})as Record<string,string>;
export type Banner={title:string;image:string;mobileImage?:string;to:string;width:number;height:number;bgColor?:string};
export const banners:Banner[]=pairBannerFiles(homeFiles).map((pair,i)=>({title:`Iyalvi collection ${i+1}`,image:pair.desktop||pair.mobile||'',mobileImage:pair.mobile,to:'/sarees',width:2048,height:768,bgColor:'var(--sandal)'}));
