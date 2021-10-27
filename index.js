
import { NativeModules, NativeAppEventEmitter } from 'react-native';
import EventEmitter from 'react-native/Libraries/vendor/emitter/EventEmitter';

const EVENT_CHANNEL = '_EVENTS_';

var channels = {};

/*
 * This class is defined in rn-bridge/index.js as well.
 * Any change made here should be ported to rn-bridge/index.js too.
 * The MessageCodec class provides two static methods to serialize/deserialize
 * the data sent through the events channel.
*/
class MessageCodec {
  // This is a 'private' constructor, should only be used by this class
  // static methods.
  constructor(_event, ..._payload) {
    this.event = _event;
    this.payload = JSON.stringify(_payload);
  };

  // Serialize the message payload and the message.
  static serialize(event, ...payload) {
    const envelope = new MessageCodec(event, ...payload);
    // Return the serialized message, that can be sent through a channel.
    return JSON.stringify(envelope);
  };

  // Deserialize the message and the message payload.
  static deserialize(message) {
    var envelope = JSON.parse(message);
    if (typeof envelope.payload !== 'undefined') {
      envelope.payload = JSON.parse(envelope.payload);
    }
    return envelope;
  };
};

/**
 * Channel super class.
 */
class ChannelSuper extends EventEmitter {
  constructor(name) {
    super();
    this.name = name;
    // Renaming the 'emit' method to 'emitLocal' is not strictly needed, but
    // it is useful to clarify that 'emitting' on this object has a local
    // scope: it emits the event on the Node side only, it doesn't send
    // the event to React Native.
    this.emitLocal = this.emit;
    delete this.emit;
  };
};


const { RNNodeJsMobile } = NativeModules;

/**
 * Events channel class that supports user defined event types with
 * optional arguments. Allows to send any serializable
 * JavaScript object supported by 'JSON.stringify()'.
 * Sending functions is not currently supported.
 * Includes the previously available 'send' method for 'message' events.
 */
class EventChannel extends ChannelSuper {
  post(event, ...msg) {
    RNNodeJsMobile.sendMessage(this.name, MessageCodec.serialize(event, ...msg));
  };

  // Posts a 'message' event, to be backward compatible with old code.
  send(...msg) {
    this.post('message', ...msg);
  };

  processData(data) {
    // The data contains the serialized message envelope.
    var envelope = MessageCodec.deserialize(data);
    this.emitLocal(envelope.event, ...(envelope.payload));
  };
};

const start=function(mainFileName, options) {
  if (typeof mainFileName !== 'string') {
    throw new Error('nodejs-mobile-react-native\'s start expects to receive the main .js entrypoint filename, e.g.: nodejs.start("main.js");');
  }
  options = options || {};
  RNNodeJsMobile.startNodeProject(mainFileName, options);
};
const startWithScript=function(script, options) {
  options = options || {};
  RNNodeJsMobile.startNodeWithScript(script, options);
}

/*
 * Dispatcher for all channels. This event is called by the plug-in
 * native code to deliver events from Node.
 * The channelName field is the channel name.
 * The message field is the data.
 */
NativeAppEventEmitter.addListener("nodejs-mobile-react-native-message",
  (e) => {
    if (channels[e.channelName]) {
      channels[e.channelName].processData(e.message);
    } else {
      throw new Error('Error: Channel not found:', e.channelName);
    }
  }
);

function registerChannel(channel) {
  channels[channel.name] = channel;
};

const eventChannel = new EventChannel(EVENT_CHANNEL);
registerChannel(eventChannel);

const export_object = {
  start: start,
  startWithScript: startWithScript,
  channel: eventChannel
};

module.exports = export_object;
