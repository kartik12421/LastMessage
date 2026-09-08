# Anonymous Community Chat App

A production-ready, anonymous real-time chat application built with Node.js, Express, MongoDB, Socket.io, and React.

## Features
- **Anonymous Authentication:** Username and password based signup/login with JWT.
- **Communities:** Switch between different chat rooms (General, Tech, Gaming, etc.).
- **Real-time Messaging:** Powered by Socket.io for instant updates.
- **Modern Dark UI:** Sleek, responsive design using Tailwind CSS.
- **Secure:** Password hashing, JWT in cookies, and environment variables.

## Getting Started

### Prerequisites
- Node.js installed
- MongoDB installed and running locally (default: `mongodb://localhost:27017/anonymous_chat`)

### Setup Backend
1. Go to `server` folder.
2. Install dependencies: `npm install`.
3. Create/Verify `.env` file (one is already provided).
4. Start the server: `npm run dev`.

### Setup Frontend
1. Go to `client` folder.
2. Install dependencies: `npm install`.
3. Start the React app: `npm run dev`.

### Default Communities
The server will automatically create `General`, `Tech`, `Gaming`, and `Movies` communities on first load.

## Tech Stack
- **Frontend:** React, Tailwind CSS, Lucide Icons, Axios, Socket.io-client.
- **Backend:** Node.js, Express, MongoDB, Mongoose, Socket.io, JWT, BcryptJS.
