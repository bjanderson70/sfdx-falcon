//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @file          helpers/falcon-helper.ts
 * @copyright     Vivek M. Chawla - 2018
 * @author        Vivek M. Chawla <@VivekMChawla>
 * @version       1.0.0
 * @license       MIT
 * @requires      module:???
 * @summary       SFDX-Falcon general helper library
 * @description   Exports general helper classes & functions tightly related to the SFDX-Falcon
 *                framework.
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
// Imports
import {AppxDemoLocalConfig}    from '../falcon-types';   // Why?
import {AppxDemoProjectConfig}  from '../falcon-types';   // Why?

// Requires
const chalk         = require('chalk');
const util          = require('util');




// Returns the Debug Tail Padding (this is a hack for printing debug while Listr is running);
export function dtp(){
  return '\n%O\n-\n-\n-\n-\n-\n-\n-\n-';
} 

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @class       AppxDemoProjectContext
 * @access      public
 * @version     1.0.0
 * @summary     ????
 * @description ????
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
export class AppxDemoProjectContext {
  // Interface
  public config: {
    local:    AppxDemoLocalConfig;
    project:  AppxDemoProjectConfig;
    global:   any;
  }
  public path: string;
  // Constructor
  constructor() {
    this.config = {
      local:    <AppxDemoLocalConfig>{},
      project:  <AppxDemoProjectConfig>{},
      global:   {}
    };
  }
}

// ────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @function    composeFalconError
 * @param       {string}  falconErrMsg  Required.
 * @param       {string}  sfdxStdErr    Required.
 * @returns     {FalconError}  ???
 * @description ???
 * @version     1.0.0
 * @public
 */
// ────────────────────────────────────────────────────────────────────────────────────────────────┘
export function composeFalconError(falconErrMsg:string, stdErrOutput:string, falconStatus:number=1):FalconError {
  let stdErrJson = null;
  try {
    stdErrJson = JSON.parse(stdErrOutput);
  } catch (e) {
    stdErrJson = {
      name:     'Error',
      message:  'Unknown SFDX Error (could not parse stderr result from CLI)',
      status:   1
    };
  }
  let falconError = {
    message:    falconErrMsg,
    status:     falconStatus,
    stdErrJson: stdErrJson
  }
  return falconError;
}

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @class       FalconDebug
 * @access      public
 * @version     1.0.0
 * @summary     ????
 * @description ????
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
export class FalconDebug {
  private static debugEnabled:boolean         = false;
  private static debugAsyncEnabled:boolean    = false;
  private static debugExtendedEnabled:boolean = false;
  private static debugInitialized:boolean     = false;

  static getDebugEnabled():boolean {
    return FalconDebug.debugEnabled;
  }
  static getDebugAsyncEnabled():boolean {
    return FalconDebug.debugAsyncEnabled;
  }
  static getDebugExtendedEnabled():boolean {
    return FalconDebug.debugExtendedEnabled;
  }
  static getDebugInitialized():boolean {
    return FalconDebug.debugInitialized;
  }
  static setDebugEnablement(debugEnabled:boolean, debugAsyncEnabled:boolean, debugExtendedEnabled:boolean):void {
    if (FalconDebug.debugInitialized === true) {
      throw new Error(`ERROR_DEBUG_OPTIONS_SET: Debug enablement options can only be set once`);
    }
    FalconDebug.debugEnabled          = debugEnabled;
    FalconDebug.debugAsyncEnabled     = debugAsyncEnabled;
    FalconDebug.debugExtendedEnabled  = debugExtendedEnabled;
    FalconDebug.debugInitialized      = true;
  }
  static debugObject(localDebugger:any, objToDebug:object, objName:string):void {
    localDebugger(
      `-\n${chalk.magenta(objName + ':')}\n` +
      util.inspect(objToDebug, {depth:6, colors:true}) +
      `\n-\n-\n-\n-`
    );
  }
}

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @class       FalconError
 * @access      public
 * @version     1.0.0
 * @summary     ????
 * @description ????
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
export class FalconError {
  public  message:    string;
  public  status:     number;
  public  stdErrJson: any;

  public static wrap(error:any):FalconError {

    // If error is missing stdErrJson, it's definitely not a Falcon Error.
    if (typeof error.stdErrJson === 'undefined') {
      return {
        message:    'Unexpected Exception',
        status:     1,
        stdErrJson: error
      }
    }
    // Assume that it's already a Falcon Error.
    return error;
  }
}

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @class       FalconStatusReport
 * @access      public
 * @version     1.0.0
 * @summary     ????
 * @description ????
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
export class FalconStatusReport {
  private   startTime:      number  = -1;
  private   endTime:        number  = -1;
  private   runTime:        number  = -1;

  public    statusCode:     number  = -1;
  public    statusLog:      Array<string>;
  public    statusMessage:  string  = '';

  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @constructs  FalconStatusReport      
   * @description ???
   * @version     1.0.0
   */
  //───────────────────────────────────────────────────────────────────────────┘
  constructor (startTimer:boolean=false) {
    if (startTimer === true) {
      this.startTimer();
    }
    this.statusLog = new Array<string>();
  }
  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @method      
   * @description ???
   * @version     1.0.0
   * @public
   */
  //───────────────────────────────────────────────────────────────────────────┘
  public setStatusMessage(statusMessage:string):void {
    this.logStatusMessage(statusMessage);
    this.statusMessage = statusMessage;
  }
  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @method      
   * @description ???
   * @version     1.0.0
   * @public
   */
  //───────────────────────────────────────────────────────────────────────────┘
  public logStatusMessage(logMessage:string):void {
    this.statusLog.push(logMessage);
  }
  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @method      
   * @description ???
   * @version     1.0.0
   * @public
   */
  //───────────────────────────────────────────────────────────────────────────┘
  public startTimer() {
    if (this.endTime !== -1) {
      throw new Error('ERROR_TIMER_RUNNING: You can not restart a timer that has already been stopped.');
    }
    if (this.startTime !== -1) {
      throw new Error('ERROR_TIMER_RUNNING: You can not start a timer that is already running.');
    }
    let d = new Date();
    this.startTime = d.getTime();
  }
  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @method      
   * @description ???
   * @version     1.0.0
   * @public
   */
  //───────────────────────────────────────────────────────────────────────────┘
  public stopTimer():number {
    if (this.startTime === -1) {
      throw new Error('ERROR_TIMER_NEVER_STARTED: You can not stop a timer that was never started.');
    }
    if (this.endTime !== -1) {
      throw new Error('ERROR_TIMER_STOPPED: You can not stop a timer that is already stopped.');
    }
    let d = new Date();
    this.endTime = d.getTime();
    this.runTime = this.endTime - this.startTime;
    return this.runTime;
  }
  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @method      
   * @description ???
   * @version     1.0.0
   * @public
   */
  //───────────────────────────────────────────────────────────────────────────┘
  public getStartTime(returnString:boolean=false):number|string {
    if (returnString === true) {
      return this.printTime(this.startTime);
    }
    else {
      return this.startTime;
    }
  }
  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @method      
   * @description ???
   * @version     1.0.0
   * @public
   */
  //───────────────────────────────────────────────────────────────────────────┘
  public getEndTime(returnString:boolean=false):number|string {
    if (returnString === true) {
        return this.printTime(this.endTime);
    }
    else {
      return this.endTime;
    }
  }
  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @method      
   * @description ???
   * @version     1.0.0
   * @public
   */
  //───────────────────────────────────────────────────────────────────────────┘
  public getRunTime(returnString:boolean=false):number|string {
    if (this.startTime === -1) {
      throw new Error('ERROR_TIMER_NEVER_STARTED: You can get runtime from a timer that was never started.');
    }
    let returnRuntime = -1;
    if (this.runTime === -1) {
      let d = new Date();
      returnRuntime = d.getTime() - this.startTime;
    }
    else {
      returnRuntime = this.runTime;
    }
    if (returnString === true) {
      return `${returnRuntime/1000}`;
    }
    else {
      return returnRuntime;
    }
  }
  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @method      
   * @description ???
   * @version     1.0.0
   * @public
   */
  //───────────────────────────────────────────────────────────────────────────┘
  public getCurrentTime(returnString:boolean=false):number|string {
    let d = new Date();
    let currentTime = d.getTime();

    if (returnString === true) {
      return this.printTime(currentTime);
    }
    else {
      return currentTime;      
    }
  }
  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @method      printTime
   * @description ???
   * @version     1.0.0
   * @private
   */
  //───────────────────────────────────────────────────────────────────────────┘
  private printTime(timeCode:number):string {
    let d = new Date(timeCode);
    let hours         = d.getHours();
    let minutes       = d.getMinutes().toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false});
    let seconds       = d.getSeconds().toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping: false});
    let milliseconds  = d.getMilliseconds().toLocaleString('en-US', {minimumIntegerDigits: 3, useGrouping: false});

    return `${hours}:${minutes}:${seconds}:${milliseconds}`;
  }
}