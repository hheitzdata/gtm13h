// GTM13h — Popup de configuration
document.addEventListener('DOMContentLoaded', function() {
  const apiKeyInput = document.getElementById('apiKey');
  const saveBtn = document.getElementById('saveBtn');
  const status = document.getElementById('status');

  loadApiKey();

  saveBtn.addEventListener('click', saveApiKey);
  
  apiKeyInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') saveApiKey();
  });

  async function loadApiKey() {
    try {
      if (await readApiKey()) {
        apiKeyInput.placeholder = '••••••••••••••••••••••••••••••••';
        showStatus('Clé API configurée', 'success');
      }
    } catch (error) {
      showStatus('Erreur de lecture du stockage', 'error');
    }
  }

  async function saveApiKey() {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      showStatus('Veuillez saisir une clé API', 'error');
      return;
    }

    if (!apiKey.startsWith('AIza') || apiKey.length < 35) {
      showStatus('Format de clé invalide (doit commencer par AIza...)', 'error');
      return;
    }

    try {
      await writeApiKey(apiKey);
    } catch (error) {
      showStatus('Erreur : ' + error.message, 'error');
      return;
    }

    showStatus('Clé API enregistrée', 'success');
    apiKeyInput.value = '';
    apiKeyInput.placeholder = '••••••••••••••••••••••••••••••••';
    setTimeout(() => window.close(), 2000);
  }

  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type} show`;
    setTimeout(() => status.classList.remove('show'), 5000);
  }

  async function testApiKey() {
    let apiKey;
    try {
      apiKey = await readApiKey();
    } catch (error) {
      showStatus('Erreur de lecture du stockage', 'error');
      return;
    }

    if (!apiKey) {
      showStatus('Aucune clé API configurée', 'error');
      return;
    }

    showStatus('Test en cours...', 'info');

    try {
      const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
        headers: { 'x-goog-api-key': apiKey }
      });

      if (response.ok) {
        showStatus('Clé API valide', 'success');
      } else {
        const errorData = await response.json().catch(() => ({}));
        showStatus(`Clé invalide : ${errorData.error?.message || 'Erreur'}`, 'error');
      }
    } catch (error) {
      showStatus('Erreur de connexion', 'error');
    }
  }

  async function clearApiKey() {
    if (!confirm('Supprimer la clé API stockée ?')) return;

    try {
      await deleteApiKey();
    } catch (error) {
      showStatus('Erreur : ' + error.message, 'error');
      return;
    }

    showStatus('Clé API supprimée', 'success');
    apiKeyInput.placeholder = 'Collez votre clé API ici...';
    apiKeyInput.value = '';
  }

  // Bouton test
  const testBtn = document.createElement('button');
  testBtn.className = 'btn btn-secondary';
  testBtn.textContent = 'Tester la clé';
  testBtn.style.marginTop = '10px';
  testBtn.addEventListener('click', testApiKey);
  saveBtn.parentNode.insertBefore(testBtn, status);

  // Bouton suppression
  const clearBtn = document.createElement('button');
  clearBtn.className = 'btn btn-secondary';
  clearBtn.textContent = 'Supprimer la clé';
  clearBtn.style.marginTop = '5px';
  clearBtn.style.fontSize = '12px';
  clearBtn.style.opacity = '0.7';
  clearBtn.addEventListener('click', clearApiKey);
  testBtn.parentNode.insertBefore(clearBtn, status);
});
