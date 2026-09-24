export type PersonaSocial = {slug:string;name:string;description:string;avatar?:string;creator_id?:string;username?:string;unique_users:number;conversations:number;likes:number;followers:number;rating:number;trending_score:number;weekly_rank?:number;all_rank?:number;liked?:boolean;followed?:boolean;challenge_enabled?:boolean;definition?:unknown};
export type Ranking = {entity_id:string;rank:number;previous_rank?:number;score:number;likes:number;users:number;name:string;avatar?:string;username?:string;updated_at:string};
export type Submission = {id:string;score:number|null;feedback:string;xp_earned:number;status:string};
export type Challenge = {id:string;persona_slug:string;name:string;avatar?:string;question:string;difficulty:string;category:string;xp_reward:number;deadline:string;participants:number;submission?:Submission};
export type SharedAnswer = {id:string;persona_slug:string;persona_name:string;question:string;answer:string;score?:number;created_at:string;likes:number;liked:boolean};
export type Creator = {user_id:string;username:string;display_name:string;bio:string;avatar_data_url?:string;profile_visibility:string;xp:number;level:number;followers:number;following:number;persona_count:number;persona_users:number;persona_likes:number;weekly_rank?:number;all_rank?:number;followed:boolean;is_owner:boolean;badges:{id:string;name:string;description:string}[];personas:PersonaSocial[];answers:SharedAnswer[]};
export async function socialRequest<T>(params:string|Record<string,unknown>):Promise<T> {
  const response=await fetch(typeof params==='string'?`/api/social?${params}`:'/api/social',typeof params==='string'?{cache:'no-store',credentials:'same-origin'}:{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify(params)});
  const data=await response.json();
  if(!response.ok) throw new Error(data.error||'Unable to load community data.');
  return data;
}
export const number = (n:number=0)=>new Intl.NumberFormat('en',{notation:Math.abs(n)>=1000?'compact':'standard',maximumFractionDigits:1,minimumFractionDigits:0}).format(n);
