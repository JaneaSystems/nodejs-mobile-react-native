
#import "RNNodeJsMobile.h"
#import "NodeRunner.hpp"
#import <React/RCTEventDispatcher.h>


@implementation RNNodeJsMobile

@synthesize bridge = _bridge;

- (dispatch_queue_t)methodQueue
{
    return dispatch_get_main_queue();
}

+ (BOOL)requiresMainQueueSetup
{
    return NO;
}

- (id)init
{
  self = [super init];
  if (self != nil)
  {
    [[NodeRunner sharedInstance] setCurrentRNNodeJsMobile:self];
  }
  return self;
}

RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(sendMessage:(NSString *)script)
{
  dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_BACKGROUND, 0), ^{
    [[NodeRunner sharedInstance] sendMessageToNode:script];
  });
}

-(void)callStartNodeWithScript:(NSString *)script
{
  NSString* builtinModulesPath = [[NSBundle mainBundle] pathForResource:@"builtin_modules" ofType:@""];
  NSArray* nodeArguments = [NSArray arrayWithObjects:
                            @"node",
                            @"-e",
                            script,
                            nil
                            ];
  [[NodeRunner sharedInstance] startEngineWithArguments:nodeArguments:builtinModulesPath];
}

-(void)callStartNodeProject
{
  NSString* builtinModulesPath = [[NSBundle mainBundle] pathForResource:@"builtin_modules" ofType:@""];
  NSString* srcPath = [[NSBundle mainBundle] pathForResource:@"nodejs-project/main" ofType:@"js"];
  NSArray* nodeArguments = [NSArray arrayWithObjects:
                            @"node",
                            srcPath,
                            nil
                            ];
  [[NodeRunner sharedInstance] startEngineWithArguments:nodeArguments:builtinModulesPath];
}


RCT_EXPORT_METHOD(startNodeWithScript:(NSString *)script)
{
  if(![NodeRunner sharedInstance].startedNodeAlready)
  {
    [NodeRunner sharedInstance].startedNodeAlready=true;
    NSThread* nodejsThread = nil;
    nodejsThread = [[NSThread alloc]
      initWithTarget:self
      selector:@selector(callStartNodeWithScript:)
      object:script
    ];
    [nodejsThread start];
  }
}

RCT_EXPORT_METHOD(startNodeProject:(BOOL)deleteandcopy)
{
  if(![NodeRunner sharedInstance].startedNodeAlready)
  {
    [NodeRunner sharedInstance].startedNodeAlready=true;
    NSThread* nodejsThread = nil;
    nodejsThread = [[NSThread alloc]
      initWithTarget:self
      selector:@selector(callStartNodeProject)
      object:nil
    ];
    [nodejsThread start];      
  }
}

-(void) sendMessageBackToReact:(NSString*)message
{
  dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_BACKGROUND, 0), ^{
    [self.bridge.eventDispatcher sendAppEventWithName:@"nodejs-mobile-react-native-message"
      body:@{@"message": message}
    ];
  });
}

@end

