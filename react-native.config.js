module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android'
      },
      ios: {
        project: './ios/RNNodeJsMobile.xcodeproj',
        scriptPhases: [
          {
            name: '[NODEJS MOBILE] Copy Node.js Project files',
            path: './scripts/ios-copy-nodejs-project.sh',
            execution_position: 'after_compile'
          }, {
            name: '[NODEJS MOBILE] Build Native Modules',
            path: './scripts/ios-build-native-modules.sh',
            execution_position: 'after_compile'
          }, {
            name: '[NODEJS MOBILE] Sign Native Modules',
            path: './scripts/ios-sign-native-modules.sh',
            execution_position: 'after_compile'
          }, {
            name: '[NODEJS MOBILE] Remove Simulator Strip',
            path: './scripts/ios-remove-framework-simulator-strips.sh',
            execution_position: 'after_compile'
          }
        ]
      }
    }
  }
}