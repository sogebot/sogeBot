'use strict';
var chalk     = require('chalk'),
    db        = require('nedb'),
    constants = require("../constants");
    
 
var database = new db({
        filename: 'db/points.db',
        autoload: true
    });
database.persistence.setAutocompactionInterval(60000);


function Points(configuration) {        
    if (global.configuration.get().systems.points === true) {
        global.parser.register('!points', this.getPoints, constants.VIEWERS);
        
        // add events for join/part
        var self = this;
        setTimeout(function() {
            self.addEvents(self);
        }, 1000);
        // count Points - every 30s check points
        setInterval(function() {
            self.updatePoints();
        }, 30000);
    }
    
    console.log('Points system loaded and ' + (global.configuration.get().systems.points === true ? chalk.green('enabled'):chalk.red('disabled')));
}

Points.prototype.addEvents = function(self) {
    global.client.on("join", function (channel, username) {
        if (username != global.configuration.get().twitch.username) {
            self.startCounting(username)   
        }
    });
    global.client.on("part", function (channel, username) {
        if (username != global.configuration.get().twitch.username) {
            self.stopCounting(username)
        }
    });
}

Points.prototype.getPoints = function(user) {
    var self = this;
    database.findOne({ username: user.username }, function (err, item) {
        var points = (typeof item !== undefined && item !== null ? item.points : 0),
            responsePattern = global.configuration.get().systems.pointsResponse,
            pointsNames = global.configuration.get().systems.pointsName.split('|');
            
        var single, multi, xmulti;
        // get single|x:multi|multi from pointsName
        switch (pointsNames.length) {
            case 0:
                xmulti = null;
                single = 'Point';
                multi = 'Points';
                break;
            case 1:
                xmulti = null;
                single = multi = pointsNames[0];
                break;
            case 2:
                single = pointsNames[0];
                multi = pointsNames[1];
                xmulti = null;
                break;
            default:
                var len = pointsNames.length;
                single = pointsNames[0]
                multi = pointsNames[len-1];
                xmulti = {}
                
                for (var pattern in pointsNames) {
                    if (pointsNames.hasOwnProperty(pattern) && pattern != 0 && pattern != len-1) {
                        var maxPts = pointsNames[pattern].split(':')[0],
                            name   = pointsNames[pattern].split(':')[1];
                        xmulti[maxPts] = name;    
                    }
                }
                break;     
        }        
        
        var pointsName = (points == 1 ? single : multi)
        if (typeof xmulti === 'object' && points > 1 && points <= 10) {
            for (var i=points; i<=10; i++) { 
                console.log(typeof xmulti[i])
                if (typeof xmulti[i] === 'string') {
                    pointsName = xmulti[i];
                    break;
                }
            }
        }
        
        global.client.action(global.configuration.get().twitch.owner, 
            responsePattern.replace('(sender)', user.username).replace('(amount)', points + ' ' + pointsName));
    });
}

Points.prototype.startCounting = function(username) {
    database.findOne({ username: username }, function (err, item) {
            if (typeof item !== undefined && item !== null) { // exists, update
                var partedTime = (item.partedTime == 0 ? item.pointsGrantedAt : item.partedTime), // if not correctly parted
                    pointsGrantedAt = new Date().getTime() + (item.pointsGrantedAt - partedTime) ;
                database.update({_id: item._id}, {$set: {isOnline: true, pointsGrantedAt: pointsGrantedAt}}, {});
            } else { // not exists, create a new one
                database.insert({ username: username, isOnline: true, pointsGrantedAt: new Date().getTime(), partedTime: 0, points: 0});
            }
        });
}

Points.prototype.stopCounting = function(username) {
    database.update({ username: username }, {$set: {isOnline: false, partedTime: new Date().getTime()}}, {});
}

Points.prototype.updatePoints = function() {
    var interval = global.configuration.get().systems.pointsInterval*60*1000,
        ptsPerInterval = global.configuration.get().systems.pointsPerInterval;
    database.find({ isOnline: true }, function (err, items) {
        items.forEach(function(e, i, ar) {
            var points = parseInt(e.points) + parseInt(ptsPerInterval),
                now    = new Date().getTime();
            if (now - e.pointsGrantedAt >= interval) {
                database.update({_id: e._id}, {$set: {pointsGrantedAt: now, points: points}}, {});
            }
        });
    });
}

module.exports = new Points();