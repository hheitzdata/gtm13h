// GTM13h — Accès à la clé API Gemini
//
// La clé vit dans chrome.storage.local : contrairement à storage.sync, elle ne
// quitte jamais la machine. Les installations antérieures la stockaient dans
// storage.sync ; elle est rapatriée automatiquement à la première lecture.

const GTM13H_API_KEY = 'geminiApiKey';

async function readApiKey() {
  const local = await chrome.storage.local.get([GTM13H_API_KEY]);
  if (local[GTM13H_API_KEY]) return local[GTM13H_API_KEY];

  const synced = await chrome.storage.sync.get([GTM13H_API_KEY]);
  if (!synced[GTM13H_API_KEY]) return null;

  await chrome.storage.local.set({ [GTM13H_API_KEY]: synced[GTM13H_API_KEY] });
  await chrome.storage.sync.remove([GTM13H_API_KEY]);
  console.log('[GTM13h] Clé API migrée vers le stockage local');
  return synced[GTM13H_API_KEY];
}

async function writeApiKey(apiKey) {
  await chrome.storage.local.set({ [GTM13H_API_KEY]: apiKey });
  // Ne rien laisser derrière si une ancienne version l'avait synchronisée
  await chrome.storage.sync.remove([GTM13H_API_KEY]);
}

async function deleteApiKey() {
  await chrome.storage.local.remove([GTM13H_API_KEY]);
  await chrome.storage.sync.remove([GTM13H_API_KEY]);
}
