export function discountPercent(price:number,mrp:number){return mrp>0?Math.round((mrp-price)/mrp*100):0}
export function productPrice(price:number,mrp:number){return{price,mrp,discount:discountPercent(price,mrp),placement:'below-image' as const}}
