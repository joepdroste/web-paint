"use strict";

import { default as express } from 'express';
import * as HTTP from 'http';
import * as Vite from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import dotenv from "dotenv";
import { Server } from "socket.io";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
app.use(express.json({ limit: "10mb" }));
const httpServer = HTTP.createServer();
httpServer.on('request', app);
const io = new Server(httpServer);

const SECRET_KEY = process.env.SECRET_KEY || "supersecretkey";

// In-memory storage for users and drawings
let users = []; // [{ username, passwordHash }]
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

// Get a specific drawing by ID
app.get("/api/drawings/:id", (req, res) => {
    const { id } = req.params;
    const drawing = drawings.find(d => d.id === parseInt(id));
    if (!drawing) {
        return res.status(404).json({ error: "Drawing not found" });
    }
    res.json(drawing);
});

// Get all drawings by a specific user
app.get("/api/user/:userID", (req, res) => {
    const { userID } = req.params;
    const userDrawings = drawings.filter(d => d.userID === parseInt(userID));

    res.json(userDrawings);
});

// Register a new user
app.post("/api/register", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required." });
    }

    const existingUser = users.find(user => user.username === username);
    if (existingUser) {
        return res.status(400).json({ error: "Username already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userID = users.length + 1;
    users.push({ username, passwordHash, userID });

    res.status(201).json({ message: "User registered successfully." });
});

// Login a user
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required." });
    }

    const user = users.find(user => user.username === username);
    if (!user) {
        return res.status(400).json({ error: "Invalid username or password." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
        return res.status(400).json({ error: "Invalid username or password." });
    }

    const token = jwt.sign({ username: username, userID: user.userID }, SECRET_KEY, { expiresIn: "1h" });
    res.status(200).json({ token, message: "Login successful." });
});

function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: "Authorization header required." });
    }

    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        console.log("Authenticated user:", decoded);
        next();
    } catch (err) {
        res.status(401).json({ error: "Invalid or expired token." });
    }
}

// Post a new drawing
app.post("/api/drawings", authenticate, (req, res) => {
    const {username, userID} = req.user;
    const drawing = req.body;
    // Add an id to each drawing for uniqueness
    drawing.id = drawings.length + 1;
    drawing.userID = userID;
    drawings.push(drawing);
    res.status(201).json(drawing);
});

// Delete a drawing by ID
app.delete("/api/drawings/:id", authenticate, (req, res) => {
    const { userID } = req.user;
    const { id } = req.params;

    // Find the drawing by ID
    const drawing = drawings.find(d => d.id === parseInt(id)); // Use parseInt to compare as integers

    if (!drawing) {
        return res.status(404).json({ error: "Drawing not found" });
    }

    // Check if the authenticated user is the owner of the drawing
    if (userID === drawing.userID) {
        // Remove the drawing from the array
        const index = drawings.indexOf(drawing);
        drawings.splice(index, 1); // Remove the drawing
        res.status(200).json({ message: "Drawing deleted successfully" });
    } else {
        res.status(403).json({ error: "You are not authorized to delete this drawing" });
    }
});

// Delete all drawings for a specific user
app.delete("/api/user/:id", authenticate, (req, res) => {
    const { userID } = req.user;  // Get the userID from the authenticated user
    const { id } = req.params;    // Get the userID from the URL parameter

    // Check if the authenticated user has permission to delete drawings for the given userID
    if (userID !== parseInt(id)) {
        return res.status(403).json({ error: "You are not authorized to delete drawings for this user." });
    }

    // Filter out drawings by the given userID
    drawings = drawings.filter(drawing => drawing.userID !== parseInt(id));

    res.status(200).json({ message: "All drawings deleted successfully." });
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
