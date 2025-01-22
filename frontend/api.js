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
    console.log(drawing);

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
