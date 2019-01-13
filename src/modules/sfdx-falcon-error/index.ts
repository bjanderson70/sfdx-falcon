//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @file          modules/sfdx-falcon-error/index.ts
 * @copyright     Vivek M. Chawla - 2018
 * @author        Vivek M. Chawla <@VivekMChawla>
 * @summary       Provides specialized error structures for SFDX-Falcon modules.
 * @description   Provides specialized error structures for SFDX-Falcon modules.  Wraps SfdxError
 *                by adding additional SFDX-Falcon specific stack information as well as customized
 *                rendering capabilities to show formatted output via the console.
 * @version       1.0.0
 * @license       MIT
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
// Import External Modules
import {SfdxError}                      from  '@salesforce/core'; // Why?
import {isEmpty}                        from  'lodash';           // Why?

// Require Modules
const chalk = require('chalk'); // Makes it easier to generate colored CLI output via console.log.
const util  = require('util');  // Provides access to the "inspect" function to help output objects via console.log.

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @interface   CliErrorDetail
 * @description Data structure returned by Salesforce CLI calls made with --json flag set.
 * @public
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
export interface CliErrorDetail {
  status:     number;
  result:     any;
  name?:      string;
  message?:   string;
  actions?:   Array<string>;
  stack?:     string;
  warnings?:  any;
}

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @interface   SfdxFalconErrorRenderOptions
 * @description Options object used by the various Render functions to customize display output.
 * @public
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
export interface SfdxFalconErrorRenderOptions {
  headerColor:        string;
  labelColor:         string;
  errorLabelColor:    string;
  valueColor:         string;
  childInspectDepth:  number;
  detailInspectDepth: number;
  errorInspectDepth:  number;
}

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @interface   ShellErrorDetail
 * @description Represents information available after the failed execution of any shell command.
 * @public
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
export interface ShellErrorDetail {
  code:     number;
  command:  string;
  message:  string;
  signal:   string;
  stderr:   string;
  stdout:   string;
}

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @class       SfdxFalconError
 * @extends     SfdxError
 * @description Extends SfdxError to provide specialized error structures for SFDX-Falcon modules.
 * @public
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
export class SfdxFalconError extends SfdxError {

  // Private Members
  private _resultStack:     string;               // Keeps a record of each SfdxFalconResult that impacted this error.
  private _detail:          any;                  // Additional information that's relevant to this error. Should be in the form of an object.
  private _userInfo:        SfdxFalconErrorInfo;  // Info/message shown on Error when running in USER MODE.
  private _debugInfo:       SfdxFalconErrorInfo;  // Info/message shown on Error when running in DEBUG MODE.
  private _devInfo:         SfdxFalconErrorInfo;  // Info/message shown on Error when running in DEVELOPER MODE.
  
  // Readonly Members
  readonly  source:         string;               // Full debug path to where this error came from (eg. "UTILITY:sfdx:executeSfdxCommand").

  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @constructs  SfdxFalconError
   * @param       {string}  message Required. Message for the error.
   * @param       {string}  [name]  Optional. Defaults to SfdxFalconError.
   * @param       {string}  [source]  Optional. Defaults to UNKNOWN.
   * @param       {Error}   [cause] Optional. Error object causing this error.
   * @param       {string[]}  [actions] Optional. Array of action messages.
   * @param       {number}  [exitCode]  Optional. Code passed to the CLI.
   * @description Extension of the SfdxError object. Adds special SFDX-Falcon
   *              specific stack and detail properties.
   * @version     1.0.0
   * @public
   */
  //───────────────────────────────────────────────────────────────────────────┘
  public constructor(message:string, name?:string, source:string='Unhandled Exception', cause?:Error, actions?:string[], exitCode?:number) {

    // Set a default for name
    let thisName = name || 'SfdxFalconError';

    // Call the parent constructor
    super(message, thisName, actions || [], exitCode || 1, cause);

    // Initialize member vars
    this.data         = {};
    this.source       = source;
    this._detail      = {};
    this._userInfo    = new SfdxFalconErrorInfo();
    this._debugInfo   = new SfdxFalconErrorInfo();
    this._devInfo     = new SfdxFalconErrorInfo();

    // Copy the Result Stack from any Child (cause) Error.
    if (cause) {
      let causeError = cause as SfdxFalconError;
      this._resultStack = causeError.resultStack || ``;
    }
    else {
      this._resultStack = ``;
    }
  }

  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @method      addToStack
   * @param       {string}  stackItem Required. ???
   * @description ???
   * @public
   */
  //───────────────────────────────────────────────────────────────────────────┘
  public addToStack(stackItem:string):void {
    let indent = `    `;
    if (this._resultStack) {
      this._resultStack = `${indent}${stackItem}\n${this._resultStack}`;
    }
    else {
      this._resultStack = `${indent}${stackItem}`;
    }
  }

  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @property    detail
   * @description Gets the current Detail object.
   * @public
   */
  //───────────────────────────────────────────────────────────────────────────┘
  public get detail():any {
    return this._detail;
  }

  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @property    falconDebugInfo
   * @description Gets the current Debug Information object.
   * @public
   */
  //───────────────────────────────────────────────────────────────────────────┘
  public get debugInfo():SfdxFalconErrorInfo {
    return this._debugInfo;
  }

  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @property    falconDevInfo
   * @description Gets the current Developer Information object.
   * @public
   */
  //───────────────────────────────────────────────────────────────────────────┘
  public get devInfo():SfdxFalconErrorInfo {
    return this._devInfo;
  }

  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @property    resultStack
   * @description Gets the current Falcon Result Stack.
   * @public
   */
  //───────────────────────────────────────────────────────────────────────────┘
  public get resultStack():any {
    return this._resultStack;
  }

  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @property    rootCause
   * @description Gets the "root" Error objec in the cause chain of this Error.
   * @public
   */
  //───────────────────────────────────────────────────────────────────────────┘
  public get rootCause():SfdxFalconError {
    let rootCause = this as SfdxFalconError;
    while(rootCause.cause && (isEmpty(rootCause.cause) === false)) {
      rootCause = rootCause.cause as SfdxFalconError;
    }
    // No child (cause) Errors left, so we've found the Root Cause.
    return rootCause;
  }

  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @property    userInfo
   * @description Gets the current User Information object.
   * @public
   */
  //───────────────────────────────────────────────────────────────────────────┘
  public get userInfo():SfdxFalconErrorInfo {
    return this._userInfo;
  }

  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @method      setDetail
   * @param       {unknown} detail  Required. ???
   * @description Additional detail related to this object, provided in addition
   *              to what might be attached to the SfdxError.data property.
   * @version     1.0.0
   * @public
   */
  //───────────────────────────────────────────────────────────────────────────┘
  public setDetail(detail:unknown):this {
    this._detail = detail;
    return this;
  }

  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @method      wrap
   * @param       {Error} error  Required. The Error object to wrap.
   * @param       {string}  source  Required. 
   * @description Given an instance of Error, wraps it as SFDX-Falcon Error and
   *              returns the result.
   * @version     1.0.0
   * @public @static
   */
  //───────────────────────────────────────────────────────────────────────────┘
  public static wrap(error:Error, source?:string):SfdxFalconError {

    // If this is already an SfdxFalconError, just return it.
    if (error instanceof SfdxFalconError) {
      return error;
    }

    // Create a new instance of SFDX-Falcon Error.
    let sfdxFalconError:SfdxFalconError;
    if (error instanceof Error) {
      sfdxFalconError = new SfdxFalconError(error.message, error.name, source);
      if (sfdxFalconError.stack) {
        sfdxFalconError.stack = sfdxFalconError.stack.replace(`${error.name}: ${error.message}`, `Outer stack:`);
        sfdxFalconError.stack = `${error.stack}\n${sfdxFalconError.stack}`;
      }
    }
    else {
      sfdxFalconError       = new SfdxFalconError(`Additional error detail saved to the SfdxFalconError.data Object.`, `UnknownError`);
      sfdxFalconError.data  = {unknownObj: error}
    }

    // Return the new Falcon Error
    return sfdxFalconError;
  }

  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @method      renderBaseDetail
   * @param       {Error}   errorToRender  Required. Any object that is a child
   *              of Error.
   * @param       {SfdxFalconErrorRenderOptions}  options  Required. Rendering
   *              options that determine colors and inspection depth.
   * @returns     {string}
   * @description Generates the baseline set of completely formatted output 
   *              that is relevant to ALL Errors.
   * @version     1.0.0
   * @private @static
   */
  //───────────────────────────────────────────────────────────────────────────┘
  private static renderBaseDetail(errorToRender:SfdxFalconError, options:SfdxFalconErrorRenderOptions):string {
    // Lay down the core information.
    let renderOutput 
      = chalk`\n{${options.errorLabelColor} Error Name:}    {${options.valueColor} ${errorToRender.name}}`
      + chalk`\n{${options.errorLabelColor} Error Message:} {${options.valueColor} ${errorToRender.message}}`;
    // Add SfdxError Actions.
    if (errorToRender.actions && (isEmpty(errorToRender.actions) === false)) {
      renderOutput += chalk`\n{${options.errorLabelColor} SfdxError Actions (Depth ${options.childInspectDepth}):}\n{reset ${util.inspect(errorToRender.actions, {depth:options.childInspectDepth, colors:true})}}`;
    }
    // Add SfdxFalconError Source and Error Stack.
    renderOutput +=
        chalk`\n{${options.errorLabelColor} Error Source:}  {${options.valueColor} ${errorToRender.source}}`
      + chalk`\n{${options.errorLabelColor} Error Stack:} \n{${options.valueColor} ${errorToRender.stack}}`;
    // Add SfdxFalconError Result Stack.
    if (errorToRender.resultStack && (isEmpty(errorToRender.resultStack) === false)) {
      renderOutput += chalk`\n{${options.errorLabelColor} Result Stack:}\n${errorToRender.resultStack}`;
    }
    // Add SfdxFalconError Detail.
    if (errorToRender.detail && (isEmpty(errorToRender.detail) === false)) {
      renderOutput += chalk`\n{${options.errorLabelColor} Error Detail:}\n{reset ${util.inspect(errorToRender.detail, {depth:10, colors:true})}}`;
    }
    // Add SfdxError Data.
    if (errorToRender.data && (isEmpty(errorToRender.data) === false)) {
      renderOutput += chalk`\n{${options.errorLabelColor} Error Data (Depth ${options.errorInspectDepth}):}\n{reset ${util.inspect(errorToRender.data, {depth:options.errorInspectDepth, colors:true})}}`;
    }

    return renderOutput;
  }
  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @method      renderError
   * @param       {Error}   errorToRender  Required. Any object that is a child
   *              of Error.
   * @param       {number}  [childInspectDepth] Optional. Sets how deep the
   *              object inpsection goes when rendering "child" objects.
   * @param       {number}  [detailInspectDepth]  Optional. Sets how deep the
   *              object inpsection goes when rendering "detail" objects.
   * @param       {number}  [errorInspectDepth] Optional. Sets how deep the
   *              object inpsection goes when rendering "error" objects.
   * @returns     {string}
   * @description Generates a string of completely formatted output that's ready 
   *              for display to the user via console.log() or debug(). Relies
   *              on the caller to decide how to actually display to the user.
   * @version     1.0.0
   * @private @static
   */
  //───────────────────────────────────────────────────────────────────────────┘
  public static renderError(errorToRender:Error, childInspectDepth:number=2, detailInspectDepth:number=4, errorInspectDepth:number=1):string {

    // Setup the options that will be used
    let renderOptions:SfdxFalconErrorRenderOptions = {
      headerColor:        `yellow`,
      labelColor:         `blue`,
      errorLabelColor:    `red`,
      valueColor:         `reset`,
      childInspectDepth:  childInspectDepth   || 2,
      detailInspectDepth: detailInspectDepth  || 4,
      errorInspectDepth:  errorInspectDepth   || 1
    };

    // If what we got is NOT any type of Error, render as UNKNOWN
    if ((errorToRender instanceof Error) !== true) {
      return SfdxFalconError.renderUnknownDetail(errorToRender, renderOptions);
    }

    // Render the BASE error info.
    let renderOutput = SfdxFalconError.renderBaseDetail(errorToRender as SfdxFalconError, renderOptions);

    // Render details for SfdxCliError objects.
    if (errorToRender instanceof SfdxCliError) {
      renderOutput += SfdxFalconError.renderSfdxCliErrorDetail(errorToRender, renderOptions);
    }
    // Render details for ShellError objects.
    if (errorToRender instanceof ShellError) {
      renderOutput += SfdxFalconError.renderShellErrorDetail(errorToRender, renderOptions);
    }
    
    // All done. Return the rendered output to caller.
    return renderOutput;
  }

  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @method      renderSfdxCliErrorDetail
   * @param       {SfdxCliError}  errorToRender  Required. Any object that is
   *              a child of Error.
   * @param       {SfdxFalconErrorRenderOptions}  options  Required. Rendering
   *              options that determine colors and inspection depth.
   * @returns     {string}
   * @description Generates an extended set of completely formatted output 
   *              that is relevant only to SfdxCliError objects.
   * @version     1.0.0
   * @private @static
   */
  //───────────────────────────────────────────────────────────────────────────┘
  private static renderSfdxCliErrorDetail(errorToRender:SfdxCliError, options:SfdxFalconErrorRenderOptions):string {
    let renderOutput  = '';
    if (isEmpty(errorToRender.cliError.name) === false) {
      renderOutput += chalk`\n{${options.errorLabelColor} CLI Error Name:}    ${errorToRender.cliError.name}`;
    }
    if (isEmpty(errorToRender.cliError.message) === false) {
      renderOutput += chalk`\n{${options.errorLabelColor} CLI Error Message:} ${errorToRender.cliError.message}`;
    }
    if (isEmpty(errorToRender.cliError.status) === false) {
      renderOutput += chalk`\n{${options.errorLabelColor} CLI Error Status:}  ${errorToRender.cliError.status}`;
    }
    // Render any "actions" as straight string output so newlines are respected in the output.
    if (Array.isArray(errorToRender.cliError.actions)) {
      renderOutput += chalk`\n{${options.errorLabelColor} CLI Error Actions:}`
      for (let i=0; i<errorToRender.cliError.actions.length; i++) {
        renderOutput += chalk`\n{green ${errorToRender.cliError.actions[i]}}`;
      }
    }
    if (isEmpty(errorToRender.cliError.warnings) === false) {
      renderOutput += chalk`\n{${options.errorLabelColor} CLI Error Warnings:}\n${util.inspect(errorToRender.cliError.warnings, {depth:options.childInspectDepth, colors:true})}`;
    }
    // Only display the CLI Error Stack if Child Inspect Depth is set to 5 or higher.
    if (isEmpty(errorToRender.cliError.stack) === false && options.childInspectDepth >= 5) {
      renderOutput += chalk`\n{${options.errorLabelColor} CLI Error Stack:}   \n${errorToRender.cliError.stack}`;
    }
    // Only display the CLI Error's "raw result" if the Child Inspect Depth is set to 2 or higher.
    if (isEmpty(errorToRender.cliError.result) === false && options.childInspectDepth >= 2) {
      let cliRawResultDepth = 5;
      renderOutput += chalk`\n{${options.errorLabelColor} CLI Error Raw Result: (Depth ${cliRawResultDepth})}\n${util.inspect(errorToRender.cliError.result, {depth:cliRawResultDepth, colors:true})}`;
    }
    return renderOutput;
  }

  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @method      renderShellErrorDetail
   * @param       {ShellError}  errorToRender  Required. Any object that is
   *              a child of Error.
   * @param       {SfdxFalconErrorRenderOptions}  options  Required. Rendering
   *              options that determine colors and inspection depth.
   * @returns     {string}
   * @description Generates an extended set of completely formatted output 
   *              that is relevant only to ShellError objects.
   * @version     1.0.0
   * @private @static
   */
  //───────────────────────────────────────────────────────────────────────────┘
  private static renderShellErrorDetail(errorToRender:ShellError, options:SfdxFalconErrorRenderOptions):string {
    let renderOutput = '';
    if (isEmpty(errorToRender.shellError.command) === false) {
      renderOutput += chalk`\n{${options.errorLabelColor} ShellError Command:} ${errorToRender.shellError.command}`;
    }
    if (errorToRender.shellError.code) {
      renderOutput += chalk`\n{${options.errorLabelColor} ShellError Code:}    ${errorToRender.shellError.code}`;
    }
    if (isEmpty(errorToRender.shellError.signal) === false) {
      renderOutput += chalk`\n{${options.errorLabelColor} ShellError Signal:}  ${errorToRender.shellError.signal}`;
    }
    if (isEmpty(errorToRender.shellError.message) === false) {
      renderOutput += chalk`\n{${options.errorLabelColor} ShellError Message:} ${errorToRender.shellError.message}`;
    }
    if (isEmpty(errorToRender.shellError.stderr) === false) {
      renderOutput += chalk`\n{${options.errorLabelColor} ShellError StdErr:}\n${errorToRender.shellError.stderr}`;
    }
    if (isEmpty(errorToRender.shellError.stdout) === false) {
      renderOutput += chalk`\n{${options.errorLabelColor} ShellError StdOut:}\n${errorToRender.shellError.stdout}`;
    }
    return renderOutput;
  }

  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @method      renderUnknown
   * @param       {Error}   errorToDisplay  Required. Any object that is a child
   *              of Error.
   * @param       {number}  [inspectDepth]  Optional. Sets how deep the object
   *              inpsection goes when rendering object properties.
   * @returns     {void}
   * @description Given an object derived from Error and optionally a number
   *              indicating the inspection depth, renders to console.log a
   *              customized display of the information contained in the Error.
   * @version     1.0.0
   * @public @static
   */
  //───────────────────────────────────────────────────────────────────────────┘
  private static renderUnknownDetail(unknownObject:any, options:SfdxFalconErrorRenderOptions):string {
    let renderOutput  = 
        chalk`\n{${options.errorLabelColor} Error Name:}    {${options.valueColor} UNKNOWN}`
      + chalk`\n{${options.errorLabelColor} Error Message:} {${options.valueColor} The object provided is not of type 'Error'}`
      + chalk`\n{${options.errorLabelColor} Error Stack:}   {${options.valueColor} Not Available}`
      + chalk`\n{${options.errorLabelColor} Raw Object: (Depth ${options.childInspectDepth})}\n${util.inspect(unknownObject, {depth:options.childInspectDepth, colors:true})}`
    return renderOutput;    
  }
}

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @class       SfdxFalconErrorInfo
 * @description Stores detailed error information & messages for display to multiple user personas.
 * @version     1.0.0
 * @public
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
export class SfdxFalconErrorInfo {

  // Public Members
  public title:   string;
  public message: string;
  public actions: Array<string>;

  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @constructs  SfdxFalconErrorInfo
   * @description Stores detailed error information & messages for display to
   *              multiple user personas.
   * @version     1.0.0
   * @public
   */
  //───────────────────────────────────────────────────────────────────────────┘
  public constructor() {
    this.title    = 'UNKNOWN ERROR';
    this.message  = 'An unknown error has occured';
    this.actions  = [];
  }

  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @method      addAction
   * @param       {string}  actionItem Required. Action that the user can take
   *              to recover from whatever caused this error.
   * @description Adds a new string to the "actions" array.
   * @version     1.0.0
   * @public
   */
  //───────────────────────────────────────────────────────────────────────────┘
  public addAction(actionItem:string=''):void {
    this.actions.push(actionItem);
  }
}

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @class       SfdxCliError
 * @extends     SfdxFalconError
 * @description Extends SfdxFalconError to provide specialized error handling of error results
 *              returned from CLI commands run via shell exec.
 * @version     1.0.0
 * @public
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
export class SfdxCliError extends SfdxFalconError {

  // Member vars
  public cliError: CliErrorDetail;

  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @constructs  SfdxCliError
   * @param       {string}  stdErrBuffer  Required. Results from an stderr
   *              stream resulting from a call to a Salesforce CLI command.
   * @param       {string}  [message] Optional. Sets the SfdxFalconError message.
   * @param       {string}  [source]  Optional. Sets the SfdxFalconError source.
   * @description Given a string (typically the contents of a stderr buffer),
   *              returns an SfdxFalconError object with a specialized 
   *              "cliError" object property.
   * @version     1.0.0
   * @public
   */
  //───────────────────────────────────────────────────────────────────────────┘
  public constructor(stdErrBuffer:string, message:string='Unknown CLI Error', source:string='') {

    // Initialize the cliError member var and helper vars.
    let cliError  = <CliErrorDetail>{};
    let actions   = new Array<string>();

    // Try to parse stdErrBuffer into an object, then try to copy over the standard SFDX CLI error details
    try {
      let parsedError = JSON.parse(stdErrBuffer);
      cliError.name      = parsedError.name      || `UnknownCliError`;
      cliError.message   = parsedError.message   || `Unknown CLI Error (see 'cliError.result.rawResult' for original CLI response)`;
      cliError.status    = (isNaN(parsedError.status)) ?  1 : parsedError.status;
      // Figuring out "actions" is a little complicated because it may be "actions" or "action"
      // (or not even there) in the JSON retured from the CLI. Try to handle all possibilities.
      if (Array.isArray(parsedError.actions)) {
        actions = actions.concat(parsedError.actions);
      }
      if (parsedError.action) {
        actions.push(parsedError.action);
      }
      cliError.actions   = actions;
      cliError.warnings  = parsedError.warnings  || [];
      cliError.stack     = parsedError.stack     || '';
      cliError.result    = parsedError.result    || {rawResult: parsedError};

    }
    catch (parsingError) {
      cliError.name      = `UnparseableCliError`;
      cliError.message   = `Unparseable CLI Error (see 'cliError.result.rawResult' for raw error)`;
      cliError.status    = 999;
      cliError.actions   = [];
      cliError.warnings  = [];
      cliError.stack     = `Unparseable CLI Error (see 'cliError.result.rawResult' for raw error)`;
      cliError.result    = {rawResult: stdErrBuffer};
    }

    // Call the parent constructor to get our baseline SfdxFalconError object.
    super(`${message}. ${cliError.message}`, 'SfdxCliError', source);

    // Attach the cliError variable to this SfdxCliError object.
    this.cliError = cliError;

    // Pull any "actions" out of the CLI Error and attach them to the SfdxError.actions property.
    if (isEmpty(cliError.actions) === false) {
      this.actions = cliError.actions;
    }

    return;
  }
}

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @class       ShellError
 * @extends     SfdxFalconError
 * @description Extends SfdxFalconError to provide specialized error handling of error results
 *              returned by failed shell commands which may or may not provide a JSON structure as
 *              part of their error message.
 * @version     1.0.0
 * @public
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
export class ShellError extends SfdxFalconError {

  // Member vars
  public shellError: ShellErrorDetail;

  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @constructs  ShellError
   * @param       {string}  command Required. The shell command whose execution
   *              resulted in this ShellError.
   * @param       {number}  code  Required. Exit code provided by the Shell.
   *              If NULL, then signal must have a value.
   * @param       {string}  signal  Required. Signal which caused the Shell to 
   *              terminate. If NULL, then code must have a value.
   * @param       {string}  stdErrBuffer  Required. Contents of stderr when the
   *              shell was terminated.
   * @param       {string}  [stdOutBuffer]  Optional. Contents of stdout when the
   *              shell was terminated.
   * @param       {string}  [source]  Optional. Sets the SfdxFalconError source.
   * @param       {string}  [message] Optional. Message that the caller would
   *              like the user to see. If not provided, will default to the
   *              contents of stderr.
   * @description Returns an SfdxFalconError object with a specialized set of 
   *              information in the "shellError" object property.
   * @version     1.0.0
   * @public
   */
  //───────────────────────────────────────────────────────────────────────────┘
  public constructor(command:string, code:number, signal:string, stdErrBuffer:string, stdOutBuffer:string=null, source:string='', message:string='') {

    // Set the message to be either what the caller provided, the first line of stdErrBuffer, or a default message.
    if (!message) {
      if (typeof stdErrBuffer === 'string' && stdErrBuffer) {
        message = stdErrBuffer.substr(0, stdErrBuffer.indexOf('\n'));
      }
      else if (typeof stdOutBuffer === 'string' && stdOutBuffer) {
        message = stdOutBuffer.substr(0, stdOutBuffer.indexOf('\n'));
      }
      else {
        // Set a default "Unknown Shell Error" message.
        message = `Unknown Shell Error (code=${code}, signal=${signal})`;
      }
    }

    // Call the parent constructor to get our baseline Error.
    super(`${message}`, 'ShellError', source);

    // Initialize the shellError member var.
    this.shellError = <ShellErrorDetail>{};

    // Copy over all of the Shell Error details
    this.shellError.command = command;
    this.shellError.code    = code;
    this.shellError.signal  = signal;
    this.shellError.stdout  = stdOutBuffer;
    this.shellError.stderr  = stdErrBuffer;
    this.shellError.message = message;

    // Add a detail line to the Falcon Stack.
    //this.addToStack(`at ${this.shellError.code}: ${this.shellError.message}`);
    return;
  }
}