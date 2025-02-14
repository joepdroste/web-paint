<script>
    import { onMount } from "svelte";
    import { Circle, Rectangle, Line, Brush } from "./shapes";
    import {
        register,
        login,
        saveDrawing,
        deleteImage,
        deleteAllImages,
        loadDrawing,
        fetchSavedDrawings,
    } from "./api.js";

    let canvas;
    let context;
    let mousedownLocation = null;
    let currentShape = "Brush";
    let currentColor = "#000000";
    let currentLineWidth = 3;
    let brushStrokes = [];
    let currentRoom = "";
    let username = "";
    let password = "";
    let deleteID = null;
    let showModal = false;
    let savedDrawings = [];
    let useFill = false; // Toggle for fill mode

    const socket = io();

    socket.on("draw", (data) => {
        drawFromSocket(data);
    });
    socket.on("clear", clearCanvas);

    const shapeMap = { Brush, Circle, Rectangle, Line };

    async function openModal() {
        showModal = true;
        try {
            savedDrawings = await fetchSavedDrawings();
        } catch (error) {
            console.error("Error fetching saved drawings:", error);
        }
    }

    function closeModal() {
        showModal = false;
    }

    function selectDrawing(base64Image) {
        const img = new Image();
        img.onload = () => {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = base64Image;
        closeModal();
    }

    function clearCanvas() {
        context.clearRect(0, 0, canvas.width, canvas.height);
        brushStrokes = [];
    }

    function setLineWidth() {
        context.lineWidth = currentLineWidth;
    }

    function joinRoom() {
        socket.emit("joinRoom", currentRoom);
    }

    function handleRegister() {
        register(username, password);
        username = "";
        password = "";
    }

    function handleLogin() {
        login(username, password);
        username = "";
        password = "";
    }

    function getMousePosition(event) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        if (event.touches && event.touches.length > 0) {
            const touch = event.touches[0];
            return {
                x: (touch.clientX - rect.left) * scaleX,
                y: (touch.clientY - rect.top) * scaleY,
            };
        }
        return {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY,
        };
    }

    let activeBrush = null;
    function handleMouseDown(event) {
        event.preventDefault();
        mousedownLocation = getMousePosition(event);
        if (currentShape === "Brush") {
            activeBrush = new Brush(currentColor, currentLineWidth);
            activeBrush.addPoint(mousedownLocation);
        }
    }

    function handleMouseMove(event) {
        event.preventDefault();
        if (currentShape === "Brush" && activeBrush) {
            const pos = getMousePosition(event);
            activeBrush.addPoint(pos);
            activeBrush.draw(context);
        }
    }

    function handleMouseUp(event) {
        event.preventDefault();
        if (!mousedownLocation) return;
        if (currentShape === "Brush" && activeBrush) {
            brushStrokes.push(activeBrush);
            socket.emit("draw", {
                shape: currentShape,
                points: activeBrush.points,
                color: currentColor,
                lineWidth: activeBrush.lineWidth,
                room: currentRoom,
            });
            activeBrush = null;
        } else {
            const endLocation = getMousePosition(event);
            const shapeClass = shapeMap[currentShape];
            // If fill mode is enabled, use the selected color for filling; otherwise, no fill.
            const fill = useFill ? currentColor : null;
            const shape = new shapeClass(
                mousedownLocation,
                endLocation,
                currentColor,
                fill,
            );
            shape.draw(context);
            socket.emit("draw", {
                shape: currentShape,
                start: mousedownLocation,
                end: endLocation,
                color: currentColor,
                fillColor: fill,
                room: currentRoom,
            });
        }
        mousedownLocation = null;
    }

    function drawFromSocket(data) {
        if (data.shape === "Brush") {
            const brush = new Brush(data.color, data.lineWidth);
            brush.points = data.points;
            brush.draw(context);
        } else {
            const shapeClass = shapeMap[data.shape];
            const shape = new shapeClass(
                data.start,
                data.end,
                data.color,
                data.fillColor,
            );
            shape.draw(context);
        }
    }

    function setCurrentShape(shape) {
        currentShape = shape;
    }

    onMount(() => {
        context = canvas.getContext("2d");
        canvas.width = 1920;
        canvas.height = 1080;
        context.lineWidth = currentLineWidth;
    });
</script>

<div class="app">
    <!-- Header: Branding & Authentication -->
    <header class="header">
        <h1>Web Paint</h1>
        <div class="auth">
            <input type="text" placeholder="Username" bind:value={username} />
            <input
                type="password"
                placeholder="Password"
                bind:value={password}
            />
            <button on:click={handleRegister}>Register</button>
            <button on:click={handleLogin}>Login</button>
        </div>
    </header>

    <!-- Main content: Canvas and Sidebar Toolbar -->
    <main class="main-content">
        <div class="canvas-container">
            <canvas
                bind:this={canvas}
                on:mousedown={handleMouseDown}
                on:mousemove={handleMouseMove}
                on:mouseup={handleMouseUp}
                on:touchstart={handleMouseDown}
                on:touchmove={handleMouseMove}
                on:touchend={handleMouseUp}
            >
            </canvas>
        </div>
        <aside class="toolbar">
            <!-- Tools Group: Shape Buttons with Icons -->
            <div class="tool-group shapes">
                <h3>Shapes</h3>
                <div class="shape-buttons">
                    <button
                        class="shape-button"
                        class:active={currentShape === "Brush"}
                        on:click={() => setCurrentShape("Brush")}
                    >
                        <!-- Brush Icon -->
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <path
                                d="M4,20 C6,18 8,16 10,14"
                                stroke="currentColor"
                                stroke-width="2"
                                fill="none"
                            />
                            <circle cx="10" cy="14" r="2" fill="currentColor" />
                        </svg>
                    </button>
                    <button
                        class="shape-button"
                        class:active={currentShape === "Circle"}
                        on:click={() => setCurrentShape("Circle")}
                    >
                        <!-- Circle Icon -->
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <circle
                                cx="12"
                                cy="12"
                                r="8"
                                stroke="currentColor"
                                stroke-width="2"
                                fill="none"
                            />
                        </svg>
                    </button>
                    <button
                        class="shape-button"
                        class:active={currentShape === "Rectangle"}
                        on:click={() => setCurrentShape("Rectangle")}
                    >
                        <!-- Rectangle Icon -->
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <rect
                                x="5"
                                y="5"
                                width="14"
                                height="14"
                                stroke="currentColor"
                                stroke-width="2"
                                fill="none"
                            />
                        </svg>
                    </button>
                    <button
                        class="shape-button"
                        class:active={currentShape === "Line"}
                        on:click={() => setCurrentShape("Line")}
                    >
                        <!-- Line Icon -->
                        <svg width="24" height="24" viewBox="0 0 24 24">
                            <line
                                x1="4"
                                y1="20"
                                x2="20"
                                y2="4"
                                stroke="currentColor"
                                stroke-width="2"
                            />
                        </svg>
                    </button>
                </div>
            </div>

            <!-- Color Picker and Fill Toggle -->
            <div class="tool-group colors">
                <h3>Color</h3>
                <input type="color" bind:value={currentColor} id="color" />
                <button
                    class="fill-toggle"
                    on:click={() => (useFill = !useFill)}
                >
                    {useFill ? "Fill: On" : "Fill: Off"}
                </button>
            </div>

            <!-- Brush Size -->
            <div class="tool-group">
                <h3>Brush Size</h3>
                <input
                    type="range"
                    min="1"
                    max="10"
                    bind:value={currentLineWidth}
                    on:change={setLineWidth}
                />
            </div>

            <!-- Room -->
            <div class="tool-group">
                <h3>Room</h3>
                <input
                    type="text"
                    placeholder="Room Name"
                    bind:value={currentRoom}
                />
                <button on:click={joinRoom}>Join Room</button>
            </div>

            <!-- Actions -->
            <div class="tool-group">
                <h3>Actions</h3>
                <button on:click={() => saveDrawing(canvas)}>Save</button>
                <button on:click={clearCanvas}>Clear</button>
            </div>

            <!-- Load Drawings -->
            <div class="tool-group">
                <h3>Load Drawing</h3>
                <button on:click={openModal}>Load</button>
            </div>
        </aside>
    </main>

    <!-- Modal for Saved Drawings -->
    {#if showModal}
        <div class="modal">
            <div class="modal-content">
                <span class="close" on:click={closeModal}>&times;</span>
                <h2>Select a Drawing</h2>
                <div class="drawings-list">
                    {#each savedDrawings as drawing}
                        <div
                            class="drawing-item"
                            on:click={() => selectDrawing(drawing.imageData)}
                        >
                            <img src={drawing.imageData} alt="Saved Drawing" />
                        </div>
                    {/each}
                </div>
            </div>
        </div>
    {/if}
</div>
