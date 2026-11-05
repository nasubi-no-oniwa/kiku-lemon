// ランキングのルールの試験（GitHub の上で Firebase の試し用データベースを立てて試す。本番のデータには触らない）
const NS='ft-green-default-rtdb',PROJ='ft-green',BASE='http://127.0.0.1:9000';
const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
const tok=uid=>b64({alg:'none',typ:'JWT'})+'.'+b64({uid,sub:uid,user_id:uid,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,aud:PROJ,iss:'https://securetoken.google.com/'+PROJ,provider_id:'anonymous',firebase:{sign_in_provider:'anonymous'}})+'.';
async function req(method,path,uid,body){const r=await fetch(BASE+'/'+path+'.json?ns='+NS+(uid?'&auth='+tok(uid):''),{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {ok:r.ok,status:r.status,j:await r.json().catch(()=>null)};}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fail=0;const ex=(name,res,want)=>{const ok=res.ok===want;console.log((ok?'OK  ':'NG  ')+name+' → '+res.status);if(!ok){fail++;console.log(JSON.stringify(res.j));}};
const TS={'.sv':'timestamp'};
const U='user1aaaaaaaaaaaaaaaaaaa',U2='user2bbbbbbbbbbbbbbbbbbb';
async function ticket(uid){const r=await req('PUT','kl/runs/'+uid,uid,{t:TS,v:1});const g=await req('GET','kl/runs/'+uid,uid);return {r,st:g.j&&g.j.t};}
// c 個こなして p 点、s ミリ秒で終わった記録
const rec=(st,s,c,p,n='テスト')=>({n,c,p,k:c*10000000+p,s,st,lg:'3m'.repeat(c),v:1,t:TS});
const dk=()=>Math.floor((Date.now()+32400000)/86400000);

ex('ログインなしで始める',await req('PUT','kl/runs/'+U,null,{t:TS,v:1}),false);
let tk=await ticket(U);ex('始めた時刻を書く',tk.r,true);
ex('ほかの人の場所で始める',await req('PUT','kl/runs/'+U,U2,{t:TS,v:1}),false);
ex('すぐにもう一度始める',await req('PUT','kl/runs/'+U,U,{t:TS,v:1}),false);
ex('遊んだ時間より長い記録をすぐ送る（8秒）',await req('PUT','kl/all/scores/'+U,U,rec(tk.st,8000,5,450)),false);
await sleep(4200);
ex('始めた時刻がちがう記録',await req('PUT','kl/all/scores/'+U,U,rec(tk.st-5000,4000,3,270)),false);
ex('点数が多すぎる（1個101点）',await req('PUT','kl/all/scores/'+U,U,rec(tk.st,4000,3,303)),false);
ex('点数が少なすぎる（1個49点）',await req('PUT','kl/all/scores/'+U,U,rec(tk.st,4000,3,147)),false);
ex('並べる数がちがう',await req('PUT','kl/all/scores/'+U,U,{...rec(tk.st,4000,3,270),k:99}),false);
ex('押した記録の長さがちがう',await req('PUT','kl/all/scores/'+U,U,{...rec(tk.st,4000,3,270),lg:'3m3m'}),false);
ex('0個',await req('PUT','kl/all/scores/'+U,U,rec(tk.st,4000,0,0)),false);
ex('ほかの人の場所に書く',await req('PUT','kl/all/scores/'+U2,U,rec(tk.st,4000,3,270)),false);
ex('ふつうの記録（3個）',await req('PUT','kl/all/scores/'+U,U,rec(tk.st,4000,3,270)),true);
ex('今日のランキングに書く',await req('PUT','kl/d/scores/'+U,U,{...rec(tk.st,4000,3,270),dk:dk()}),true);
ex('今日のランキングに、ちがう日で書く',await req('PUT','kl/d/scores/'+U2,U2,{...rec(tk.st,4000,3,270),dk:dk()-1}),false);
ex('同じ回で数を増やして送る',await req('PUT','kl/all/scores/'+U,U,rec(tk.st,4000,4,360)),false);
ex('名前だけ変える',await req('PUT','kl/all/scores/'+U,U,rec(tk.st,4000,3,270,'なまえ')),true);
ex('今日のほうも名前だけ変える',await req('PUT','kl/d/scores/'+U,U,{...rec(tk.st,4000,3,270,'なまえ'),dk:dk()}),true);
ex('名前を変えるふりで点数を変える',await req('PUT','kl/all/scores/'+U,U,rec(tk.st,4000,3,280,'なまえ')),false);
ex('13文字の名前',await req('PUT','kl/all/scores/'+U,U,rec(tk.st,4000,3,270,'あいうえおかきくけこさしす')),false);
tk=await ticket(U);ex('2秒たって、もう一度始める',tk.r,true);await sleep(3200);
ex('前より悪い記録は全期間に載らない',await req('PUT','kl/all/scores/'+U,U,rec(tk.st,3000,2,180)),false);
ex('今日のほうも前より悪い記録は載らない',await req('PUT','kl/d/scores/'+U,U,{...rec(tk.st,3000,2,180),dk:dk()}),false);
await sleep(2100);tk=await ticket(U2);await sleep(3200);ex('新しい版（v2）の記録',await req('PUT','kl/all/scores/'+U2,U2,{...rec(tk.st,3000,2,180),v:2}),true);
ex('知らない版（v3）の記録',await req('PUT','kl/d/scores/'+U2,U2,{...rec(tk.st,3000,2,180),v:3,dk:dk()}),false);
ex('ランキングはだれでも読める',await req('GET','kl/all/scores',null),true);
ex('始めた時刻は本人以外読めない',await req('GET','kl/runs/'+U,U2),false);
console.log(fail?('失敗 '+fail+' 件'):'すべて合格');
process.exit(fail?1:0);
