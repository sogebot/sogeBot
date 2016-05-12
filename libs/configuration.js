'use strict';

var chalk = require('chalk'),
    ini   = require('ini'),
    fs    = require('fs');
    
function Configuration() {
    this.config = null;
    this.loadFile();
}

Configuration.prototype.loadFile = function() {
    console.log('Loading configuration file');
    this.config = ini.parse(fs.readFileSync('./config.ini', 'utf-8'));
}

Configuration.prototype.get = function () {
    return this.config;
}

module.exports = Configuration;