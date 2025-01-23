"use strict";

import { default as express } from 'express';
import * as HTTP from 'http';
import * as Vite from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import dotenv from "dotenv";
import { Server } from "socket.io";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { db } from "./database.js";

dotenv.config();

const app = express();
app.use(express.json({ limit: "10mb" }));
const httpServer = HTTP.createServer();
httpServer.on('request', app);
const io = new Server(httpServer);


const SECRET_KEY = process.env.SECRET_KEY || "supersecretkey";

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
    db.all('SELECT * FROM images', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: "Failed to retrieve drawings." });
        }
        res.json(rows);
    });
});

// Get a specific drawing by ID
app.get("/api/drawings/:id", (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM images WHERE id = ?', [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: "Failed to retrieve drawing." });
        }
        if (!row) {
            return res.status(404).json({ error: "Drawing not found." });
        }
        res.json(row);
    });
});

// Get all drawings by a specific user
app.get("/api/user/:userID/drawings", (req, res) => {
    const { userID } = req.params;
    db.all('SELECT * FROM images WHERE userId = ?', [userID], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: "Failed to retrieve user's drawings." });
        }
        res.json(rows);
    });
});

// Register a new user
app.post("/api/register", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required." });
    }

    db.get('SELECT username FROM users WHERE username = ?', [username], async (err, row) => {
        if (row) {
            return res.status(400).json({ error: "Username already exists." });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (username, passwordHash) VALUES (?, ?)', [username, passwordHash], function(err) {
            if (err) {
                return res.status(500).json({ error: "Failed to register user." });
            }
            res.status(201).json({ message: "User registered successfully." });
        });
    });
});

// Login a user
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required." });
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (!user) {
            return res.status(400).json({ error: "Invalid username or password." });
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(400).json({ error: "Invalid username or password." });
        }

        const token = jwt.sign({ username: username, userID: user.id }, SECRET_KEY, { expiresIn: "1h" });
        res.status(200).json({ token, message: "User logged in successfully." });
    });
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
        next();
    } catch (err) {
        res.status(401).json({ error: "Invalid or expired token." });
    }
}

// Post a new drawing
app.post("/api/drawings", authenticate, (req, res) => {
    const {username, userID} = req.user;
    const imageData = req.body;
    
    if (!userID || !imageData) {
        return res.status(400).json({ error: "User ID and image data are required." });
    }

    db.run('INSERT INTO images (userID, imageData) VALUES (?, ?)', [userID, imageData.drawing], function(err) {
        if (err) {
            return res.status(500).json({ error: "Failed to upload image." });
        }
        res.status(201).json({ message: "Image uploaded successfully." });
    });

});

// Delete a drawing by ID
app.delete("/api/drawings/:id", authenticate, (req, res) => {
    const { userID } = req.user;
    const { id } = req.params;

    db.get('SELECT * FROM images WHERE id = ?', [id], (err, drawing) => {
        if (err) {
            return res.status(500).json({ error: "Failed to find drawing." });
        }

        if (!drawing) {
            return res.status(404).json({ error: "Drawing not found" });
        }


        if (userID === drawing.userId) {
            db.run('DELETE FROM images WHERE id = ?', [id], (err) => {
                if (err) {
                    return res.status(500).json({ error: "Failed to delete drawing." });
                }
                res.status(200).json({ message: "Drawing deleted successfully" });
            });
        } else {
            res.status(403).json({ error: "You are not authorized to delete this drawing" });
        }
    });
});

// Delete all drawings for a specific user
app.delete("/api/user/:id", authenticate, (req, res) => {
    const { userID } = req.user;  
    const { id } = req.params;    

    if (userID !== parseInt(id)) {
        return res.status(403).json({ error: "You are not authorized to delete drawings for this user." });
    }

    db.run('DELETE FROM images WHERE userId = ?', [id], (err) => {
        if (err) {
            return res.status(500).json({ error: "Failed to delete drawings." });
        }
        res.status(200).json({ message: "All drawings deleted successfully" });
    });
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
