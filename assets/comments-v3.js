import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, browserLocalPersistence, setPersistence } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyCzaMd2nmPNo8R6Gp1XpFXsOS_gFFBDXh8',
  authDomain: 'ranasports-172b6.firebaseapp.com',
  projectId: 'ranasports-172b6',
  storageBucket: 'ranasports-172b6.firebasestorage.app',
  messagingSenderId: '325852299356',
  appId: '1:325852299356:web:2ee36159ade6fe99d1e699'
};

const articleId = new URL(location.href).searchParams.get('n');
const detail = document.querySelector('#newsDetail');
if (articleId && detail) {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  try { await setPersistence(auth, browserLocalPersistence); } catch (e) { console.warn('RanaSports auth persistence:', e); }
  const db = getFirestore(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  let currentUser = null;
  let replyingTo = null;
  let cache = [];

  const css = document.createElement('style');
  css.textContent = `.rs-comments{max-width:900px;margin:34px auto 10px;padding:22px;border:1px solid #27303a;border-radius:14px;background:#0d131a;color:#edf2f7}.rs-comments *{box-sizing:border-box}.rs-comments-head,.rs-authbar,.rs-compose-actions{display:flex;align-items:center;justify-content:space-between;gap:12px}.rs-comments h2{margin:0}.rs-comments-count,.rs-comment-policy,.rs-charcount{color:#9aa7b5;font-size:.84rem}.rs-authbar{padding:12px;border:1px solid #27303a;border-radius:10px;background:#111923;margin:15px 0}.rs-user{display:flex;align-items:center;gap:9px}.rs-user img,.rs-comment-avatar{width:34px;height:34px;border-radius:50%;object-fit:cover}.rs-user-name,.rs-comment-name{font-weight:900}.rs-btn{border:0;border-radius:9px;padding:9px 13px;font-weight:900;cursor:pointer}.rs-btn-primary{background:#ff123b;color:#fff}.rs-btn-secondary{background:#202a35;color:#fff}.rs-btn-link{background:transparent;color:#b8c3cf;padding:4px 6px;font-size:.78rem}.rs-composer{display:grid;gap:9px;margin-bottom:22px}.rs-composer textarea{width:100%;min-height:96px;resize:vertical;border:1px solid #303b47;border-radius:10px;background:#080d12;color:#fff;padding:12px;font:inherit}.rs-message{min-height:1.2em;margin:0;color:#ff8fa3;font-size:.82rem}.rs-list{display:grid;gap:12px}.rs-empty{padding:18px;text-align:center;color:#8996a3;border:1px dashed #303b47;border-radius:10px}.rs-comment{display:grid;grid-template-columns:38px 1fr;gap:10px;padding:13px;border:1px solid #252f3a;border-radius:11px;background:#10171f}.rs-comment.rs-reply{margin-left:44px;border-left:3px solid #394655}.rs-comment-time{font-size:.74rem;color:#8795a3;margin-left:7px}.rs-comment-text{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.45}.rs-replying{display:none;color:#b7c2ce;font-size:.82rem}.rs-replying.active{display:flex;justify-content:space-between}@media(max-width:640px){.rs-comments{padding:15px}.rs-authbar{align-items:flex-start;flex-direction:column}.rs-comment.rs-reply{margin-left:18px}}`;
  document.head.append(css);

  const section = document.createElement('section');
  section.className = 'rs-comments';
  section.id = 'comentarios';
  section.innerHTML = `<div class="rs-comments-head"><h2>💬 COMENTARIOS</h2><span class="rs-comments-count" id="rsCount">0 comentarios</span></div><p class="rs-comment-policy">Opiná con respeto. No se permite odio, acoso, amenazas, publicación de datos personales ni spam. Los comentarios pueden ser reportados y moderados.</p><div class="rs-authbar"><div id="rsUser">Iniciá sesión para comentar.</div><div><button class="rs-btn rs-btn-primary" id="rsLogin" type="button">Continuar con Google</button><button class="rs-btn rs-btn-secondary" id="rsLogout" type="button" hidden>Salir</button></div></div><form class="rs-composer" id="rsForm"><div class="rs-replying" id="rsReply"><span></span><button type="button" class="rs-btn rs-btn-link" id="rsCancel">Cancelar</button></div><textarea id="rsText" maxlength="1000" placeholder="Escribí tu opinión…" disabled></textarea><div class="rs-compose-actions"><span class="rs-charcount"><span id="rsChars">0</span>/1000</span><button class="rs-btn rs-btn-primary" id="rsPublish" type="submit" disabled>PUBLICAR</button></div><p class="rs-message" id="rsMsg" role="status"></p></form><div class="rs-list" id="rsList"><div class="rs-empty">Cargando comentarios…</div></div>`;
  const cta = document.querySelector('.article-cta');
  (cta || detail).insertAdjacentElement(cta ? 'beforebegin' : 'afterend', section);

  const $ = s => section.querySelector(s);
  const els = { count:$('#rsCount'), user:$('#rsUser'), login:$('#rsLogin'), logout:$('#rsLogout'), form:$('#rsForm'), reply:$('#rsReply'), cancel:$('#rsCancel'), text:$('#rsText'), chars:$('#rsChars'), publish:$('#rsPublish'), msg:$('#rsMsg'), list:$('#rsList') };
  const commentsRef = collection(db, 'articles', articleId, 'comments');
  const msg = t => { els.msg.textContent = t || ''; };
  const safeName = v => (v || 'Usuario').trim().slice(0,80) || 'Usuario';
  const fmt = t => t?.toDate ? new Intl.DateTimeFormat('es-AR',{timeZone:'America/Argentina/Buenos_Aires',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(t.toDate())+' ARG' : 'recién';

  function updateReplyUI(){
    const s = els.reply.querySelector('span');
    if (!replyingTo) { els.reply.classList.remove('active'); s.textContent=''; return; }
    s.textContent = `Respondiendo a ${replyingTo.name}`;
    els.reply.classList.add('active');
    els.text.focus();
  }

  function commentNode(item, isReply=false){
    const d=item.data, wrap=document.createElement('article');
    wrap.className='rs-comment'+(isReply?' rs-reply':'');
    const av=document.createElement('img'); av.className='rs-comment-avatar'; av.alt=''; av.src=d.photoURL||'assets/icon-192.png';
    const body=document.createElement('div'), meta=document.createElement('div');
    const nm=document.createElement('span'); nm.className='rs-comment-name'; nm.textContent=safeName(d.displayName);
    const tm=document.createElement('span'); tm.className='rs-comment-time'; tm.textContent=fmt(d.createdAt);
    meta.append(nm,tm);
    const p=document.createElement('p'); p.className='rs-comment-text'; p.textContent=d.text||'';
    const actions=document.createElement('div');
    const reply=document.createElement('button'); reply.type='button'; reply.className='rs-btn rs-btn-link'; reply.textContent='Responder';
    reply.onclick=()=>{ if(!currentUser) return msg('Iniciá sesión con Google para responder.'); replyingTo={id:d.parentId||item.id,name:safeName(d.displayName)}; updateReplyUI(); };
    actions.append(reply);
    if(currentUser && d.uid===currentUser.uid){
      const del=document.createElement('button'); del.type='button'; del.className='rs-btn rs-btn-link'; del.textContent='Eliminar';
      del.onclick=async()=>{ if(confirm('¿Eliminar tu comentario?')) { try{ await deleteDoc(doc(db,'articles',articleId,'comments',item.id)); }catch{ msg('No se pudo eliminar el comentario.'); } } };
      actions.append(del);
    } else {
      const report=document.createElement('button'); report.type='button'; report.className='rs-btn rs-btn-link'; report.textContent='Reportar';
      report.onclick=async()=>{ if(!currentUser) return msg('Iniciá sesión para reportar.'); const reason=prompt('Motivo del reporte:','Contenido inapropiado'); if(!reason?.trim()) return; try{ await setDoc(doc(db,'articles',articleId,'comments',item.id,'reports',currentUser.uid),{uid:currentUser.uid,reason:reason.trim().slice(0,300),createdAt:serverTimestamp()}); msg('Reporte enviado. Gracias.'); }catch{ msg('No se pudo enviar el reporte.'); } };
      actions.append(report);
    }
    body.append(meta,p,actions); wrap.append(av,body); return wrap;
  }

  function render(){
    els.list.replaceChildren();
    const visible=cache.filter(c=>c.data.status==='visible');
    els.count.textContent=`${visible.length} comentario${visible.length===1?'':'s'}`;
    if(!visible.length){ els.list.innerHTML='<div class="rs-empty">Todavía no hay comentarios. Sé el primero en opinar.</div>'; return; }
    const by=new Map(visible.map(c=>[c.id,c])), replies=new Map(), roots=[];
    for(const c of visible){ if(c.data.parentId && by.has(c.data.parentId)){ if(!replies.has(c.data.parentId)) replies.set(c.data.parentId,[]); replies.get(c.data.parentId).push(c); } else roots.push(c); }
    for(const root of roots){ els.list.append(commentNode(root)); for(const child of replies.get(root.id)||[]) els.list.append(commentNode(child,true)); }
  }

  function authError(e){
    console.error('RanaSports auth:',e);
    const map={
      'auth/popup-blocked':'El navegador bloqueó la ventana de Google. Permití pop-ups para RanaSports y probá de nuevo.',
      'auth/popup-closed-by-user':'Se cerró la ventana de Google antes de completar el ingreso.',
      'auth/unauthorized-domain':'Este dominio todavía no está autorizado en Firebase.',
      'auth/network-request-failed':'No se pudo conectar con Google. Revisá la conexión.',
      'auth/web-storage-unsupported':'El navegador bloquea el almacenamiento necesario para iniciar sesión.',
      'auth/api-key-not-valid.-please-pass-a-valid-api-key.':'La clave de Firebase no es válida.'
    };
    return map[e?.code] || `No se pudo iniciar sesión con Google${e?.code?` (${e.code})`:''}.`;
  }

  els.login.onclick=async()=>{ msg('Abriendo Google…'); els.login.disabled=true; try{ await signInWithPopup(auth,provider); msg(''); }catch(e){ msg(authError(e)); }finally{ els.login.disabled=false; } };
  els.logout.onclick=()=>signOut(auth);
  els.cancel.onclick=()=>{ replyingTo=null; updateReplyUI(); };
  els.text.oninput=()=>{ els.chars.textContent=String(els.text.value.length); msg(''); };
  els.form.onsubmit=async e=>{
    e.preventDefault();
    if(!currentUser) return msg('Iniciá sesión con Google para comentar.');
    const text=els.text.value.trim();
    if(text.length<2) return msg('El comentario es demasiado corto.');
    if(text.length>1000) return msg('El comentario supera los 1000 caracteres.');
    if((text.match(/https?:\/\/|www\./gi)||[]).length>2) return msg('Evitá publicar múltiples enlaces o spam.');
    if(/\b(te\s+voy\s+a\s+matar|ojal[aá]\s+te\s+mueras|matate|suicidate)\b/i.test(text)) return msg('Ese mensaje infringe las reglas de convivencia.');
    const last=Number(localStorage.getItem('rs-last-comment-at')||0);
    if(Date.now()-last<20000) return msg('Esperá unos segundos antes de publicar otro comentario.');
    els.publish.disabled=true;
    try{
      const payload={uid:currentUser.uid,displayName:safeName(currentUser.displayName),photoURL:currentUser.photoURL||'',text,status:'visible',createdAt:serverTimestamp()};
      if(replyingTo?.id) payload.parentId=replyingTo.id;
      await addDoc(commentsRef,payload);
      localStorage.setItem('rs-last-comment-at',String(Date.now()));
      els.text.value=''; els.chars.textContent='0'; replyingTo=null; updateReplyUI(); msg('Comentario publicado.');
    }catch(err){ console.error('RanaSports comment publish:',err); msg('No se pudo publicar el comentario.'); }
    finally{ els.publish.disabled=!currentUser; }
  };

  onAuthStateChanged(auth,user=>{
    currentUser=user; els.user.replaceChildren();
    if(user){
      const w=document.createElement('div'); w.className='rs-user';
      const im=document.createElement('img'); im.alt=''; im.src=user.photoURL||'assets/icon-192.png';
      const n=document.createElement('span'); n.className='rs-user-name'; n.textContent=safeName(user.displayName);
      w.append(im,n); els.user.append(w); els.login.hidden=true; els.logout.hidden=false; els.text.disabled=false; els.publish.disabled=false;
    } else {
      els.user.textContent='Iniciá sesión para comentar.'; els.login.hidden=false; els.logout.hidden=true; els.text.disabled=true; els.publish.disabled=true; replyingTo=null; updateReplyUI();
    }
    render();
  });

  onSnapshot(query(commentsRef,orderBy('createdAt','asc')),snapshot=>{ cache=snapshot.docs.map(d=>({id:d.id,data:d.data()})); render(); },error=>{ console.error('RanaSports comments read:',error); els.list.innerHTML='<div class="rs-empty">No se pudieron cargar los comentarios.</div>'; });
}
