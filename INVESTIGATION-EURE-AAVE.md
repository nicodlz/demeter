# Investigation: EURe sur Aave non affiché dans Demeter

**Date:** 30 janvier 2026  
**Wallet:** `0xc3adc1091690722001f205eb9cccb7f8f8f95fc4`  
**Conclusion:** ⚠️ **Ce n'est PAS un bug dans le code Demeter.** Le wallet n'a actuellement aucun EURe déposé sur Aave.

---

## 1. Vérification On-Chain

### Balance aEURe (Aave V3 Gnosis)
- **Contrat aEURe vérifié:** `0xEdBC7449a9b594CA4E053D9737EC5Dc4CbCcBfb2` (confirmé via Blockscout: "Aave v3 EURe", symbol AEURE)
- **Contrat confirmé via `getReserveData`** sur le Pool Aave V3 Gnosis (`0xb50201558B00496A145fE76f7424749556E326D8`) — slot 8 correspond bien à l'aToken EURe
- **`balanceOf()` pour le wallet → 0** ✅

### Balance EURe (wallet simple)
- **EURe sur Gnosis** (`0xcB444e90D8198415266c6a2724b7900fb12FC56E`) → **0**
- **EURe sur Ethereum** (`0x3231Cb76718CDeF2155FC47b5286d82e6eDA273f`) → **0**

### Balance stETH/wstETH (Ethereum Mainnet)
- **stETH** (`0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84`) → **0**
- **wstETH** (`0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0`) → **0**
- **Aave V3 aWstETH** (`0x0B925eD163218f6662a35e0f0371Ac234f9E9371`) → **0**

### Spark (Gnosis)
- **spEURe** → **0**

### Nature du wallet
- **Smart contract wallet** (ERC-4337 Account Abstraction) sur Gnosis et Ethereum
- Toutes les transactions passent par `handleOps` (EntryPoint ERC-4337)

### Tokens réellement détenus
| Token | Chain | Montant | Valeur USD |
|-------|-------|---------|------------|
| WETH | Gnosis (xdai) | 2.6748 | ~$7,300 |
| ETH | Base | 0.1793 | ~$489 |
| RUNNER | Base | 163.59 | ~$29 |
| ETH | Arbitrum | 0.0044 | ~$12 |
| ETH | Ethereum | 0.0041 | ~$11 |
| XDAI | Gnosis | 1.5832 | ~$1.58 |
| + petits montants | divers | — | < $1 chacun |

**Aucune position DeFi. Aucun EURe. Aucun stETH. Aucun aToken.**

---

## 2. Historique des transactions EURe

Le wallet a un historique de 20 transferts EURe sur Gnosis. Le plus récent :

| Date | Direction | Montant | Destination |
|------|-----------|---------|-------------|
| 2026-01-30 16:21 | → ENVOYÉ | 39.13 EURe | `0xEdBC7449...` (aEURe/Aave) |
| 2025-12-18 | ← REÇU | 425.51 EURe | depuis `0xB4537312...` |
| 2025-11-10 | → ENVOYÉ | 89.67 EURe | vers `0x3a23F943...` (SocketGateway) |
| ... | ... | ... | ... |

### Historique des transferts aEURe (14 transferts)
**Pattern systématique : chaque réception de aEURe est immédiatement suivie d'un envoi**

```
2025-12-04 : Reçu 0.41 aEURe de 0xECca4e14... → Envoyé 0.41 aEURe à 0x389f1d84...
2025-07-27 : Reçu 33.56 aEURe de 0xECca4e14... → Envoyé 33.56 aEURe à 0x3a23F943... (SocketGateway)
2025-07-22 : Reçu 1750.00 aEURe de 0xECca4e14... → Envoyé 1750.00 aEURe à 0x3a23F943... (SocketGateway)
2025-07-21 : Reçu 300.00 aEURe de 0xECca4e14... → Envoyé 300.00 aEURe à 0x3a23F943... (SocketGateway)
...
```

**Conclusion :** Le wallet ne garde jamais les aEURe. Il les reçoit de `0xECca4e1490...` (EOA) et les bridge immédiatement via **SocketGateway** (`0x3a23F943...`). Le solde aEURe est toujours 0.

---

## 3. Vérification API Zerion

### Résultat avec `filter[positions]=no_filter`
- **11 positions retournées**, toutes `position_type: "wallet"`, `protocol: null`
- **0 positions DeFi** (deposit, staked, reward, locked, liquidity)
- Zerion reflète **correctement** l'état on-chain

### Vérification du filtre trash
- **2 positions trash** : uniquement des tokens de scam/spam sur Base (faux USDC)
- **Aucun EURe ou aEURe dans les positions trash**

### Gnosis (xdai) spécifiquement
- 2 positions : WETH + XDAI
- Pas de DeFi, pas d'EURe

---

## 4. Analyse du code Demeter

### `src/services/zerionApi.ts`
✅ **Aucun bug identifié**

1. **URL correcte** : `filter[positions]=no_filter` inclut bien tous les types de positions
2. **Filtre `displayable && !is_trash`** : raisonnable, ne filtre que le spam (2 tokens de scam sur 13 total)
3. **`mapPosition()`** : mappe correctement tous les `position_type` (wallet, deposit, staked, etc.)
4. **Pagination** : gérée correctement via `json.links.next`

### `src/utils/constants.ts`
✅ **EURe est bien listé comme stablecoin**
- `STABLECOIN_SYMBOLS` inclut `'EURe'`
- La détection Aave fonctionne : `isStablecoinSymbol('aEURe')` → `true` (vérifie le préfixe 'a')

### `src/store/slices/cryptoSlice.ts`
✅ **Aucun filtre additionnel** — stocke toutes les positions retournées

### `src/components/crypto/TokenTable.tsx`
✅ **Supporte l'affichage des types DeFi** — a des filtres UI pour `deposit`, `staked`, etc.

---

## 5. Diagnostic Final

### Le problème n'est PAS dans le code

Le wallet `0xc3adc1091690722001f205eb9cccb7f8f8f95fc4` :
1. **N'a PAS de EURe déposé sur Aave** (balance aEURe = 0 on-chain)
2. **N'a PAS de stETH sur Aave** (balance aWstETH = 0 on-chain)
3. **N'a AUCUNE position DeFi** sur aucune chaîne
4. N'a que des holdings "wallet" simples (WETH, ETH, petits montants)

### Hypothèses sur la confusion de l'utilisateur

1. **Wallet différent** : L'utilisateur pourrait avoir un autre wallet avec des positions Aave EURe. Le pattern de transferts aEURe montre que quelqu'un (`0xECca4e1490...`) envoie des aEURe à ce wallet, qui les bridge immédiatement via SocketGateway. Les EURe sur Aave sont peut-être sur ce wallet source.

2. **Positions historiques** : Le wallet A EU des interactions avec Aave EURe (transferts de aEURe en juillet-décembre 2025), mais les a toujours immédiatement transférées/bridgées. Il n'y a jamais eu de détention persistante.

3. **Transaction d'aujourd'hui** : 39.13 EURe ont été envoyés au contrat aEURe il y a ~15 minutes, mais le solde aEURe est déjà 0 — la transaction ERC-4337 bundled a probablement inclus un dépôt + retrait/bridge dans la même opération.

---

## 6. Recommandation

**Pas de fix nécessaire dans le code Demeter.** Le code fonctionne correctement.

### Action suggérée pour l'utilisateur
- Vérifier sur quel wallet les EURe sont réellement déposés sur Aave
- Si les aEURe sont sur `0xECca4e1490Ec00956BB65F22fc0e5e830e70dC0B`, ajouter cette adresse dans Demeter
- Vérifier sur [app.aave.com](https://app.aave.com) en connectant ce wallet pour confirmer l'absence de positions

### Si on veut améliorer l'UX (optionnel, non bloquant)
- Ajouter un message dans l'UI quand Zerion retourne 0 positions DeFi mais que l'utilisateur s'attend à en voir
- Permettre d'afficher l'historique des interactions DeFi (pas seulement les positions courantes)
