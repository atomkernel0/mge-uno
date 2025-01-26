# MGE-UNO

Welcome to **MGE-UNO**, an online UNO game project developed with Angular for the front-end and Node.js/Socket.io for the back-end. This README will guide you through the main features, project architecture, and steps to run it locally or in production.

---

## Table of Contents
1. [Project Overview](#project-overview)  
2. [Main Features](#main-features)  
3. [Project Structure](#project-structure)  
4. [Prerequisites](#prerequisites)  
5. [Installation & Launch](#installation--launch)  
6. [Environmental Configuration](#environmental-configuration)  
7. [Key Features](#key-features)  
8. [Available Scripts](#available-scripts)  
9. [Contribution](#contribution)  
10. [License](#license)

---

## Project Overview
**MGE-UNO** is a multiplayer game platform based on UNO rules, allowing multiple players to connect simultaneously.  
- Players can join a lobby, choose a nickname, an avatar, a victory music, and declare themselves "ready."  
- The game starts when all players have set up their profiles and at least two players are connected.  
- The game flow is managed by Socket.io to handle real-time synchronization and game events (drawing, playing a card, skipping a turn, etc.).  
- The Angular front-end communicates with the Node.js/Express back-end via Socket.io as well.

---

## Main Features
- Lobby mode with nickname, avatar, and victory music selection.  
- Advanced game mechanics: special cards (reverse, skip, plusone, wild, shuffle).  
- Real-time management of game states (current player, playable cards, etc.).  
- Spectator mode: newcomers can watch an ongoing game.  
- Fun and animated interface (CSS animations, hover effects, etc.).  
- Basic sound effects (hover and card selection, victory acquisition, etc.).  

---

## Project Structure

The project is divided into two main directories:

```
.
├── client
│   ├── environment.prod.ts
│   ├── environment.ts
│   └── src
│       ├── app
│       │   ├── app.component.html
│       │   ├── app.component.scss
│       │   ├── app.component.ts
│       │   ├── app.config.ts
│       │   ├── app.routes.ts
│       │   ├── card
│       │   ├── color-picker-dialog
│       │   ├── data
│       │   ├── game
│       │   ├── glow
│       │   ├── lobby
│       │   ├── models
│       │   ├── socket
│       │   └── victory-dialog
│       ├── index.html
│       ├── main.ts
│       └── styles.scss
├── server
│   └── src
│       ├── app
│       │   ├── constants
│       │   ├── handlers
│       │   ├── managers
│       │   ├── models
│       │   ├── rules
│       │   ├── services
│       │   └── main.ts
│       ├── config
│       └── ...
├── package.json
└── ...
```

### Key Structure Details
- **client/src/app**: Contains all Angular components for the front-end (cards, game, lobby, etc.) along with their associated files (HTML templates, SCSS styles, TypeScript logic).  
- **server/src/app**: Contains all server logic (Socket.io handlers, game state management, etc.).  
- **environment.ts / environment.prod.ts**: Angular environment files for managing API URLs, configuration variables, etc.  
- **socket.service.ts** (client): Dedicated service for Socket.io communication with the server.  
- **game.service.ts** (client): Front-end service interacting in real-time with game events.  
- **constants/cardList.ts** (server): Defines the list of all cards.  
- **game.service.ts** (server): Manages the global game state on the server side (deck, player hands, current card, etc.).

---

## Prerequisites
- **Node.js** (version ≥ 16 recommended)  
- **npm** or **yarn** to install dependencies  
- **Angular CLI** (optional) if you want to generate components, services, etc.

---

## Installation & Launch

1. **Clone the repository:**  
   ```bash
   git clone https://github.com/atomkernel0/mge-uno.git
   cd mge-uno
   ```

2. **Install dependencies:**  
   At the project root:  
   ```bash
   npm install
   ```  
   (This will install both server and client dependencies if your script configuration allows. Otherwise, make sure to also run npm install in ./client if needed.)

3. **Start the server:**  
   (From the root or ./server folder depending on your configuration)
   ```bash
   cd server
   npm run dev
   ```
   By default, the server listens on port 3000.

4. **Start the front-end:**  
   (From the ./client folder)
   ```bash
   cd client
   npm start
   ```
   By default, Angular will launch the application on http://localhost:4200.

---

## Environmental Configuration
### Environment Files (client)
- **environment.ts** (development):  
  ```ts
  export const environment = {
    production: false,
    apiUrl: '/api',
  };
  ```
- **environment.prod.ts** (production):  
  ```ts
  export const environment = {
    production: true,
    apiUrl: '/api',
  };
  ```
The parameters defined here (like `apiUrl`) are used to specify the Socket.io path or any other API configuration.  
You can adjust the `apiUrl` to point to your production endpoints.

### Environment Variables (server)
The Node.js server can be configured via .env files or environment variables. Refer to `main.ts` or your configuration file to adjust the **port** and other settings if necessary.

---

## Key Features
- **Lobby Management**:  
  - Choose a nickname, an avatar, and victory music.  
  - Real-time update of connected players list and their status ("ready" or not).  
- **Game Management**:  
  - Initial card distribution (7 cards per player).  
  - Dynamic draw system: reshuffle the deck with the discard pile if the deck is empty.  
  - Special cards (reverse, skip, plusone, wild, shuffle).  
  - Animation and sound effects (hover effect, victory sound, etc.).  
- **Spectator Mode**: New users automatically join as spectators if the game has already started.  
- **Anti-AFK System**: Automatic kick for a player who hasn't completed their profile (nickname, avatar, music).  

---

## Available Scripts

In the **server** folder:  
- `npm run dev`: Launches the Node.js/Express application in development mode (watch).  
- `npm run start`: Launches the application in production mode.  

In the **client** folder:  
- `npm start`: Launches the Angular application in development mode (http://localhost:4200).  
- `npm run build`: Compiles the Angular project for production (dist/ folder).  
- `npm run lint`: Analyzes the code to adhere to TypeScript/Angular conventions.  

---

## Contribution
Contributions are welcome!  
1. **Fork** the project.  
2. Create a **branch** for your feature:  
   ```bash
   git checkout -b feature/my-feature
   ```  
3. **Commit** your changes:  
   ```bash
   git commit -m "Add feature X"
   ```  
4. **Push** the branch:  
   ```bash
   git push origin feature/my-feature
   ```  
5. Open a **Pull Request** on the main repository.

---

## License
This project is distributed under the *GPL v3* license. See the [LICENSE](LICENSE) file for more details.

---