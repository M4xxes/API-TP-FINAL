## TP – API Marketplace (Express + TypeScript + Prisma)

### 1. Objectif du projet

Cette API implémente un petit **marketplace niveau production**, en deux parties :

- **Catalogue produit avancé** : pagination, tri, filtrage, projection, gestion de la relation `category`.
- **Authentification moderne** : access tokens courts (JWT) + refresh tokens persistants avec rotation, protection des routes.

Une interface web minimaliste est fournie pour **tester visuellement** tous les cas d’usage.

---

### 2. Stack technique

- **Runtime** : Node.js + Express
- **Langage** : TypeScript
- **ORM** : Prisma + SQLite (`dev.db`)
- **Auth** : JWT via `jsonwebtoken`, mots de passe via `bcryptjs`
- **Autres** : `cors`, `dotenv`

---

### 3. Installation & lancement

1. **Cloner / ouvrir** ce projet dans ton IDE.
2. Installer les dépendances (déjà fait si tu suis le TP, à refaire si besoin) :

```bash
npm install
```

3. Vérifier le fichier `.env` (racine du projet) :

```env
DATABASE_URL="file:./dev.db"
ACCESS_TOKEN_SECRET="test123"   # ou un secret plus long
```

4. Appliquer les migrations Prisma et générer le client (si besoin) :

```bash
npm run prisma:migrate
npm run prisma:generate
```

5. **Seeder** la base (catégories, produits, utilisateurs) :

```bash
npm run prisma:seed
```

6. Lancer le serveur en développement :

```bash
npm run dev
```

Par défaut, l’API tourne sur `http://localhost:3000`.

---

### 4. Modèle de données

#### Category
- `id` (Int, PK)
- `name` (String)
- `description` (String?)
- `products` (relation `Product[]`)
- `createdAt`, `updatedAt`

#### Product
- `id` (Int, PK)
- `name` (String)
- `type` (String, ex : `INFORMATIQUE_LAPTOP`, `MAISON_MOBILIER`, `SPORTS_EQUIPMENT`…)
- `price` (Float)
- `stock` (Int)
- `createdAt` (DateTime)
- `categoryId` (Int, FK vers `Category`)
- `category` (relation `Category`)

#### User
- `id` (Int, PK)
- `email` (String, unique)
- `password` (String, hashé avec `bcrypt`)
- `role` (String, ex : `USER`, `ADMIN`)
- `createdAt` (DateTime)
- `refreshTokens` (relation `RefreshToken[]`)

#### RefreshToken
- `id` (Int, PK)
- `token` (String, unique)
- `userId` (Int, FK)
- `user` (relation `User`)
- `revoked` (Boolean)
- `createdAt` (DateTime)
- `expiresAt` (DateTime)

#### Données seedées

- **Catégories** (IDs forcés) :
  - `1` – Informatique
  - `2` – Maison
  - `3` – Sport
- **Utilisateurs** :
  - `admin@example.com` / `password123` (role `ADMIN`)
  - `user1@example.com` / `password123`
  - `user2@example.com` / `password123`
- **Produits** : plus de 20 produits répartis par **catégories** et **types** (`INFORMATIQUE_LAPTOP`, `MAISON_APPAREIL`, `SPORTS_ACCESSORY`, etc.).

---

### 5. Authentification (Étape 2 du TP)

#### 5.1. Login – `POST /auth/login`

**Body (JSON)** :

```json
{
  "email": "user1@example.com",
  "password": "password123"
}
```

**Réponse 200** :

```json
{
  "accessToken": "JWT...",
  "refreshToken": "random-refresh-token",
  "tokenType": "Bearer",
  "expiresIn": 300
}
```

- `accessToken` : JWT signé HS256 avec `ACCESS_TOKEN_SECRET`, durée de vie courte (~5 min).
- `refreshToken` : string aléatoire, **stocké en base** dans la table `RefreshToken`.

#### 5.2. Profil – `GET /auth/me`

- Protégé par **access token**.
- En-tête :

```http
Authorization: Bearer <accessToken>
```

**Réponse 200** :

```json
{
  "id": 2,
  "email": "user1@example.com",
  "role": "USER",
  "createdAt": "2025-12-04T..."
}
```

#### 5.3. Refresh – `POST /auth/refresh`

**Body (JSON)** :

```json
{
  "refreshToken": "<refreshToken_actuel>"
}
```

Comportement :
- Vérifie le refresh token en base (existe, **non révoqué**, **non expiré**).
- **Rotation** :
  - marque l’ancien token `revoked = true`,
  - crée un **nouveau refresh token**,
  - renvoie un **nouvel access token** et ce **nouveau refresh token**.

**Réponse 200** :

```json
{
  "accessToken": "nouveau JWT...",
  "refreshToken": "nouveau-refresh-token",
  "tokenType": "Bearer",
  "expiresIn": 300
}
```

#### 5.4. Logout – `POST /auth/logout`

**Body (JSON)** :

```json
{
  "refreshToken": "<refreshToken_a_invalider>"
}
```

- Met `revoked = true` pour ce token en base.
- Réponse `204 No Content`.

#### 5.5. Middleware d’authentification

- `authMiddleware` lit l’en-tête `Authorization: Bearer ...`.
- Vérifie le JWT (`jwt.verify`), remplit `req.user` (id, email, role) et laisse passer, sinon 401.
- **Aucune fonctionnalité “automatique” fournie par la lib JWT** n’est utilisée (tout est géré à la main).

---

### 6. Catalogue produit (Étape 1 du TP)

Toutes les routes produits sont **protégées** par access token et montées sur `/products`.

#### 6.1. Consultation – `GET /products`

**Query params pris en charge** :

- **Pagination**
  - `page` (par défaut : `1`)
  - `limit` (par défaut : `10`, max : `100`)
- **Tri**
  - `sort` sur `name`, `price`, `createdAt`
  - ordre décroissant : préfixer par `-` (ex: `-price`)
  - exemple : `sort=-price` → du plus cher au moins cher
- **Filtres**
  - `categoryId` : ex `categoryId=1`
  - `priceMin`, `priceMax` : ex `priceMin=50&priceMax=200`
  - `type` : ex `type=SPORTS_EQUIPMENT`
  - les champs de tri/filtres sont **validés** (erreur 400 si champ interdit).
- **Projection**
  - `fields` : liste de colonnes autorisées :
    - `id`, `name`, `price`, `stock`, `createdAt`, `type`
  - ex : `fields=name,price,stock`
- **Include relation**
  - `include=category` → renvoie l’objet `category` complet pour chaque produit
  - le chargement est **conditionnel** (pas de category si non demandé).

**Exemple complet** :

```http
GET /products?page=1&limit=5&sort=-price&categoryId=1&priceMin=50&fields=name,price,type&include=category&type=INFORMATIQUE_ACCESSOIRE
Authorization: Bearer <accessToken>
```

**Exemple de réponse :**

```json
{
  "page": 1,
  "limit": 5,
  "total": 2,
  "totalPages": 1,
  "items": [
    {
      "name": "Casque audio Bluetooth",
      "price": 129,
      "type": "INFORMATIQUE_ACCESSOIRE",
      "category": {
        "id": 1,
        "name": "Informatique",
        "description": "Ordinateurs, périphériques et accessoires",
        "createdAt": "2025-12-04T...",
        "updatedAt": "2025-12-04T..."
      }
    },
    {
      "name": "Souris sans fil",
      "price": 24.99,
      "type": "INFORMATIQUE_ACCESSOIRE",
      "category": { "...": "..." }
    }
  ]
}
```

#### 6.2. Création – `POST /products`

- Route protégée (access token obligatoire).

**Body (JSON)** :

```json
{
  "name": "Moniteur 32\"",
  "price": 349.99,
  "stock": 7,
  "categoryId": 1,
  "type": "INFORMATIQUE_ECRAN"
}
```

Validations :
- `name` : string requis
- `price` : nombre >= 0
- `stock` : entier >= 0
- `categoryId` : entier > 0 et **doit exister** (sinon `404 Category not found`)
- `type` :
  - optionnel ; si vide → `"STANDARD"`
  - sinon pris tel quel (ex : `SPORTS_ACCESSORY`).

Retourne le produit créé (201) avec `category` incluse.

---

### 7. Interface web de test

L’interface se trouve dans `public/index.html` et est servie automatiquement :

- Ouvrir : `http://localhost:3000/`

Elle permet de tout tester sans Postman :

- **Bloc 1 – Authentification**
  - Formulaire `email` / `password`
  - Bouton **Login** → appelle `POST /auth/login`
  - Bouton **/auth/me** → profil (avec le token courant)
  - Affichage des tokens chargés (access / refresh).

- **Bloc 2 – Tokens**
  - Affiche l’`accessToken` et le `refreshToken`
  - Boutons :
    - **/auth/refresh** → rotation de refresh token + nouveau access token
    - **/auth/logout** → invalide le refresh token

- **Bloc 3 – Requête /products**
  - Paramètres :
    - `page`, `limit`, `sort`
    - `categoryId` (**select** avec : `1 – Informatique`, `2 – Maison`, `3 – Sport`)
    - `priceMin`, `priceMax`
    - `type` (**select** avec tous les types connus)
    - `fields` (projection)
    - `include` (option `category`)
  - Bouton **GET /products** : envoie la requête avec l’access token en **Authorization Bearer**.
  - Affichage :
    - JSON brut de la réponse
    - **Cartes de synthèse** (page, par page, total produits, total pages)
    - **Cartes produit** jolies (nom, type, prix, stock, catégorie).

- **Bloc 4 – Créer un produit**
  - Champs :
    - `name`, `price`, `stock`
    - `Catégorie` : select (1 Informatique, 2 Maison, 3 Sport)
    - `Type` : select (liste des types connus ou `STANDARD` par défaut)
  - Bouton **POST /products** : crée un produit et affiche la réponse dans le panneau de résultat.

---

### 8. Notes pédagogiques (par rapport au sujet du TP)

- La bibliothèque JWT (`jsonwebtoken`) est utilisée **uniquement** pour :
  - signer un JWT (`jwt.sign`) avec HS256 et expiration,
  - vérifier un JWT (`jwt.verify`).
- La logique suivante est entièrement faite **à la main** :
  - `/auth/login`
  - `/auth/refresh`
  - rotation des refresh tokens (révocation + recréation)
  - invalidation des refresh tokens (`/auth/logout`)
  - protection des endpoints (`authMiddleware`).
- Le catalogue répond aux exigences :
  - pagination, tri, filtres autorisés, projection, inclusion conditionnelle de `category`.
  - test combiné possible en un seul appel (pagination + tri + filtres + projection + include).

Tu peux t’appuyer sur ce README pour expliquer ton travail lors de la soutenance ou pour le rendre avec ton code.  

# API-TP-FINAL
