<script>
    import { onMount } from "svelte";
    import { Circle, Rectangle, Line, Brush } from "./shapes";

    let canvas;
    let context;
    let mousedownLocation = null;
    let currentShape = "Circle";
    let currentColor = "#000000";
    let currentFillColor = null;
    let activeBrush = null;
    let currentLineWidth = 1
    let brushStrokes = [];
    let currentRoom = null;

    const socket = io();

    socket.on("draw", (data) => {
        drawFromSocket(data);
    });

    const shapeMap = {
        Circle,
        Rectangle,
        Line,
        Brush
    };

    function clearCanvas() {
        context.clearRect(0, 0, width, height);
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

    // Share the drawing
    async function shareDrawing() {
        const image = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
        
        await fetch("/api/drawings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ image }),
        });
    }

    function getMousePosition(event) {
        const rect = canvas.getBoundingClientRect();

        // Scale factors for width and height
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        if (event.touches && event.touches.length > 0) {
            // For touchstart and touchmove
            const touch = event.touches[0];
            return {
                x: (touch.clientX - rect.left) * scaleX,
                y: (touch.clientY - rect.top) * scaleY,
            };
        } else if (event.changedTouches && event.changedTouches.length > 0) {
            // For touchend
            const touch = event.changedTouches[0];
            return {
                x: (touch.clientX - rect.left) * scaleX,
                y: (touch.clientY - rect.top) * scaleY,
            };
        } else {
            // For mouse events
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
            // Finalize the brush stroke
            brushStrokes.push(activeBrush);

            // Send the brush stroke to other users
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

<div>
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
        <button on:click="{shareDrawing}">Share</button>
        <button on:click="{emitClear}">Clear</button>
        <select bind:value="{currentShape}">
            {#each Object.keys(shapeMap) as shape}
                <option value="{shape}">{shape}</option>
            {/each}
        </select>
        <select bind:value={currentColor}>
            <option value="#000000">Black</option>
            <option value="#ff0000">Red</option>
            <option value="#00ff00">Green</option>
            <option value="#0000ff">Blue</option>
        </select>
        <select bind:value={currentFillColor}>
            <option value="#000000">Black</option>
            <option value="#ff0000">Red</option>
            <option value="#00ff00">Green</option>
            <option value="#0000ff">Blue</option>
        </select>
        <input type="range" min="1" max="10" on:change={setLineWidth} bind:value="{currentLineWidth}">
        <select bind:value={currentRoom}>
            <option value="Room1">Room 1</option>
            <option value="Room2">Room 2</option>
            <option value="Room3">Room 3</option>
        </select>
        <button on:click="{joinRoom}">Join Room</button>
    </div>
</div>
