# GTM13h — Version Generator

Extension Chrome qui génère automatiquement les noms et descriptions de versions dans Google Tag Manager.

Quand on publie un workspace GTM, il faut renseigner un nom de version et une description. En pratique on fait ça à la va-vite ou on oublie, et on se retrouve avec un historique illisible. GTM13h lit les modifications du workspace et propose un nom + une description structurée, prête à publier.

Développé par [M13h](https://www.m13h.com) — Cosmo5 Group.

---

## Fonctionnement

1. Ouvrir un workspace GTM avec des modifications en cours
2. Cliquer sur **Submit** (depuis n'importe quelle page : Tags, Variables, Triggers, etc.)
3. Le bouton **Générer la description** apparaît au-dessus du champ de description
4. En un clic, le nom de version et la description sont pré-remplis à partir des modifications détectées

L'extension utilise l'API Gemini (Google) pour structurer les descriptions. Les noms de balises, variables et déclencheurs modifiés sont envoyés à l'API pour produire un titre et des explications claires. Le tout reste synthétique et orienté métier.

### Exemple de sortie

```
Version Name : Intégration Traackr, MAJ Pixels et Variables ecommerce

Version Description :
Ajout du tracking Traackr et mise à jour des pixels Meta/Snap et des variables ecommerce.

→ AJOUTS :
  • Variable : DLV - ecommerce - items — nouvelle variable pour les items du dataLayer ecommerce
  • Variable : DLV - ecommerce.coupon — capture du code promo dans le dataLayer
  • Tag : Traackr - Global tag — intégration du pixel Traackr global
  • Tag : Traackr - Purchase — tracking des conversions achat Traackr

→ MODIFICATIONS :
  • Custom Template : Meta Pixel — mise à jour du template Meta Pixel
  • Custom Template : Snap Pixel — mise à jour du template Snap Pixel
```

---

## Installation

### 1. Télécharger l'extension

Deux options :

**Option A — Télécharger le ZIP**
- Cliquer sur **Code** → **Download ZIP** en haut de cette page
- Décompresser le dossier

**Option B — Cloner le repo**
```bash
git clone https://github.com/hheitzdata/gtm13h.git
```

### 2. Charger dans Chrome

1. Ouvrir `chrome://extensions/`
2. Activer le **Mode développeur** (toggle en haut à droite)
3. Cliquer **Charger l'extension non empaquetée**
4. Sélectionner le dossier `gtm13h`
5. L'icône GTM13h apparaît dans la barre d'extensions

### 3. Configurer la clé API

L'extension nécessite une clé API Gemini (gratuite) :

1. Aller sur [Google AI Studio](https://aistudio.google.com/apikey)
2. Se connecter avec votre compte Google
3. Cliquer **Create API Key** → sélectionner le projet **Generative Language Client** (projet par défaut, il convient parfaitement)
4. Copier la clé générée (elle commence par `AIza...`)
5. Cliquer sur l'icône GTM13h dans Chrome → coller la clé → **Enregistrer**

La clé est stockée localement dans Chrome et n'est jamais transmise ailleurs que vers l'API Google.

---

## Mise à jour

1. Télécharger la nouvelle version (ZIP ou `git pull`)
2. Remplacer les fichiers du dossier
3. Aller sur `chrome://extensions/` → cliquer le bouton de rechargement sur GTM13h
4. **Rafraîchir les pages GTM ouvertes** (F5)
5. La clé API est conservée, pas besoin de la reconfigurer

---

## Détails techniques

- **Manifest V3** (standard Chrome actuel)
- **Modèle** : Gemini 2.5 Flash via API Google Generative Language
- **Permissions** : accès à `tagmanager.google.com` uniquement + appel API Gemini
- **Stockage** : la clé API est dans `chrome.storage.sync` (synchronisée entre les sessions Chrome du même compte)
- **Détection** : l'extension cible l'overlay de publication GTM (`gtm-draft-submit-page`) et lit le tableau "Workspace Changes" à l'intérieur
- **Langues** : fonctionne avec l'interface GTM en français et en anglais

---

## Dépannage

**Le bouton n'apparaît pas**
→ Vérifiez que vous êtes sur la page de publication (après avoir cliqué "Submit" dans GTM). Le bouton s'affiche uniquement quand le champ de description est visible.

**"Aucune modification détectée"**
→ Le workspace ne contient pas de modifications, ou l'interface GTM a changé. Vérifiez que des modifications apparaissent dans la section "Workspace Changes".

**"L'extension a été mise à jour"**
→ Après rechargement de l'extension, rafraîchissez la page GTM (F5).

**Erreur API**
→ Testez la clé via le bouton "Tester la clé" dans le popup. Si invalide, régénérez-en une sur [Google AI Studio](https://aistudio.google.com/apikey).

---

## Limites connues

- L'extension dépend de la structure DOM de GTM. Si Google modifie significativement l'interface de publication, la détection peut casser.
- La qualité de la description dépend des noms des éléments GTM. Si les noms sont cryptiques, la description le sera aussi.
- Nécessite une connexion internet (appel API Gemini).

---

## Licence

[MIT](LICENSE) — M13h, Cosmo5 Group
