
const EventEmitter = require('events');
const NativeBridge = process.binding('rn_bridge');

/**
 * Built-in events channel to exchange events between the react-native app
 * and the Node.js app. It allows to emit user defined event types with
 * optional arguments.
 */
const EVENT_CHANNEL = '_EVENTS_';

/**
 * This class is defined in the plugin's root index.js as well.
 * Any change made here should be ported to the root index.js too.
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
    // scope: it emits the event on the react-native side only, it doesn't send
    // the event to Node.
    this.emitLocal = this.emit;
    delete this.emit;
  };

  emitWrapper(type, ...msg) {
    const _this = this;
    setImmediate( () => {
      _this.emitLocal(type, ...msg);
     });
  };
};

/**
 * Events channel class that supports user defined event types with
 * optional arguments. Allows to send any serializable
 * JavaScript object supported by 'JSON.stringify()'.
 * Sending functions is not currently supported.
 * Includes the previously available 'send' method for 'message' events.
 */
class EventChannel extends ChannelSuper {
  post(event, ...msg) {
    NativeBridge.sendMessage(this.name, MessageCodec.serialize(event, ...msg));
  };

  // Posts a 'message' event, to be backward compatible with old code.
  send(...msg) {
    this.post('message', ...msg);
  };

  processData(data) {
    // The data contains the serialized message envelope.
    var envelope = MessageCodec.deserialize(data);
    this.emitWrapper(envelope.event, ...(envelope.payload));
  };
};

/**
 * System channel class.
 * Emit pause/resume events when the app goes to background/foreground.
 */
class SystemChannel extends ChannelSuper {
  constructor(name) {
    super(name);
  };

  processData(data) {
    // The data is the event.
    this.emitWrapper(data);
  };

};
/**
 * Manage the registered channels to emit events/messages received by the
 * react-native app or by the react-native plugin itself (i.e. the system channel).
 */
var channels = {};

/*
 * This method is invoked by the native code when an event/message is received
 * from the react-native app.
 */
function bridgeListener(channelName, data) {
  if (channels.hasOwnProperty(channelName)) {
    channels[channelName].processData(data);
  } else {
    console.error('ERROR: Channel not found:', channelName);
  }
};

/*
 * The bridge's native code processes each channel's messages in a dedicated
 * per-channel queue, therefore each channel needs to be registered within
 * the native code.
 */
function registerChannel(channel) {
  channels[channel.name] = channel;
  NativeBridge.registerChannel(channel.name, bridgeListener);
};

const eventChannel = new EventChannel(EVENT_CHANNEL);
registerChannel(eventChannel);

module.exports = exports = {
  app: systemChannel,
  channel: eventChannel
};
