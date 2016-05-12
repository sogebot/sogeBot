'use strict';

var chalk     = require('chalk'),
    constants = require("./constants");

function Parser() {
    this.registeredCmds = {};
    this.permissionsCmds = {};
    this.linesParsed = 0;
}

Parser.prototype.parse = function(user, message) {
    this.linesParsed++;
    for (var cmd in this.registeredCmds) {
        if (message.startsWith(cmd)) {
            if (this.permissionsCmds[cmd] === constants.VIEWERS || this.permissionsCmds[cmd] === constants.OWNER_ONLY && this.isOwner(user)) {
                var text = message.replace(cmd,'');
                this.registeredCmds[cmd](user, text.trim());
                break; // cmd is executed
            }
        }
    }
}

Parser.prototype.register = function(cmd, fnc, permission) {
    this.registeredCmds[cmd] = fnc;
    this.permissionsCmds[cmd] = permission;
}

Parser.prototype.isOwner = function(user) {
    return global.configuration.get().twitch.owner.toLowerCase() === user.username.toLowerCase();
}

module.exports = Parser;