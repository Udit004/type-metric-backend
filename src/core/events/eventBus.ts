import  EventEmitter from "eventemitter2";

export const eventBus = new EventEmitter.EventEmitter2({

    wildcard: true,

    delimiter: ".",

    maxListeners: 50,

    verboseMemoryLeak: true

});