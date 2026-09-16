import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyCzaMd2mPNO8R6Gp1XpFXs0S_gFFBDXh8',
  authDomain: 'ranasports-172b6.firebaseapp.com',
  projectId: 'ranasports-172b6',
  storageBucket: 'ranasports-172b6.firebasestorage.app',
  messagingSenderId: '325852299356',
  appId: '1:325852299356:web:2ee36159ade6fe99d1e699'
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

try {
  await setPersistence(auth, browserLocalPersistence);
} catch (error) {
  console.warn('RanaSports auth persistence:', error);
}

function authMessage(text) {
  const el = document.querySelector('#rsMessage');
  if (el) el.textContent = text;
}

function friendlyError(error) {
  switch (error?.code) {
    case 'auth/popup-blocked':
      return 'El navegador bloqueó la ventana de Google. Habilitá las ventanas emergentes para RanaSports y volvé a intentarlo.';
    case 'auth/popup-closed-by-user':
      return 'Se cerró la ventana de Google antes de completar el ingreso.';
    case 'auth/cancelled-popup-request':
      return 'Ya hay un inicio de sesión en curso. Cerrá la otra ventana e intentá nuevamente.';
    case 'auth/unauthorized-domain':
      return 'Este dominio todavía no está autorizado por Firebase. Recargá la página e intentá de nuevo.';
    case 'auth/network-request-failed':
      return 'No se pudo conectar con Google. Revisá la conexión e intentá nuevamente.';
    case 'auth/web-storage-unsupported':
      return 'El navegador está bloqueando el almacenamiento necesario para iniciar sesión. Probá permitiendo cookies/almacenamiento para este sitio.';
    default:
      return `No se pudo iniciar sesión con Google${error?.code ? ` (${error.code})` : ''}.`;
  }
}

function attach() {
  const button = document.querySelector('#rsLoginBtn');
  if (!button || button.dataset.rsAuthFix === '1') return false;
  button.dataset.rsAuthFix = '1';

  button.addEventListener('click', async event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    authMessage('Abriendo Google…');
    button.disabled = true;
    try {
      await signInWithPopup(auth, provider);
      authMessage('');
    } catch (error) {
      console.error('RanaSports Google auth:', error);
      authMessage(friendlyError(error));
    } finally {
      button.disabled = false;
    }
  }, true);
  return true;
}

if (!attach()) {
  const observer = new MutationObserver(() => {
    if (attach()) observer.disconnect();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
