#include <jni.h>
#include <string>
#include <cstdlib>
#include <android/log.h>

#include "node.h"
#include "rn-bridge.h"

// cache the environment variable for the thread running node to call into java
JNIEnv* cacheEnvPointer=NULL;

extern "C"
JNIEXPORT void JNICALL
Java_com_janeasystems_rn_1nodejs_1mobile_RNNodeJsMobileModule_notifyNode(
        JNIEnv *env,
        jobject /* this */,
        jstring msg) {
    const char* nativeMessage = env->GetStringUTFChars(msg, 0);
    rn_bridge_notify(nativeMessage);
    env->ReleaseStringUTFChars(msg,nativeMessage);
}

extern "C" int callintoNode(int argc, char *argv[])
{
    const int exit_code = node::Start(argc,argv);
    return exit_code;
}

#define APPNAME "RNBRIDGE"

void rcv_message(char* msg) {
  JNIEnv *env=cacheEnvPointer;
  if(!env) return;
  jclass cls2 = env->FindClass("com/janeasystems/rn_nodejs_mobile/RNNodeJsMobileModule");  // try to find the class
  if(cls2 != nullptr) {
    jmethodID m_sendMessage = env->GetStaticMethodID(cls2, "sendMessageBackToReact", "(Ljava/lang/String;)V");  // find method
    if(m_sendMessage != nullptr) {
        jstring java_msg=env->NewStringUTF(msg);
        env->CallStaticVoidMethod(cls2, m_sendMessage,java_msg);                      // call method
    }
  }
}

//node's libUV requires all arguments being on contiguous memory.
extern "C" jint JNICALL
Java_com_janeasystems_rn_1nodejs_1mobile_RNNodeJsMobileModule_startNodeWithArguments(
        JNIEnv *env,
        jobject /* this */,
        jobjectArray arguments,
        jstring modulesPath) {

    //Set the builtin_modules path to NODE_PATH.
    const char* path_path = env->GetStringUTFChars(modulesPath, 0);
    setenv("NODE_PATH", path_path, 1);
    env->ReleaseStringUTFChars(modulesPath, path_path);

    //argc
    jsize argument_count = env->GetArrayLength(arguments);

    //Compute byte size need for all arguments in contiguous memory.
    int c_arguments_size = 0;
    for (int i = 0; i < argument_count ; i++) {
        c_arguments_size += strlen(env->GetStringUTFChars((jstring)env->GetObjectArrayElement(arguments, i), 0));
        c_arguments_size++; // for '\0'
    }

    //Stores arguments in contiguous memory.
    char* args_buffer=(char*)calloc(c_arguments_size, sizeof(char));

    //argv to pass into node.
    char* argv[argument_count];

    //To iterate through the expected start position of each argument in args_buffer.
    char* current_args_position=args_buffer;

    //Populate the args_buffer and argv.
    for (int i = 0; i < argument_count ; i++)
    {
        const char* current_argument = env->GetStringUTFChars((jstring)env->GetObjectArrayElement(arguments, i), 0);

        //Copy current argument to its expected position in args_buffer
        strncpy(current_args_position, current_argument, strlen(current_argument));

        //Save current argument start position in argv
        argv[i] = current_args_position;

        //Increment to the next argument's expected position.
        current_args_position += strlen(current_args_position)+1;
    }

    rn_register_bridge_cb(&rcv_message);

    cacheEnvPointer=env;

    //Start node, with argc and argv.
    return jint(callintoNode(argument_count,argv));

}
