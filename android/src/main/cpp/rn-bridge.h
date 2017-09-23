#ifndef SRC_RN_BRIDGE_H_
#define SRC_RN_BRIDGE_H_

typedef void (*rn_bridge_cb)(char* arg);
void rn_register_bridge_cb(rn_bridge_cb);
void rn_bridge_notify(const char *message);

#endif
