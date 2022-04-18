/* eslint-disable @typescript-eslint/no-explicit-any */

/* The SymblEvents class is a class that allows you to subscribe to Symbl events */
export class SymblEvents {
  captionHandlers: any = []; /** Handlers for the caption events **/
  insightHandlers: any = []; /** Handlers for the insight events **/
  transcriptHandlers: any = []; /** Handlers for the transcript events **/
  topicHandlers: any = []; /** Handlers for the topic events **/
  trackerHandlers: any = []; /** Handlers for the tracker events **/

  // constructor() {}

  /**
   * *Get the array of handlers for the given handler type.*
   * @param {string} handlerType - The type of handler.
   * @returns An array of functions.
   */
  getHandlerArr(handlerType: string): any {
    let handlerArr;
    if (handlerType === 'caption') {
      handlerArr = this.captionHandlers;
    } else if (handlerType === 'insight') {
      handlerArr = this.insightHandlers;
    } else if (handlerType === 'transcript') {
      handlerArr = this.transcriptHandlers;
    } else if (handlerType === 'topic') {
      handlerArr = this.topicHandlers;
    } else if (handlerType === 'tracker') {
      handlerArr = this.trackerHandlers;
    } else {
      throw new Error(`Unhandled SymblEvent handler type ${handlerType}`);
    }
    return handlerArr;
  }

  /**
   * Subscribe to one of three possible insight handlers
   * @param  type    handler type - can be `caption`, `insight`, and `transcript`
   * @param  handler callback function that will be fired when the corresponding event is emitted
   * @return         function that removes the handler.
   */
  subscribe(type: string, handler: any): any {
    try {
      const handlerArr = this.getHandlerArr(type);
      if (handlerArr) {
        handlerArr.push(handler);
        return () => {
          const index = this.captionHandlers.indexOf(handler);
          if (index > -1) {
            const removedHandler = this.captionHandlers.splice(index, 1);
            return removedHandler;
          }
        };
      }
    } catch (err) {
      console.log(err);
      throw new Error(`Error subscribing to SymblEvent type ${type} ${err}`);
    }
  }

  /**
   * * Emit an event.
   * @param {string} type - The type of event to emit.
   * @param {string} event - The name of the event to emit.
   * @param {any[]} args - any[]
   */
  emit(type: string, event: string, ...args: any[]) {
    try {
      const handlerArr = this.getHandlerArr(type);
      if (handlerArr) {
        handlerArr.forEach((handler: any) => {
          if (handler[event]) {
            handler[event](...args);
          }
        });
      }
    } catch (err) {
      console.error(err);
      throw new Error(`Error emitting event type ${type} ${err}`);
    }
  }
}
