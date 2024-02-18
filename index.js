// Import required modules
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const qrCode = require('qrcode');
const nodemailer = require('nodemailer');
const cors = require('cors');

// Initialize Express app
const app = express();

app.use(cors({
  origin: 'https://beacon-frontend.vercel.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// Use JSON parsing middleware


const uri ='mongodb://vishalsmurali:vishal123@ac-zjd5rri-shard-00-00.wj6gy9a.mongodb.net:27017,ac-zjd5rri-shard-00-01.wj6gy9a.mongodb.net:27017,ac-zjd5rri-shard-00-02.wj6gy9a.mongodb.net:27017/?ssl=true&replicaSet=atlas-kny4ov-shard-0&authSource=admin&retryWrites=true&w=majority';

// Connect to MongoDB Atlas
mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB Atlas'))
.catch(err => console.error('Error connecting to MongoDB Atlas:', err));

// Define user schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  email: {type: String,required:true},
  dob: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
});

const eventSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    location: { type: String, required: true },
    organizer:{type:String , required:true},
    pno:{type:String,required:true}
  });

  const verifyToken = (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }
  
    jwt.verify(token, 'your_secret_key', (err, decoded) => {
      if (err) {
        return res.status(403).json({ message: 'Failed to authenticate token' });
      }
  
      req.user = decoded;
      next();
    });
  };

// Define user model
const User = mongoose.model('User', userSchema);
const Event = mongoose.model('Event', eventSchema);
app.use(bodyParser.json());
// Route for user registration
app.post('/register', async (req, res) => {
  try {
    const { username, password, name,email, dob, role } = req.body;
    // Check if the username already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const newUser = new User({
      username,
      password: hashedPassword,
      name,
      email,
      dob,
      role
    });

    // Save the user to the database
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Route for user login and token generation
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Find the user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Compare the provided password with the hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, 'your_secret_key', { expiresIn: '1h' });

    // Return the token
    res.status(200).json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Route to retrieve user information
app.get('/user/:username', async (req, res) => {
  try {
    const { username } = req.params;

    // Find user by username
    const user = await User.findOne({ username });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server Error' });
  }
});

app.post('/events', verifyToken, async (req, res) => {
    try {
      const { title, organizer,pno, date, time, location, description } = req.body;
      
  
      // Check if the user making the request is an admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized' });
      }
  
      // Create a new event
      const newEvent = new Event({
        title,
        description,
        date,
        time,
        location,
        organizer,
        pno
      });
  
      // Save the event to the database
      await newEvent.save();
      res.status(201).json({ message: 'Event created successfully' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server Error' });
    }
  });

  app.get('/events', async (req, res) => {
    try {
      // Get current date and time
      const currentDate = new Date();
  
      // Find events with date and time greater than or equal to current date and time
      const upcomingEvents = await Event.find({
        $or: [
          { date: { $gt: currentDate } },
          { date: currentDate, time: { $gte: currentDate.getHours() + ':' + currentDate.getMinutes() } }
        ]
      });
  
      res.json(upcomingEvents);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server Error' });
    }
  });


  app.get('/events/filter', async (req, res) => {
    try {
      // Extract query parameters
      const { title, date, time, location,organizer, filterAll } = req.query;
  
      // Build query object based on provided parameters
      const query = {};
      if (title) {
        query.title = new RegExp(title, 'i'); // Case-insensitive search
      }
      if (date) {
        query.date = date;
      }
      if (time) {
        query.time = time;
      }
      if (location) {
        query.location = new RegExp(location, 'i'); // Case-insensitive search
      }
      if(organizer){
        query.organizer=organizer;
      }
      if (filterAll) {
        query.$or = [
          { title: new RegExp(filterAll, 'i') },
          { date },
          { time },
          { location: new RegExp(filterAll, 'i') }
        ];
      }
  
      // Find events based on the query
      const filteredEvents = await Event.find(query);
  
      res.json(filteredEvents);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server Error' });
    }
  });


  app.get('/events/user', async (req, res) => {
    try {
      // Extract query parameters
      const {organizer} = req.query;
      // Build query object based on provided parameters
      
  
      // Find events based on the query
      const filteredEvents = await Event.find({organizer:organizer});
  
      res.json(filteredEvents);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server Error' });
    }
  });

  const generateQRCode = async (eventDetails) => {
    try {
        const qrData = JSON.stringify(eventDetails);
        const qrCodeImage = await qrCode.toDataURL(qrData);
        return qrCodeImage;
    } catch (err) {
        console.error("Error generating QR code:", err);
        throw err;
    }
};

// Send email function
const sendEmail = async (email, eventDetails, qrCodeImage) => {
    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.user,
                pass: process.env.pass
            }
        });

        const mailOptions = {
            from: 'vtech232003@gmail.com',
            to: email,
            subject: 'Event Registration',
            html: `
            <!DOCTYPE html>
        <html>
        <head>
            <style>
            html, body{
                height:100%;
                font-family: 'Indie Flower', cursive;
              }
              body{
                display:flex;
                justify-content:space-around;
                background-color:#333;
              }
              p{
                font-size:32px;
                margin:auto;
              }
              .papercard{
                width:25%;
                margin:auto;
                min-height:200px;
                background-color:#fff;
                box-sizing:border-box;
                box-shadow:0 1px 4px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 0, 0, 0.5) inset;
                display:flex;
              }
              
            </style>
        </head>
        <body>
        <table class="card" role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-radius: 6px; border-collapse: separate !important; width: 100%; overflow: hidden; border: 1px solid #e2e8f0;" bgcolor="#ffffff">
        <tbody>
          <tr>
            <td style="line-height: 24px; font-size: 16px; width: 100%; margin: 0;" align="left" bgcolor="#ffffff">
              <table class="card-body" role="presentation" border="0" cellpadding="0" cellspacing="0" style="width: 100%;">
                <tbody>
                  <tr>
                    <td style="line-height: 24px; font-size: 16px; width: 100%; margin: 0; padding: 20px;" align="left">
                    Event Details<br><br>
                    Title: ${eventDetails.title}<br><br>
                    Description: ${eventDetails.description}<br><br>
                    Date: ${eventDetails.date}<br><br>
                    Time: ${eventDetails.time}<br><br>
                    Location: ${eventDetails.location}<br><br>
                    Regards,<br>V-Tech
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>
      
        </body>
        </html>
    `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);
    } catch (err) {
        console.error('Error sending email:', err);
        throw err;
    }
};



app.post('/events/deleteevent', verifyToken, async (req, res) => {
  try {
    const title = req.body.title;
    // Find the event by title and delete it
    const deletedEvent = await Event.findOneAndDelete({ title: title });
    if (deletedEvent) {
      res.status(200).json({ message: "Event deleted successfully" });
    } else {
      res.status(404).json({ message: "Event not found" });
    }
  } catch (error) {
    console.error(error); // Log the error for debugging
    res.status(500).json({ message: "Internal server error" });
  }
});

// Route for user registration for event
app.post('/register-event', async (req, res) => {
    try {
        const { email, eventName } = req.body;

        // Fetch event details from MongoDB
        const event = await Event.findOne({ title: eventName });
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        // Generate QR code
        const qrCodeImage = await generateQRCode(event);

        // Send email with QR code
        await sendEmail(email, event, qrCodeImage);

        res.status(200).json({ message: 'Email sent successfully' });
    } catch (err) {
        console.error('Error registering for event:', err);
        res.status(500).json({ message: 'Failed to register for event' });
    }
});


// Start the server
const PORT = process.env.PORT || 9002;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
