#include "node_api.h"
#include "uv.h"
#include "rn-bridge.h"
#define NM_F_BUILTIN 0x1
#include <map>
#include <mutex>
#include <queue>
#include <string>
#include <cstring>
#include <cstdlib>


//Some helper macros from node/test/addons-napi/common.h

// Empty value so that macros here are able to return NULL or void
#define NAPI_RETVAL_NOTHING  // Intentionally blank #define

#define GET_AND_THROW_LAST_ERROR(env)                                    \
  do {                                                                   \
    const napi_extended_error_info *error_info;                          \
    napi_get_last_error_info((env), &error_info);                        \
    bool is_pending;                                                     \
    napi_is_exception_pending((env), &is_pending);                       \
    /* If an exception is already pending, don't rethrow it */           \
    if (!is_pending) {                                                   \
      const char* error_message = error_info->error_message != NULL ?    \
        error_info->error_message :                                      \
        "empty error message";                                           \
      napi_throw_error((env), NULL, error_message);                      \
    }                                                                    \
  } while (0)

#define NAPI_ASSERT_BASE(env, assertion, message, ret_val)               \
  do {                                                                   \
    if (!(assertion)) {                                                  \
      napi_throw_error(                                                  \
          (env),                                                         \
        NULL,                                                            \
          "assertion (" #assertion ") failed: " message);                \
      return ret_val;                                                    \
    }                                                                    \
  } while (0)

// Returns NULL on failed assertion.
// This is meant to be used inside napi_callback methods.
#define NAPI_ASSERT(env, assertion, message)                             \
  NAPI_ASSERT_BASE(env, assertion, message, NULL)

// Returns empty on failed assertion.
// This is meant to be used inside functions with void return type.
#define NAPI_ASSERT_RETURN_VOID(env, assertion, message)                 \
  NAPI_ASSERT_BASE(env, assertion, message, NAPI_RETVAL_NOTHING)

#define NAPI_CALL_BASE(env, the_call, ret_val)                           \
  do {                                                                   \
    if ((the_call) != napi_ok) {                                         \
      GET_AND_THROW_LAST_ERROR((env));                                   \
      return ret_val;                                                    \
    }                                                                    \
  } while (0)

// Returns NULL if the_call doesn't return napi_ok.
#define NAPI_CALL(env, the_call)                                         \
  NAPI_CALL_BASE(env, the_call, NULL)

// Returns empty if the_call doesn't return napi_ok.
#define NAPI_CALL_RETURN_VOID(env, the_call)                             \
  NAPI_CALL_BASE(env, the_call, NAPI_RETVAL_NOTHING)


class QueuedFunc {
public:
    QueuedFunc(napi_env& env, napi_ref& function) : env(env), function(function) {
    };

    void notify_message(char *s){
        napi_env original_env = env;

        napi_handle_scope scope;
        napi_open_handle_scope(original_env, &scope);

        napi_ref original_function_ref = function;

        napi_value callback;
        napi_get_reference_value(original_env, original_function_ref, &callback);
        napi_value global;
        napi_get_global(original_env, &global);

        napi_value message;
        napi_create_string_utf8(original_env, s, strlen(s), &message);

        napi_value* argv = &message;
        size_t argc = 1;

        napi_value result;
        napi_call_function(original_env, global, callback, argc, argv, &result);

        napi_close_handle_scope(original_env, scope);
    }

private:
    napi_ref                    function;
    napi_env                    env;
};

std::map<int32_t, QueuedFunc*> pool;
int32_t my_little_pool_incrementer=1;

rn_bridge_cb embedder_callback=NULL;

std::mutex queueLock;
std::queue<char*> messageQueue;
uv_async_t* queue_uv_handle=NULL;

void rn_register_bridge_cb(rn_bridge_cb _cb) {
    embedder_callback=_cb;
}

void close_cb (uv_handle_t* handle) {
    free(((uv_async_t*)handle)->data);
    free(handle);
};

void doRegisteredCallbacks(uv_async_t* handle) {
    std::map<int32_t, QueuedFunc*> copiedPool;
    copiedPool=pool;
    char* message =(char*)(handle->data);
    std::map<int32_t, QueuedFunc*>::iterator it;
    for(it = copiedPool.begin(); it != copiedPool.end(); it++) {
        it->second->notify_message(message);
    }
    uv_close((uv_handle_t*)handle, close_cb);
}

void flushMessageQueue(uv_async_t* handle) {
    char* message;
    queueLock.lock();
    bool has_elements=!messageQueue.empty();
    queueLock.unlock();
    while(has_elements)
    {
        queueLock.lock();
        message=messageQueue.front();
        messageQueue.pop();
        has_elements=!messageQueue.empty();
        queueLock.unlock();

        uv_async_t* handle = (uv_async_t*)malloc(sizeof(uv_async_t));
        uv_async_init(uv_default_loop(), handle, doRegisteredCallbacks);
        handle->data=(void*)message;
        uv_async_send(handle);
    }
}

void init_queue_uv_handle()
{
    queue_uv_handle = (uv_async_t*)malloc(sizeof(uv_async_t));
    uv_async_init(uv_default_loop(), queue_uv_handle, flushMessageQueue);
    uv_async_send(queue_uv_handle);
}

napi_value Method_RegisterListener(napi_env env, napi_callback_info info) {
    if(queue_uv_handle==NULL)
    {
        init_queue_uv_handle();
    }
    size_t argc = 1;
    napi_value args[1];
    NAPI_CALL(env, napi_get_cb_info(env,info,&argc,args,NULL,NULL));

    NAPI_ASSERT(env, argc == 1, "Wrong number of arguments");

    napi_value listener_function=args[0];

    napi_valuetype valuetype0;
    NAPI_CALL(env, napi_typeof(env, listener_function, &valuetype0));

    NAPI_ASSERT(env, valuetype0==napi_function, "Expected a function");

    napi_ref ref_to_function;
    NAPI_CALL(env, napi_create_reference(env, listener_function, 1, &ref_to_function));

    napi_value result;
    NAPI_CALL(env, napi_create_int32(env, my_little_pool_incrementer, &result));

    QueuedFunc *af = new QueuedFunc(env, ref_to_function);
    pool[my_little_pool_incrementer++]=af;

    return result;
}

// Let's make something appear on native code.
napi_value Method_SendMessage(napi_env env, napi_callback_info info) {
    size_t argc = 1;
    napi_value args[1];

    NAPI_CALL(env, napi_get_cb_info(env,info,&argc,args,NULL,NULL));

    NAPI_ASSERT(env, argc == 1, "Wrong number of arguments");

    napi_value value_to_log=args[0];

    napi_valuetype valuetype0;
    NAPI_CALL(env, napi_typeof(env, value_to_log, &valuetype0));

    if (valuetype0 != napi_string) {
        NAPI_CALL(env, napi_coerce_to_string(env, value_to_log, &value_to_log));
    }

    size_t length;
    size_t copied;
    NAPI_CALL(env, napi_get_value_string_utf8(env, value_to_log, NULL, 0, &length));

    //C++ cleans it automatically.
    std::unique_ptr<char[]> unique_buffer(new char[length+1]());
    char *buff=unique_buffer.get();

    NAPI_CALL(env, napi_get_value_string_utf8(env, value_to_log, buff, length+1, &copied));

    NAPI_ASSERT(env, copied==length, "Couldn't fully copy the message");

    NAPI_ASSERT(env, embedder_callback,"No callback is set in native code to receive the message");

    if(embedder_callback)
    {
        embedder_callback(buff);
    }

    return nullptr;
}

#define DECLARE_NAPI_METHOD(name, func)                          \
  { name, 0, func, 0, 0, 0, napi_default, 0 }

void Init(napi_env env, napi_value exports, napi_value module, void* priv) {
    napi_status status;
    napi_property_descriptor properties[] = {
        DECLARE_NAPI_METHOD("sendMessage", Method_SendMessage),
        DECLARE_NAPI_METHOD("registerListener", Method_RegisterListener),
    };
    status = napi_define_properties(env, exports, sizeof(properties) / sizeof(*properties), properties);
}

void rn_bridge_notify(const char *message) {
    int messageLength=strlen(message);
    char* messageCopy = (char*)calloc(sizeof(char),messageLength+1);

    strncpy(messageCopy,message,messageLength);

    queueLock.lock();
    messageQueue.push(messageCopy);
    queueLock.unlock();

    //lock
    if(queue_uv_handle!=NULL)
        uv_async_send(queue_uv_handle);
}

NAPI_MODULE_X(rn_bridge, Init, NULL, NM_F_BUILTIN)

