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
    var FrameworksUUID = xcodeProject.pbxCreateGroup("Frameworks");
    var mainGroupUUID = xcodeProject.pbxProjectSection()[xcodeProject.getFirstProject().uuid].mainGroup;
    xcodeProject.addToPbxGroup(FrameworksUUID,mainGroupUUID);

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

    //Adds the libnode framework to the firstTarget (it's the main app target)
    var frameworkPath="../node_modules/nodejs-mobile-react-native/ios/libnode.framework";
    var frameworkFileRef=xcodeProject.addFramework(
      frameworkPath,
      {customFramework:true, embed:true, link: true, sign: true, target: firstTargetUUID}
    );

    if(frameworkFileRef)
    {
      myaddToFrameworkSearchPaths(frameworkPath);
    }

    //Create the resources group.
    xcodeProject.pbxCreateGroup("Resources");

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

    //Writes the updated .pbx file
    fs.writeFileSync(pbxProjectPath,xcodeProject.writeSync(),'utf-8');
  });

}

