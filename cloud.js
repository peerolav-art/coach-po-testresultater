(function(){
  'use strict';
  const cfg=window.COACH_PO_SUPABASE||{};
  const configured=cfg.url && cfg.anonKey && !cfg.url.includes('DIN-PROSJEKT') && !cfg.anonKey.includes('DIN-');
  let client=null, user=null, cloudReady=false, syncing=false, lastSnapshot=[];
  const ORIGINAL_KEY='testresultater-v1';
  const QUEUE_PREFIX='coach-po-sync-queue:';
  const MIGRATION_PREFIX='coach-po-cloud-migrated:';
  const rawPersist=()=>localStorage.setItem(ORIGINAL_KEY,JSON.stringify(data));
  const clone=v=>JSON.parse(JSON.stringify(v));
  const rowKey=r=>String(r.id);
  function setMsg(text,kind=''){
    const el=document.getElementById('authMsg'); if(el){el.className='authMsg '+kind; el.textContent=text;}
  }
  function setSync(text,kind=''){
    const el=document.getElementById('syncStatus'); if(el){el.className='syncPill '+kind; el.textContent=text;}
  }
  function showLoggedIn(on){
    document.getElementById('authShell').style.display=on?'none':'block';
    document.getElementById('appMain').style.display=on?'block':'none';
    document.getElementById('cloudBar').style.display=on?'flex':'none';
    if(on) document.getElementById('cloudEmail').textContent=user?.email||'';
  }
  function queueKey(){return QUEUE_PREFIX+(user?.id||'anonymous')}
  function getQueue(){try{return JSON.parse(localStorage.getItem(queueKey())||'[]')}catch{return []}}
  function setQueue(q){localStorage.setItem(queueKey(),JSON.stringify(q))}
  function toDb(r){return {
    id:Number.isFinite(Number(r.id))?Math.trunc(Number(r.id)):Date.now()*1000+Math.floor(Math.random()*1000),
    user_id:user.id, athlete:r.athlete||'', birthdate:r.birthdate||null,
    gender:r.gender||null, test_date:r.date||null, test_time:r.testTime||null, location:r.location||null, athlete_group:r.group||null,
    test_environment:r.environment||null, temperature_c:validNum(r.temperature), weather_text:r.weatherText||null, latitude:validNum(r.latitude), longitude:validNum(r.longitude),
   longjump:validNum(r.longjump), liakov:validNum(r.ljakov), ball:validNum(r.ball), sprint:validNum(r.sprint), squat:validNum(r.squat),
clean:validNum(r.clean), deadlift:validNum(r.deadlift), bench:validNum(r.bench),
bosco:validNum(r.bosco), bosco_type:r.boscoType||null, comment:r.comment||null
  }}
  function validNum(v){return v==null||v===''?null:(Number.isFinite(Number(v))?Number(v):null)}
  function fromDb(r){return {
    id:r.id, athlete:r.athlete, birthdate:r.birthdate, gender:r.gender, date:r.test_date, testTime:r.test_time,
   liakov:r.ljakov==null?null:Number(r.ljakov), ball:r.ball==null?null:Number(r.ball),
sprint:r.sprint==null?null:Number(r.sprint), bosco:r.bosco==null?null:Number(r.bosco), squat:r.squat==null?null:Number(r.squat),
clean:r.clean==null?null:Number(r.clean), deadlift:r.deadlift==null?null:Number(r.deadlift), bench:r.bench==null?null:Number(r.bench),
boscoType:r.bosco_type||'CMJ', comment:r.comment||null
  
  }}
  function same(a,b){return JSON.stringify(a)===JSON.stringify(b)}
  function enqueueDiff(prev,cur){
    if(!user)return;
    const p=new Map(prev.map(r=>[rowKey(r),r])), c=new Map(cur.map(r=>[rowKey(r),r]));
    const up=[]; const del=[];
    for(const [k,r] of c){if(!p.has(k)||!same(p.get(k),r))up.push(clone(r))}
    for(const k of p.keys()){if(!c.has(k))del.push(k)}
    if(up.length||del.length){const q=getQueue();q.push({upsert:up,delete:del,at:Date.now()});setQueue(q);flushQueue()}
  }
  // Replace the old local-only persistence with local cache + granular cloud queue.
  window.persist=function(){
    rawPersist();
    if(cloudReady){const now=clone(data);enqueueDiff(lastSnapshot,now);lastSnapshot=now}
  };
  async function flushQueue(){
    if(!client||!user||syncing||!navigator.onLine)return;
    const q=getQueue();if(!q.length){setSync('Synkronisert','good');return}
    syncing=true;setSync('Synkroniserer…');
    try{
      while(q.length){
        const op=q[0];
        if(op.upsert?.length){
          const payload=op.upsert.map(toDb);
          const {error}=await client.from('test_results').upsert(payload,{onConflict:'id'});
          if(error)throw error;
        }
       if(op.delete?.length){
  const ids=op.delete.map(x=>Number(x)).filter(Number.isFinite).map(Math.trunc);
  if(ids.length){
    const {error}=await client.from('test_results')
      .delete()
      .eq('user_id',user.id)
      .in('id',ids);
    if(error)throw error;
  }
}
        q.shift();setQueue(q);
      }
      setSync('Synkronisert','good');
    }catch(e){
      console.error(e);setSync(navigator.onLine?'Synk-feil':'Offline – venter','warn');
    }finally{syncing=false}
  }
  function dedupe(rows){
    const map=new Map();
    for(const r of rows){
      const fp=[(r.athlete||'').trim().toLowerCase(),r.date||'',validNum(r.longjump),validNum(r.liakov),validNum(r.sprint),validNum(r.bosco)].join('|');
      if(!map.has(fp))map.set(fp,r);
    }
    return [...map.values()];
  }
  async function fetchRemote(){
    const {data:rows,error}=await client.from('test_results').select('*').eq('user_id',user.id).order('created_at',{ascending:true});
    if(error)throw error;return (rows||[]).map(fromDb);
  }
  async function uploadRows(rows){
    if(!rows.length)return;
    const clean=dedupe(rows).map((r,i)=>{if(r.id==null||r.id==='')r.id='migrated-'+Date.now()+'-'+i;return r});
    for(let i=0;i<clean.length;i+=200){
      const {error}=await client.from('test_results').upsert(clean.slice(i,i+200).map(toDb),{onConflict:'id'});
      if(error)throw error;
    }
  }
  async function bootstrap(){
    setSync('Laster data…'); cloudReady=false;
    try{
      await flushQueue();
      let remote=await fetchRemote();
      const migrated=localStorage.getItem(MIGRATION_PREFIX+user.id)==='1';
      if(!remote.length && !migrated && Array.isArray(data) && data.length){
        setSync('Flytter lokale data…');
        await uploadRows(data);
        localStorage.setItem(MIGRATION_PREFIX+user.id,'1');
        remote=await fetchRemote();
      }else if(!migrated){localStorage.setItem(MIGRATION_PREFIX+user.id,'1')}
      data=remote;rawPersist();lastSnapshot=clone(data);cloudReady=true;render();setSync('Synkronisert','good');
    }catch(e){
      console.error(e);cloudReady=true;lastSnapshot=clone(data);render();setSync('Kun lokal cache','warn');
    }
  }
  async function refresh(){
    if(!client||!user)return;
    setSync('Oppdaterer…');
    try{
      await flushQueue();
      if(getQueue().length)return;
      const remote=await fetchRemote();
      data=remote;rawPersist();lastSnapshot=clone(data);render();setSync('Synkronisert','good');
    }catch(e){console.error(e);setSync('Kunne ikke oppdatere','warn')}
  }
  async function signIn(){
    if(!client)return setMsg('Supabase er ikke konfigurert ennå. Fyll inn config.js.','warn');
    const email=document.getElementById('authEmail').value.trim(),password=document.getElementById('authPassword').value;
    if(!email||!password)return setMsg('Skriv inn e-post og passord.','warn');
    setMsg('Logger inn…');
    const {error}=await client.auth.signInWithPassword({email,password});
    if(error)setMsg(error.message,'warn');
  }
  async function signUp(){
    if(!client)return setMsg('Supabase er ikke konfigurert ennå. Fyll inn config.js.','warn');
    const email=document.getElementById('authEmail').value.trim(),password=document.getElementById('authPassword').value;
    if(!email||password.length<6)return setMsg('Bruk gyldig e-post og et passord på minst 6 tegn.','warn');
    setMsg('Oppretter konto…');
    const {data:res,error}=await client.auth.signUp({email,password});
    if(error)return setMsg(error.message,'warn');
    if(!res.session)setMsg('Konto opprettet. Bekreft e-posten, og logg deretter inn.','good');
  }
async function requestPasswordReset(){
  if(!client)return setMsg('Supabase er ikke konfigurert ennå.','warn');
  const email=document.getElementById('authEmail').value.trim();
  if(!email)return setMsg('Skriv inn e-postadressen din først.','warn');
  setMsg('Sender lenke for nytt passord…');
  const redirectTo=window.location.origin+window.location.pathname;
  const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo});
  if(error)return setMsg(error.message,'warn');
  setMsg('E-post sendt. Åpne lenken i e-posten for å velge nytt passord.','good');
}
function showPasswordReset(){
  const modal=document.getElementById('passwordResetModal');
  if(modal)modal.classList.add('open');
}

async function updatePassword(){
  if(!client)return;

  const p1=document.getElementById('newPassword')?.value||'';
  const p2=document.getElementById('newPasswordRepeat')?.value||'';
  const msg=document.getElementById('passwordResetMsg');

  const say=(text,kind='')=>{
    if(msg){
      msg.className='authMsg '+kind;
      msg.textContent=text;
    }
  };

  if(p1.length<6)return say('Passordet må være minst 6 tegn.','warn');
  if(p1!==p2)return say('Passordene er ikke like.','warn');

  say('Lagrer nytt passord…');

  const {error}=await client.auth.updateUser({password:p1});

  if(error)return say(error.message,'warn');

  say('Passordet er oppdatert. Du er nå logget inn.','good');

  setTimeout(()=>{
    document.getElementById('passwordResetModal')?.classList.remove('open');
  },900);
}
  async function signOut(){if(client)await client.auth.signOut()}
  async function updateResult(row){
    if(!client||!user)throw new Error('Ikke koblet til databasen.');
    const id=Number(row.id);
    if(!Number.isFinite(id))throw new Error('Resultatet mangler en gyldig database-ID.');
    const payload={
      athlete:row.athlete||'', birthdate:row.birthdate||null, gender:row.gender||null,
      test_date:row.date||null, test_time:row.testTime||null, location:row.location||null, athlete_group:row.group||null,
      test_environment:row.environment||null, temperature_c:validNum(row.temperature), weather_text:row.weatherText||null, latitude:validNum(row.latitude), longitude:validNum(row.longitude),
      longjump:validNum(row.longjump), liakov:validNum(row.liakov), ball:validNum(row.ball),
      sprint:validNum(row.sprint), bosco:validNum(row.bosco), bosco_type:row.boscoType||null,
      comment:row.comment||null, updated_at:new Date().toISOString()
    };
    setSync('Lagrer…');
    const {data:updated,error}=await client.from('test_results')
      .update(payload)
      .eq('user_id',user.id)
      .eq('id',Math.trunc(id))
      .select('id');
    if(error){setSync('Lagringsfeil','warn');throw error;}
    if(!updated||updated.length!==1){setSync('Lagringsfeil','warn');throw new Error('Fant ikke resultatet som skulle oppdateres.');}
    rawPersist();lastSnapshot=clone(data);setSync('Synkronisert','good');
    return true;
  }
  window.cloudUpdateResult=updateResult;
  window.cloudSignIn=signIn;window.cloudSignUp=signUp;window.cloudSignOut=signOut;window.cloudRefresh=refresh;window.cloudRequestPasswordReset=requestPasswordReset;window.cloudUpdatePassword=updatePassword;
  window.addEventListener('online',()=>{setSync('Online – synkroniserer…');flushQueue().then(refresh)});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&user)refresh()});
  if(!configured){
    showLoggedIn(false);setMsg('Database er klar i appen, men Supabase må kobles til. Se OPPSETT_SUPABASE.md og fyll inn config.js.','warn');return;
  }
  if(!window.supabase?.createClient){showLoggedIn(false);setMsg('Kunne ikke laste Supabase-biblioteket. Kontroller internettilkoblingen.','warn');return}
  client=window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  client.auth.onAuthStateChange(async(event,session)=>{
  user=session?.user||null;

  if(event==='PASSWORD_RECOVERY'){
    showLoggedIn(false);
    showPasswordReset();
    return;
  }

  if(user){
    showLoggedIn(true);
    await bootstrap();
  }else{
    cloudReady=false;
    showLoggedIn(false);
    setMsg('Logg inn for å hente den felles databasen.');
    setSync('Ikke innlogget');
  }
});
  client.auth.getSession().then(({data:res})=>{
    if(!res.session){showLoggedIn(false);setMsg('Logg inn med samme konto på alle enhetene.');}
  });
})();
