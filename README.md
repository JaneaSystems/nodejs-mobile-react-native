
# The Node.js for Mobile Apps React Native plugin

## Reporting Issues

We have a [central repo](https://github.com/janeasystems/nodejs-mobile/issues) where we manage all the issues related to Node.js for Mobile Apps, including issues specific to this plugin. Please, report your issue [there](https://github.com/janeasystems/nodejs-mobile/issues).

## Installation

`$ npm install nodejs-mobile-react-native --save`

For iOS, run `pod install` for linking the native code parts:

`$ cd iOS && pod install`

### iOS

Universal binaries are included in the plugin, so you can run in both iOS simulators and devices.

`nodejs-mobile-react-native` supports iOS 11.0 or later. In order to archive the application, the deployment target needs to be `iOS 11.0` or later.

### Android

You may need to open your app's `/android` folder in `Android Studio`, so that it detects, downloads and cofigures requirements that might be missing, like the `NDK` and `CMake` to build the native code part of the project.

You can also set the environment variable `ANDROID_NDK_HOME`, as in this example:
```sh
export ANDROID_NDK_HOME=/Users/username/Library/Android/sdk/ndk-bundle
```

## Usage

### `Node.js` project

When `nodejs-mobile-react-native` was installed through npm, it created a `nodejs-assets/nodejs-project/` path inside your application. This path will be packaged with your application and the background project will be started using the `main.js` file inside. It contains a `sample-main.js` and `sample-package.json` files under `nodejs-assets/nodejs-project/`.

The `sample-main.js` and `sample-package.json` files contain a sample echo project. We advise to rename `sample-main.js` to `main.js` and `sample-package.json` to `package.json` to get you started easily.

> Attention: The `sample-main.js` and `sample-package.json` will be overwritten with installs/updates of `nodejs-mobile-react-native`.

The sample `main.js` contents:
```js
var rn_bridge = require('rn-bridge');

// Echo every message received from react-native.
rn_bridge.channel.on('message', (msg) => {
  rn_bridge.channel.send(msg);
} );

// Inform react-native node is initialized.
rn_bridge.channel.send("Node was initialized.");
```

Recent versions of `react-native` (since 0.57) throw an error during the bundling of the project. Please look at [the Troubleshooting Duplicate module name section](#duplicate-module-name) for instructions on how to configure the `react-native` bundler to ignore the `nodejs-project` folder.

The Node.js runtime accesses files through Unix-based pathnames, so in Android the node project is copied from the project's apk assets into the default application data folder at startup, during the first run or after an update, under `nodejs-project/`.

> Attention: Given the project folder will be overwritten after each application update, it should not be used for persistent storage.

To expedite the process of extracting the assets files, instead of parsing the assets hierarchy, a list of files `file.list` and a list of folders `dir.list` are created when the application is compiled and then added to the application assets. On Android 6.x and older versions, this allows to work around a serious perfomance bug in the Android assets manager.

#### Node Modules

Node modules can be added to the project using `npm install` inside `nodejs-assets/nodejs-project/`, as long as there's a `package.json` already present.

#### Native Modules

On Linux and macOS, there is support for building modules that contain native code.

The plugin automatically detects native modules inside your `nodejs-project` folder by searching for `.gyp` files. It's recommended to have the build prerequisites mentioned in `nodejs-mobile` for [Android](https://github.com/janeasystems/nodejs-mobile#prerequisites-to-build-the-android-library-on-linux-ubuntudebian) and [iOS](https://github.com/janeasystems/nodejs-mobile#prerequisites-to-build-the-ios-framework-library-on-macos). For Android it's also recommended that you set the `ANDROID_NDK_HOME` environment variable in your system.

Building native modules for Android can take a long time, since it depends on building a standalone NDK toolchain for each required architecture. The resulting `.node` binaries are then included in the final application in a separate asset path for each architecture and the correct one will be chosen at runtime.

While the plugin tries to detect automatically the presence of native modules, there's a way to override this detection and turn the native modules build process on or off, by creating the `nodejs-assets/BUILD_NATIVE_MODULES.txt` file and setting its contents to `1` or `0`, respectively. This can be used to start your application like this:
```sh
echo "1" > nodejs-assets/BUILD_NATIVE_MODULES.txt
react-native run-android
```
```sh
echo "1" > nodejs-assets/BUILD_NATIVE_MODULES.txt
react-native run-ios
```

### `React-Native` application

To communicate with Node.js from your `react-native` application, first import `nodejs-mobile-react-native`.

```js
import nodejs from 'nodejs-mobile-react-native';
```

Then add this to your Application's main component's `componentWillMount` lifecycle event:
```js
  componentWillMount()
  {
    nodejs.start("main.js");
    nodejs.channel.addListener(
      "message",
      (msg) => {
        alert("From node: " + msg);
      },
      this
    );
  }
```

This will tell the native code to start a dedicated thread running Node.js starting at the `main.js` file in `nodejs-assets/nodejs-project/`, as described above. It will then register a listener to show alert boxes with each message sent from Node.js.

> Attention: The Node.js project runs on a dedicated thread and as a singleton, so only the first `nodejs.start()` command will make any effect, as further calls will not start new threads. This means that if you use `react-native`'s hotreload functionality you won't see any changes in the Node.js project.

We can then define a button in our interface to send messages to our Node.js project:

```js
  <Button title="Message Node"
    onPress={() => nodejs.channel.send('A message!')}
    />
```

## Methods available in the React Native layer

These methods can be called from the React Native javascript code directly:
```js
import nodejs from 'nodejs-mobile-react-native';
```

- `nodejs.start`
- `nodejs.startWithScript`
- `nodejs.channel.addListener`
- `nodejs.channel.post`
- `nodejs.channel.send`

> `nodejs.channel.send(...msg)` is equivalent to `nodejs.channel.post('message', ...msg)`. It is maintained for backward compatibility purposes.

> The `nodejs.channel` object inherits from [React Native's `EventEmitter` class](https://github.com/facebook/react-native/blob/055c941c4045468af4ff2b8162d3a35dd993b1b9/Libraries/vendor/emitter/EventEmitter.js), with `emit` removed and `post` and `send` added.

### nodejs.start(scriptFileName [, options])

| Param | Type |
| --- | --- |
| scriptFileName | <code>string</code> |
| options | <code>[StartupOptions](#ReactNative.StartupOptions)</code>  |

Starts the nodejs-mobile runtime thread with a file inside the `nodejs-project` directory.

### nodejs.startWithScript(scriptBody [, options])

| Param | Type |
| --- | --- |
| scriptBody | <code>string</code> |
| options | <code>[StartupOptions](#ReactNative.StartupOptions)</code>  |

Starts the nodejs-mobile runtime thread with a script body.

### nodejs.channel.addListener(event, callback)

| Param | Type |
| --- | --- |
| event | <code>string</code> |
| callback | <code>[function](#ReactNative.channelCallback)</code> |

Registers a callback for user-defined events raised from the nodejs-mobile side.

### nodejs.channel.post(event, ...message)

| Param | Type |
| --- | --- |
| event | <code>string</code> |
| ...message | any JS type that can be serialized with `JSON.stringify` and deserialized with `JSON.parse` |

Raises a user-defined event on the nodejs-mobile side.

### nodejs.channel.send(...message)

| Param | Type |
| --- | --- |
| ...message | any JS type that can be serialized with `JSON.stringify` and deserialized with `JSON.parse` |

Raises a 'message' event on the nodejs-mobile side.
It is an alias for `nodejs.channel.post('message', ...message);`.

<a name="ReactNative.StartupOptions"></a>
### StartupOptions: <code>object</code>
| Name | Type | Default | Description |
| --- | --- | --- | --- |
| redirectOutputToLogcat | <code>boolean</code> | <code>true</code> | Allows to disable the redirection of the Node stdout/stderr to the Android logcat |


## Methods available in the Node layer

The following methods can be called from the Node javascript code through the `rn-bridge` module:
```js
  const rn_bridge = require('rn-bridge');
```

- `rn_bridge.channel.on`
- `rn_bridge.channel.post`
- `rn_bridge.channel.send`
- `rn_bridge.app.on`
- `rn_bridge.app.datadir`

> `rn_bridge.channel.send(...msg)` is equivalent to `rn_bridge.channel.post('message', ...msg)`. It is maintained for backward compatibility purposes.

> The `rn_bridge.channel` object inherits from [Node's `EventEmitter` class](https://github.com/janeasystems/nodejs-mobile/blob/9e90dd8c14fce5b047aa16d00e22a8ef44222a99/lib/events.js), with `emit` removed and `post` and `send` added.

### rn_bridge.channel.on(event, callback)

| Param | Type |
| --- | --- |
| event | <code>string</code> |
| callback | <code>[function](#ReactNative.channelCallback)</code> |

Registers a callback for user-defined events raised from the React Native side.

> To receive messages from `nodejs.channel.send`, use:
> ```js
>   rn_bridge.channel.on('message', listenerCallback);
> ```

### rn_bridge.channel.post(event, ...message)

| Param | Type |
| --- | --- |
| event | <code>string</code> |
| ...message | any JS type that can be serialized with `JSON.stringify` and deserialized with `JSON.parse` |

Raises a user-defined event on the React Native side.

### rn_bridge.channel.send(...message)

| Param | Type |
| --- | --- |
| ...message | any JS type that can be serialized with `JSON.stringify` and deserialized with `JSON.parse` |

Raises a 'message' event on the React Native side.
It is an alias for `rn_bridge.channel.post('message', ...message);`.

### rn_bridge.app.on(event, callback)

| Param | Type |
| --- | --- |
| event | <code>string</code> |
| callback | <code>function</code> |

Registers callbacks for App events.
Currently supports the 'pause' and 'resume' events, which are raised automatically when the app switches to the background/foreground.

```js
rn_bridge.app.on('pause', (pauseLock) => {
  console.log('[node] app paused.');
  pauseLock.release();
});
rn_bridge.app.on('resume', () => {
  console.log('[node] app resumed.');
});
```

The 'pause' event is raised when the application switches to the background. On iOS, the system will wait for the 'pause' event handlers to return before finally suspending the application. For the purpose of letting the iOS application know when it can safely suspend after going to the background, a `pauseLock` argument is passed to each 'pause' listener, so that `release()` can be called on it to signal that listener has finished doing all the work it needed to do. The application will only suspend after all the locks have been released (or iOS forces it to).

```js
rn_bridge.app.on('pause', (pauseLock) => {
  server.close( () => {
    // App will only suspend after the server stops listening for connections and current connections are closed.
    pauseLock.release();
  });
});
```

**Warning :** On iOS, the application will eventually be suspended, so the pause event should be used to run the clean up operations as quickly as possible and let the application suspend after that. Make sure to call `pauseLock.release()` in each 'pause' event listener, or your Application will keep running in the background for as long as iOS will allow it.

### rn_bridge.app.datadir()

Returns a writable path used for persistent data storage in the application. Its value corresponds to `NSDocumentDirectory` on iOS and `FilesDir` on Android.

<a name="ReactNative.channelCallback"></a>
### Channel callback: <code>function(arg)</code>
| Name | Type |
| --- | --- |
| arg | any JS type that can be serialized with `JSON.stringify` and deserialized with `JSON.parse` |

The messages sent through the channel can be of any type that can be correctly serialized with [`JSON.stringify`](https://www.w3schools.com/js/js_json_stringify.asp) on one side and deserialized with [`JSON.parse`](https://www.w3schools.com/js/js_json_parse.asp) on the other side, as it is what the channel does internally. This means that passing JS dates through the channel will convert them to strings and functions will be removed from their containing objects. In line with [The JSON Data Interchange Syntax Standard](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf), the channel supports sending messages that are composed of these JS types: `Boolean`, `Number`, `String`, `Object`, `Array`.

## Notes about other node APIs

### os.tmpdir()

On iOS, `os.tmpdir()` returns a temporary directory, since iOS sets the `TMPDIR` environment variable of the application to the equivalent of calling `NSTemporaryDirectory`.

The Android OS doesn't define a temporary directory for the system or application, so the plugin sets the `TMPDIR` environment variable to the value of the application context's `CacheDir` value.

## Troubleshooting

On Android applications, the `react-native` build process is sometimes unable to rebuild assets.
If you are getting errors while building the application using `react-native run-android`, the following commands can help you do a clean rebuild of the project, when run in your project's folder.

On Windows:
```sh
cd android
gradlew clean
cd ..
react-native run-android
```

On Linux/macOS:
```sh
cd android
./gradlew clean
cd ..
react-native run-android
```

### Duplicate module name

During the `react-native` application's build process, the `nodejs-project` gets copied to the application's assets, where they'll be used by `nodejs-mobile`.
The `react-native` packager monitors the project's folder for javascript packages and may throw a "`jest-haste-map: Haste module naming collision`" error.

To avoid this error, instruct the `react-native` packager to ignore the `nodejs-project` and the platform folders where it is copied to. Edit the `metro.config.js` file in your `react-native` project's root path with the following contents if you're using recent versions of `react-native` (`>= v0.60`) and add the `blacklist` require and the following `resolver` to the module exports:

```js
const blacklist = require('metro-config/src/defaults/exclusionList');

module.exports = {
  resolver: {
    blacklistRE: blacklist([
      /\/nodejs-assets\/.*/,
      /\/android\/.*/,
      /\/ios\/.*/
    ])
  },

...

};
```

## Changelog

Releases are documented in [CHANGELOG.md](https://github.com/janeasystems/nodejs-mobile-react-native/blob/unstable/CHANGELOG.md)
