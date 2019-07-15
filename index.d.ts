declare module "nodejs-mobile-react-native" {
  export interface NodeJs {
    start: (scriptFileName: string, options?: StartupOptions) => void
    startWithScript: (scriptBody: string, options?: StartupOptions) => void
    channel: Channel;
  }
  export interface Channel {
    addListener: (event: string, callback: (message?: string) => void, context?: any) => void;
    removeListener: (event: string, callback: (message?: string) => void, context?: any) => void;
    post: (event: string, ...message: any[]) => void;
    send: (...message: any[]) => void;
  }

  export interface StartupOptions {
    redirectOutputToLogcat?: boolean
  }

  const nodejs: NodeJs

  export default nodejs
}
