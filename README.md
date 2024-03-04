# Beacon-server

## About

Beacon Backend is a Node.js application designed to serve as the backend service for the Beacon Frontend application. It provides functionalities for user authentication, event management, and event registration via email.

## Technologies Used

    Node.js
    Express.js
    MongoDB
    bcryptjs (for password hashing)
    jsonwebtoken (JWT for authentication)
    nodemailer (for sending emails)
    qrcode (for generating QR codes)

## Features

    User registration and authentication
    Event creation and management
    Event registration via email with QR code
    Filtering and retrieval of events
    Token-based authentication for protected routes

## Installation

Clone the repository:

```
git clone https://github.com/VykSI/beacon-backend.git
```

Install dependencies:
```
cd beacon-backend
npm install
```

Set up environment variables:

Create a .env file in the root directory and add the following variables:
```
MONGODB_URI=<your_MongoDB_URI>
PORT=<desired_port_number>
```

## Usage

Once the server is running, you can interact with it using HTTP requests. You can use tools like Postman or curl to test the endpoints.

## Endpoints

User Routes

    POST /register: Register a new user.
    POST /login: Login and generate a JWT token.
    GET /user/:username: Get user information by username.

Event Routes

    POST /events: Create a new event (requires admin privileges).
    GET /events: Retrieve upcoming events.
    GET /events/filter: Filter events based on parameters like title, date, time, location, and organizer.
    GET /events/user: Retrieve events organized by a specific user.
    POST /events/deleteevent: Delete an event by title (requires admin privileges).
    POST /register-event: Register for an event and receive a confirmation email with a QR code.

## Run Server
```
node index.js
```
## NOTE:
Change cors accordingly.
