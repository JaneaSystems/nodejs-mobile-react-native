var path = require('path');
var fs = require('fs');
var ncp = require('ncp');
var xcode = require('xcode');
const android = require('./../../../node_modules/react-native/local-cli/core/android');
const ios = require('./../../../node_modules/react-native/local-cli/core/ios');

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
if [ "1" != "$NODEJS_MOBILE_BUILD_NATIVE_MODULES" ]; then exit 0; fi
set -e
NODEJS_HEADERS_DIR="$( cd "$PROJECT_DIR" && cd ../node_modules/nodejs-mobile-react-native/ios/libnode/ && pwd )"
pushd $CODESIGNING_FOLDER_PATH/nodejs-project/
if [ "$PLATFORM_NAME" == "iphoneos" ]
then
  GYP_DEFINES="OS=ios" npm_config_nodedir="$NODEJS_HEADERS_DIR" npm_config_platform="ios" npm_config_node_engine="chakracore" npm_config_arch="arm64" npm --verbose rebuild --build-from-source
else
  GYP_DEFINES="OS=ios" npm_config_nodedir="$NODEJS_HEADERS_DIR" npm_config_platform="ios" npm_config_node_engine="chakracore" npm_config_arch="x64" npm --verbose rebuild --build-from-source
fi
popd
`
    var rebuildNativeModulesBuildPhase = xcodeProject.buildPhaseObject('PBXShellScriptBuildPhase', rebuildNativeModulesBuildPhaseName, firstTargetUUID);
    if (!(rebuildNativeModulesBuildPhase)) {
      xcodeProject.addBuildPhase(
        [],
        'PBXShellScriptBuildPhase',
        rebuildNativeModulesBuildPhaseName,
        firstTargetUUID,
        { shellPath: '/bin/sh', shellScript: rebuildNativeModulesBuildPhaseScript }
      );
    }

    //Adds a build phase to sign native modules
    var signNativeModulesBuildPhaseName = 'Sign NodeJS Mobile Native Modules';
    var signNativeModulesBuildPhaseScript = `
if [ "1" != "$NODEJS_MOBILE_BUILD_NATIVE_MODULES" ]; then exit 0; fi
/usr/bin/codesign --force --sign $EXPANDED_CODE_SIGN_IDENTITY --preserve-metadata=identifier,entitlements,flags --timestamp=none $(find "$CODESIGNING_FOLDER_PATH/nodejs-project/" -type f -name "*.node")
`
    var signNativeModulesBuildPhase = xcodeProject.buildPhaseObject('PBXShellScriptBuildPhase', signNativeModulesBuildPhaseName, firstTargetUUID);
    if (!(signNativeModulesBuildPhase)) {
      xcodeProject.addBuildPhase(
        [],
        'PBXShellScriptBuildPhase',
        signNativeModulesBuildPhaseName,
        firstTargetUUID,
        { shellPath: '/bin/sh', shellScript: signNativeModulesBuildPhaseScript }
      );
    }

    //Writes the updated .pbx file
    fs.writeFileSync(pbxProjectPath,xcodeProject.writeSync(),'utf-8');
  });

}

