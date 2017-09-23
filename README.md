
# The Node.js for Mobile Apps React Native plugin

## Installation

`$ npm install nodejs-mobile-react-native --save`

`$ react-native link nodejs-mobile-react-native`

### iOS

As currently only `arm64` binaries are available, you need a physical device to run the project, so you'll also have to sign the project.

### Android

You may need to open your app's `/android` folder in `Android Studio`, so that it detects, downloads and cofigures requirements that might be missing, like the `NDK` and `CMake` to build the native code part of the project.

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

> The Node.js runtime accesses files through Unix-based pathnames, so in Android the node project is copied from the project's apk assets into the default application data folder at startup. In the future, we hope to provide the mechanisms so Node.js can access the files inside the apk.

### `React-Native` application

To communicate with Node.js from your `react-native` application, first import `nodejs-mobile-react-native`.

```js
import nodejs from 'nodejs-mobile-react-native';
```

Then add this to your Application's main component's `componentWillMount` lifecycle event:
```js
  componentWillMount()
  {
    nodejs.start();
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
