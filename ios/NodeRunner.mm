#include "NodeRunner.hpp"
#include <libnode/node.hpp>
#include <string>
#include "rn-bridge.h"

void notifyNode(const char* msg)
{
  rn_bridge_notify(msg);
}

void rcv_message(char* msg) {
  NSString* objectiveCMessage=[NSString stringWithUTF8String:msg];
  [[NodeRunner sharedInstance] sendMessageBackToReact:objectiveCMessage];
}

@implementation NodeRunner
{
  RNNodeJsMobile * _currentModuleInstance;
}

@synthesize startedNodeAlready = _startedNodeAlready;

+ (NodeRunner*)sharedInstance {
  static NodeRunner *_instance = nil;
  @synchronized(self) {
    if (_instance == nil)
      _instance = [[self alloc] init];
  }
  return _instance;
}
- (id)init {
  if (self = [super init]) {
    _currentModuleInstance=nil;
    _startedNodeAlready=false;
  }
  return self;
}

- (void)dealloc {
}

- (void) setCurrentRNNodeJsMobile:(RNNodeJsMobile*)module
{
  _currentModuleInstance=module;
}

-(void) sendMessageToNode:(NSString*)message
{
  const char* c_message=[message UTF8String];
  notifyNode(c_message);
}

-(void) sendMessageBackToReact:(NSString*)message
{
  if(_currentModuleInstance!=nil) {
    [_currentModuleInstance sendMessageBackToReact:message];
  }
}

//node's libUV requires all arguments being on contiguous memory.
- (void) startEngineWithArguments:(NSArray*)arguments:(NSString*)builtinModulesPath
{
  //Set the builtin_modules path to NODE_PATH
  NSString* nodePath = [[NSProcessInfo processInfo] environment][@"NODE_PATH"];
  if (nodePath == NULL)
  {
    nodePath = builtinModulesPath;
  } else {
    nodePath = [nodePath stringByAppendingString:@":"];
    nodePath = [nodePath stringByAppendingString:builtinModulesPath];
  }
  setenv([@"NODE_PATH" UTF8String], (const char*)[nodePath UTF8String], 1);

  int c_arguments_size=0;
  
  //Compute byte size need for all arguments in contiguous memory.
  for (id argElement in arguments)
  {
    c_arguments_size+=strlen([argElement UTF8String]);
    c_arguments_size++; // for '\0'
  }
  
  //Stores arguments in contiguous memory.
  char* args_buffer=(char*)calloc(c_arguments_size, sizeof(char));
  
  //argv to pass into node.
  char* argv[[arguments count]];
  
  //To iterate through the expected start position of each argument in args_buffer.
  char* current_args_position=args_buffer;
  
  //Argc
  int argument_count=0;
  
  //Populate the args_buffer and argv.
  for (id argElement in arguments)
  {
    const char* current_argument=[argElement UTF8String];
    
    //Copy current argument to its expected position in args_buffer
    strncpy(current_args_position, current_argument, strlen(current_argument));
    
    //Save current argument start position in argv and increment argc.
    argv[argument_count]=current_args_position;
    argument_count++;
    
    //Increment to the next argument's expected position.
    current_args_position+=strlen(current_args_position)+1;
  }
  rn_register_bridge_cb(rcv_message);
  //Start node, with argc and argv.
  node::Start(argument_count,argv);
}
@end



