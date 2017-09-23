
import { NativeModules, NativeAppEventEmitter } from 'react-native';
var EventEmitter = require('react-native/Libraries/vendor/emitter/EventEmitter');

const { RNNodeJsMobile } = NativeModules;

class MyEmitter extends EventEmitter {}
MyEmitter.prototype.send=function(msg) {
  RNNodeJsMobile.sendMessage(msg);
};
const start=function() {
  RNNodeJsMobile.startNodeProject(true);
};
const startWithScript=function(script) {
  RNNodeJsMobile.startNodeWithScript(script);
}

const channel = new MyEmitter();

NativeAppEventEmitter.addListener("nodejs-mobile-react-native-message",
  (e) => {
    channel.emit("message",e.message);
  }
);

const export_object = {
  start: start,
  startWithScript: startWithScript,
  channel: channel
};

module.exports = export_object;
