export type AuthUser={name:string;email:string;mobile:string};
export interface AuthService{signIn(identifier:string,password:string):Promise<AuthUser>;signUp(user:AuthUser,password:string):Promise<AuthUser>;signOut():Promise<void>;currentUser():AuthUser|null}
const STORAGE_KEY='iyalvi-user';
function readUser():AuthUser|null{try{const value=localStorage.getItem(STORAGE_KEY);if(!value)return null;const data=JSON.parse(value);if(typeof data.name==='string'&&typeof data.email==='string'&&typeof data.mobile==='string')return{name:data.name,email:data.email,mobile:data.mobile}}catch{}return null}
function writeUser(user:AuthUser){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({name:user.name,email:user.email,mobile:user.mobile}))}catch{}}
export const authService:AuthService={async signIn(identifier,password){if(!password)throw Error('Enter your password.');const saved=readUser(),user=saved&&(saved.email.toLowerCase()===identifier.toLowerCase()||saved.mobile===identifier)?saved:/^\d{10}$/.test(identifier)?{name:'Iyalvi customer',email:'',mobile:identifier}:{name:identifier.split('@')[0]||'Iyalvi customer',email:identifier,mobile:''};writeUser(user);return user},async signUp(user,password){if(password.length<8)throw Error('Use at least 8 characters for your password.');writeUser(user);return user},async signOut(){try{localStorage.removeItem(STORAGE_KEY)}catch{}},currentUser:readUser};
export function authRedirect(path:string,signedIn:boolean){return signedIn?null:{requiresAuth:true as const,returnTo:path}}
export function validateAuthMobile(value:string){return /^\d{10}$/.test(value)}
export function validateAuthEmail(value:string){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)}
