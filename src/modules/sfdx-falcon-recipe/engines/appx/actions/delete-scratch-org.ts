//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @file          modules/sfdx-falcon-recipe/actions/delete-scratch-org.ts
 * @copyright     Vivek M. Chawla - 2018
 * @author        Vivek M. Chawla <@VivekMChawla>
 * @version       1.0.0
 * @license       MIT
 * @summary       Exposes the CLI Command force:org:delete
 * @description   Marks the specified scratch org for deletion.
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
// Import Local Modules
import {SfdxFalconDebug}        from  '../../../../sfdx-falcon-debug';            // Why?
import {executeSfdxCommand}     from  '../../../executors/sfdx';                  // Why?
import {SfdxShellResult}        from  '../../../executors/sfdx';                  // Why?

// Import Internal Engine Modules
import {AppxEngineAction}         from  '../../appx/actions';                     // Why?
import {AppxEngineActionContext}  from  '../../appx';                             // Why?
import {AppxEngineActionType}     from  '../../appx/';                            // Why?
import {SfdxFalconActionType}     from  '../../../engines';             // Why?
import { SfdxFalconExecutorResponse } from '../../../executors';

// Set the File Local Debug Namespace
const dbgNs     = 'action:delete-scratch-org:';
const clsDbgNs  = 'DeleteScratchOrgAction:';

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @class       DeleteScratchOrgAction
 * @extends     AppxEngineAction
 * @description Implements the action "delete-scratch-org".
 * @version     1.0.0
 * @public
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
export class DeleteScratchOrgAction extends AppxEngineAction {

  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @method      initializeAction
   * @returns     {void}
   * @description Sets member variables based on the specifics of this action.
   * @version     1.0.0
   * @protected
   */
  //───────────────────────────────────────────────────────────────────────────┘
  protected initializeAction():void {

    // Set values for all the base member vars to better define THIS AppxEngineAction.
    this.actionType       = SfdxFalconActionType.SFDX_CLI;
    this.actionName       = 'delete-scratch-org';
    this.command          = 'force:org:delete';
    this.description      = 'Delete Scratch Org';
    this.successDelay     = 2;
    this.errorDelay       = 2;
    this.progressDelay    = 1000;
  }

  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @method      validateActionOptions
   * @param       {any}   actionOptions Required. The options that should be
   *              validated because they are required by this specific action.
   * @returns     {void}  
   * @description Given an object containing Action Options, make sure that 
   *              everything expected by this Action in order to properly
   *              execute has been provided.
   * @version     1.0.0
   * @private
   */
  //───────────────────────────────────────────────────────────────────────────┘
  protected validateActionOptions(actionOptions:any):void {
    if (typeof actionOptions.scratchOrgAlias === 'undefined') throw new Error(`ERROR_MISSING_OPTION: 'scratchOrgAlias'`);
  }  

  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @method      executeAction
   * @param       {any}   actionOptions Optional. Any options that the command
   *              execution logic will require in order to properly do its job.
   * @returns     {Promise<void>}
   * @description Performs the custom logic that's wrapped by the execute method
   *              of the base class.
   * @version     1.0.0
   * @protected @async
   */
  //───────────────────────────────────────────────────────────────────────────┘
  protected async executeAction(actionContext:AppxEngineActionContext, actionOptions:any={}):Promise<void> {

    // Set the progress, error, and success messages for this action execution.
    this.progressMessage  = `Marking scratch org '${actionOptions.scratchOrgAlias}' for deletion`;
    this.errorMessage     = `Request to mark scratch org '${actionOptions.scratchOrgAlias}' for deletion failed`;
    this.successMessage   = `Scratch org '${actionOptions.scratchOrgAlias}' successfully marked for deletion`;

    // Create an SFDX Command Definition object to specify which command the CLI will run.
    this.sfdxCommandDef = {
      command:      this.command,
      progressMsg:  this.progressMessage,
      errorMsg:     this.errorMessage,
      successMsg:   this.successMessage,
      observer:     actionContext.listrExecOptions.observer,
      commandArgs:  [] as [string],
      commandFlags: {
        FLAG_TARGETUSERNAME:        actionContext.targetOrg.alias,
        FLAG_TARGETDEVHUBUSERNAME:  actionContext.devHubAlias,
        FLAG_NOPROMPT:              true,
        FLAG_JSON:                  true,
        FLAG_LOGLEVEL:              actionContext.logLevel
      }
    }
    SfdxFalconDebug.obj(`FALCON_EXT:${dbgNs}`, this.sfdxCommandDef, `${clsDbgNs}executeAction:sfdxCommandDef: `);

    // Execute the SFDX Command using an SFDX Executor. Base class handles success/error.
    await executeSfdxCommand(this.sfdxCommandDef)
      .then(execSuccessResponse => {
        this.actionResponse.execSuccess(execSuccessResponse);
      })
      .catch(execErrorResponse => {
        SfdxFalconDebug.obj(`FALCON_EXT:${dbgNs}`, execErrorResponse, `${clsDbgNs}executeAction:executeSfdxCommand:catch:execErrorResponse: `);
        // Suppress errors here because we might be deleting a scratch org that doesn't exist.
        let newExecResult = new SfdxFalconExecutorResponse('Suppressed Scratch Org Deletion Error');
        newExecResult.parse(execErrorResponse);
        this.actionResponse.execSuccess(newExecResult);
      });

    // The Action has now been run. Code in the base class will handle the return to the Engine->Recipe->User.
    return;
  }
}