export type OrderLine={name:string;qty:number;price:number};export type PlacedOrder={number:string;date:string;total:number;items:OrderLine[]};const KEY='iyalvi-orders';
export function readOrders():PlacedOrder[]{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}
export function saveOrder(order:PlacedOrder){try{const orders=readOrders();localStorage.setItem(KEY,JSON.stringify([order,...orders]))}catch{}}
