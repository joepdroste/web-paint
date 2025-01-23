describe("API Routes", () => {
    beforeEach(() => {
        cy.request("POST", "/api/reset");
    });

    describe("GET /api/drawings", () => {
        it("should return an empty array initially", () => {
            cy.request("/api/drawings").then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body).to.deep.eq([]);
            });
        });
    });

    describe("POST /api/register", () => {
        it("should register a new user", () => {
            cy.request("POST", "/api/register", {
                username: "testuser",
                password: "testpass",
            }).then((response) => {
                expect(response.status).to.eq(201);
                expect(response.body.message).to.eq("User registered successfully.");
            });
        });

        it("should not allow duplicate usernames", () => {
            cy.request("POST", "/api/register", {
                username: "testuser",
                password: "testpass",
            });

            cy.request({
                method: "POST",
                url: "/api/register",
                body: { username: "testuser", password: "testpass2" },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).to.eq(400);
                expect(response.body.error).to.eq("Username already exists.");
            });
        });
    });

    describe("POST /api/login", () => {
        beforeEach(() => {
            cy.request("POST", "/api/register", {
                username: "testuser",
                password: "testpass",
            });
        });

        it("should login a user with valid credentials", () => {
            cy.request("POST", "/api/login", {
                username: "testuser",
                password: "testpass",
            }).then((response) => {
                expect(response.status).to.eq(200);
                expect(response.body).to.have.property("token");
            });
        });

        it("should reject login with invalid credentials", () => {
            cy.request({
                method: "POST",
                url: "/api/login",
                body: { username: "testuser", password: "wrongpass" },
                failOnStatusCode: false,
            }).then((response) => {
                expect(response.status).to.eq(400);
                expect(response.body.error).to.eq("Invalid username or password.");
            });
        });
    });

    describe("Authenticated Routes", () => {
        let token;
        beforeEach(() => {
            cy.request("POST", "/api/register", {
                username: "testuser",
                password: "testpass",
            }).then(() => {
                cy.request("POST", "/api/login", {
                    username: "testuser",
                    password: "testpass",
                }).then((response) => {
                    token = response.body.token;
                });
            });
        });

        it("should post a new drawing", () => {
            cy.request({
                method: "POST",
                url: "/api/drawings",
                body: { title: "My Drawing", content: "..." },
                headers: { Authorization: `Bearer ${token}` },
            }).then((response) => {
                expect(response.status).to.eq(201);
                expect(response.body.title).to.eq("My Drawing");
            });
        });

        it("should delete a specific drawing", () => {
            // Add a drawing first
            cy.request({
                method: "POST",
                url: "/api/drawings",
                body: { title: "My Drawing", content: "..." },
                headers: { Authorization: `Bearer ${token}` },
            }).then((response) => {
                const drawingId = response.body.id;

                // Delete the drawing
                cy.request({
                    method: "DELETE",
                    url: `/api/drawings/${drawingId}`,
                    headers: { Authorization: `Bearer ${token}` },
                }).then((deleteResponse) => {
                    expect(deleteResponse.status).to.eq(200);
                    expect(deleteResponse.body.message).to.eq("Drawing deleted successfully");
                });
            });
        });

        it("should not allow deleting another user's drawing", () => {
            // Create another user
            cy.request("POST", "/api/register", {
                username: "anotherUser",
                password: "password123",
            });

            // Another user adds a drawing
            let anotherUserToken;
            cy.request("POST", "/api/login", {
                username: "anotherUser",
                password: "password123",
            }).then((response) => {
                anotherUserToken = response.body.token;

                cy.request({
                    method: "POST",
                    url: "/api/drawings",
                    body: { title: "Another's Drawing", content: "..." },
                    headers: { Authorization: `Bearer ${anotherUserToken}` },
                }).then((response) => {
                    const drawingId = response.body.id;

                    // Attempt to delete another user's drawing
                    cy.request({
                        method: "DELETE",
                        url: `/api/drawings/${drawingId}`,
                        headers: { Authorization: `Bearer ${token}` },
                        failOnStatusCode: false,
                    }).then((deleteResponse) => {
                        expect(deleteResponse.status).to.eq(403);
                        expect(deleteResponse.body.error).to.eq("You are not authorized to delete this drawing");
                    });
                });
            });
        });
    });
});