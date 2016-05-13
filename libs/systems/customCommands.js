'use strict';
var chalk     = require('chalk'),
    db        = require('nedb'),
    constants = require("../constants");
    
 
var database = new db({
        filename: 'db/customCommands.db',
        autoload: true
    });
database.persistence.setAutocompactionInterval(60000);

// TODO - add parsing of (sender) 

function customCommands(configuration) {
    if (global.configuration.get().systems.customCommands === true) {
        global.parser.register('!command add',    this.addCommand,   constants.OWNER_ONLY);
        global.parser.register('!command list',   this.listCommands, constants.OWNER_ONLY);
        global.parser.register('!command remove', this.delCommand,   constants.OWNER_ONLY);
        global.parser.register('!command',        this.help,         constants.OWNER_ONLY);
    
        // start interval for registering commands from DB
        var self = this;
        setInterval(function() {
            self.registerCommands();
        }, 1000);
    }
    
    console.log('CustomCommands system loaded and ' + (global.configuration.get().systems.customCommands === true ? chalk.green('enabled'):chalk.red('disabled')));
}

customCommands.prototype.help = function() {
    var text = 'Usage: !command add <command> <response> | !command remove <command> | !command list';
    global.client.action(global.configuration.get().twitch.owner, text);
}

customCommands.prototype.registerCommands = function() {
    var self = this;
    database.find({}, function (err, docs) {
        docs.forEach(function(e, i, ar) { global.parser.register('!'+e.keyword, self.customCommand, constants.VIEWERS);});
    });  
}

customCommands.prototype.addCommand = function(user, keyword) {
    if (keyword.length < 1) {
        global.client.action(global.configuration.get().twitch.owner, 'CustomCommand error: Cannot add empty keyword');
        return;
    }
    
    // check if response after keyword is set
    if (keyword.split(" ").length <= 1) {
        global.client.action(global.configuration.get().twitch.owner, 'CustomCommand error: Cannot add keyword without response');
        return;
    }
    
    var kw       = keyword.split(" ")[0],
        response = keyword.replace(kw,'').trim(),
        self     = this;
        
    database.find({ keyword: kw }, function (err, docs) {
        if (docs.length === 0) { // it is safe to insert new notice?
            database.insert({keyword: kw, response: response}, function (err, newItem) {  
                global.client.action(global.configuration.get().twitch.owner, 'CustomCommand#'+ kw +' succesfully added');
            });
        } else {
            global.client.action(global.configuration.get().twitch.owner, 'CustomCommand error: Cannot add duplicate command.');
        }
    });
}

customCommands.prototype.customCommand = function(user, msg, fullMsg) {
    database.findOne({ keyword: fullMsg.split('!')[1] }, function (err, item) {
            if (typeof item !== undefined && item !== null) {
                global.client.action(global.configuration.get().twitch.owner, item.response);
            } else {
                global.parser.unregister(fullMsg); // unregister if not found in database
            }
        });
}

customCommands.prototype.listCommands = function() {
    database.find({}, function (err, docs) {
        var keywords = [];
        docs.forEach(function(e, i, ar) { keywords.push('!'+e.keyword); });
        var output = (docs.length === 0 ? 'CustomCommand list is empty.' :'CustomCommand list: ' + keywords.join(', ') + '.');
        global.client.action(global.configuration.get().twitch.owner, output);
    });
}

customCommands.prototype.delCommand = function(user, keyword) {
    if (keyword.length < 1) {
        global.client.action(global.configuration.get().twitch.owner, 'CustomCommand error: Cannot delete keyword without keyword.');
        return;
    }
    
    database.remove({ keyword: keyword}, {}, function(err, numRemoved) {
        var output = (numRemoved === 0 ? 'CustomCommand#' + keyword + ' cannot be found.' : 'CustomCommand#' + keyword + ' is succesfully deleted.');
        global.client.action(global.configuration.get().twitch.owner, output);
        if (numRemoved > 0) global.parser.unregister('!'+keyword);
    }); 
}
module.exports = new customCommands();