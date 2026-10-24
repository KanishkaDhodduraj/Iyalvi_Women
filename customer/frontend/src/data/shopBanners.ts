import{pairBannerFiles}from'./bannerSources';
const sareeFiles=import.meta.glob('../assets/banners/sarees/*',{eager:true,query:'?url',import:'default'})as Record<string,string>;
const kurtiFiles=import.meta.glob('../assets/banners/kurtis/*',{eager:true,query:'?url',import:'default'})as Record<string,string>;
export const shopBannerFiles={saree:pairBannerFiles(sareeFiles),kurti:pairBannerFiles(kurtiFiles)};
