
# The Node.js for Mobile Apps React Native plugin

## Reporting Issues

We have a [central repo](https://github.com/janeasystems/nodejs-mobile/issues) where we manage all the issues related to Node.js for Mobile Apps, including issues specific to this plugin. Please, report your issue [there](https://github.com/janeasystems/nodejs-mobile/issues).

## Installation

`$ npm install nodejs-mobile-react-native --save`

`$ react-native link nodejs-mobile-react-native`

### iOS

Universal binaries are included in the plugin, so you can run in both iOS simulators and devices.

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

The Node.js runtime accesses files through Unix-based pathnames, so in Android the node project is copied from the project's apk assets into the default application data folder at startup, during the first run or after an update, under `nodejs-project/`.

> Attention: Given the project folder will be overwritten after each application update, it should not be used for persistent storage.

To expedite the process of extracting the assets files, instead of parsing the assets hierarchy, a list of files `file.list` and a list of folders `dir.list` are created when the application is compiled and then added to the application assets. On Android 6.x and older versions, this allows to work around a serious perfomance bug in the Android assets manager.

#### Node Modules

Node modules can be added to the project using `npm` inside `nodejs-assets/nodejs-project/`, as long as there's a `package.json` already present.

#### Native Modules

On Linux and macOS, there is experimental support for building modules that contain native code.

The plugin automatically detects native modules inside your `nodejs-project` folder by searching for `.gyp` files. It's recommended to have the build prerequisites mentioned in `nodejs-mobile` for [Android](https://github.com/janeasystems/nodejs-mobile#prerequisites-to-build-the-android-library-on-linux-ubuntudebian) and [iOS](https://github.com/janeasystems/nodejs-mobile#prerequisites-to-build-the-ios-framework-library-on-macos). For Android it's also recommended that you set the `ANDROID_NDK_HOME` environment variable in your system.

Building native modules can take a long time for Android, since it depends on building a standalone NDK toolchain for each required architecture. The resulting `.node` binaries are then included in the final application in a separate asset path for each architecture and the correct one will be chosen at runtime.

While the plugin tries to detect automatically the presence of native modules, there's a way to override this detection and turn the native modules build process on or off, by creating the `nodejs-assets/BUILD_NATIVE_MODULES.txt` and setting its contents to `1` or `0`, respectively. This can be used to start your application like this:
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

## Changelog

Releases are documented in [CHANGELOG.md](https://github.com/janeasystems/nodejs-mobile-react-native/blob/unstable/CHANGELOG.md)
