const uWS = require('./node_modules/uWebSockets.js');
var SOCKETS = [];
const decoder = new TextDecoder('utf-8');
const port = process.env.PORT || 5000;

const MESSAGE_ENUM = Object.freeze({
    SELF_CONNECTED: "SELF_CONNECTED",
    CLIENT_CONNECTED: "CLIENT_CONNECTED",
    CLIENT_DISCONNECTED: "CLIENT_DISCONNECTED",
    CLIENT_MESSAGE: "CLIENT_MESSAGE",
    SERVER_MESSAGE: "SERVER_MESSAGE",
});
var id = 1;

app = uWS.App()
    .ws('/ws', {
    compression: 0,
    maxPayloadLength: 16 * 1024 * 1024,
    idleTimeout: 60,
    
    open: (ws, req) => {
        ws.id = id;
        ws.username = 'user'+id;
        id ++;

        ws.subscribe(MESSAGE_ENUM.CLIENT_CONNECTED);
        ws.subscribe(MESSAGE_ENUM.CLIENT_DISCONNECTED);
        ws.subscribe(MESSAGE_ENUM.CLIENT_MESSAGE);
        ws.subscribe(MESSAGE_ENUM.SERVER_MESSAGE);

        console.log("Dołącza użytkownik " + ws.username);
        let selfMsg = {
            type: MESSAGE_ENUM.SELF_CONNECTED,
            body: {
                id: ws.id,
                name: ws.username
            }
        }
        let msg = {
            type: MESSAGE_ENUM.CLIENT_CONNECTED,
            body: {
            id: ws.id,
            name: ws.username
            }
        }
        ws.send(JSON.stringify(selfMsg));
        app.publish(MESSAGE_ENUM.CLIENT_CONNECTED, JSON.stringify(msg));
    },

    message: (ws, message, isBinary) => {
        let clientMsg = JSON.parse(decoder.decode(message));
        console.log("ws.username: ", clientMsg);
        switch (clientMsg.type) {
            case MESSAGE_ENUM.CLIENT_MESSAGE:
                msg = {
                    type: MESSAGE_ENUM.CLIENT_MESSAGE,
                    sender: ws.username,
                    body: clientMsg.body
                };
                app.publish(MESSAGE_ENUM.CLIENT_MESSAGE, JSON.stringify(msg));
                break;
            default:

                break;
        }
    },
    close: (ws, code, message) => {
        let pubMsg = {
            type: MESSAGE_ENUM.CLIENT_DISCONNECTED,
            body: {
                id: ws.id,
                name: ws.username
            }
        }
        console.log("Rozłącza się użytkownik " + ws.username);
        app.publish(MESSAGE_ENUM.CLIENT_DISCONNECTED, JSON.stringify(pubMsg));
    }
}).listen(7777, token => {
    token ?
    console.log(`Listening to port ${port}`) :
    console.log(`Failed to listen to port ${port}`);
});



const express = require('express');
const serveIndex = require('serve-index');

const app2 = express();
app2.use(express.static(__dirname + '/public/'));
app2.use('/',serveIndex('public', {icons: true}));
app2.listen(port, function() { console.log('nasluchujemy na 8880'); });
