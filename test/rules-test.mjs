// ランキングのルールの試験（GitHub の上で Firebase の試し用データベースを立てて試す。本番のデータには触らない）
const NS='ft-green-default-rtdb',PROJ='ft-green',BASE='http://127.0.0.1:9000';
const b64=o=>Buffer.from(JSON.stringify(o)).toString('base64url');
const tok=uid=>b64({alg:'none',typ:'JWT'})+'.'+b64({uid,sub:uid,user_id:uid,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600,aud:PROJ,iss:'https://securetoken.google.com/'+PROJ,provider_id:'anonymous',firebase:{sign_in_provider:'anonymous'}})+'.';
async function req(method,path,uid,body){const r=await fetch(BASE+'/'+path+'.json?ns='+NS+(uid?'&auth='+tok(uid):''),{method,headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});return {ok:r.ok,status:r.status,j:await r.json().catch(()=>null)};}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let fail=0;const ex=(name,res,want)=>{const ok=res.ok===want;console.log((ok?'OK  ':'NG  ')+name+' → '+res.status);if(!ok){fail++;console.log(JSON.stringify(res.j));}};
const TS={'.sv':'timestamp'};
const U='user1aaaaaaaaaaaaaaaaaaa',U2='user2bbbbbbbbbbbbbbbbbbb',U3='user3ccccccccccccccccccc';
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
// 軽い写し（ランキングを軽く読むための「名前・個数・点数だけ」の写し。記録と同じ中身のときだけ書ける）
await sleep(2100);tk=await ticket(U);ex('写しの試験のために始める',tk.r,true);await sleep(3200);
const slim=r=>({n:r.n,c:r.c,p:r.p,k:r.k,t:TS});
const R=rec(tk.st,3000,5,450);const RD={...R,dk:dk(),ds:dk()*10000000000+R.k};
ex('記録と軽い写しをまとめて書く（全期間）',await req('PATCH','kl',U,{['all/scores/'+U]:R,['sa/'+U]:slim(R)}),true);
ex('記録と軽い写しをまとめて書く（今日）',await req('PATCH','kl',U,{['d/scores/'+U]:RD,['sd/'+U]:{...slim(R),dk:RD.dk,ds:RD.ds}}),true);
ex('軽い写しだけ点数を盛る',await req('PATCH','kl',U,{['sa/'+U]:{...slim(R),p:R.p+1,k:R.k+1}}),false);
ex('軽い写しだけ名前を変える（記録とちがう）',await req('PATCH','kl',U,{['sa/'+U]:{...slim(R),n:'にせもの'}}),false);
ex('今日の軽い写しの日付をずらす',await req('PATCH','kl',U,{['sd/'+U]:{...slim(R),dk:RD.dk+1,ds:RD.ds+10000000000}}),false);
ex('今日の軽い写しに知らない項目を足す',await req('PATCH','kl',U,{['sd/'+U]:{...slim(R),dk:RD.dk,ds:RD.ds,x:1}}),false);
ex('ほかの人の軽い写しを書く',await req('PATCH','kl',U2,{['sa/'+U]:slim(R)}),false);
ex('記録のない人の軽い写しを書く',await req('PATCH','kl',U3,{['sa/'+U3]:slim(R)}),false);
ex('ログインなしで軽い写しを書く',await req('PATCH','kl',null,{['sa/'+U]:slim(R)}),false);
ex('記録と同じ軽い写しを書きなおす',await req('PATCH','kl',U,{['sa/'+U]:slim(R)}),true);
ex('名前だけ変える（記録と写しをまとめて）',await req('PATCH','kl',U,{['all/scores/'+U]:{...R,n:'なまえ2'},['sa/'+U]:{...slim(R),n:'なまえ2'}}),true);
ex('今日のほうも名前だけ変える（まとめて）',await req('PATCH','kl',U,{['d/scores/'+U]:{...RD,n:'なまえ2'},['sd/'+U]:{...slim(R),n:'なまえ2',dk:RD.dk,ds:RD.ds}}),true);
ex('軽い写しを消す',await req('DELETE','kl/sa/'+U,U),false);
ex('写しが合わないと記録もまとめて書けない',await req('PATCH','kl',U,{['all/scores/'+U]:{...R,n:'なまえ3'},['sa/'+U]:{...slim(R),n:'ちがう'}}),false);
ex('前の書き方（記録だけ）もそのまま書ける',await req('PUT','kl/all/scores/'+U,U,{...R,n:'なまえ4'}),true);
ex('軽い写しはだれでも読める（全期間）',await req('GET','kl/sa',null),true);
ex('軽い写しはだれでも読める（今日）',await req('GET','kl/sd',null),true);
console.log(fail?('失敗 '+fail+' 件'):'すべて合格');
process.exit(fail?1:0);
