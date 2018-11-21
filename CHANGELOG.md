# Node.js for Mobile Apps React Native plugin ChangeLog

<table>
<tr>
<th>Current</th>
</tr>
<tr>
<td>
<a href="#0.3.2">0.3.2</a><br/>
<a href="#0.3.1">0.3.1</a><br/>
<a href="#0.3.0">0.3.0</a><br/>
<a href="#0.2.1">0.2.1</a><br/>
<a href="#0.2.0">0.2.0</a><br/>
<a href="#0.1.4">0.1.4</a><br/>
<a href="#0.1.3">0.1.3</a><br/>
<a href="#0.1.2">0.1.2</a><br/>
<a href="#0.1.1">0.1.1</a><br/>
</td>
</tr>
</table>

<a id="0.3.2"></a>
## 2018-11-21, Version 0.3.2 (Current)

### Notable Changes

* Hotfixes the node thread stack size on iOS, when starting the runtime with a node project folder.

### Commits

* [[`082cbc0`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/082cbc0d4815d435a8c06cd34bea4c0a6d573dec)] - ios: set node project thread stack size to 2MB (Jaime Bernardo)

<a id="0.3.1"></a>
## 2018-11-07, Version 0.3.1

### Notable Changes

* Update `nodejs-mobile` binaries to `v0.1.8`, fixing exceptions on Apple A12 CPUs for iOS and being built with NDK r18b for Android.

### Commits

* [[`0e6ffe9`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/0e6ffe9cfb26bf0fa2b8ba8a823067d4ad35ab9c)] - core: update nodejs-mobile v0.1.8 (Jaime Bernardo)
* [[`ed727ed`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/ed727edea17e8a9e1a85cef3413becc83b8a0328)] - docs: duplicate module name instructions (Jaime Bernardo)

<a id="0.3.0"></a>
## 2018-09-03, Version 0.3.0

### Notable Changes

* Add new channel APIs.

### Commits

* [[`085e047`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/085e04762b98859354738611cd4e9fc0828c679e)] - docs: document os.tmpdir behavior in node (Jaime Bernardo)
* [[`2ccc542`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/2ccc54290d59cc014d930d1b4bac7c8486bc6316)] - android: show alternative to misleading error log (Jaime Bernardo)
* [[`ff308a6`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/ff308a6107c1857e7ec94599420ede1b712e0931)] - docs: document the new channel API, app channel (Jaime Bernardo)
* [[`1116698`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/11166985ef65b253fcb7080289619c31466ead7a)] - plugin: add app.datadir API to get writable path (Jaime Bernardo)
* [[`10c1d3e`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/10c1d3e75af44f1f5b473c0dba552363e13cfe49)] - plugin: add app channel for pause-resume events (Jaime Bernardo)
* [[`7c922f9`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/7c922f9751e577154cbc95215bb8c83dbe2254b1)] - plugin: improved events channel (Jaime Bernardo)

<a id="0.2.1"></a>
## 2018-07-30, Version 0.2.1

### Notable Changes

* Update `nodejs-mobile` binaries to `v0.1.7`, built with NDK r17b, to solve Android 7 C++ STL runtime issues.
* Use project-wide properties from react-native, for compatibility with recent react-native releases.

### Commits

* [[`f813ec9`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/f813ec973879506b52ba73b57928deaf8ab0e51e)] - core: update nodejs-mobile v0.1.7 (Jaime Bernardo)
* [[`5e35c75`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/5e35c750f706d600440e4b69b97303e82ae1847c)] - android: use react-native project-wide properties (Jaime Bernardo)

<a id="0.2.0"></a>
## 2018-07-09, Version 0.2.0

### Notable Changes

* Update `nodejs-mobile` binaries to `v0.1.6`, with concurrent GC for iOS.
* Improve native modules support.
* Automatically detect native modules.
* Remove simulator strip when building for iOS devices.
* Include memory optimizations.

### Commits

* [[`b0a55d6`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/b0a55d6cc9244d519c53e026b1f3a5ca9ada288b)] - core: update nodejs-mobile v0.1.6 (Jaime Bernardo)
* [[`dc6e1ed`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/dc6e1ed4a0de202567d08beae1b58b81067e64c8)] - docs: add native modules instructions to README (Jaime Bernardo)
* [[`eb960e0`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/eb960e02cd64d0a1d4229e249d472c6500eaf67e)] - plugin: add automatic native modules detection (Jaime Bernardo)
* [[`ded08e5`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/ded08e5ddf0de5402ddd74e27205561fa8474e55)] - android: use original .bin for native modules (Jaime Bernardo)
* [[`209f541`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/209f5410b6e35c8b3f5fc94049f09c0fa92ca975)] - android: release node-rn JNI local references (Jaime Bernardo)
* [[`fd958ed`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/fd958edc6079061f5ccc6ee637be30d7d910c945)] - ios: release memory from node-react messages (Jaime Bernardo)
* [[`d356d70`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/d356d70ac15ce1e59d6916ef143aca4cc6e5a6e5)] - core: update nodejs-mobile v0.1.5 (Jaime Bernardo)
* [[`cba49e1`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/cba49e1baa457a7be7b094ec06d5fdf2cc396498)] - ios: building for device removes the x86_64 arch (Jaime Bernardo)
* [[`22e6286`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/22e62863c30a215fc9227672da867fa88e8e7d0e)] - android: check if native modules assets exist (Jaime Bernardo)
* [[`222f953`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/222f9539b62e18c0fb090f7972e3ea3f599bd83f)] - plugin: use alternative nodejs-mobile-gyp path (Jaime Bernardo)
* [[`757294e`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/757294e9567cdd0fd1723f25c4a37b8918a8f193)] - ios: delete .deps gyp paths from app build (Jaime Bernardo)
* [[`5f5447d`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/5f5447db4ab0ebc0e610cbfff598774bb83c2eb1)] - ios: build native modules as frameworks (Jaime Bernardo)
* [[`89ce6b3`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/89ce6b335ab71943b856215e3be973d71b9b8b87)] - ios: rewrite build phases when linking (Jaime Bernardo)

<a id="0.1.4"></a>
## 2018-03-05, Version 0.1.4

### Notable Changes

* Include the nodejs-project in the runtime NODE_PATH.
* Update `nodejs-mobile` binaries to `v0.1.4`.
* Include experimental native modules build code.
* Increase the iOS node thread stack size to 1MB.

### Commits

* [[`7780f20`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/7780f2017817723de53123a268578c89b96235e1)] - plugin: remove native modules detection (Jaime Bernardo)
* [[`99f3400`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/99f3400895d0b8626dbea37f8382f13e6aeb7ebb)] - docs: rephrasing of some README.md sections (Jaime Bernardo)
* [[`940fcfe`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/940fcfe5f14baf9976d8714b3aa321fc094821b7)] - ios: increase node's thread stack size to 1MB (Jaime Bernardo)
* [[`409b5d4`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/409b5d4e35ae0ad8fe102c26b778e6aa77888f1c)] - docs: Add native modules instructions (Jaime Bernardo)
* [[`62af6f1`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/62af6f1ed876756135ca24ec47075dee5665d7c6)] - ios: use file to override native modules build (Jaime Bernardo)
* [[`fabbd6b`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/fabbd6b6a3757af1e624c52503c7f5e8e07a6e9e)] - android: use file to override native modules build (Jaime Bernardo)
* [[`41f7dce`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/41f7dcedbf0ecaa25ea256cd069c1c6b6c94d626)] - android: use script to call npm and node on macOS (Jaime Bernardo)
* [[`3cc78d6`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/3cc78d66a313fb8ec80ba568990f907f182c2d47)] - android: use gradle tasks inputs and outputs (Jaime Bernardo)
* [[`8a7688f`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/8a7688f9b8942f0977483d7929ead7a19fbf473f)] - plugin: Build native modules automatically (Jaime Bernardo)
* [[`7ae4dd5`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/7ae4dd569b5bcc9e560ba75bbff2bdf29904a8d8)] - plugin: use nodejs-mobile-gyp for native modules (Jaime Bernardo)
* [[`d933954`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/d9339545465c67b846cbe5b9b09e5180e4846cb6)] - plugin: patch node-pre-gyp module path variables (Jaime Bernardo)
* [[`62c2670`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/62c2670b743bc60da817e8a686622fad597f1737)] - ios: native modules support (Jaime Bernardo)
* [[`af82e39`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/af82e3974d4b206b84ed20a24646a4901ae81f32)] - android: native modules support (Jaime Bernardo)
* [[`448c9ae`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/448c9ae32e70e1d2ec5239fa9d95ce22179f6eca)] - core: update nodejs-mobile v0.1.4 (Jaime Bernardo)
* [[`d478d02`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/d478d029d76e7d1de8b52d1cd5c51f7d61067b31)] - plugin: set NODE_PATH to include the project root (Enrico Giordani)

<a id="0.1.3"></a>
## 2018-01-16, Version 0.1.3

### Notable Changes

* Breaking change:
  - The `start` function from the plugin now takes the node entrypoint filename as a mandatory argument. This means current `react-native` project will have to update every `start()` call to `start('main.js')` to maintain behaviour.
* Updates `react-native` dependency version to `0.52`.
* Optimizes assets copy.
* Adds option argument to disable redirecting `stdout` and `stderr` to logcat.

### Commits

* [[`6de9bb6`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/6de9bb674e1d513547fcba2a62f0a91b556ea1d5)] - plugin: node.js entrypoint filename as argument (Jaime Bernardo)
* [[`b7f145d`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/b7f145d9945df4794f02ef1a98529b623df93958)] - plugin: Add options argument to start methods (Jaime Bernardo)
* [[`ae837b2`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/ae837b29c928bdd964db79abff06ddf925af097a)] - android: optimize assets copy (Enrico Giordani)
* [[`c32ace3`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/c32ace3e432f9ee29f5c05964f12c966611a5ddf)] - rn: add requiresMainQueueSetup and update to 0.52 (Rayron Victor)

<a id="0.1.2"></a>
## 2017-10-31, Version 0.1.2

### Notable Changes

* Update `nodejs-mobile` binaries to `v0.1.3`.
* Adds iOS simulator support.
* Updates node version and headers to `v8.6.0`.
* Shows stdout and stderr in Android logcat.

### Commits

* [[`3c5b16e`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/3c5b16e9a8a2b3eba3f513ad310adc433e0732d3)] - docs: Add mention to simulator support in README (Jaime Bernardo)
* [[`7069d4b`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/7069d4bd84d66c264eda7ea99599ef3957b36de9)] - core: update nodejs-mobile v0.1.3 (Jaime Bernardo)
* [[`70c9ac3`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/70c9ac3798ca1fa06447ffb5430a1ba7259bccbc)] - bridge: emit message event inside a setImmediate (Jaime Bernardo)
* [[`e5fbfd0`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/e5fbfd0748757a9c77dc57e4b6c11a68d13aaeac)] - android: Redirect stdout and stderr to logcat (Jaime Bernardo)
* [[`ece0079`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/ece0079d9cd798e045936048c4f65788554090de)] - meta: Update package.json fields (Jaime Bernardo)
* [[`1a5cf5e`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/1a5cf5e3c8d11a92eb88726dbb301a15dc30efa4)] - meta: Add Reporting Issues section to README.md (Jaime Bernardo)
* [[`da767ba`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/da767babc69b59e4efd9ef244766dbbf75999cc5)] - Create LICENSE (Alexis Campailla)

<a id="0.1.1"></a>
## 2017-10-02, Version 0.1.1

### Notable Changes

* Initial release.

### Commits

* [[`d1601e4`](https://github.com/janeasystems/nodejs-mobile-react-native/commit/d1601e494cf14ae4704ee7e781b0b89a645f5c50)] - Initial commit for the React Native Module (Jaime Bernardo)
