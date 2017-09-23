
#import <React/RCTBridgeModule.h>

@interface RNNodeJsMobile : NSObject <RCTBridgeModule>
  -(void) sendMessageBackToReact:(NSString*)message;
@end
  