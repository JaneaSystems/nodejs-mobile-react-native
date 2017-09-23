
package com.janeasystems.rn_nodejs_mobile;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.Callback;
import com.facebook.react.modules.core.RCTNativeAppEventEmitter;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import javax.annotation.Nullable;
import android.util.Log;

import android.app.Application;
import java.util.Arrays;
import java.util.List;
import android.content.res.AssetManager;
import java.io.*;

public class RNNodeJsMobileModule extends ReactContextBaseJavaModule {

  private final ReactApplicationContext reactContext;

  static {
    System.loadLibrary("nodejs-mobile-react-native-native-lib");
    System.loadLibrary("node");
  }

  //To store the instance when node is started.
  public static RNNodeJsMobileModule _instance=null;

  //We just want one instance of node running in the background.
  public static boolean _startedNodeAlready=false;

  public RNNodeJsMobileModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.reactContext = reactContext;
  }

  @Override
  public String getName() {
    return "RNNodeJsMobile";
  }

  @ReactMethod
  public void startNodeWithScript(String script)
  {
    // A New module instance may have been created due to hot reload.
    _instance=this;
    if( !_startedNodeAlready ) {
      _startedNodeAlready=true;
      final String scriptToRun=new String(script);
      new Thread(new Runnable() {
        @Override
        public void run() {
          //Copy the builtin-modules to data folder.
          String modulesDir=getReactApplicationContext().getFilesDir().getAbsolutePath()+"/nodejs-builtin_modules";

          //Recursevely delete paths that are from an incomplete copy.
          File modulesDirReference=new File(modulesDir);
          if (modulesDirReference.exists()) {
            deleteFolderRecursively(new File(modulesDir));
          }
          //Copy the node project from assets into the application's data path.
          copyAssetFolder(getReactApplicationContext().getAssets(), "builtin_modules", modulesDir);

          startNodeWithArguments(new String[]{"node",
            "-e",
            scriptToRun
            },
            modulesDir
          );
        }
      }).start();
    }
  }
  
  @ReactMethod
  public void startNodeProject(boolean deleteandcopy)
  {
    // A New module instance may have been created due to hot reload.
    _instance=this;
    if( !_startedNodeAlready ) {
      _startedNodeAlready=true;
      new Thread(new Runnable() {
        @Override
        public void run() {
          //The path where we expect the node project to be at runtime.
          String nodeDir=getReactApplicationContext().getFilesDir().getAbsolutePath()+"/nodejs-project";

          //Recursevely delete paths that are from an incomplete copy.
          File nodeDirReference=new File(nodeDir);
          if (nodeDirReference.exists()) {
            deleteFolderRecursively(new File(nodeDir));
          }
          //Copy the node project from assets into the application's data path.
          copyAssetFolder(getReactApplicationContext().getAssets(), "nodejs-project", nodeDir);
          
          //Do the builtin-modules copy too.
          String modulesDir=getReactApplicationContext().getFilesDir().getAbsolutePath()+"/nodejs-builtin_modules";

          //Recursevely delete paths that are from an incomplete copy.
          File modulesDirReference=new File(modulesDir);
          if (modulesDirReference.exists()) {
            deleteFolderRecursively(new File(modulesDir));
          }
          //Copy the node project from assets into the application's data path.
          copyAssetFolder(getReactApplicationContext().getAssets(), "builtin_modules", modulesDir);

          startNodeWithArguments(new String[]{"node",
            nodeDir+"/main.js"
            },
            modulesDir
          );
        }
      }).start();
    }
  }
  
  @ReactMethod
  public void sendMessage(String msg)
  {
    notifyNode(msg);
  }
  
  private void sendEvent(String eventName,
                       @Nullable WritableMap params) {
    reactContext
      .getJSModule(RCTNativeAppEventEmitter.class)
      .emit(eventName, params);
  }

  public static void sendMessageBackToReact(String msg)
  {
    if(_instance!=null) {
      final RNNodeJsMobileModule _moduleInstance=_instance;
      final String _msgToPass=new String(msg);
      new Thread(new Runnable() {
        @Override
        public void run() {
          WritableMap params = Arguments.createMap();
          params.putString("message", _msgToPass);
          _moduleInstance.sendEvent("nodejs-mobile-react-native-message",params);
        }
      }).start();
    }
  }

  public native Integer startNodeWithArguments(String[] arguments, String modulesPath);
  public native void notifyNode(String msg);

  private static boolean deleteFolderRecursively(File file) {
    try {
      boolean res=true;
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

  //Adapted from https://stackoverflow.com/a/22903693
  private static boolean copyAssetFolder(AssetManager assetManager,
      String fromAssetPath, String toPath) {
    try {
      String[] files = assetManager.list(fromAssetPath);
      boolean res = true;

      if (files.length==0) {
        //If it's a file, it won't have any assets "inside" it.
        res &= copyAsset(assetManager, 
                fromAssetPath,
                toPath);
      } else {
        new File(toPath).mkdirs();
        for (String file : files)
          res &= copyAssetFolder(assetManager, 
                  fromAssetPath + "/" + file,
                  toPath + "/" + file);
      }
      return res;
    } catch (Exception e) {
      e.printStackTrace();
      return false;
    }
  }

  private static boolean copyAsset(AssetManager assetManager,
          String fromAssetPath, String toPath) {
      InputStream in = null;
      OutputStream out = null;
      try {
        in = assetManager.open(fromAssetPath);
        new File(toPath).createNewFile();
        out = new FileOutputStream(toPath);
        copyFile(in, out);
        in.close();
        in = null;
        out.flush();
        out.close();
        out = null;
        return true;
      } catch(Exception e) {
          e.printStackTrace();
          return false;
      }
  }

  private static void copyFile(InputStream in, OutputStream out) throws IOException {
    byte[] buffer = new byte[1024];
    int read;
    while ((read = in.read(buffer)) != -1) {
      out.write(buffer, 0, read);
    }
  }
}