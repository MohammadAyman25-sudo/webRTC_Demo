require("dotenv").config();
const debug = require("debug")(`${process.env.APPNAME}:index`);
const app = require("express")();
const server = require("http").Server(app);
const wss = require("./wss");

const HTTPPORT = 4000;
const WSSPORT = 8090;
// init the websocket server on 8090
wss.init(WSSPORT);
// init the http server on 4000
server.listen(HTTPPORT, () => {
  debug(`${process.env.APPNAME} is running on port: ${HTTPPORT}`);
  console.log("Server is Listening...");
});
