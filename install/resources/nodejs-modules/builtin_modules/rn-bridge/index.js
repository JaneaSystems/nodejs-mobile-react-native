
const EventEmitter = require('events');
var mybridgeaddon = process.binding('rn_bridge');

class MyEmitter extends EventEmitter {}
MyEmitter.prototype.send=function(msg) {
  mybridgeaddon.sendMessage(msg);
};

const channel = new MyEmitter();

var myListener = mybridgeaddon.registerListener( function(msg) {
  channel.emit('message', msg);
});

exports.channel = channel;
