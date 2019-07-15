declare module "nodejs-mobile-react-native" {
  export interface NodeJs {
    /**
     * Starts the nodejs-mobile runtime thread with a file inside the nodejs-project directory
     * @param scriptFileName 
     * @param options 
     */
    start: (scriptFileName: string, options?: StartupOptions) => void
    /**
     * Starts the nodejs-mobile runtime thread with a script body
     * @param scriptBody 
     * @param options 
     */
    startWithScript: (scriptBody: string, options?: StartupOptions) => void
    channel: Channel;
  }
  export interface Channel {
    /**
     * Registers a callback for user-defined events raised from the nodejs-mobile side
     * @param event 
     * @param callback a function that accepts any JS type that can be serialized with JSON.stringify 
     * and deserialized with JSON.parse of the type: `boolean`, `number`, `string`, `object`, or `array`
     * @param context
     */
    addListener: (event: string, callback: ChannelCallback, context?: any) => void;
    /**
     * Removes the listener for the user-defined events raised from the nodejs-mobile side
     * @param event 
     * @param callback a function that accepts any JS type that can be serialized with JSON.stringify 
     * and deserialized with JSON.parse of the type: `boolean`, `number`, `string`, `object`, or `array`
     * @param context
     */
    removeListener: (event: string, callback: ChannelCallback, context?: any) => void;
    /**
     * Raises a user-defined event on the nodejs-mobile side
     * - accepts any JS type that can be serialized with JSON.stringify and deserialized with JSON.parse
     * - can accept multiple message arguments
     * @param event 
     * @param message can be of type: `boolean`, `number`, `string`, `object`, or `array`
     */
    post: (event: string, ...message: any[]) => void;
    /**
     * Raises a `'message'` event on the nodejs-mobile side 
     * It is an alias for `nodejs.channel.post('message', ...message)`
     * - accepts any JS type that can be serialized with JSON.stringify and deserialized with JSON.parse
     * - can accept multiple message arguments
     * @param message can be of type: `boolean`, `number`, `string`, `object`, or `array`
     */
    send: (...message: any[]) => void;
  }

  /**
   * Handles messages sent through the nodejs-mobile channel. 
   * - accepts any JS type that can be serialized with JSON.stringify and deserialized with JSON.parse
   * - can accept multiple arguments
   * @param arg can be of type: `boolean`, `number`, `string`, `object`, or `array`
   */
  export type ChannelCallback = (...arg: any[]) => void

  /**
   * Optional options for `start` and `startWithScript`
   */
  export interface StartupOptions {
    redirectOutputToLogcat?: boolean
  }

  const nodejs: NodeJs

  export default nodejs
}
