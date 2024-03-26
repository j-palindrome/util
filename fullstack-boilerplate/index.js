"use strict";
import express from "express";
import ViteExpress from "vite-express";
import { Server as SocketServer } from "socket.io";
import { Client as OscClient, Server as OscServer } from "node-osc";
const app = express();
const server = ViteExpress.listen(
  app,
  7001,
  () => console.log("Server is listening...")
);
const io = new SocketServer(server);
const oscOut = new OscClient("127.0.0.1", 7001);
const oscIn = new OscServer(7004, "0.0.0.0");
io.on("connection", (socket) => {
  console.log(socket.id, "connected");
});
