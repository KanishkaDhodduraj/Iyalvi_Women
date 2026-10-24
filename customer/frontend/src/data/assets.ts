export const assetFocus={default:'50% 0%',byImage:{'/images/occasions/diwali.jpg':'50% 0%','/images/occasions/wedding.jpg':'50% 0%','/images/occasions/office.jpg':'50% 0%','/images/occasions/casual.jpg':'50% 0%','/images/occasions/reception.jpg':'50% 0%','/images/occasions/pongal.jpg':'50% 0%'}};
export function focusForImage(src:string){return assetFocus.byImage[src as keyof typeof assetFocus.byImage]||assetFocus.default}
export const assets={logo:'/images/logo/logo.png',hero:'/images/banners/hero.png'};
