'use strict';
var chalk     = require('chalk'),
    db        = require('nedb'),
    constants = require("../constants");
    
 
var database = new db({
        filename: 'db/price.db',
        autoload: true
    });
database.persistence.setAutocompactionInterval(60000);


function Price(configuration) {        
    if (global.configuration.get().systems.points === true && global.configuration.get().systems.price === true) {
        global.parser.register('!price set',   this.setPrice,   constants.OWNER_ONLY);
        global.parser.register('!price list',  this.listPrices, constants.OWNER_ONLY);
        global.parser.register('!price unset', this.unsetPrice, constants.OWNER_ONLY);
        global.parser.register('!price',       this.help,       constants.OWNER_ONLY);
        
        global.parser.registerParser('price', this.checkPrice, constants.VIEWERS);
    }
    
    console.log('Price system (dependency on Points system) loaded and ' + (global.configuration.get().systems.price === true && global.configuration.get().systems.points === true ? chalk.green('enabled'):chalk.red('disabled')));
}

Price.prototype.help = function() {
    var text = 'Usage: !price set <cmd> <price> | !price unset <cmd> | !price list';
    global.client.action(global.configuration.get().twitch.owner, text);
}

Price.prototype.setPrice = function(user, text) {
    if (text.length < 1) {
        global.client.action(global.configuration.get().twitch.owner, 'Price error: Cannot set price for empty command');
        return;
    }
    
    // check if response after keyword is set
    if (text.split(" ").length <= 1) {
        global.client.action(global.configuration.get().twitch.owner, 'Price error: Cannot set empty price for command');
        return;
    }
    
    var cmd   = text.split(" ")[0],
        price = parseInt(text.replace(cmd,'').trim()),
        self  = this;
        
    if (!Number.isInteger(price)) {
        global.client.action(global.configuration.get().twitch.owner, 'Price error: Cannot set NaN price.');
        return;
    }
    
    database.find({ command: cmd }, function (err, docs) {
        if (docs.length === 0) {
            database.insert({command: cmd, price: price});
        } else {
            database.update({command: cmd}, {$set: {price: price}}, {});
        }
        global.client.action(global.configuration.get().twitch.owner, 'Price#'+ cmd +' succesfully set to ' + price);
    });
}

Price.prototype.unsetPrice = function(user, msg) {
    database.remove({ command: msg}, {}, function(err, numRemoved) {
        var output = (numRemoved === 0 ? 'Price#' + msg + ' wasn\'t set.' : 'Price#' + msg + ' is succesfully unset.');
        global.client.action(global.configuration.get().twitch.owner, output);
    }); 
}

Price.prototype.listPrices = function(user, msg) {
    database.find({}, function (err, docs) {
        var ids = [];
        docs.forEach(function(e, i, ar) { ids.push(e.command+':'+e.price); });
        var output = (docs.length === 0 ? 'Price list is empty.' :'Price list: ' + ids.join(', ') + '.');
        global.client.action(global.configuration.get().twitch.owner, output);
    });
}

Price.prototype.checkPrice = function(id, user, msg) {
    if (!msg.startsWith('!')) {
        global.updateQueue(id, true); // we want to parse _ONLY_ commands
        return true;
    }

    database.find({ }, function (err, items) {
        var itemFound = false;
        for (var item in items) {
            if (items.hasOwnProperty(item)) {
                var position = msg.toLowerCase().indexOf('!'+items[item].command),
                    kwLength = items[item].command.length+1,
                    price    = items[item].price,
                    command  = items[item].command;
                    
                if (position>=0 && typeof msg[position-1] === 'undefined' &&
                    (msg[position+kwLength] === ' ' || typeof msg[position+kwLength] === 'undefined')) {
                        var pointsDb = global.systems.points.getDatabase();
                        itemFound = true;
                        pointsDb.findOne({ username: user.username }, function (err, item) {
                            var points = (typeof item !== 'undefined' && item !== null ? item.points : 0);
                            if (points >= price) {
                                pointsDb.update({username: user.username}, {$set: {points: points-price}}, {});
                                global.updateQueue(id, true);
                            } else {
                                global.client.action(global.configuration.get().twitch.owner, 'Sorry, ' + user.username + ', you need ' + price +  ' Points for !' + command);
                                global.updateQueue(id, false)
                            }
                        });
                }    
            }
        }
	if (!itemFound) global.updateQueue(id, true);
    });
}

module.exports = new Price();
