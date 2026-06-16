(async ()=>{
  const fetch = (typeof globalThis.fetch !== 'undefined') ? globalThis.fetch : require('node-fetch');
  const base = 'http://localhost:10000/api';
  function j(body){return {method:'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)}}
  function pjs(body){return {method:'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body)}}
  async function req(path, opts, token){opts = opts||{}; opts.headers = opts.headers||{}; if(token) opts.headers.Authorization = 'Bearer ' + token; const r = await fetch(base+path, opts); const text = await r.text(); let json=null; try{json=JSON.parse(text)}catch(e){} return {status: r.status, text, json};}
  console.log('Starting flow test');
  async function ensureUser(email, pass, name){ let r = await req('/auth/register', j({email, password: pass, fullName: name})); if(r.status===201) console.log('registered', email); else console.log('register skipped', email, r.status); r = await req('/auth/login', j({email, password: pass})); if(r.json && r.json.token) return r.json; throw new Error('login failed '+email+' '+JSON.stringify(r)); }
  const learnerCred = await ensureUser('flow_learner@example.com','flowpass','Flow Learner');
  const teacherCred = await ensureUser('flow_teacher@example.com','flowpass','Flow Teacher');
  const adminLogin = await req('/auth/login', j({email: 'admin@skilltrading.com', password: 'admin123'}));
  if(!adminLogin.json || !adminLogin.json.token) throw new Error('admin login failed');
  const learnerToken = learnerCred.token; const teacherToken = teacherCred.token; const adminToken = adminLogin.json.token;
  console.log('tokens ready');

  // schedule for tomorrow 09:00 Asia/Ho_Chi_Minh => UTC 02:00Z
  const tomorrow = new Date(Date.now()+24*3600*1000);
  const y = tomorrow.getFullYear(); const m = String(tomorrow.getMonth()+1).padStart(2,'0'); const d = String(tomorrow.getDate()).padStart(2,'0');
  const scheduledAt = `${y}-${m}-${d}T02:00:00.000Z`;
  // compute weekday in VN timezone
  const weekday = new Date(scheduledAt).toLocaleString('en-GB',{timeZone:'Asia/Ho_Chi_Minh', weekday:'short'});
  const dayMap = {'Mon':1,'Tue':2,'Wed':3,'Thu':4,'Fri':5,'Sat':6,'Sun':7};
  const day = String(dayMap[weekday]||1);

  // teacher creates skill
  const skillData = { title: 'Flow Test Skill', description: 'Test', category: 'Test', price: 50, availabilitySlots: [{day, start: '09:00', end: '10:00', label: '9-10'}], isPublished: true };
  let r = await req('/skills', j(skillData), teacherToken);
  if(r.status !== 201){ console.error('create skill failed', r.status, r.text); process.exit(1);} const skill = r.json; console.log('skill created', skill.id);

  // admin approve (PUT)
  r = await req('/admin/skills/'+skill.id+'/approve', pjs({}), adminToken); console.log('approve', r.status);

  // fund learner
  const learnerId = learnerCred.user?.id || (await req('/auth/me', {}, learnerToken)).json?.user?.id;
  if(!learnerId) { console.error('Could not determine learner id'); process.exit(1); }
  r = await req('/admin/users/'+learnerId+'/adjust-skc', pjs({amount:300, reason:'test funding'}), adminToken); console.log('fund learner', r.status);

  // learner book
  r = await req('/bookings', j({skillId: skill.id, scheduledAt, durationHours:1, message:'Booking flow test'}), learnerToken);
  if(r.status !== 201){ console.error('book failed', r.status, r.text); process.exit(1);} const booking = r.json; console.log('booking created', booking.id, 'status', booking.status);

  // teacher confirm
  r = await req('/bookings/'+booking.id+'/confirm', pjs({}), teacherToken); console.log('teacher confirm', r.status);

  // teacher mark done
  r = await req('/bookings/'+booking.id+'/mark-done', j({}), teacherToken); console.log('mark done', r.status, r.text);

  // fetch booking
  r = await req('/bookings/'+booking.id, {}, teacherToken); console.log('booking after markDone', r.status, JSON.stringify(r.json,null,2));

  // learner confirm
  r = await req('/bookings/'+booking.id+'/confirm', j({}), learnerToken); console.log('learner confirm', r.status, r.text);
  r = await req('/bookings/'+booking.id, {}, learnerToken); console.log('booking after learner confirm', r.status, JSON.stringify(r.json,null,2));

  // Auto-confirm test: create booking2
  r = await req('/bookings', j({skillId: skill.id, scheduledAt, durationHours:1, message:'Auto confirm test'}), learnerToken); const b2 = r.json; console.log('booking2', b2.id);
  await req('/bookings/'+b2.id+'/confirm', pjs({}), teacherToken);
  await req('/bookings/'+b2.id+'/mark-done', j({}), teacherToken);

  // backdate teacherDoneAt via prisma using server lib
  try{
    const prisma = require('./server/lib/prisma');
    await prisma.booking.update({ where: { id: b2.id }, data: { teacherDoneAt: new Date(Date.now() - 13*3600*1000) } });
    console.log('backdated booking2');
  }catch(e){ console.error('backdate failed', e); }

  // trigger admin dashboard to run expirePendingBookings
  r = await req('/admin/dashboard', {}, adminToken); console.log('admin dashboard', r.status);
  r = await req('/bookings/'+b2.id, {}, learnerToken); console.log('booking2 after auto-confirm', r.status, JSON.stringify(r.json,null,2));

  // teacher-cancel scenario
  r = await req('/bookings', j({skillId: skill.id, scheduledAt, durationHours:1, message:'Teacher cancel test'}), learnerToken); const b3 = r.json; console.log('booking3', b3.id);
  await req('/bookings/'+b3.id+'/confirm', pjs({}), teacherToken);
  r = await req('/bookings/'+b3.id+'/cancel', pjs({reason:'emergency'}), teacherToken); console.log('teacher cancel b3', r.status, r.text);

  // fetch transactions
  r = await req('/transactions/my', {}, learnerToken); console.log('learner tx', r.status, JSON.stringify(r.json?.transactions?.slice(0,5),null,2));
  r = await req('/transactions/my', {}, teacherToken); console.log('teacher tx', r.status, JSON.stringify(r.json?.transactions?.slice(0,5),null,2));

  console.log('Flow test completed');
  process.exit(0);
})();
