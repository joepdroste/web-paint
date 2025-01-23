// Register a new user
export async function register(username, password) {
    const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
    }

    const result = await response.json();
    console.log('User registered successfully:', result.message);
}

// Login a user
export async function login(username, password) {
    const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
    }

    const result = await response.json();
    localStorage.setItem('authToken', result.token);
    console.log('Login successful:', result.message);
}

// Share the drawing
export async function saveDrawing(canvas) {
    const token = localStorage.getItem('authToken');
    const drawing = canvas.toDataURL("image/png");

    const response = await fetch('/api/drawings', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ drawing }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
    }
    
    const result = await response.json();
    console.log('Drawing saved successfully:', result);
}

// Delete a drawing by ID
export async function deleteImage(id) {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`/api/drawings/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
    }

    console.log('Drawing deleted successfully');
}

// Delete all drawings for a specific user
export async function deleteAllImages(id) {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`/api/user/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
    }

    console.log('All drawings deleted successfully');
}

export async function loadDrawing(id, context) {
    try {
        const response = await fetch(`/api/drawings/${id}`);
        if (!response.ok) {
            throw new Error("Failed to load drawing.");
        }

        const { imageData } = await response.json();

        const img = new Image();
        img.onload = () => {
            context.clearRect(0, 0, 1920, 1080); // Clear the canvas
            context.drawImage(img, 0, 0, 1920, 1080); // Draw the loaded image
        };
        img.src = imageData;
    } catch (error) {
        console.error(error);
        alert("Failed to load drawing.");
    }
}

export async function fetchSavedDrawings() {
    const token = localStorage.getItem('authToken');
    const response = await fetch('/api/drawings/', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
    }

    return await response.json(); // Return array of drawings
}

