// GTM13h — Script principal pour la génération de descriptions de versions GTM
class GTM13hGenerator {
  constructor() {
    this.isGenerating = false;
    this.observer = null;
    this.checkTimeout = null;
    this.lastUrl = '';
    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.startObserving());
    } else {
      this.startObserving();
    }
  }

  startObserving() {
    // Observer les changements DOM (debounced pour éviter les appels excessifs)
    this.observer = new MutationObserver(() => {
      clearTimeout(this.checkTimeout);
      this.checkTimeout = setTimeout(() => this.checkForPublishDialog(), 300);
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Vérification initiale
    this.checkForPublishDialog();
  }

  checkForPublishDialog() {
    // Si le bouton existe déjà dans le DOM, ne rien faire
    const existingButton = document.querySelector('.gtm13h-button');
    if (existingButton) return;

    // Chercher l'overlay de publication GTM
    const overlay = document.querySelector('gtm-draft-submit-page, [class*="gtm-draft-submit"]');
    const searchRoot = overlay || document;

    // Chercher le textarea de description de version (FR + EN)
    const selectors = [
      'textarea[data-ng-model="ctrl.versionForm.notes"]',
      'textarea[placeholder*="description"]',
      'textarea[placeholder*="Description"]',
      'textarea[placeholder*="modifications"]',
      'textarea[placeholder*="changes"]',
      '.version-form textarea',
      '[data-testid="version-notes"] textarea'
    ];

    let versionTextarea = null;
    for (const selector of selectors) {
      versionTextarea = searchRoot.querySelector(selector);
      if (versionTextarea) break;
    }

    // Fallback : chercher par placeholder en texte libre
    if (!versionTextarea) {
      const textareas = searchRoot.querySelectorAll('textarea');
      for (const textarea of textareas) {
        const placeholder = textarea.placeholder?.toLowerCase() || '';
        if (placeholder.includes('description') || placeholder.includes('modifications') || placeholder.includes('changes')) {
          versionTextarea = textarea;
          break;
        }
      }
    }
    
    if (versionTextarea) {
      console.log('[GTM13h] Interface de publication détectée', overlay ? '(overlay)' : '(document)');
      this.injectButton(versionTextarea);
    }
  }

  injectButton(textarea) {
    // Double-check : ne pas injecter si le bouton existe déjà
    if (document.querySelector('.gtm13h-button')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'gtm13h-button';
    button.innerHTML = 'Générer la description';
    button.title = 'Générer automatiquement le nom et la description de version';
    
    button.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.generateDescription(textarea);
    });

    const container = textarea.parentElement;
    container.insertBefore(button, textarea);
    
    console.log('[GTM13h] Bouton injecté');
  }

  findVersionNameInput() {
    const overlay = document.querySelector('gtm-draft-submit-page, [class*="gtm-draft-submit"]');
    const searchRoot = overlay || document;

    const selectors = [
      'input[data-ng-model="ctrl.versionForm.name"]',
      'input[placeholder*="nom"]',
      'input[placeholder*="name"]',
      'input[placeholder*="descriptif"]',
      'input[placeholder*="descriptive"]',
      '.version-form input[type="text"]',
      '[data-testid="version-name"] input'
    ];

    for (const selector of selectors) {
      const input = searchRoot.querySelector(selector);
      if (input) return input;
    }

    const inputs = searchRoot.querySelectorAll('input[type="text"]');
    for (const input of inputs) {
      const placeholder = input.placeholder?.toLowerCase() || '';
      if (placeholder.includes('nom') || placeholder.includes('name') || placeholder.includes('descriptif') || placeholder.includes('descriptive')) {
        return input;
      }
    }

    return null;
  }

  async generateDescription(textarea) {
    if (this.isGenerating) return;
    
    this.isGenerating = true;
    const button = document.querySelector('.gtm13h-button');
    const originalText = button.innerHTML;
    
    try {
      button.innerHTML = 'Vérification...';
      const apiKey = await this.getApiKey();
      
      if (!apiKey) {
        alert('Clé API Gemini manquante.\nConfigurez-la via l\'icône GTM13h dans la barre d\'extensions.');
        return;
      }

      button.innerHTML = 'Scan des modifications...';
      const changes = this.extractChanges();
      
      console.log('[GTM13h] Modifications trouvées :', changes);
      
      if (changes.length === 0) {
        alert('Aucune modification détectée.\nVérifiez que vous êtes sur la page de publication GTM avec des modifications visibles.');
        return;
      }

      button.innerHTML = 'Génération...';
      const aiResult = await this.callGeminiAPI(apiKey, changes);
      
      // Construire le nom et la description à partir du JSON Gemini + données DOM
      const { versionName, description } = this.buildOutput(aiResult, changes);
      
      // Remplir le nom de version
      const versionNameInput = this.findVersionNameInput();
      if (versionNameInput) {
        this.setFieldValue(versionNameInput, versionName);
        console.log('[GTM13h] Nom de version :', versionName);
      } else {
        console.warn('[GTM13h] Champ nom de version non trouvé');
      }
      
      // Remplir la description
      this.setFieldValue(textarea, description);
      
      button.innerHTML = 'Terminé ✓';
      setTimeout(() => { button.innerHTML = originalText; }, 2000);
      
    } catch (error) {
      console.error('[GTM13h] Erreur :', error);
      if (error.message === 'CONTEXT_INVALIDATED') {
        alert('L\'extension a été mise à jour.\nRafraîchissez la page GTM (F5) puis réessayez.');
      } else {
        alert(`Erreur : ${error.message}`);
      }
      button.innerHTML = 'Erreur';
      setTimeout(() => { button.innerHTML = originalText; }, 3000);
    } finally {
      this.isGenerating = false;
    }
  }

  // Déclencher les events Angular/React pour que GTM prenne en compte la valeur
  setFieldValue(element, value) {
    // Setter natif pour les frameworks qui interceptent la propriété value
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype, 'value'
    )?.set;
    
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(element, value);
    } else {
      element.value = value;
    }
    
    // Déclencher tous les events nécessaires
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
    // Pour Angular
    element.dispatchEvent(new Event('keyup', { bubbles: true }));
  }

  // Construire la sortie finale : Gemini fournit le titre + résumé, JS structure la liste
  buildOutput(aiResult, changes) {
    const isFR = this.detectLanguage() === 'fr';

    const buckets = { added: [], modified: [], deleted: [] };
    for (const change of changes) {
      const action = change.action.toLowerCase();
      if (/ajouté|added|nouveau|new|créé|created/.test(action)) {
        buckets.added.push(change);
      } else if (/supprimé|deleted|retiré|removed/.test(action)) {
        buckets.deleted.push(change);
      } else {
        buckets.modified.push(change);
      }
    }

    const labels = isFR
      ? { added: '→ AJOUTS :', modified: '→ MODIFICATIONS :', deleted: '→ SUPPRESSIONS :' }
      : { added: '→ ADDED:', modified: '→ MODIFIED:', deleted: '→ DELETED:' };

    const lines = [];

    if (aiResult.summary) {
      lines.push(aiResult.summary);
    }

    if (aiResult.themeGroups?.length > 0) {
      lines.push('');
      for (const group of aiResult.themeGroups) {
        lines.push(`• ${group}`);
      }
    }

    if (buckets.added.length > 0) {
      lines.push('');
      lines.push(labels.added);
      for (const c of buckets.added) {
        const detail = aiResult.details?.[c.name];
        lines.push(`  • ${c.type} : ${c.name}${detail ? ' — ' + detail : ''}`);
      }
    }

    if (buckets.modified.length > 0) {
      lines.push('');
      lines.push(labels.modified);
      for (const c of buckets.modified) {
        const detail = aiResult.details?.[c.name];
        lines.push(`  • ${c.type} : ${c.name}${detail ? ' — ' + detail : ''}`);
      }
    }

    if (buckets.deleted.length > 0) {
      lines.push('');
      lines.push(labels.deleted);
      for (const c of buckets.deleted) {
        const detail = aiResult.details?.[c.name];
        lines.push(`  • ${c.type} : ${c.name}${detail ? ' — ' + detail : ''}`);
      }
    }

    let versionName = aiResult.name || '';
    if (!versionName) {
      const locale = isFR ? 'fr-FR' : 'en-US';
      const date = new Date().toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
      versionName = isFR ? `Version ${date}` : `Version ${date}`;
    }
    versionName = versionName
      .replace(/\*\*/g, '').replace(/##/g, '').replace(/[`~\[\]()]/g, '')
      .trim()
      .substring(0, 80);

    return {
      versionName,
      description: lines.join('\n').trim()
    };
  }

  async getApiKey() {
    return new Promise((resolve, reject) => {
      try {
        if (!chrome?.storage?.sync) {
          reject(new Error('CONTEXT_INVALIDATED'));
          return;
        }
        chrome.storage.sync.get(['geminiApiKey'], (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error('CONTEXT_INVALIDATED'));
            return;
          }
          resolve(result.geminiApiKey || null);
        });
      } catch (e) {
        reject(new Error('CONTEXT_INVALIDATED'));
      }
    });
  }

  extractChanges() {
    console.log('[GTM13h] Extraction des modifications...');
    
    // Cibler spécifiquement l'overlay de publication GTM
    const overlay = document.querySelector('gtm-draft-submit-page, [class*="gtm-draft-submit"]');
    const searchRoot = overlay || document;
    
    console.log('[GTM13h] Recherche dans :', overlay ? 'overlay submit' : 'document entier');
    
    // Méthode 1 : section gtm-draft-change-list (structure GTM spécifique)
    const draftChanges = this.extractFromDraftChangeList(searchRoot);
    if (draftChanges.length > 0) {
      console.log('[GTM13h] Via draft-change-list :', draftChanges);
      return draftChanges;
    }
    
    // Méthode 2 : heading "Workspace Changes" + tableau en dessous
    const headingChanges = this.extractFromWorkspaceChangesHeading(searchRoot);
    if (headingChanges.length > 0) {
      console.log('[GTM13h] Via heading Workspace Changes :', headingChanges);
      return headingChanges;
    }
    
    // Méthode 3 : tous les liens cliquables dans l'overlay qui ressemblent à des éléments GTM
    const linkChanges = this.extractFromLinks(searchRoot);
    if (linkChanges.length > 0) {
      console.log('[GTM13h] Via liens :', linkChanges);
      return linkChanges;
    }
    
    console.warn('[GTM13h] Aucune modification trouvée');
    return [];
  }

  // Méthode 1 : lire directement la structure GTM draft-change-list
  extractFromDraftChangeList(root) {
    const changes = [];
    
    // Chercher le container des changements
    const changeList = root.querySelector('.draft-changes, gtm-draft-change-list, [data-draft-key]');
    if (!changeList) return [];
    
    console.log('[GTM13h] draft-change-list trouvé');
    
    // Chercher le tableau GTM (div.gtm-table ou table classique)
    const table = changeList.querySelector('.gtm-table, [data-table-id="draft-change-list"], table');
    if (!table) {
      // Fallback : chercher les lignes directement dans le container
      return this.extractRowsFromContainer(changeList);
    }
    
    // Lire les lignes du tableau
    // GTM utilise des div avec des classes gtm-table-component, ou des tr classiques
    const rows = table.querySelectorAll('tr, [class*="table-row"], [role="row"]');
    
    for (const row of rows) {
      const cells = row.querySelectorAll('td, [class*="table-cell"], [role="cell"], [role="gridcell"]');
      if (cells.length >= 3) {
        const result = this.parseCells(cells);
        if (result) changes.push(result);
      }
    }
    
    // Si pas de lignes trouvées via les sélecteurs classiques, essayer les liens
    if (changes.length === 0) {
      return this.extractRowsFromContainer(table);
    }
    
    return changes;
  }

  // Méthode 2 : trouver le heading "Workspace Changes" puis lire le tableau en dessous
  extractFromWorkspaceChangesHeading(root) {
    const targets = ['workspace changes', 'modifications de l\'espace de travail', 'modifications apportées'];
    
    // Chercher le heading dans les éléments texte de l'overlay
    const allElements = root.querySelectorAll('div, span, h1, h2, h3, h4, h5, h6, p');
    let heading = null;
    
    for (const el of allElements) {
      const directText = this.getDirectTextContent(el).toLowerCase().trim();
      if (targets.some(t => directText.includes(t))) {
        heading = el;
        break;
      }
    }
    
    if (!heading) return [];
    
    console.log('[GTM13h] Heading trouvé :', heading.textContent.trim());
    
    // Remonter au container parent et chercher le tableau
    let container = heading.parentElement;
    for (let i = 0; i < 6 && container && container !== root; i++) {
      const changes = this.extractRowsFromContainer(container);
      if (changes.length > 0) return changes;
      container = container.parentElement;
    }
    
    return [];
  }

  // Méthode 3 : extraire depuis les liens dans le container
  extractFromLinks(root) {
    const changes = [];
    
    // Dans l'overlay, les noms des éléments GTM sont des liens <a> cliquables
    const links = root.querySelectorAll('a');
    
    for (const link of links) {
      const name = link.textContent.trim();
      if (!name || name.length < 2 || name.length > 120) continue;
      
      // Remonter à la ligne parente
      const row = link.closest('tr, [class*="table-row"], [role="row"]') || link.parentElement?.parentElement;
      if (!row) continue;
      
      const rowText = row.textContent || '';
      const action = this.detectActionFromText(rowText);
      
      // Ne garder que les lignes avec une action valide (Added, Modified, Deleted)
      if (!action) continue;
      
      const type = this.detectTypeFromText(rowText);
      changes.push({ name, type, action });
    }
    
    return this.deduplicate(changes);
  }

  // Lire les lignes d'un container quelconque (cherche les liens + contexte)
  extractRowsFromContainer(container) {
    const changes = [];
    
    // Chercher tous les liens (noms des éléments GTM)
    const links = container.querySelectorAll('a');
    
    for (const link of links) {
      const name = link.textContent.trim();
      if (!name || name.length < 2 || name.length > 120) continue;
      
      // Essayer de trouver la ligne contenant ce lien
      const row = link.closest('tr, [role="row"], [class*="row"]');
      
      if (row) {
        const cells = row.querySelectorAll('td, [role="cell"], [role="gridcell"], [class*="cell"]');
        if (cells.length >= 3) {
          const result = this.parseCells(cells);
          if (result) {
            changes.push(result);
            continue;
          }
        }
      }
      
      // Fallback : analyser le texte autour du lien
      const parentRow = row || link.parentElement?.parentElement;
      if (!parentRow) continue;
      
      const rowText = parentRow.textContent || '';
      const action = this.detectActionFromText(rowText);
      if (!action) continue;
      
      const type = this.detectTypeFromText(rowText);
      changes.push({ name, type, action });
    }
    
    return this.deduplicate(changes);
  }

  // Parser les cellules d'une ligne
  parseCells(cells) {
    const name = cells[0]?.textContent?.trim() || '';
    const type = cells[1]?.textContent?.trim() || '';
    const action = cells[2]?.textContent?.trim() || '';
    
    // Filtrer headers et lignes vides
    const nameLower = name.toLowerCase();
    if (!name || nameLower === 'name' || nameLower === 'nom' || name.length > 120) return null;
    if (!this.isValidAction(action)) return null;
    
    return { name, type: type || 'Élément', action };
  }

  getDirectTextContent(el) {
    let text = '';
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      }
    }
    if (!text.trim() && el.textContent.trim().length < 80) {
      text = el.textContent;
    }
    return text.trim();
  }

  deduplicate(changes) {
    const unique = [];
    const seen = new Set();
    for (const c of changes) {
      if (!seen.has(c.name)) {
        seen.add(c.name);
        unique.push(c);
      }
    }
    return unique;
  }

  isValidAction(text) {
    if (!text) return false;
    const t = text.toLowerCase().trim();
    return ['added', 'modified', 'deleted', 'ajouté', 'modifié', 'supprimé', 
            'ajoutée', 'modifiée', 'supprimée', 'created', 'updated', 'removed',
            'nouveau', 'new'].includes(t);
  }

  detectTypeFromText(text) {
    const t = text.toLowerCase();
    if (/\bcustom template\b|modèle personnalisé/i.test(t)) return 'Custom Template';
    if (/\btag\b|balise/i.test(t)) return 'Tag';
    if (/\bvariable\b/i.test(t)) return 'Variable';
    if (/\btrigger\b|déclencheur/i.test(t)) return 'Trigger';
    if (/\btemplate\b|modèle/i.test(t)) return 'Template';
    if (/\bfolder\b|dossier/i.test(t)) return 'Folder';
    return 'Élément';
  }

  detectActionFromText(text) {
    const t = text.toLowerCase();
    if (/\badded\b|ajouté/i.test(t)) return 'Added';
    if (/\bmodified\b|modifié/i.test(t)) return 'Modified';
    if (/\bdeleted\b|supprimé/i.test(t)) return 'Deleted';
    return '';
  }

  async callGeminiAPI(apiKey, changes) {
    if (!window.location.hostname.includes('tagmanager.google.com')) {
      throw new Error('Extension utilisable uniquement sur GTM');
    }

    if (!apiKey || !apiKey.startsWith('AIza') || apiKey.length < 35) {
      throw new Error('Clé API invalide');
    }

    const button = document.querySelector('.gtm13h-button');
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];

    for (const model of models) {
      const result = await this.tryModel(apiKey, model, changes, button);
      if (result !== null) return result;
      if (button) button.innerHTML = 'Modèle alternatif...';
    }

    throw new Error('API Gemini indisponible. Réessayez dans quelques instants.');
  }

  async tryModel(apiKey, model, changes, button) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const body = JSON.stringify({
      contents: [{ parts: [{ text: this.buildPrompt(changes) }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
    });

    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        if (button) button.innerHTML = `Nouvelle tentative (${attempt}/2)...`;
        await new Promise(r => setTimeout(r, 1500 * attempt));
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });

      if (response.ok) {
        const data = await response.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (!rawText) throw new Error('Réponse vide de l\'API Gemini');
        console.log(`[GTM13h] Réponse Gemini (${model}) :`, rawText);
        return this.parseGeminiResponse(rawText, changes);
      }

      if (response.status === 503 || response.status === 429) continue;

      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API Gemini : ${errorData.error?.message || 'Erreur inconnue'}`);
    }

    return null;
  }

  parseGeminiResponse(rawText, changes) {
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l);

    let name = '';
    let summary = '';
    const themeGroups = [];
    const details = {};

    for (const line of lines) {
      if (line.startsWith('NAME:')) {
        name = line.substring(5).trim();
      } else if (line.startsWith('SUMMARY:')) {
        summary = line.substring(8).trim();
      } else if (line.startsWith('GROUP:')) {
        themeGroups.push(line.substring(6).trim());
      } else if (line.startsWith('DETAIL|')) {
        const parts = line.substring(7).split('|');
        if (parts.length >= 2) {
          details[parts[0].trim()] = parts[1].trim();
        }
      }
    }

    const matchedDetails = this.matchDetails(details, changes);
    return { name, summary, themeGroups, details: matchedDetails };
  }

  // Associer les détails Gemini aux noms exacts des changements (matching souple)
  matchDetails(geminiDetails, changes) {
    const matched = {};
    const detailKeys = Object.keys(geminiDetails);
    
    for (const change of changes) {
      const changeName = change.name;
      
      // Match exact
      if (geminiDetails[changeName]) {
        matched[changeName] = geminiDetails[changeName];
        continue;
      }
      
      // Match partiel : la clé Gemini contient le nom ou inversement
      const found = detailKeys.find(k => 
        k.toLowerCase().includes(changeName.toLowerCase()) ||
        changeName.toLowerCase().includes(k.toLowerCase()) ||
        // Match sur les mots clés principaux
        changeName.split(/[\s\-_]+/).filter(w => w.length > 2).some(word => 
          k.toLowerCase().includes(word.toLowerCase())
        )
      );
      
      if (found) {
        matched[changeName] = geminiDetails[found];
      }
    }
    
    return matched;
  }

  detectLanguage() {
    const htmlLang = (document.documentElement.lang || '').toLowerCase();
    if (htmlLang.startsWith('fr')) return 'fr';
    if (htmlLang.startsWith('en')) return 'en';

    const bodyText = document.body?.innerText || '';
    if (/\bpublier\b|\bbalise\b|\bdéclencheur\b|\bespace de travail\b/i.test(bodyText)) return 'fr';

    return (navigator.language || '').toLowerCase().startsWith('fr') ? 'fr' : 'en';
  }

  buildPrompt(changes) {
    const isFR = this.detectLanguage() === 'fr';
    const changesText = changes.map(c => `- [${c.action}] ${c.type} : "${c.name}"`).join('\n');

    if (isFR) {
      return `Tu es un expert Google Tag Manager. Un consultant analytics publie un workspace GTM. Génère un titre et une description qui permettent à n'importe quel collègue de comprendre en un coup d'œil ce qui a été fait et pourquoi — pas juste une liste, mais une vraie lecture analytique.

Modifications du workspace :
${changesText}

Réponds EXACTEMENT dans ce format (aucune ligne vide, aucun markdown, aucun backtick) :

NAME: titre court en français (max 70 caractères)
SUMMARY: une phrase complète décrivant l'objectif global de cette version
GROUP: Thème — ce que ces changements apportent concrètement (2 à 4 lignes GROUP, une par plateforme ou thème logique)
DETAIL|nom exact element|explication courte (5 à 15 mots)

Règles :
- NAME : professionnel, clair, en français. Regroupe les grands thèmes. Ex: "MAJ tracking Commanders Act, Meta et e-commerce"
- SUMMARY : phrase COMPLÈTE sur l'objectif métier. Doit se terminer par un point. Ex: "Déploiement du tracking Commanders Act serverside, refonte des balises Meta et ajout du suivi e-commerce."
- GROUP : une ligne par plateforme ou thème logique. Regroupe intelligemment les éléments liés. Format: "Thème — ce que ces changements font ensemble". 2 à 4 lignes max. Ex: "Commanders Act — intégration bridge serverside, SDK JS et variables site ID / source key"
- DETAIL : une ligne par élément, nom EXACT entre les pipes, explication 5 à 15 mots.
- Aucun JSON, markdown, backtick, guillemet ou caractère spécial hors format.`;
    }

    return `You are a Google Tag Manager expert. An analytics consultant is publishing a GTM workspace. Generate a title and description that allow any colleague to understand at a glance what was done and why — not just a list, but a real analytical read.

Workspace changes:
${changesText}

Reply EXACTLY in this format (no blank lines, no markdown, no backticks):

NAME: short title in English (max 70 characters)
SUMMARY: one complete sentence describing the overall goal of this version
GROUP: Theme — what these changes achieve together (2 to 4 GROUP lines, one per platform or logical theme)
DETAIL|exact element name|short explanation (5 to 15 words)

Rules:
- NAME: professional, clear, in English. Summarize main themes. Ex: "Update Commanders Act, Meta tracking & e-commerce events"
- SUMMARY: COMPLETE sentence on business objective. Must end with a period. Ex: "Deploying Commanders Act serverside tracking, updating Meta pixels and adding e-commerce event tracking."
- GROUP: one line per platform or logical theme. Intelligently group related elements. Format: "Theme — what these changes achieve together". 2 to 4 lines max. Ex: "Commanders Act — serverside bridge, JS SDK and site ID / source key variables"
- DETAIL: one line per element, EXACT name between pipes, 5 to 15 word explanation.
- No JSON, markdown, backticks, quotes or special characters outside the format.`;
  }
}

// Initialiser
if (window.location.hostname === 'tagmanager.google.com') {
  new GTM13hGenerator();
}
