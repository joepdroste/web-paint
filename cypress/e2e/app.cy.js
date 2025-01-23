describe('App Happy Paths', () => {
  beforeEach(() => {
    cy.request('POST', '/api/reset');
    cy.visit('/');
  });

  const selectors = {
    colorInput: 'input[id="color"]',
    fillColorInput: 'input[id="fillcolor"]',
    roomInput: 'input[id="roominput"]',
    joinRoomButton: 'button:contains("Join Room")',
    brushSizeInput: 'input[type="range"]'
  };

  it('should change color', () => {
    cy.get(selectors.colorInput).invoke('val', '#ff0000').trigger('input');
    cy.get(selectors.colorInput).should('have.value', '#ff0000');
  });

  it('should change fill color', () => {
    cy.get(selectors.fillColorInput).invoke('val', '#00ff00').trigger('input');
    cy.get(selectors.fillColorInput).should('have.value', '#00ff00');
  });

  it('should join room', () => {
    cy.get(selectors.roomInput).type('TestRoom');
    cy.get(selectors.joinRoomButton).click();
    cy.get(selectors.roomInput).should('have.value', 'TestRoom');
  });

  it('should change brush size', () => {
    cy.get(selectors.brushSizeInput).invoke('val', '5').trigger('change');
    cy.get(selectors.brushSizeInput).should('have.value', '5');
  });

  it('should register', () => {
    cy.get('input[id="username"]').type('testuser');
    cy.get('input[id="password"]').type('testpass');
    cy.get('button:contains("Register")').click();
    cy.get('input[id="username"]').should('have.value', '');
    cy.get('input[id="password"]').should('have.value', '');
  });

  it('should register and login', () => {
    cy.get('input[id="username"]').type('testuser');
    cy.get('input[id="password"]').type('testpass');
    cy.get('button:contains("Register")').click();
    cy.get('input[id="username"]').should('have.value', '');
    cy.get('input[id="password"]').should('have.value', '');

    cy.get('input[id="username"]').type('testuser');
    cy.get('input[id="password"]').type('testpass');
    cy.get('button:contains("Login")').click();
    cy.get('input[id="username"]').should('have.value', '');
    cy.get('input[id="password"]').should('have.value', '');
  });
});