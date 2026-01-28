const express = require('express');
const app = express();
const http = require('http');
require('dotenv').config();
const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const { Server } = require('socket.io');
const passport = require('./Config/Passport');

const bcrypt = require('bcrypt');
const User = require("./Models/User");
const Post = require('./Models/Post');

const cors = require('cors');
const cookieParser = require("cookie-parser");
const authRoutes = require('./Routes/Auth');
const uploadRoutes = require("./Routes/Upload")
const userRoute = require("./Routes/User")
const postRoute = require("./Routes/Post")
const videoRoute = require("./Routes/Video")
const NotificationRoute = require("./Routes/Notification")
const AnalyticRoute = require("./Routes/Analytic")
const MessageRoute = require("./Routes/Message")
const FeedRoutes = require("./Routes/Feed")
const ReportRoute = require("./Routes/Report")
const ReviewRoute = require("./Routes/Review")
const  DashboardRoute = require("./Routes/Dashboard");



app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));

app.use(express.json())

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

const userSockets = new Map();
global.io = io;

io.on('connection', (socket) => {
  
  socket.on('register', (userId) => {
    userSockets.set(userId, socket.id);
    socket.userId = userId;
    socket.join(userId);
    
    io.emit('user-online', userId);
    
    socket.emit('registered', { userId, socketId: socket.id });
  });
  
  socket.on('join-user-room', (userId) => {
    socket.join(userId);
  });
  
  socket.on('join-conversation', (conversationId) => {
    socket.join(conversationId);
    const roomSize = io.sockets.adapter.rooms.get(conversationId)?.size || 0;
    
    socket.emit('room-joined', { conversationId, roomSize });
  });
  
  socket.on('leave-conversation', (conversationId) => {
    socket.leave(conversationId);
  });
  
  socket.on('typing', ({ conversationId, userId, userName }) => {
    socket.to(conversationId).emit('user-typing', { userId, userName });
    
    socket.broadcast.emit('user-typing-global', { 
      conversationId, 
      userId, 
      userName 
    });
  });
  
  socket.on('stop-typing', ({ conversationId, userId }) => {
    socket.to(conversationId).emit('user-stop-typing', { userId });
    
    socket.broadcast.emit('user-stop-typing-global', { 
      conversationId, 
      userId 
    });
  });
  
  socket.on('mark-seen', ({ conversationId, userId }) => {
    const timestamp = new Date();
    socket.to(conversationId).emit('messages-seen', { userId, timestamp });
  });
  
  socket.on('disconnect', (reason) => {
    if (socket.userId) {
      userSockets.delete(socket.userId);
      
      io.emit('user-offline', socket.userId);
    } else {
      for (let [userId, socketId] of userSockets.entries()) {
        if (socketId === socket.id) {
          userSockets.delete(userId);
          
          io.emit('user-offline', userId);
          break;
        }
      }
    }
  });
});

function emitNewMessage(conversationId, message, participants) {
  const eventData = {
    conversationId,
    message
  };
  
  io.to(conversationId).emit('new-message', eventData);
  
  if (participants && participants.length > 0) {
    participants.forEach(participantId => {
      const participantIdStr = participantId.toString();
      io.to(participantIdStr).emit('new-message', eventData);
    });
  }
}

global.emitNewMessage = emitNewMessage;

function sendNotificationToUser(userId, notification) {
  const socketId = userSockets.get(userId);
  if (socketId) {
    io.to(socketId).emit('new-notification', notification);
  }
}

global.sendNotificationToUser = sendNotificationToUser;




mongoose.connect(process.env.MONGO_URI)

server.listen(process.env.PORT , ()=>{console.log(`Server is running on port ${process.env.PORT}`)})

app.use(cookieParser());
app.use(passport.initialize()) 

app.use('/api', (req, res, next) => {
  req.setTimeout(600000); 
  res.setTimeout(600000); 
  next();
});

app.use('/api',  authRoutes);
app.use('/api' , uploadRoutes)
app.use('/api' , userRoute )
app.use('/api' , postRoute )
app.use('/api' , videoRoute)
app.use('/api' , NotificationRoute )
app.use('/api' , AnalyticRoute )
app.use('/api/messages' , MessageRoute )
app.use('/api/feed' , FeedRoutes )
app.use('/api/report' , ReportRoute )
app.use('/api/review' , ReviewRoute )
app.use("/api/dashboard", DashboardRoute);