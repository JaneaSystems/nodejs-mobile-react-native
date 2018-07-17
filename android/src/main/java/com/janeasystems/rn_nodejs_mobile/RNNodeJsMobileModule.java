
package com.janeasystems.rn_nodejs_mobile;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.modules.core.RCTNativeAppEventEmitter;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.LifecycleEventListener;
import javax.annotation.Nullable;
import android.util.Log;

import android.content.Context;
import android.content.res.AssetManager;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.SharedPreferences;
import android.system.Os;
import android.system.ErrnoException;

import java.io.*;
import java.util.*;
import java.util.concurrent.Semaphore;

public class RNNodeJsMobileModule extends ReactContextBaseJavaModule implements LifecycleEventListener {

  private final ReactApplicationContext reactContext;
  private static final String TAG = "NODEJS-RN";
  private static final String NODEJS_PROJECT_DIR = "nodejs-project";
  private static final String NODEJS_BUILTIN_MODULES = "nodejs-builtin_modules";
  private static final String TRASH_DIR = "nodejs-project-trash";
  private static final String SHARED_PREFS = "NODEJS_MOBILE_PREFS";
  private static final String LAST_UPDATED_TIME = "NODEJS_MOBILE_APK_LastUpdateTime";
  private static final String BUILTIN_NATIVE_ASSETS_PREFIX = "nodejs-native-assets-";
  private static final String SYSTEM_CHANNEL = "_SYSTEM_";

  private static String trashDirPath;
  private static String filesDirPath;
  private static String nodeJsProjectPath;
  private static String builtinModulesPath;
  private static String nativeAssetsPath;

  private static long lastUpdateTime = 1;
  private static long previousLastUpdateTime = 0;
  private static Semaphore initSemaphore = new Semaphore(1);
  private static boolean initCompleted = false;

  private static AssetManager assetManager;

  // Flag to indicate if node is ready to receive app events.
  private static boolean nodeIsReadyForAppEvents = false;

  static {
    System.loadLibrary("nodejs-mobile-react-native-native-lib");
    System.loadLibrary("node");
  }

  // To store the instance when node is started.
  public static RNNodeJsMobileModule _instance = null;

  // We just want one instance of node running in the background.
  public static boolean _startedNodeAlready = false;

  public RNNodeJsMobileModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.reactContext = reactContext;
    reactContext.addLifecycleEventListener(this);
    filesDirPath = reactContext.getFilesDir().getAbsolutePath();

    // The paths where we expect the node project assets to be at runtime.
    nodeJsProjectPath = filesDirPath + "/" + NODEJS_PROJECT_DIR;
    builtinModulesPath = filesDirPath + "/" + NODEJS_BUILTIN_MODULES;
    trashDirPath = filesDirPath + "/" + TRASH_DIR;
    nativeAssetsPath = BUILTIN_NATIVE_ASSETS_PREFIX + getCurrentABIName();

    // Sets the TMPDIR environment to the cacheDir, to be used in Node as os.tmpdir
    try {
      Os.setenv("TMPDIR", reactContext.getCacheDir().getAbsolutePath(), true);
    } catch (ErrnoException e) {
      e.printStackTrace();
    }

    // Register the filesDir as the Node data dir.
    registerNodeDataDirPath(filesDirPath);

    asyncInit();
  }

  private void asyncInit() {
    if (wasAPKUpdated()) {
      try {
        initSemaphore.acquire();
        new Thread(new Runnable() {
          @Override
          public void run() {
            emptyTrash();
            try {
              copyNodeJsAssets();
              initCompleted = true;
            } catch (IOException e) {
              throw new RuntimeException("Node assets copy failed", e);
            }
            initSemaphore.release();
            emptyTrash();
          }
        }).start();
      } catch (InterruptedException ie) {
        initSemaphore.release();
        ie.printStackTrace();
      }
    } else {
      initCompleted = true;
    }
  }

  @Override
  public String getName() {
    return "RNNodeJsMobile";
  }

  // Extracts the option to redirect stdout and stderr to logcat
  private boolean extractRedirectOutputToLogcatOption(ReadableMap options)
  {
    final String OPTION_NAME = "redirectOutputToLogcat";
    if( (options != null) &&
        options.hasKey(OPTION_NAME) &&
        !options.isNull(OPTION_NAME) &&
        (options.getType(OPTION_NAME) == ReadableType.Boolean)
      ) {
      return options.getBoolean(OPTION_NAME);
    } else {
      // By default, we redirect the process' stdout and stderr to show in logcat
      return true;
    }
  }

  @ReactMethod
  public void startNodeWithScript(String script, ReadableMap options) throws Exception {
    // A New module instance may have been created due to hot reload.
    _instance = this;
    if(!_startedNodeAlready) {
      _startedNodeAlready = true;

      final boolean redirectOutputToLogcat = extractRedirectOutputToLogcatOption(options);
      final String scriptToRun = new String(script);

      new Thread(new Runnable() {
        @Override
        public void run() {
          waitForInit();
          startNodeWithArguments(new String[]{"node",
            "-e",
            scriptToRun
            },
            nodeJsProjectPath + ":" + builtinModulesPath,
            redirectOutputToLogcat
          );
        }
      }).start();
    }
  }

  @ReactMethod
  public void startNodeProject(final String mainFileName, ReadableMap options) throws Exception {
    // A New module instance may have been created due to hot reload.
    _instance = this;
    if(!_startedNodeAlready) {
      _startedNodeAlready = true;

      final boolean redirectOutputToLogcat = extractRedirectOutputToLogcatOption(options);

      new Thread(new Runnable() {
        @Override
        public void run() {
          waitForInit();
          startNodeWithArguments(new String[]{"node",
            nodeJsProjectPath + "/" + mainFileName
            },
            nodeJsProjectPath + ":" + builtinModulesPath,
            redirectOutputToLogcat
          );
        }
      }).start();
    }
  }

  @ReactMethod
  public void sendMessage(String channel, String msg) {
    sendMessageToNodeChannel(channel, msg);
  }

  // Sends an event through the App Event Emitter.
  private void sendEvent(String eventName,
                         @Nullable WritableMap params) {
    reactContext
      .getJSModule(RCTNativeAppEventEmitter.class)
      .emit(eventName, params);
  }

  public static void sendMessageToApplication(String channelName, String msg) {
    if (channelName.equals(SYSTEM_CHANNEL)) {
      // If it's a system channel call, handle it in the plugin native side.
      handleAppChannelMessage(msg);
    } else {
      // Otherwise, send it to React Native.
      sendMessageBackToReact(channelName, msg);
    }
  }

  @Override
  public void onHostPause() {
    if (nodeIsReadyForAppEvents) {
      sendMessageToNodeChannel(SYSTEM_CHANNEL, "pause");
    }
  }

  @Override
  public void onHostResume() {
    if (nodeIsReadyForAppEvents) {
      sendMessageToNodeChannel(SYSTEM_CHANNEL, "resume");
    }
  }

  @Override
  public void onHostDestroy() {
      // Activity `onDestroy`
  }

  public static void handleAppChannelMessage(String msg) {
    if (msg.equals("ready-for-app-events")) {
      nodeIsReadyForAppEvents=true;
    }
  }

  // Called from JNI when node sends a message through the bridge.
  public static void sendMessageBackToReact(String channelName, String msg) {
    if (_instance != null) {
      final RNNodeJsMobileModule _moduleInstance = _instance;
      final String _channelNameToPass = new String(channelName);
      final String _msgToPass = new String(msg);
      new Thread(new Runnable() {
        @Override
        public void run() {
          WritableMap params = Arguments.createMap();
          params.putString("channelName", _channelNameToPass);
          params.putString("message", _msgToPass);
          _moduleInstance.sendEvent("nodejs-mobile-react-native-message", params);
        }
      }).start();
    }
  }

  public native void registerNodeDataDirPath(String dataDir);

  public native String getCurrentABIName();

  public native Integer startNodeWithArguments(String[] arguments, String modulesPath, boolean option_redirectOutputToLogcat);

  public native void sendMessageToNodeChannel(String channelName, String msg);

  private void waitForInit() {
    if (!initCompleted) {
      try {
        initSemaphore.acquire();
        initSemaphore.release();
      } catch (InterruptedException ie) {
        initSemaphore.release();
        ie.printStackTrace();
      }
    }
  }

  private boolean wasAPKUpdated() {
    SharedPreferences prefs = this.reactContext.getSharedPreferences(SHARED_PREFS, Context.MODE_PRIVATE);
    this.previousLastUpdateTime = prefs.getLong(LAST_UPDATED_TIME, 0);

    try {
      PackageInfo packageInfo = this.reactContext.getPackageManager().getPackageInfo(this.reactContext.getPackageName(), 0);
      this.lastUpdateTime = packageInfo.lastUpdateTime;
    } catch (PackageManager.NameNotFoundException e) {
      e.printStackTrace();
    }
    return (this.lastUpdateTime != this.previousLastUpdateTime);
  }

  private void saveLastUpdateTime() {
    SharedPreferences prefs = this.reactContext.getSharedPreferences(SHARED_PREFS, Context.MODE_PRIVATE);
    SharedPreferences.Editor editor = prefs.edit();
    editor.putLong(LAST_UPDATED_TIME, this.lastUpdateTime);
    editor.commit();
  }

  private void emptyTrash() {
    File trash = new File(RNNodeJsMobileModule.trashDirPath);
    if (trash.exists()) {
      deleteFolderRecursively(trash);
    }
  }

  // Recursively deletes a folder
  private static boolean deleteFolderRecursively(File file) {
    try {
      boolean res = true;
      for (File childFile : file.listFiles()) {
        if (childFile.isDirectory()) {
          res &= deleteFolderRecursively(childFile);
        } else {
          res &= childFile.delete();
        }
      }
      res &= file.delete();
      return res;
    } catch (Exception e) {
      e.printStackTrace();
      return false;
    }
  }

  private boolean copyNativeAssetsFrom() throws IOException {
    // Load the additional asset folder and files lists
    ArrayList<String> nativeDirs = readFileFromAssets(nativeAssetsPath + "/dir.list");
    ArrayList<String> nativeFiles = readFileFromAssets(nativeAssetsPath + "/file.list");
    // Copy additional asset files to project working folder
    if (nativeFiles.size() > 0) {
      Log.v(TAG, "Building folder hierarchy for " + nativeAssetsPath);
      for (String dir : nativeDirs) {
        new File(nodeJsProjectPath + "/" + dir).mkdirs();
      }
      Log.v(TAG, "Copying assets using file list for " + nativeAssetsPath);
      for (String file : nativeFiles) {
        String src = nativeAssetsPath + "/" + file;
        String dest = nodeJsProjectPath + "/" + file;
        copyAsset(src, dest);
      }
    } else {
      Log.v(TAG, "No assets to copy from " + nativeAssetsPath);
    }
    return true;
  }


  private void copyNodeJsAssets() throws IOException {
    assetManager = getReactApplicationContext().getAssets();

    // If a previous project folder is present, move it to the trash.
    File nodeDirReference = new File(nodeJsProjectPath);
    if (nodeDirReference.exists()) {
      File trash = new File(trashDirPath);
      nodeDirReference.renameTo(trash);
    }

    // Load the nodejs project's folder and file lists.
    ArrayList<String> dirs = readFileFromAssets("dir.list");
    ArrayList<String> files = readFileFromAssets("file.list");

    // Copy the nodejs project files to the application's data path.
    if (dirs.size() > 0 && files.size() > 0) {
      Log.d(TAG, "Node assets copy using pre-built lists");
      for (String dir : dirs) {
        new File(filesDirPath + "/" + dir).mkdirs();
      }

      for (String file : files) {
        String src = file;
        String dest = filesDirPath + "/" + file;
        copyAsset(src, dest);
      }
    } else {
      Log.d(TAG, "Node assets copy enumerating APK assets");
      copyAssetFolder(NODEJS_PROJECT_DIR, nodeJsProjectPath);
    }

    copyNativeAssetsFrom();

    // Do the builtin-modules copy too.
    // If a previous built-in modules folder is present, delete it.
    File modulesDirReference = new File(builtinModulesPath);
    if (modulesDirReference.exists()) {
      deleteFolderRecursively(modulesDirReference);
    }

    // Copy the nodejs built-in modules to the application's data path.
    copyAssetFolder("builtin_modules", builtinModulesPath);

    saveLastUpdateTime();
    Log.d(TAG, "Node assets copy completed successfully");
  }

  private ArrayList<String> readFileFromAssets(String filename){
    ArrayList lines = new ArrayList();
    try {
      BufferedReader reader = new BufferedReader(new InputStreamReader(assetManager.open(filename)));
      String line = reader.readLine();
      while (line != null) {
        lines.add(line);
        line = reader.readLine();
      }
      reader.close();
    } catch (IOException e) {
      lines = new ArrayList();
      e.printStackTrace();
    }
    return lines;
  }

  // Recursively copies contents of a folder in assets to a path
  private static void copyAssetFolder(String fromAssetPath, String toPath) throws IOException {
    String[] files = assetManager.list(fromAssetPath);
    boolean res = true;

    if (files.length == 0) {
      // If it's a file, it won't have any assets "inside" it.
      copyAsset(fromAssetPath, toPath);
    } else {
      new File(toPath).mkdirs();
      for (String file : files)
        copyAssetFolder(fromAssetPath + "/" + file, toPath + "/" + file);
    }
  }

  private static void copyAsset(String fromAssetPath, String toPath) throws IOException {
    InputStream in = null;
    OutputStream out = null;
    in = assetManager.open(fromAssetPath);
    new File(toPath).createNewFile();
    out = new FileOutputStream(toPath);
    copyFile(in, out);
    in.close();
    in = null;
    out.flush();
    out.close();
    out = null;
  }

  // Copy file from an input stream to an output stream
  private static void copyFile(InputStream in, OutputStream out) throws IOException {
    byte[] buffer = new byte[1024];
    int read;
    while ((read = in.read(buffer)) != -1) {
      out.write(buffer, 0, read);
    }
  }
}
