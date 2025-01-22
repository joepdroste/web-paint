"use strict";

import { default as express } from 'express';
import * as HTTP from 'http';
import * as Vite from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import dotenv from "dotenv";
import { Server } from "socket.io";

dotenv.config();

const app = express();
app.use(express.json({ limit: "10mb" }));
const httpServer = HTTP.createServer();
httpServer.on('request', app);
const io = new Server(httpServer);

// In-memory storage for drawings
let drawings = [];

// Websocket
io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("joinRoom", (roomName) => {
        console.log(`${socket.id} joined room: ${roomName}`);
        socket.join(roomName);
    })

    socket.on("draw", (data) => {
        socket.to(data.room).emit("draw", data);
    });

    socket.on("clear", (room) => {
        socket.emit("clear");
        socket.to(room).emit("clear");
        console.log("Clearing drawings", socket.id);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

// API routes
// Get all drawings
app.get("/api/drawings", (req, res) => {
    res.json(drawings);
});

// Post a new drawing
app.post("/api/drawings", (req, res) => {
    const drawing = req.body;
    // Add an id to each drawing for uniqueness
    drawing.id = drawings.length + 1;
    drawings.push(drawing);
    res.status(201).json(drawing);
});

// Get a specific drawing by ID
app.get("/api/drawings/:id", (req, res) => {
    const { id } = req.params;
    const drawing = drawings.find(d => d.id === parseInt(id));
    if (!drawing) {
        return res.status(404).json({ error: "Drawing not found" });
    }
    res.json(drawing);
});

// Serve frontend files
app.use((await Vite.createServer({
    root: 'frontend/',
    logLevel: 'info',
    server: {
        middlewareMode: true,
        hmr: { server: httpServer },
        allowedHosts: true
    },
    plugins: [
        svelte(),
    ],
    appType: 'spa',
})).middlewares);

// Start the server
const host = process.env.HOST || "0.0.0.0";
const port = process.env.PORT || 3000;
httpServer.listen(port, host, () => {
    console.log(`Running at http://${host}:${port}`);
});
