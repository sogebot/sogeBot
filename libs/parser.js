'use strict';

var chalk     = require('chalk'),
    constants = require("./constants");

function Parser() {
    this.registeredCmds = {};
    this.permissionsCmds = {};
    this.registeredParsers = {};
    this.permissionsParsers = {};
    this.linesParsed = 0;
}

Parser.prototype.parse = function(user, message) {
    this.linesParsed++;
    
    var isParseable = true;
    for (var parser in this.registeredParsers) {
        if (this.permissionsParsers[parser] === constants.VIEWERS || this.permissionsParsers[parser] === constants.OWNER_ONLY && this.isOwner(user)) {
            isParseable = this.registeredParsers[parser](user, message);
        }
        if (!isParseable) return;
    }
    
    for (var cmd in this.registeredCmds) {
        if (message.startsWith(cmd)) {
            if (this.permissionsCmds[cmd] === constants.VIEWERS || this.permissionsCmds[cmd] === constants.OWNER_ONLY && this.isOwner(user)) {
                var text = message.replace(cmd,'');
                this.registeredCmds[cmd](user, text.trim(), message);
                break; // cmd is executed
            }
        }
    }
}

Parser.prototype.register = function(cmd, fnc, permission) {
    this.registeredCmds[cmd] = fnc;
    this.permissionsCmds[cmd] = permission;
}

Parser.prototype.registerParser = function(parser, fnc, permission) {
    this.registeredParsers[parser] = fnc;
    this.permissionsParsers[parser] = permission;
}

Parser.prototype.unregister = function(cmd) {
    delete this.registeredCmds[cmd];
    delete this.permissionsCmds[cmd];
}

Parser.prototype.isOwner = function(user) {
    return global.configuration.get().twitch.owner.toLowerCase() === user.username.toLowerCase();
}

module.exports = Parser;