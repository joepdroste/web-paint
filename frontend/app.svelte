<script>
    import { onMount } from "svelte";
    import { Circle, Rectangle, Line, Brush } from "./shapes";
    import { register, login, saveDrawing, deleteImage, deleteAllImages, loadDrawing, fetchSavedDrawings } from './api.js';

    let canvas;
    let context;
    let mousedownLocation = null;
    let currentShape = "Brush";
    let currentColor = "#000000";
    let currentFillColor = null;
    let activeBrush = null;
    let currentLineWidth = 1
    let brushStrokes = [];
    let currentRoom = null;
    let username = "";
    let password = "";
    let deleteID = null;
    let loadID = null;
    let showModal = false;
    let savedDrawings = [];

    const socket = io();

    socket.on("draw", (data) => {
        drawFromSocket(data);
    });

    socket.on("loadImage", (data) => {
        fetch
    });

    const shapeMap = {
        Brush,
        Circle,
        Rectangle,
        Line
    };

    async function openModal() {
        showModal = true;
        try {
            savedDrawings = await fetchSavedDrawings();
            if (savedDrawings.length === 0) {
                console.log("No saved drawings found.");
            }
        } catch (error) {
            console.error("Failed to fetch saved drawings:", error);
        }
    }

    function closeModal() {
        showModal = false;
    }

    function selectDrawing(base64Image) {
        const img = new Image();
        img.onload = () => {
            context.clearRect(0, 0, 1920, 1080);
            context.drawImage(img, 0, 0, 1920, 1080);
        };
        img.src = base64Image;
        closeModal();
    }



    function clearCanvas() {
        context.clearRect(0, 0, 1920, 1080);
        brushStrokes = [];
    }

    function setLineWidth() {
        context.lineWidth = currentLineWidth;
    }

    function emitClear() {
        if (currentRoom !== null) {
            socket.emit("clear", currentRoom);
        } else {
            clearCanvas();
        }
    }
    
    function joinRoom() {
        socket.emit("joinRoom", currentRoom);
        console.log(`Joined room: ${currentRoom}`);
    }

    function handleRegister() {
        const result = register(username, password);
        username = "";
        password = "";
    }

    function handleLogin() {
        const result = login(username, password);
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
        } else if (event.changedTouches && event.changedTouches.length > 0) {
            const touch = event.changedTouches[0];
            return {
                x: (touch.clientX - rect.left) * scaleX,
                y: (touch.clientY - rect.top) * scaleY,
            };
        } else {
            return {
                x: (event.clientX - rect.left) * scaleX,
                y: (event.clientY - rect.top) * scaleY,
            };
        }
    }


    function handleMouseDown(event) {
        event.preventDefault();
        mousedownLocation = getMousePosition(event);

        if (currentShape === "Brush") {
            activeBrush = new Brush(currentColor, currentLineWidth);
            activeBrush.addPoint(mousedownLocation);
            return;
        }
    }

    function handleMouseMove(event) {
        event.preventDefault();
        if (currentShape === "Brush" && activeBrush) {
            const mousePosition = getMousePosition(event);
            activeBrush.addPoint(mousePosition);
            activeBrush.draw(context);
        }
    }

    function handleMouseUp(event) {
        event.preventDefault();
        if (!mousedownLocation) return;

        if (currentShape === "Brush" && activeBrush) {
            brushStrokes.push(activeBrush);

            if (currentRoom !== null) {
                socket.emit("draw", {
                    shape: currentShape ,
                    points: activeBrush.points,
                    color: activeBrush.color,
                    lineWidth: activeBrush.lineWidth,
                    room: currentRoom,
                });
            };

            activeBrush = null;
        } else {
            const endLocation = getMousePosition(event);
    
            const shapeClass = shapeMap[currentShape];
            const shape = new shapeClass(mousedownLocation, endLocation, currentColor, currentFillColor);
    
            shape.draw(context);
            
            if (currentRoom !== null) {
                socket.emit("draw", {
                    shape: currentShape,
                    start: mousedownLocation,
                    end: endLocation,
                    color: currentColor,
                    fillColor: currentFillColor,
                    room: currentRoom,
                });
            }
            brushStrokes = [];
        }

        mousedownLocation = null;
    }

    function drawFromSocket(data) {
        if (data.shape === "Brush") {
            const brush = new Brush(data.color, data.lineWidth);
            brush.points = data.points;
            brush.draw(context);
            brushStrokes.push(brush);
        } else {
            const shapeClass = shapeMap[data.shape];
            const shape = new shapeClass(data.start, data.end, data.color, data.fillColor);
            shape.draw(context);
        }
    }

    onMount(() => {
        context = canvas.getContext("2d");
        socket.on("clear", clearCanvas);
    });
</script>

<div class="main">
    <div class="container">
        <canvas
            bind:this={canvas}
            width={1920}
            height={1080}
            on:mousedown="{handleMouseDown}"
            on:mouseup="{handleMouseUp}"
            on:mousemove="{handleMouseMove}"
            on:touchstart="{handleMouseDown}"
            on:touchend="{handleMouseUp}"
            on:touchmove="{handleMouseMove}"
        ></canvas>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
        <div class="saveclear">
            <button on:click="{() => saveDrawing(canvas)}">Save</button>
            <button on:click="{emitClear}">Clear</button>
        </div>
        <div class="login">
            <h4>Login</h4>
            <input type="text" placeholder="Username" bind:value="{username}" id="username">
            <input type="password" placeholder="Password" bind:value="{password}" id="password">
            <button on:click="{() => handleRegister()}">Register</button>
            <button on:click="{() => handleLogin()}">Login</button>
        </div>
        <div class="delete">
            <h4>Delete</h4>
            <input type="number" placeholder="Drawing ID" bind:value={deleteID}>
            <button on:click={deleteImage(deleteID)}>Delete</button>
            <button on:click={deleteAllImages(deleteID)}>Delete All</button>
        </div>
        <!-- <button on:click={loadDrawing}>Load</button> -->
        <div class="brush">
            <h4>Shapes/Brush</h4>
            <select bind:value="{currentShape}">
                {#each Object.keys(shapeMap) as shape}
                    <option value="{shape}">{shape}</option>
                {/each}
            </select>
        </div>
        <div class="color">
            <h4>Color</h4>
            <input type="color" bind:value={currentColor} id="color">
        </div>
        <div class="fillcolor">
            <h4>Fill Color</h4>
            <input type="color" bind:value={currentFillColor} id="fillcolor">
        </div>
        <div class="room">
            <h4>Room</h4>
            <input type="text" bind:value={currentRoom} id="roominput">
            <button on:click="{joinRoom}">Join Room</button>
        </div>
        <div class="brushsize">
            <h4>Brush Size</h4>
            <input type="range" min="1" max="10" on:change={setLineWidth} bind:value="{currentLineWidth}">
        </div>
        <div class="load">
            <button on:click={openModal}>Load Drawing</button>
        </div>
    </div>
</div>

{#if showModal}
<div class="modal">
    <div class="modal-content">
        <span class="close" on:click={closeModal}>&times;</span>
        <h3>Select a Drawing</h3>
        <div>
            {#each savedDrawings as drawing}
            <div class="drawing" on:click={() => selectDrawing(drawing.imageData)}>
                <img src={drawing.imageData} alt="Saved Drawing" />
            </div>
            {/each}
        </div>
    </div>
</div>
{/if}
