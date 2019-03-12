var path = require('path');
var fs = require('fs');
var ncp = require('ncp');
var xcode = require('xcode');
const android = require('./../../../node_modules/@react-native-community/cli/build/core/android');
const ios = require('./../../../node_modules/@react-native-community/cli/build/core/ios');

function hostPackageDir(file) {
  var pathComponents = file.split(path.sep);
  var modulesDirIndex = pathComponents.lastIndexOf('node_modules');
  if (modulesDirIndex < 1) return undefined;

  return pathComponents.slice(0, modulesDirIndex).join(path.sep);
}

const getRNPMConfig = (folder) =>
// $FlowFixMe non-literal require
require(path.join(folder, './package.json')).rnpm || {};

var scriptPath = __filename;
const folder = hostPackageDir(scriptPath);
const rnpm = getRNPMConfig(folder);

function getProjectConfig() {
  var scriptPath = __filename;
  console.error("ScriptPath: "+scriptPath);
  const folder = hostPackageDir(scriptPath);
  console.error("folder: "+folder);
  var returnObj={};
  returnObj.ios = ios.projectConfig(folder, rnpm.ios || {});
  returnObj.android = android.projectConfig(folder, rnpm.android || {});
  return returnObj;
}

  // Adds a custom function to remove script build phases, which is not supported in the xcode module.
  xcode.project.prototype.myRemovePbxScriptBuildPhase = function (buildPhaseName, target) {
    var buildPhaseTargetUuid = target || this.getFirstTarget().uuid;

    var buildPhaseUuid_comment = this.buildPhase(buildPhaseName, buildPhaseTargetUuid);
    if (!buildPhaseUuid_comment)
    {
      throw new Error("Couldn't find the build script phase to remove: " + buildPhaseName );
    }

    // Remove the '_comment' suffix to get the actual uuid.
    var buildPhaseUuid=buildPhaseUuid_comment.split('_')[0];

    // Remove from the pbxBuildPhaseObjects
    var pbxBuildPhaseObjects = this.getPBXObject('PBXShellScriptBuildPhase');
    if (pbxBuildPhaseObjects) {
      delete pbxBuildPhaseObjects[buildPhaseUuid];
      delete pbxBuildPhaseObjects[buildPhaseUuid_comment];
    }

    // Remove from the target's buildPhases
    var nativeTargets = this.pbxNativeTargetSection();
    var nativeTarget = nativeTargets[buildPhaseTargetUuid];
    var buildPhases = nativeTarget.buildPhases;
    for(var i in buildPhases)
    {
      var buildPhase = buildPhases[i];
      if (buildPhase.value == buildPhaseUuid) {
        buildPhases.splice(i, 1);
        break;
      }
    }
  };

var detectedConfigs=getProjectConfig();
if ( detectedConfigs && detectedConfigs.ios && detectedConfigs.ios.pbxprojPath)
{
  var pbxProjectPath = detectedConfigs.ios.pbxprojPath;
  var xcodeProject = xcode.project(pbxProjectPath);

  var mainProjectName = detectedConfigs.ios.projectName;

  xcodeProject.parse(function (error) {
    if (error) {
      console.error("Couldn't parse .pbx project : " + JSON.stringify(error));
      return 1;
    }

    //Create a Frameworks group and add it to the project's main Group
    var mainGroupUUID = xcodeProject.pbxProjectSection()[xcodeProject.getFirstProject().uuid].mainGroup;
    var frameworksGroup = xcodeProject.pbxGroupByName('Frameworks');
    if (!frameworksGroup)
    {
      var frameworksUUID = xcodeProject.pbxCreateGroup("Frameworks");
      xcodeProject.addToPbxGroup(frameworksUUID,mainGroupUUID);
    }
    //Add an EmbedFrameworks build phase to the app's target
    var firstTargetUUID = xcodeProject.getFirstTarget().uuid;
    if(!xcodeProject.pbxEmbedFrameworksBuildPhaseObj(firstTargetUUID))
    {
      var buildPhaseResult = xcodeProject.addBuildPhase(
        [],
        'PBXCopyFilesBuildPhase',
        'Embed Frameworks',
        firstTargetUUID,
        'framework');
        buildPhaseResult.buildPhase.dstSubfolderSpec=10;
    }

    //Override addToFrameworkSearchPaths to add the framework path to all targets.
    //The one provided in the xcode module adds the wrong path and not to the right target.
    let myaddToFrameworkSearchPaths = function(fileName)
    {
      var configurations = xcodeProject.pbxXCBuildConfigurationSection(),
        INHERITED = '"$(inherited)"',
        config, buildSettings, searchPaths;

      var fileDir = path.dirname(fileName);
      var filePos = '"\\"' + fileDir + '\\""';

      for (config in configurations) {
          buildSettings = configurations[config].buildSettings;

          if(!buildSettings || !buildSettings['PRODUCT_NAME'])
            continue;

          if (!buildSettings['FRAMEWORK_SEARCH_PATHS']
              || buildSettings['FRAMEWORK_SEARCH_PATHS'] === INHERITED) {
              buildSettings['FRAMEWORK_SEARCH_PATHS'] = [INHERITED];
          }

          buildSettings['FRAMEWORK_SEARCH_PATHS'].push(filePos);
      }
    };

    //Removes the old libnode.framework from the firstTarget, if it exists.
    var oldFrameworkPath="../node_modules/nodejs-mobile-react-native/ios/libnode.framework";
    if (xcodeProject.hasFile(oldFrameworkPath)) {
      var deletedFrameworkFileRef=xcodeProject.removeFramework(
        oldFrameworkPath,
        {customFramework:true, embed:true, link: true, sign: true, target: firstTargetUUID}
      );
    }

    //Adds the NodeMobile framework to the firstTarget (it's the main app target)
    var frameworkPath="../node_modules/nodejs-mobile-react-native/ios/NodeMobile.framework";
    var frameworkFileRef=xcodeProject.addFramework(
      frameworkPath,
      {customFramework:true, embed:true, link: true, sign: true, target: firstTargetUUID}
    );

    if(frameworkFileRef)
    {
      myaddToFrameworkSearchPaths(frameworkPath);
    }

    //Create the resources group.
    var resourcesGroup = xcodeProject.pbxGroupByName('Resources');
    if (!resourcesGroup)
    {
      xcodeProject.pbxCreateGroup("Resources");
    }

    //Adds the default node project as a resource to the first project, in the main group.
    xcodeProject.addResourceFile(
      "../nodejs-assets/nodejs-project",
      {target: firstTargetUUID},
      mainGroupUUID
    );

    //Adds the built-in module inside the plugin as a resource to the first project, in the main group.
    xcodeProject.addResourceFile(
      "../node_modules/nodejs-mobile-react-native/install/resources/nodejs-modules/builtin_modules",
      {target: firstTargetUUID},
      mainGroupUUID
    );

    //Disable bitcode, as it's not present in the libnode binary.
    xcodeProject.addBuildProperty(
      'ENABLE_BITCODE','NO','Debug'
    );
    xcodeProject.addBuildProperty(
      'ENABLE_BITCODE','NO','Release'
    );

    //Adds a build phase to rebuild native modules
    var rebuildNativeModulesBuildPhaseName = 'Build NodeJS Mobile Native Modules';
    var rebuildNativeModulesBuildPhaseScript = `
set -e
if [ -z "$NODEJS_MOBILE_BUILD_NATIVE_MODULES" ]; then
# If build native modules preference is not set, look for it in the project's
#nodejs-assets/BUILD_NATIVE_MODULES.txt file.
NODEJS_ASSETS_DIR="$( cd "$PROJECT_DIR" && cd ../nodejs-assets/ && pwd )"
PREFERENCE_FILE_PATH="$NODEJS_ASSETS_DIR/BUILD_NATIVE_MODULES.txt"
  if [ -f "$PREFERENCE_FILE_PATH" ]; then
    NODEJS_MOBILE_BUILD_NATIVE_MODULES="$(cat $PREFERENCE_FILE_PATH | xargs)"
  fi
fi
if [ -z "$NODEJS_MOBILE_BUILD_NATIVE_MODULES" ]; then
# If build native modules preference is not set, try to find .gyp files
#to turn it on.
  gypfiles=($(find "$CODESIGNING_FOLDER_PATH/nodejs-project/" -type f -name "*.gyp"))
  if [ \${#gypfiles[@]} -gt 0 ]; then
    NODEJS_MOBILE_BUILD_NATIVE_MODULES=1
  else
    NODEJS_MOBILE_BUILD_NATIVE_MODULES=0
  fi
fi
if [ "1" != "$NODEJS_MOBILE_BUILD_NATIVE_MODULES" ]; then exit 0; fi
# Delete object files that may already come from within the npm package.
find "$CODESIGNING_FOLDER_PATH/nodejs-project/" -name "*.o" -type f -delete
find "$CODESIGNING_FOLDER_PATH/nodejs-project/" -name "*.a" -type f -delete
find "$CODESIGNING_FOLDER_PATH/nodejs-project/" -name "*.node" -type f -delete
# Delete bundle contents that may be there from previous builds.
find "$CODESIGNING_FOLDER_PATH/nodejs-project/" -path "*/*.node/*" -delete
find "$CODESIGNING_FOLDER_PATH/nodejs-project/" -name "*.node" -type d -delete
find "$CODESIGNING_FOLDER_PATH/nodejs-project/" -path "*/*.framework/*" -delete
find "$CODESIGNING_FOLDER_PATH/nodejs-project/" -name "*.framework" -type d -delete
# Apply patches to the modules package.json
if [ -d "$CODESIGNING_FOLDER_PATH"/nodejs-project/node_modules/ ]; then
  PATCH_SCRIPT_DIR="$( cd "$PROJECT_DIR" && cd ../node_modules/nodejs-mobile-react-native/scripts/ && pwd )"
  NODEJS_PROJECT_MODULES_DIR="$( cd "$CODESIGNING_FOLDER_PATH" && cd nodejs-project/node_modules/ && pwd )"
  node "$PATCH_SCRIPT_DIR"/patch-package.js $NODEJS_PROJECT_MODULES_DIR
fi
# Get the nodejs-mobile-gyp location
if [ -d "$PROJECT_DIR/../node_modules/nodejs-mobile-gyp/" ]; then
  NODEJS_MOBILE_GYP_DIR="$( cd "$PROJECT_DIR" && cd ../node_modules/nodejs-mobile-gyp/ && pwd )"
else
  NODEJS_MOBILE_GYP_DIR="$( cd "$PROJECT_DIR" && cd ../node_modules/nodejs-mobile-react-native/node_modules/nodejs-mobile-gyp/ && pwd )"
fi
NODEJS_MOBILE_GYP_BIN_FILE="$NODEJS_MOBILE_GYP_DIR"/bin/node-gyp.js
# Rebuild modules with right environment
NODEJS_HEADERS_DIR="$( cd "$PROJECT_DIR" && cd ../node_modules/nodejs-mobile-react-native/ios/libnode/ && pwd )"
pushd $CODESIGNING_FOLDER_PATH/nodejs-project/
if [ "$PLATFORM_NAME" == "iphoneos" ]
then
  GYP_DEFINES="OS=ios" npm_config_nodedir="$NODEJS_HEADERS_DIR" npm_config_node_gyp="$NODEJS_MOBILE_GYP_BIN_FILE" npm_config_platform="ios" npm_config_format="make-ios" npm_config_node_engine="chakracore" npm_config_arch="arm64" npm --verbose rebuild --build-from-source
else
  GYP_DEFINES="OS=ios" npm_config_nodedir="$NODEJS_HEADERS_DIR" npm_config_node_gyp="$NODEJS_MOBILE_GYP_BIN_FILE" npm_config_platform="ios" npm_config_format="make-ios" npm_config_node_engine="chakracore" npm_config_arch="x64" npm --verbose rebuild --build-from-source
fi
popd
`
    var rebuildNativeModulesBuildPhase = xcodeProject.buildPhaseObject('PBXShellScriptBuildPhase', rebuildNativeModulesBuildPhaseName, firstTargetUUID);
    if (rebuildNativeModulesBuildPhase) {
      xcodeProject.myRemovePbxScriptBuildPhase(rebuildNativeModulesBuildPhaseName, firstTargetUUID);
    }
    xcodeProject.addBuildPhase(
      [],
      'PBXShellScriptBuildPhase',
      rebuildNativeModulesBuildPhaseName,
      firstTargetUUID,
      { shellPath: '/bin/sh', shellScript: rebuildNativeModulesBuildPhaseScript }
    );

    //Adds a build phase to sign native modules
    var signNativeModulesBuildPhaseName = 'Sign NodeJS Mobile Native Modules';
    var signNativeModulesBuildPhaseScript = `
set -e
if [ -z "$NODEJS_MOBILE_BUILD_NATIVE_MODULES" ]; then
# If build native modules preference is not set, look for it in the project's
#nodejs-assets/BUILD_NATIVE_MODULES.txt file.
NODEJS_ASSETS_DIR="$( cd "$PROJECT_DIR" && cd ../nodejs-assets/ && pwd )"
PREFERENCE_FILE_PATH="$NODEJS_ASSETS_DIR/BUILD_NATIVE_MODULES.txt"
  if [ -f "$PREFERENCE_FILE_PATH" ]; then
    NODEJS_MOBILE_BUILD_NATIVE_MODULES="$(cat $PREFERENCE_FILE_PATH | xargs)"
  fi
fi
if [ -z "$NODEJS_MOBILE_BUILD_NATIVE_MODULES" ]; then
# If build native modules preference is not set, try to find .gyp files
#to turn it on.
  gypfiles=($(find "$CODESIGNING_FOLDER_PATH/nodejs-project/" -type f -name "*.gyp"))
  if [ \${#gypfiles[@]} -gt 0 ]; then
    NODEJS_MOBILE_BUILD_NATIVE_MODULES=1
  else
    NODEJS_MOBILE_BUILD_NATIVE_MODULES=0
  fi
fi
if [ "1" != "$NODEJS_MOBILE_BUILD_NATIVE_MODULES" ]; then exit 0; fi
# Delete object files
find "$CODESIGNING_FOLDER_PATH/nodejs-project/" -name "*.o" -type f -delete
find "$CODESIGNING_FOLDER_PATH/nodejs-project/" -name "*.a" -type f -delete
# Create Info.plist for each framework built and loader override.
PATCH_SCRIPT_DIR="$( cd "$PROJECT_DIR" && cd ../node_modules/nodejs-mobile-react-native/scripts/ && pwd )"
NODEJS_PROJECT_DIR="$( cd "$CODESIGNING_FOLDER_PATH" && cd nodejs-project/ && pwd )"
node "$PATCH_SCRIPT_DIR"/ios-create-plists-and-dlopen-override.js $NODEJS_PROJECT_DIR
# Embed every resulting .framework in the application and delete them afterwards.
embed_framework()
{
    FRAMEWORK_NAME="$(basename "$1")"
    cp -r "$1" "$TARGET_BUILD_DIR/$FRAMEWORKS_FOLDER_PATH/"
    
    /usr/bin/codesign --force --sign $EXPANDED_CODE_SIGN_IDENTITY --preserve-metadata=identifier,entitlements,flags --timestamp=none "$TARGET_BUILD_DIR/$FRAMEWORKS_FOLDER_PATH/$FRAMEWORK_NAME"
}
find "$CODESIGNING_FOLDER_PATH/nodejs-project/" -name "*.framework" -type d | while read frmwrk_path; do embed_framework "$frmwrk_path"; done

#Delete gyp temporary .deps dependency folders from the project structure.
find "$CODESIGNING_FOLDER_PATH/nodejs-project/" -path "*/.deps/*" -delete
find "$CODESIGNING_FOLDER_PATH/nodejs-project/" -name ".deps" -type d -delete

#Delete frameworks from their build paths
find "$CODESIGNING_FOLDER_PATH/nodejs-project/" -path "*/*.framework/*" -delete
find "$CODESIGNING_FOLDER_PATH/nodejs-project/" -name "*.framework" -type d -delete
`
    var signNativeModulesBuildPhase = xcodeProject.buildPhaseObject('PBXShellScriptBuildPhase', signNativeModulesBuildPhaseName, firstTargetUUID);
    if (signNativeModulesBuildPhase) {
      xcodeProject.myRemovePbxScriptBuildPhase(signNativeModulesBuildPhaseName, firstTargetUUID);
    }
    xcodeProject.addBuildPhase(
      [],
      'PBXShellScriptBuildPhase',
      signNativeModulesBuildPhaseName,
      firstTargetUUID,
      { shellPath: '/bin/sh', shellScript: signNativeModulesBuildPhaseScript }
    );

    //Adds a build phase to remove the x64 strips from the NodeMobile framework. Needed for correct App Store submission.
    var removeSimulatorArchsBuildPhaseName = 'Remove NodeJS Mobile Framework Simulator Strips';
    var removeSimulatorArchsBuildPhaseScript = `
set -e
FRAMEWORK_BINARY_PATH="$TARGET_BUILD_DIR/$FRAMEWORKS_FOLDER_PATH/NodeMobile.framework/NodeMobile"
FRAMEWORK_STRIPPED_PATH="$FRAMEWORK_BINARY_PATH-strip"
if [ "$PLATFORM_NAME" != "iphonesimulator" ]; then
  if $(lipo "$FRAMEWORK_BINARY_PATH" -verify_arch "x86_64") ; then
    lipo -output "$FRAMEWORK_STRIPPED_PATH" -remove "x86_64" "$FRAMEWORK_BINARY_PATH"
    rm "$FRAMEWORK_BINARY_PATH"
    mv "$FRAMEWORK_STRIPPED_PATH" "$FRAMEWORK_BINARY_PATH"
    echo "Removed simulator strip from NodeMobile.framework"
  fi
fi
`
    var removeSimulatorArchsBuildPhase = xcodeProject.buildPhaseObject('PBXShellScriptBuildPhase', removeSimulatorArchsBuildPhaseName, firstTargetUUID);
    if (removeSimulatorArchsBuildPhase) {
      xcodeProject.myRemovePbxScriptBuildPhase(removeSimulatorArchsBuildPhaseName, firstTargetUUID);
    }
    xcodeProject.addBuildPhase(
      [],
      'PBXShellScriptBuildPhase',
      removeSimulatorArchsBuildPhaseName,
      firstTargetUUID,
      { shellPath: '/bin/sh', shellScript: removeSimulatorArchsBuildPhaseScript }
    );

    //Writes the updated .pbx file
    fs.writeFileSync(pbxProjectPath,xcodeProject.writeSync(),'utf-8');
  });

}

