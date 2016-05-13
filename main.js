
'use strict';

// 3rd party libraries
var chalk = require('chalk'),
    irc   = require('tmi.js');

// bot libraries
var Configuration = require('./libs/configuration'),
    Parser        = require('./libs/parser');
    
global.configuration = new Configuration;
global.parser        = new Parser;
    
// bot systems
global.systems = require('auto-load')('./libs/systems/');

var options = {
    options: {
        debug: true
    },
    connection: {
        cluster: configuration.get().twitch.cluster,
        reconnect: true
    },
    identity: {
        username: configuration.get().twitch.username,
        password: configuration.get().twitch.password
    },
    channels: ["#"+configuration.get().twitch.owner]
};

global.client = new irc.client(options);

// Connect the client to the server..
client.connect()

client.on("connected", function (address, port) {
    global.client.raw("CAP REQ :twitch.tv/commands");
    global.client.raw("CAP REQ :twitch.tv/membership");
    client.color("Firebrick");
});

client.on("chat", function (channel, user, message, self) {
    parser.parse(user, message);
});