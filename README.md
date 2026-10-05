# Family View Numpad (Decky Loader Plugin)

Un plugin pour [Decky Loader](https://deckbrew.xyz/) qui ajoute un **pavé numérique virtuel tactile et manette** directement sur la fenêtre modale du code PIN du **Mode Famille (Family View)** sous SteamOS.

![Preview](https://raw.githubusercontent.com/SteamDeckHomebrew/decky-plugin-template/main/.github/preview.png)

## 🎮 Fonctionnalités

- **Pavé numérique tactile & manette** : Affiche les touches `0` à `9`, `C` (effacer tout), `⌫` (retour arrière) et `✓ Confirmer`.
- **Intégration automatique** : Détecte l'ouverture de la modal Family View de SteamOS et injecte le composant au bon endroit.
- **Validation automatique** : Option pour valider automatiquement la saisie dès le 4ᵉ chiffre entré.
- **Support tactile et D-pad** : Boutons larges avec retour haptique (vibration) adaptés aux consoles portables (Steam Deck, ROG Ally, Legion Go, Ayn Odin sous SteamOS/Bazzite).
- **Aperçu & configuration QAM** : Menu d'options dans le menu d'accès rapide (QAM) Decky avec prévisualisation en direct.

## 🛠️ Développement & Build

```bash
# Installer les dépendances
pnpm install

# Lancer les tests unitaires
pnpm run test

# Vérifier les types TypeScript
pnpm run typecheck

# Compiler le plugin pour distribution
pnpm run build
```

## 📦 Structure du projet

- `src/index.tsx` : Point d'entrée du plugin Decky (`definePlugin`).
- `src/components/Numpad.tsx` : Composant du pavé numérique interactif.
- `src/components/SettingsPanel.tsx` : Interface de configuration dans le menu QAM.
- `src/components/NumpadModalPreview.tsx` : Aperçu en direct dans le panneau QAM.
- `src/services/observer.tsx` : Détection par `MutationObserver` et injection dynamique dans la modal SteamOS.
- `src/services/inputSimulator.ts` : Simulation des événements clavier (`KeyboardEvent`, saisie des inputs PIN).
- `src/services/settings.ts` : Gestionnaire de préférences utilisateur (`localStorage`).
- `plugin.json` : Métadonnées du plugin Decky.
