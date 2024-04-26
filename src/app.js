import dotenv from "dotenv";
import connectDB from "./db/index.js";
import app from "./index.js";
import { Server } from "socket.io";
import  https from 'https';
import fs from 'fs'
import { fileURLToPath } from 'url';
import path from "path"
console.log("Environment variables loaded:", process.env.PORT); 
dotenv.config({
  path: "./.env",
});
connectDB();
console.log("Certificate files loaded successfully"); // Check if this logs
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const options={
  key:fs.readFileSync(path.join(__dirname,'./server.key')),
  cert:fs.readFileSync(path.join(__dirname,'./server.crt'))    
}
console.log("Certificate files loaded successfully"); // Check if this logs

const httpsServer = https.createServer(options, app);
const server = httpsServer.listen(9000, () => {
  console.log("Server Running at port: ", process.env.PORT);
});

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

io.on("connection", (socket) => {
  socket.on("setup", (userData) => {
    socket.join(userData?._id);
    console.log(userData?._id);
    socket.emit("connected");
  });

  socket.on("join chat", (roomId) => {
    socket.join(roomId);
    console.log("User joined room ", roomId);
  });

  socket.on("new message", (newMessageReceived) => {
    let chat = newMessageReceived.chat;
    if (!chat.users) {
      console.log("User not defined");
      return;
    }

    chat.users.forEach((user) => {
      if (user?._id == newMessageReceived.sender._id) return;
      socket.in(user._id).emit("message received", newMessageReceived);
    });
  });

  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  // socket.off("setup", () => {
  //   console. log("USER DISCONNECTED");
  //   socket.leave(userData?._id);
  // });
});
