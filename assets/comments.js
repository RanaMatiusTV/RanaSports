import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyCzaMd2mPNO8R6Gp1XpFXs0S_gFFBDXh8',
  authDomain: 'ranasports-172b6.firebaseapp.com',
  projectId: 'ranasports-172b6',
  storageBucket: 'ranasports-172b6.firebasestorage.app',
  messagingSenderId: '325852299356',
  appId: '1:325852299356:web:2ee36159ade6fe99d1e699'
};

const articleId = new URL(location.href).searchParams.get('n');
const detail = document.querySelector('#newsDetail');
if (!articleId || !detail) {
  // Comments only exist on individual RanaSports articles.
} else {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  let currentUser = null;
  let replyingTo = null;
  let commentsCache = [];

  const css = document.createElement('style');
  css.id = 'ranasports-comments-styles';
  css.textContent = `
    .rs-comments{max-width:900px;margin:34px auto 10px;padding:22px;border:1px solid #27303a;border-radius:14px;background:#0d131a;color:#edf2f7}
    .rs-comments *{box-sizing:border-box}
    .rs-comments-head{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:18px}
    .rs-comments h2{margin:0;font-size:clamp(1.25rem,2vw,1.7rem)}
    .rs-comments-count{font-size:.82rem;color:#9aa7b5;font-weight:800}
    .rs-comment-policy{margin:0 0 16px;color:#9aa7b5;font-size:.84rem;line-height:1.45}
    .rs-authbar{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border:1px solid #27303a;border-radius:10px;background:#111923;margin-bottom:14px}
    .rs-user{display:flex;align-items:center;gap:9px;min-width:0}
    .rs-user img,.rs-comment-avatar{width:34px;height:34px;border-radius:50%;object-fit:cover;background:#202a35}
    .rs-user-name{font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .rs-btn{appearance:none;border:0;border-radius:9px;padding:9px 13px;font-weight:900;cursor:pointer}
    .rs-btn-primary{background:#ff123b;color:white}.rs-btn-secondary{background:#202a35;color:#fff}
    .rs-btn-link{background:transparent;color:#b8c3cf;padding:4px 6px;font-size:.78rem}
    .rs-btn-link:hover{color:white}
    .rs-composer{display:grid;gap:9px;margin-bottom:22px}
    .rs-replying{display:none;font-size:.82rem;color:#b7c2ce}.rs-replying.active{display:flex;justify-content:space-between;gap:8px}
    .rs-composer textarea{width:100%;min-height:96px;resize:vertical;border:1px solid #303b47;border-radius:10px;background:#080d12;color:#fff;padding:12px;font:inherit;line-height:1.4}
    .rs-composer textarea:disabled{opacity:.6;cursor:not-allowed}
    .rs-compose-actions{display:flex;align-items:center;justify-content:space-between;gap:12px}
    .rs-charcount{font-size:.78rem;color:#8996a3}
    .rs-message{min-height:1.2em;margin:0;font-size:.82rem;color:#ffb3c0}
    .rs-list{display:grid;gap:12px}
    .rs-empty{padding:18px;text-align:center;color:#8996a3;border:1px dashed #303b47;border-radius:10px}
    .rs-comment{display:grid;grid-template-columns:38px 1fr;gap:10px;padding:13px;border:1px solid #252f3a;border-radius:11px;background:#10171f}
    .rs-comment.rs-reply{margin-left:44px;border-left:3px solid #394655}
    .rs-comment-meta{display:flex;align-items:baseline;flex-wrap:wrap;gap:7px}
    .rs-comment-name{font-weight:900}.rs-comment-time{font-size:.74rem;color:#8795a3}
    .rs-comment-text{margin:7px 0 8px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.48}
    .rs-comment-actions{display:flex;flex-wrap:wrap;gap:4px}
    @media(max-width:640px){.rs-comments{margin:26px 0 8px;padding:15px;border-radius:11px}.rs-authbar{align-items:flex-start;flex-direction:column}.rs-comment.rs-reply{margin-left:18px}}
    html[data-theme="light"] .rs-comments{background:#fff;color:#121820;border-color:#d8dee5}
    html[data-theme="light"] .rs-authbar,html[data-theme="light"] .rs-comment{background:#f6f8fa;border-color:#d8dee5}
    html[data-theme="light"] .rs-composer textarea{background:#fff;color:#111;border-color:#c9d1d9}
  `;
  document.head.append(css);

  const section = document.createElement('section');
  section.className = 'rs-comments';
  section.id = 'comentarios';
  section.innerHTML = `
    <div class="rs-comments-head">
      <h2>💬 COMENTARIOS</h2>
      <span class="rs-comments-count" id="rsCommentCount">0 comentarios</span>
    </div>
    <p class="rs-comment-policy">Opiná con respeto. No se permite odio, acoso, amenazas, publicación de datos personales ni spam. Los comentarios pueden ser reportados y moderados.</p>
    <div class="rs-authbar">
      <div id="rsUserBox"><span>Iniciá sesión para comentar.</span></div>
      <div>
        <button class="rs-btn rs-btn-primary" id="rsLoginBtn" type="button">Continuar con Google</button>
        <button class="rs-btn rs-btn-secondary" id="rsLogoutBtn" type="button" hidden>Salir</button>
      </div>
    </div>
    <form class="rs-composer" id="rsCommentForm">
      <div class="rs-replying" id="rsReplying"><span></span><button class="rs-btn rs-btn-link" id="rsCancelReply" type="button">Cancelar respuesta</button></div>
      <textarea id="rsCommentText" maxlength="1000" placeholder="Escribí tu opinión…" disabled></textarea>
      <div class="rs-compose-actions">
        <span class="rs-charcount"><span id="rsCharCount">0</span>/1000</span>
        <button class="rs-btn rs-btn-primary" id="rsPublishBtn" type="submit" disabled>PUBLICAR</button>
      </div>
      <p class="rs-message" id="rsMessage" role="status"></p>
    </form>
    <div class="rs-list" id="rsCommentList"><div class="rs-empty">Cargando comentarios…</div></div>
  `;

  const articleCta = document.querySelector('.article-cta');
  (articleCta || detail).insertAdjacentElement(articleCta ? 'beforebegin' : 'afterend', section);

  const els = {
    count: section.querySelector('#rsCommentCount'),
    userBox: section.querySelector('#rsUserBox'),
    login: section.querySelector('#rsLoginBtn'),
    logout: section.querySelector('#rsLogoutBtn'),
    form: section.querySelector('#rsCommentForm'),
    text: section.querySelector('#rsCommentText'),
    publish: section.querySelector('#rsPublishBtn'),
    charCount: section.querySelector('#rsCharCount'),
    message: section.querySelector('#rsMessage'),
    list: section.querySelector('#rsCommentList'),
    replying: section.querySelector('#rsReplying'),
    cancelReply: section.querySelector('#rsCancelReply')
  };

  const commentsRef = collection(db, 'articles', articleId, 'comments');

  function escName(value) {
    return (value || 'Usuario').trim().slice(0, 80) || 'Usuario';
  }

  function formatDate(timestamp) {
    if (!timestamp?.toDate) return 'recién';
    return new Intl.DateTimeFormat('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).format(timestamp.toDate()) + ' ARG';
  }

  function photoFor(data) {
    const u = data.photoURL || '';
    try {
      const parsed = new URL(u);
      return ['https:'].includes(parsed.protocol) ? parsed.href : '';
    } catch { return ''; }
  }

  function setMessage(text = '') {
    els.message.textContent = text;
  }

  function moderationError(text) {
    const cleaned = text.trim();
    if (cleaned.length < 2) return 'El comentario es demasiado corto.';
    if (cleaned.length > 1000) return 'El comentario supera los 1000 caracteres.';
    const urls = cleaned.match(/https?:\/\/|www\./gi) || [];
    if (urls.length > 2) return 'Evitá publicar múltiples enlaces o spam.';
    if (/(.)\1{11,}/i.test(cleaned)) return 'El comentario parece contener spam.';
    if (/\b(te\s+voy\s+a\s+matar|ojal[aá]\s+te\s+mueras|matate|suicidate)\b/i.test(cleaned)) {
      return 'Ese mensaje infringe las reglas de convivencia.';
    }
    return '';
  }

  function updateReplyUI() {
    const label = els.replying.querySelector('span');
    if (!replyingTo) {
      els.replying.classList.remove('active');
      label.textContent = '';
      return;
    }
    label.textContent = `Respondiendo a ${replyingTo.name}`;
    els.replying.classList.add('active');
    els.text.focus();
  }

  function makeCommentNode(item, isReply = false) {
    const data = item.data;
    const wrap = document.createElement('article');
    wrap.className = 'rs-comment' + (isReply ? ' rs-reply' : '');
    wrap.dataset.commentId = item.id;

    const avatar = document.createElement('img');
    avatar.className = 'rs-comment-avatar';
    avatar.alt = '';
    const photo = photoFor(data);
    if (photo) avatar.src = photo;
    else avatar.src = 'assets/icon-192.png';

    const body = document.createElement('div');
    const meta = document.createElement('div');
    meta.className = 'rs-comment-meta';
    const name = document.createElement('span');
    name.className = 'rs-comment-name';
    name.textContent = escName(data.displayName);
    const time = document.createElement('span');
    time.className = 'rs-comment-time';
    time.textContent = formatDate(data.createdAt);
    meta.append(name, time);

    const text = document.createElement('p');
    text.className = 'rs-comment-text';
    text.textContent = data.text || '';

    const actions = document.createElement('div');
    actions.className = 'rs-comment-actions';

    const reply = document.createElement('button');
    reply.type = 'button';
    reply.className = 'rs-btn rs-btn-link';
    reply.textContent = 'Responder';
    reply.addEventListener('click', () => {
      if (!currentUser) {
        setMessage('Iniciá sesión con Google para responder.');
        return;
      }
      replyingTo = { id: data.parentId || item.id, name: escName(data.displayName) };
      updateReplyUI();
    });
    actions.append(reply);

    if (currentUser && data.uid === currentUser.uid) {
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'rs-btn rs-btn-link';
      del.textContent = 'Eliminar';
      del.addEventListener('click', async () => {
        if (!confirm('¿Eliminar tu comentario?')) return;
        try {
          await deleteDoc(doc(db, 'articles', articleId, 'comments', item.id));
        } catch {
          setMessage('No se pudo eliminar el comentario.');
        }
      });
      actions.append(del);
    } else {
      const report = document.createElement('button');
      report.type = 'button';
      report.className = 'rs-btn rs-btn-link';
      report.textContent = 'Reportar';
      report.addEventListener('click', async () => {
        if (!currentUser) {
          setMessage('Iniciá sesión para reportar un comentario.');
          return;
        }
        const reason = prompt('Motivo del reporte (odio, acoso, spam, datos personales u otro):', 'Contenido inapropiado');
        if (!reason?.trim()) return;
        try {
          await setDoc(doc(db, 'articles', articleId, 'comments', item.id, 'reports', currentUser.uid), {
            uid: currentUser.uid,
            reason: reason.trim().slice(0, 300),
            createdAt: serverTimestamp()
          });
          setMessage('Reporte enviado. Gracias.');
        } catch {
          setMessage('No se pudo enviar el reporte o ya lo habías reportado.');
        }
      });
      actions.append(report);
    }

    body.append(meta, text, actions);
    wrap.append(avatar, body);
    return wrap;
  }

  function renderComments() {
    els.list.replaceChildren();
    const visible = commentsCache.filter(c => c.data.status === 'visible');
    els.count.textContent = `${visible.length} comentario${visible.length === 1 ? '' : 's'}`;
    if (!visible.length) {
      const empty = document.createElement('div');
      empty.className = 'rs-empty';
      empty.textContent = 'Todavía no hay comentarios. Sé el primero en opinar.';
      els.list.append(empty);
      return;
    }

    const byId = new Map(visible.map(c => [c.id, c]));
    const replies = new Map();
    const roots = [];
    for (const c of visible) {
      if (c.data.parentId && byId.has(c.data.parentId)) {
        if (!replies.has(c.data.parentId)) replies.set(c.data.parentId, []);
        replies.get(c.data.parentId).push(c);
      } else {
        roots.push(c);
      }
    }

    for (const root of roots) {
      els.list.append(makeCommentNode(root, false));
      for (const child of replies.get(root.id) || []) {
        els.list.append(makeCommentNode(child, true));
      }
    }
  }

  els.login.addEventListener('click', async () => {
    setMessage('');
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      if (['auth/popup-blocked', 'auth/cancelled-popup-request'].includes(error?.code)) {
        await signInWithRedirect(auth, provider);
      } else if (error?.code !== 'auth/popup-closed-by-user') {
        setMessage('No se pudo iniciar sesión con Google.');
      }
    }
  });

  els.logout.addEventListener('click', () => signOut(auth));

  els.cancelReply.addEventListener('click', () => {
    replyingTo = null;
    updateReplyUI();
  });

  els.text.addEventListener('input', () => {
    els.charCount.textContent = String(els.text.value.length);
    setMessage('');
  });

  els.form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!currentUser) {
      setMessage('Iniciá sesión con Google para comentar.');
      return;
    }

    const text = els.text.value.trim();
    const issue = moderationError(text);
    if (issue) {
      setMessage(issue);
      return;
    }

    const last = Number(localStorage.getItem('rs-last-comment-at') || 0);
    if (Date.now() - last < 20000) {
      setMessage('Esperá unos segundos antes de publicar otro comentario.');
      return;
    }

    els.publish.disabled = true;
    try {
      const payload = {
        uid: currentUser.uid,
        displayName: escName(currentUser.displayName),
        photoURL: currentUser.photoURL || '',
        text,
        status: 'visible',
        createdAt: serverTimestamp()
      };
      if (replyingTo?.id) payload.parentId = replyingTo.id;
      await addDoc(commentsRef, payload);
      localStorage.setItem('rs-last-comment-at', String(Date.now()));
      els.text.value = '';
      els.charCount.textContent = '0';
      replyingTo = null;
      updateReplyUI();
      setMessage('Comentario publicado.');
    } catch (error) {
      console.error('RanaSports comments:', error);
      setMessage('No se pudo publicar el comentario.');
    } finally {
      els.publish.disabled = !currentUser;
    }
  });

  onAuthStateChanged(auth, user => {
    currentUser = user;
    els.userBox.replaceChildren();
    if (user) {
      const userWrap = document.createElement('div');
      userWrap.className = 'rs-user';
      const img = document.createElement('img');
      img.alt = '';
      img.src = user.photoURL || 'assets/icon-192.png';
      const name = document.createElement('span');
      name.className = 'rs-user-name';
      name.textContent = escName(user.displayName);
      userWrap.append(img, name);
      els.userBox.append(userWrap);
      els.login.hidden = true;
      els.logout.hidden = false;
      els.text.disabled = false;
      els.publish.disabled = false;
    } else {
      els.userBox.textContent = 'Iniciá sesión para comentar.';
      els.login.hidden = false;
      els.logout.hidden = true;
      els.text.disabled = true;
      els.publish.disabled = true;
      replyingTo = null;
      updateReplyUI();
    }
    renderComments();
  });

  onSnapshot(query(commentsRef, orderBy('createdAt', 'asc')), snapshot => {
    commentsCache = snapshot.docs.map(d => ({ id: d.id, data: d.data() }));
    renderComments();
  }, error => {
    console.error('RanaSports comments read:', error);
    els.list.innerHTML = '<div class="rs-empty">No se pudieron cargar los comentarios.</div>';
  });
}
