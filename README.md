# WeShare — Messenger

> Real-time messaging application, part of the WeShare platform. Built with React and Zustand, featuring instant messaging, media sharing, and peer-to-peer voice and video calling via WebRTC.

🌐 **Live Demo:** [wesharemessenger.onrender.com](https://wesharemessenger.onrender.com)  
🔧 **Backend Repo:** [Weshare-server](https://github.com/arbi222/Weshare-server)

---

## What Is WeShare Messenger?

WeShare Messenger is a standalone real-time messaging application that works alongside the WeShare Social Media app. Both share the same backend, but operate as completely independent frontends. Users authenticated on the social platform can continue their conversations here with a dedicated, full-featured messaging experience.

---

## Features

### Messaging
- Real-time text messaging via Socket.io
- Image, video, audio clip, and GIF sharing
- Online presence and last-seen status
- Message notifications in real time

### Voice & Video Calling
- Peer-to-peer **voice and video calls** using WebRTC
- Signaling handled via Socket.io (offer, answer, ICE candidates)
- Custom-built calling UI — no third-party calling library
- STUN server configured for peer connection

### User Management
- User blocking system — blocked users cannot message you
- Conversation list with unread message indicators

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React.js |
| State Management | Zustand |
| Routing | React Router |
| Real-Time | Socket.io Client |
| Voice & Video | WebRTC (custom implementation) |
| HTTP Client | Axios |
| File Storage | Firebase Storage |
| Styling | Pure CSS |

---

## Architecture Note

This app is intentionally decoupled from the social media frontend. Both apps connect to the same backend via REST and Socket.io, but run as independent deployments. This architecture allows each app to scale and evolve independently.

```
  Weshare-client          Weshare-messenger
  (Social Media)  ──┐  ┌── (This App)
                    ▼  ▼
              Weshare-server
          (Shared REST + Socket.io)
```

---

## Author

**Arbi Hamolli** — Full-Stack Web Developer  
[arbihamolli.com](https://arbihamolli.com) · [LinkedIn](https://linkedin.com/in/arbi-hamolli) · [GitHub](https://github.com/arbi222)
