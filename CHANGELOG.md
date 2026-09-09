# Changelog

## 1.2.0 — 2026-09-09

- Correctif : le bouton n'apparaissait plus uniquement sur la page de publication, mais aussi sur les écrans d'édition (modèles personnalisés, balises) dont les champs "Description" matchaient la détection
- Le bouton est retiré automatiquement quand on quitte la page de publication
- Modèle de repli `gemini-1.5-flash` (retiré par Google) remplacé par `gemini-2.5-flash-lite`
- Le repli sur un second modèle fonctionne désormais aussi en cas d'erreur définitive (404, modèle inconnu) et plus seulement en cas de surcharge
- Clé API envoyée via l'en-tête `x-goog-api-key` au lieu de l'URL : elle n'apparaît plus dans l'onglet Réseau
- Clé API déplacée de `chrome.storage.sync` vers `chrome.storage.local` : elle ne remonte plus vers le compte Google. Une clé déjà configurée est migrée automatiquement à la première utilisation
- Note de confidentialité sur l'usage des données par Gemini ajoutée au popup
- Permissions réduites à `storage` (`activeTab` et `scripting` n'étaient pas utilisées)
- Suppression du service worker, qui ne contenait que du code mort
- Le libellé du bouton est correctement restauré quand la génération s'interrompt (clé manquante, aucune modification)
- Une balise et un déclencheur portant le même nom ne s'écrasent plus dans la description

## 1.1.0 — 2026-04-27

- Refonte complète de la détection des modifications dans l'overlay de publication GTM
- Support FR + EN de l'interface GTM
- Passage au modèle Gemini 2.5 Flash (stable)
- Nouveau format de prompt (ligne par ligne, plus fiable que le JSON)
- Gestion de l'erreur "Extension context invalidated" avec message utilisateur clair
- Branding M13h

## 1.0.0 — 2025

- Version initiale
- Injection du bouton sur la page de publication GTM
- Génération du nom + description de version via API Gemini
- Popup de configuration de la clé API
