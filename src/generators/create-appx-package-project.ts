//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @file          generators/create-appx-package-project.ts
 * @copyright     Vivek M. Chawla - 2018
 * @author        Vivek M. Chawla <@VivekMChawla>
 * @summary       Yeoman Generator for scaffolding an AppExchange Package Kit (APK) project.
 * @description   Salesforce CLI Plugin command (falcon:apk:create) that allows a Salesforce DX
 *                developer to create an empty project based on the  SFDX-Falcon template.  Before
 *                the project is created, the user is guided through an interview where they define
 *                key project settings which are then used to customize the project scaffolding
 *                that gets created on their local machine.
 * @version       1.0.0
 * @license       MIT
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
// Import External Modules
import * as path        from  'path';             // Helps resolve local paths at runtime.
import {Questions}      from  'yeoman-generator'; // Interface. Represents an array of Inquirer "question" objects.

// Import Internal Modules
import {SfdxFalconDebug}                from  '../modules/sfdx-falcon-debug';                       // Class. Provides custom "debugging" services (ie. debug-style info to console.log()).
//import * as gitHelper                   from  '../modules/sfdx-falcon-util/git';                    // Library of Git Helper functions specific to SFDX-Falcon.
import * as inquirerQuestions           from  '../modules/sfdx-falcon-util/inquirer-questions';            // Library of Listr Helper functions specific to SFDX-Falcon.
import * as listrTasks                  from  '../modules/sfdx-falcon-util/listr-tasks';            // Library of Listr Helper functions specific to SFDX-Falcon.
import {SfdxFalconKeyValueTableDataRow} from  '../modules/sfdx-falcon-util/ux';                     // Interface. Represents a row of data in an SFDX-Falcon data table.
import {SfdxFalconTableData}            from  '../modules/sfdx-falcon-util/ux';                     // Interface. Represents and array of SfdxFalconKeyValueTableDataRow objects.
import {ConfirmationAnswers}            from  '../modules/sfdx-falcon-util/yeoman';                 // Interface. Represents what an answers hash should look like during Yeoman/Inquirer interactions where the user is being asked to proceed/retry/abort something.
import {YeomanChoice}                   from  '../modules/sfdx-falcon-util/yeoman';                 // Interface. Represents a single "choice" from Yeoman's perspective.
//import {filterLocalPath}                from  '../modules/sfdx-falcon-util/yeoman';                 // Function. Yeoman filter which takes a local Path value and resolves it using path.resolve().
import * as yoValidate                  from  '../modules/sfdx-falcon-validators/yeoman-validator'; // Library of validation functions for Yeoman interview inputs, specific to SFDX-Falcon.
import {GeneratorOptions}               from  '../modules/sfdx-falcon-yeoman-command';              // Interface. Represents options used by SFDX-Falcon Yeoman generators.
import {SfdxFalconYeomanGenerator}      from  '../modules/sfdx-falcon-yeoman-generator';            // Class. Abstract base class class for building Yeoman Generators for SFDX-Falcon commands.

// Requires
const chalk = require('chalk');   // Utility for creating colorful console output.

// Set the File Local Debug Namespace
const dbgNs = 'GENERATOR:create-appx-package:';


//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @interface   InterviewAnswers
 * @description Represents answers to the questions asked in the Yeoman interview.
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
interface InterviewAnswers {
  producerName:             string;
  producerAlias:            string;
  projectName:              string;
  projectAlias:             string;
  projectType:              'appx:managed1gp' | 'appx:managed2gp' | 'appx:unmanaged';
  defaultRecipe:            string;

  gitRemoteUri:             string;
  gitHubUrl:                string;
  targetDirectory:          string;

  projectVersion:           string;
  schemaVersion:            string;
  pluginVersion:            string;
  sfdcApiVersion:           string;

  hasGitRemoteRepository:   boolean;
  ackGitRemoteUnreachable:  boolean;
  isGitRemoteReachable:     boolean;

  devHubAlias:              string;
  envHubAlias:              string;
  pkgOrgAlias:              string;

  isCreatingManagedPackage: boolean;
  isInitializingGit:        boolean;
  namespacePrefix:          string;
  packageName:              string;
  packageDirectory:         string;
  metadataPackageId:        string;
  packageVersionIdBeta:     string;
  packageVersionIdRelease:  string;
}

//─────────────────────────────────────────────────────────────────────────────────────────────────┐
/**
 * @class       CreateAppxPackageProject
 * @extends     SfdxFalconYeomanGenerator
 * @summary     Yeoman generator class. Creates & configures a local AppX Package Kit (APK) project.
 * @description Uses Yeoman to create a local SFDX project using the SFDX-Falcon Template.  This
 *              class defines the entire Yeoman interview process and the file template copy
 *              operations needed to create the project scaffolding on the user's local machine.
 * @public
 */
//─────────────────────────────────────────────────────────────────────────────────────────────────┘
export default class CreateAppxPackageProject extends SfdxFalconYeomanGenerator<InterviewAnswers> {

  // Define class members specific to this Generator.
  protected devHubAliasChoices:     YeomanChoice[];   // Array of DevOrg aliases/usernames in the form of Yeoman choices.
  protected envHubAliasChoices:     YeomanChoice[];   // Array of EnvHub aliases/usernames in the form of Yeoman choices.
  protected pkgOrgAliasChoices:     YeomanChoice[];   // Array of Packaging Org aliases/usernames in the form of Yeoman choices.
  protected sourceDirectory:        string;           // Location (relative to project files) of the project scaffolding template used by this command.

  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @constructs  CreateAppxPackageProject
   * @param       {string|string[]} args Required. Not used (as far as I know).
   * @param       {GeneratorOptions}  opts Required. Sets generator options.
   * @description Constructs a CreateAppxPackageProject object.
   * @public
   */
  //───────────────────────────────────────────────────────────────────────────┘
  constructor(args:string|string[], opts:GeneratorOptions) {

    // Call the parent constructor to initialize the Yeoman Generator.
    super(args, opts);

    // Initialize source directory where template files are kept.
    this.sourceDirectory  = require.resolve('sfdx-falcon-appx-package-kit');

    // Initialize DevHub/EnvHub "Alias Choices".
    this.devHubAliasChoices = new Array<YeomanChoice>();
    this.envHubAliasChoices = new Array<YeomanChoice>();
    this.pkgOrgAliasChoices = new Array<YeomanChoice>();

    // Initialize DEFAULT Interview Answers.
    this.defaultAnswers.targetDirectory             = path.resolve(opts.outputDir as string);
    this.defaultAnswers.producerName                = 'Universal Containers';
    this.defaultAnswers.producerAlias               = 'univ-ctrs';
    this.defaultAnswers.projectName                 = 'Universal Containers Packaged App';
    this.defaultAnswers.projectAlias                = 'uc-pkgd-app';
    this.defaultAnswers.projectType                 = 'appx:managed1gp';
    this.defaultAnswers.defaultRecipe               = 'build-scratch-org.json';

    this.defaultAnswers.gitRemoteUri                = 'https://github.com/my-org/my-repo.git';
    this.defaultAnswers.gitHubUrl                   = 'https://github.com/my-org/my-repo';

    this.defaultAnswers.projectVersion              = '0.0.1';
    this.defaultAnswers.schemaVersion               = '0.0.1';
    this.defaultAnswers.sfdcApiVersion              = '45.0';
    this.defaultAnswers.pluginVersion               = this.pluginVersion;

    this.defaultAnswers.hasGitRemoteRepository      = true;
    this.defaultAnswers.ackGitRemoteUnreachable     = false;
    this.defaultAnswers.isGitRemoteReachable        = false;

    this.defaultAnswers.devHubAlias                 = 'NOT_SPECIFIED';
    this.defaultAnswers.envHubAlias                 = 'NOT_SPECIFIED';
    this.defaultAnswers.pkgOrgAlias                 = 'NOT_SPECIFIED';

    this.defaultAnswers.isCreatingManagedPackage    = true;
    this.defaultAnswers.isInitializingGit           = true;
    this.defaultAnswers.namespacePrefix             = 'my_ns_prefix';
    this.defaultAnswers.packageName                 = 'My Managed Package';
    this.defaultAnswers.packageDirectory            = 'force-app';
    this.defaultAnswers.metadataPackageId           = '033000000000000';
    this.defaultAnswers.packageVersionIdBeta        = '04t000000000000';
    this.defaultAnswers.packageVersionIdRelease     = '04t000000000000';

    // Initialize the Meta Answers
    this.metaAnswers.devHubAlias                    = `<%-finalAnswers.devHubAlias%>`;
    this.metaAnswers.envHubAlias                    = `<%-finalAnswers.envHubAlias%>`;
    this.metaAnswers.pkgOrgAlias                    = `<%-finalAnswers.pkgOrgAlias%>`;

    // Initialize the "Confirmation Question".
    this.confirmationQuestion = 'Create a new AppExchange Package Kit (APK) project using these settings?';

  }

  //─────────────────────────────────────────────────────────────────────────────┐
  /**
   * @method      _executeInitializationTasks
   * @returns     {Promise<void>}  No return value, but may throw Errros.
   * @description Runs a series of initialization tasks using the Listr UX/Task
   *              Runner module.  Listr provides a framework for executing tasks
   *              while also providing an attractive, realtime display of task
   *              status (running, successful, failed, etc.).
   * @protected @async
   */
  //─────────────────────────────────────────────────────────────────────────────┘
  protected async _executeInitializationTasks():Promise<void> {

    // Define the first group of tasks (Git Initialization).
    const gitInitTasks = listrTasks.gitInitTasks.call(this);

    // Define the second group of tasks (SFDX Initialization).
    const sfdxInitTasks = listrTasks.sfdxInitTasks.call(this);

    // Run the Git Init Tasks. Make sure to use await since Listr will run asynchronously.
    const gitInitResults = await gitInitTasks.run();
    SfdxFalconDebug.obj(`${dbgNs}_executeInitializationTasks:`, gitInitResults, `gitInitResults: `);

    // Followed by the SFDX Init Tasks.
    const sfdxInitResults = await sfdxInitTasks.run();
    SfdxFalconDebug.obj(`${dbgNs}_executeInitializationTasks:`, sfdxInitResults, `sfdxInitResults: `);

  }

  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @method      _getInterviewQuestions
   * @returns     {Questions} Returns an array of Inquirer Questions.
   * @description Initialize interview questions.  May be called more than once
   *              to allow default values to be set based on the previously
   *              specified answers.
   * @protected
   */
  //───────────────────────────────────────────────────────────────────────────┘
  protected _getInterviewQuestions():Questions {

    //─────────────────────────────────────────────────────────────────────────┐
    // Define the Interview Prompts.
    // 1.  What is the target directory for this project?                        (string)
    // 2.  Which DevHub Alias do you want to use for this project?               (options)
    // 3.  Which Environment Hub Alias do you want to use for this project?      (options)
    // --  Possible Exit  --
    // 4.  Have you created a Remote Repository on GitHub for your project?      (y/n)
    // --  Possible Exit  --
    // 5.  What is the URI of your GitHub Remote (https only)?                   (string)
    // --  Possible Exit  --
    // 6.  What is your Company Name (or your name if individual developer)?     (string)
    // 7.  Provide an alias for the above (1-15 chars: a-Z, 0-9, -, and _ only)  (string)
    // 8.  What is the name of your project?                                     (string)
    // 9.  Provide an alias for the above (1-15 chars: a-Z, 0-9, -, and _ only)  (string)
    // 10. What is the namespace prefix for your managed package?                (string)
    // 11. What is the Metadata Package ID for your managed package?             (string)
    // 12. What is the Package Version ID for your most recent release? (string)
    // --  End of Interview  --
    //─────────────────────────────────────────────────────────────────────────┘

    // Create an array to hold each "group" of interview questions.
    const interviewQuestionGroups = new Array<Questions>();

    // Build Inquirer Questions for the three primary groups used by "Create" Generators.
    interviewQuestionGroups.push(inquirerQuestions.buildGroupZeroQuestionsForCreateGenerators.call(this));
    interviewQuestionGroups.push(inquirerQuestions.buildGroupOneQuestionsForCreateGenerators.call(this));
    interviewQuestionGroups.push(inquirerQuestions.buildGroupTwoQuestionsForCreateGenerators.call(this));

    //─────────────────────────────────────────────────────────────────────────┐
    // Define Group Three
    // 10.  What is the namespace prefix for your managed package?                (string)
    // 11.  What is the Metadata Package ID for your managed package?             (string)
    // 12.  What is the Package Version ID for your most recent release?          (string)
    //─────────────────────────────────────────────────────────────────────────┘
    interviewQuestionGroups.push([
      {
        type:     'confirm',
        name:     'isCreatingManagedPackage',
        message:  'Are you building a managed package?',
        default:  ( typeof this.userAnswers.isCreatingManagedPackage !== 'undefined' )
                  ? this.userAnswers.isCreatingManagedPackage       // Current Value
                  : this.defaultAnswers.isCreatingManagedPackage,   // Default Value
        when:     true
      },
      {
        type:     'input',
        name:     'namespacePrefix',
        message:  'What is the namespace prefix for your managed package?',
        default:  ( typeof this.userAnswers.namespacePrefix !== 'undefined' )
                  ? this.userAnswers.namespacePrefix                // Current Value
                  : this.defaultAnswers.namespacePrefix,            // Default Value
        validate: yoValidate.namespacePrefix,
        when:     answerHash => answerHash.isCreatingManagedPackage
      },
      {
        type:     'input',
        name:     'packageName',
        message:  'What is the name of your package?',
        default:  ( typeof this.userAnswers.packageName !== 'undefined' )
                  ? this.userAnswers.packageName                    // Current Value
                  : this.defaultAnswers.packageName,                // Default Value
        when:     answerHash => answerHash.isCreatingManagedPackage
      },
      {
        type:     'input',
        name:     'metadataPackageId',
        message:  'What is the Metadata Package ID (033) of your package?',
        default:  ( typeof this.userAnswers.metadataPackageId !== 'undefined' )
                  ? this.userAnswers.metadataPackageId              // Current Value
                  : this.defaultAnswers.metadataPackageId,          // Default Value
        validate: yoValidate.metadataPackageId,
        when:     answerHash => answerHash.isCreatingManagedPackage
      },
      {
        type:     'input',
        name:     'packageVersionId',
        message:  'What is the Package Version ID (04t) of your most recent release?',
        default:  ( typeof this.userAnswers.packageVersionIdRelease !== 'undefined' )
                  ? this.userAnswers.packageVersionIdRelease        // Current Value
                  : this.defaultAnswers.packageVersionIdRelease,    // Default Value
        validate: yoValidate.packageVersionId,
        when:     answerHash => answerHash.isCreatingManagedPackage
      },
      {
        type:     'confirm',
        name:     'isInitializingGit',
        message:  'Would you like to initialize Git for this project? (RECOMMENDED)',
        default:  ( typeof this.userAnswers.isInitializingGit !== 'undefined' )
                  ? this.userAnswers.isInitializingGit              // Current Value
                  : this.defaultAnswers.isInitializingGit,          // Default Value
        when:     true
      },
      {
        type:     'confirm',
        name:     'hasGitRemoteRepository',
        message:  'Have you created a Git Remote (eg. GitHub/BitBucket repo) for this project?',
        default:  ( typeof this.userAnswers.hasGitRemoteRepository !== 'undefined' )
                  ? this.userAnswers.hasGitRemoteRepository         // Current Value
                  : this.defaultAnswers.hasGitRemoteRepository,     // Default Value
        when:     answerHash => answerHash.isInitializingGit
      },
      {
        type:     'input',
        name:     'gitRemoteUri',
        message:  'What is the URI of your Git Remote?',
        default:  ( typeof this.userAnswers.gitRemoteUri !== 'undefined' )
                  ? this.userAnswers.gitRemoteUri                   // Current Value
                  : this.defaultAnswers.gitRemoteUri,               // Default Value
        validate: yoValidate.gitRemoteUri,
        when:     answerHash => answerHash.hasGitRemoteRepository
      }
    ]);

    // Done creating the three Interview Groups
    return interviewQuestionGroups as Questions;

  }

  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @method      _getInterviewAnswersTableData
   * @returns     {SfdxFalconTableData}
   * @description Builds an SfdxFalconTableData object based on the current
   *              values of various Interview Answers. This is consumed by the
   *              _displayInterviewAnswers() method in the parent class.
   * @protected
   */
  //───────────────────────────────────────────────────────────────────────────┘
  protected _getInterviewAnswersTableData():SfdxFalconTableData {

    // Declare an array of Falcon Table Data Rows
    const tableData = new Array<SfdxFalconKeyValueTableDataRow>();

    // Group ZERO options (always visible).
    tableData.push({option:'Target Directory:',       value:`${this.userAnswers.targetDirectory}`});
    tableData.push({option:'Dev Hub Alias:',          value:`${this.userAnswers.devHubAlias}`});
    tableData.push({option:'Env Hub Alias:',          value:`${this.userAnswers.envHubAlias}`});

    // Group ONE options (sometimes visible)
    if (this.userAnswers.hasGitRemoteRepository) {
      //tableData.push({option:'Has Git Remote:', value:`${this.userAnswers.hasGitRemoteRepository}`});
      tableData.push({option:'Git Remote URI:',       value:`${this.userAnswers.gitRemoteUri}`});
      if (this.userAnswers.isGitRemoteReachable) {
        tableData.push({option:'Git Remote Status:',  value:`${chalk.blue('AVAILABLE')}`});
      }
      else {
        tableData.push({option:'Git Remote Status:',  value:`${chalk.red('UNREACHABLE')}`});
      }
    }

    // Group TWO options (always visible)
    tableData.push({option:'Producer Name:',          value:`${this.userAnswers.producerName}`});
    tableData.push({option:'Producer Alias:',         value:`${this.userAnswers.producerAlias}`});
    tableData.push({option:'Project Name:',           value:`${this.userAnswers.projectName}`});
    tableData.push({option:'Project Alias:',          value:`${this.userAnswers.projectAlias}`});

    // Group THREE options (always visible).
    tableData.push({option:'Building Packaged App:',  value:`${this.userAnswers.isCreatingManagedPackage}`});

    // Group THREE options (sometimes visible).
    if (this.userAnswers.isCreatingManagedPackage) {
      tableData.push({option:'Namespace Prefix:',       value:`${this.userAnswers.namespacePrefix}`});
      tableData.push({option:'Package Name:',           value:`${this.userAnswers.packageName}`});
      tableData.push({option:'Metadata Package ID:',    value:`${this.userAnswers.metadataPackageId}`});
      tableData.push({option:'Package Version ID:',     value:`${this.userAnswers.packageVersionIdRelease}`});
    }

    // Git initialzation option (always visible).
    tableData.push({option:'Initialize Git Repo:',    value:`${this.userAnswers.isInitializingGit}`});

    // Git init and remote options (sometimes visible).
    if (this.userAnswers.isInitializingGit) {
      tableData.push({option:'Has Git Remote:', value:`${this.userAnswers.hasGitRemoteRepository}`});
      if (this.userAnswers.gitRemoteUri) {
        tableData.push({option:'Git Remote URI:', value:`${this.userAnswers.gitRemoteUri}`});
      }
    }

    // Return the Falcon Table Data.
    return tableData;
  }

  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @method      initializing
   * @returns     {Promise<void>}
   * @description STEP ONE in the Yeoman run-loop.  Uses Yeoman's "initializing"
   *              run-loop priority.
   * @protected @async
   */
  //───────────────────────────────────────────────────────────────────────────┘
  protected async initializing():Promise<void> {

    // Call the default initializing() function. Replace with custom behavior if desired.
    return super._default_initializing();
  }

  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @method      prompting
   * @returns     {Promise<void>}
   * @description STEP TWO in the Yeoman run-loop. Interviews the User to get
   *              information needed by the "writing" and "installing" phases.
   * @protected @async
   */
  //───────────────────────────────────────────────────────────────────────────┘
  protected async prompting():Promise<void> {

    // Check if we need to abort the Yeoman interview/installation process.
    if (this.generatorStatus.aborted) {
      SfdxFalconDebug.msg(`${dbgNs}prompting:`, `generatorStatus.aborted found as TRUE inside prompting()`);
      return;
    }

    // Start the interview loop.  This will ask the user questions until they
    // verify they want to take action based on the info they provided, or
    // they deciede to cancel the whole process.
    do {

      // Initialize interview questions.
      let interviewQuestionGroups = [];

      // Initialize confirmation answers
      this.confirmationAnswers.proceed  = false;
      this.confirmationAnswers.restart  = true;
      this.confirmationAnswers.abort    = false;

      // Prompt the user for GROUP ZERO Answers. Use a loop to allow exit on no DevHub.
      do {

        // Add a line break between groups.
        this.log('');

        // Initialize interview questions on each loop (ensures that user answers from previous loop are saved)
        interviewQuestionGroups = this._getInterviewQuestions() as Questions[];

        // Prompt the user for GROUP ZERO Answers.
        SfdxFalconDebug.obj(`${dbgNs}prompting:`, this.userAnswers, `this.userAnswers - PRE-PROMPT (GROUP ZERO): `);
        const groupZeroAnswers = await this.prompt(interviewQuestionGroups[0]) as InterviewAnswers;
        this.userAnswers = {
          ...this.userAnswers,
          ...groupZeroAnswers
        };
        SfdxFalconDebug.obj(`${dbgNs}prompting:`, this.userAnswers, `this.userAnswers - POST-PROMPT (GROUP ZERO): `);
  
        // If the User specified a DevHub, let them continue.
        if (this.userAnswers.devHubAlias !== 'NOT_SPECIFIED') {
          this.confirmationAnswers.restart = false;
          this.confirmationAnswers.proceed = true;
        }
        else {
          // Initialize "No DevHub" confirmation questions.
          const confirmNoDevHubQuestions = inquirerQuestions.buildConfirmNoDevHubQuestions.call(this) as Questions;

          // Prompt the user for confirmation of No DevHub
          this.confirmationAnswers = await this.prompt(confirmNoDevHubQuestions) as ConfirmationAnswers;

          // If the user decided to NOT restart, mark proceed as FALSE, too.
          this.confirmationAnswers.proceed = this.confirmationAnswers.restart;
        }
      } while (this.confirmationAnswers.restart === true);

      // If the user decided to NOT proceed, break out of the loop.
      if (this.confirmationAnswers.proceed === false) {
        this.log('');
        break;
      }

      // Prompt the user for GROUP ONE Answers. Use a loop to allow exit on no DevHub.
      do {

        // Add a line break between groups.
        this.log('');

        // Initialize interview questions on each loop (same reason as above).
        interviewQuestionGroups = this._getInterviewQuestions() as Questions[];

        // Prompt the user for GROUP ONE Answers.
        SfdxFalconDebug.obj(`${dbgNs}prompting:`, this.userAnswers, `this.userAnswers - PRE-PROMPT (GROUP ONE): `);
        const groupOneAnswers = await this.prompt(interviewQuestionGroups[1]) as InterviewAnswers;
        this.userAnswers = {
          ...this.userAnswers,
          ...groupOneAnswers
        };
        SfdxFalconDebug.obj(`${dbgNs}prompting:`, this.userAnswers, `this.userAnswers - POST-PROMPT (GROUP ONE): `);

        // Check if the user has specified a GitHub Repo
        if (this.userAnswers.hasGitRemoteRepository) {

          // If the Git Remote has already been found to be reachable, move on.
          if (this.userAnswers.isGitRemoteReachable) {
            this.confirmationAnswers.restart = false;
            break;
          }

          // If Git Remote was unreachable, but the uers acknowledged that it's OK, let them through.
          if (this.userAnswers.ackGitRemoteUnreachable === true) {
            this.confirmationAnswers.restart = false;
            break;
          }
          // Force a restart to this group.
          else {
            this.confirmationAnswers.restart = true;
            continue;
          }
        }
        // User did not want to specify a repo.  WARN them about this.
        else {

          // Make sure "restart" is defaulted to TRUE
          this.confirmationAnswers.restart = true;

          // Initialize "No GitHub Repository" confirmation questions.
          const confirmNoGitHubRepoQuestions = inquirerQuestions.buildConfirmNoGitHubRepoQuestions.call(this) as Questions;

          // Prompt the user for confirmation of No DevHub
          this.confirmationAnswers = await this.prompt(confirmNoGitHubRepoQuestions) as ConfirmationAnswers;

          // A FALSE restart here actually means "YES, RESTART PLEASE", so negate the answer we got back.
          this.confirmationAnswers.restart = (! this.confirmationAnswers.restart);
        }
      } while (this.confirmationAnswers.restart === true);

      // Add a line break between groups.
      this.log('');

      // One more initialization of the Question Groups
      interviewQuestionGroups = this._getInterviewQuestions() as Questions[];

      // Prompt the user for GROUP TWO Answers. No loop needed, since there's one more group after this.
      SfdxFalconDebug.obj(`${dbgNs}prompting:`, this.userAnswers, `this.userAnswers - PRE-PROMPT (GROUP TWO): `);
      const groupTwoAnswers = await this.prompt(interviewQuestionGroups[2]) as InterviewAnswers;
      this.userAnswers = {
        ...this.userAnswers,
        ...groupTwoAnswers
      };
      SfdxFalconDebug.obj(`${dbgNs}prompting:`, this.userAnswers, `this.userAnswers - PRE-PROMPT (GROUP TWO): `);

      // Add a line break between groups.
      this.log('');

      // Prompt the user for GROUP THREE Answers. No loop needed, though this group gets to restart ALL if desired.
      SfdxFalconDebug.obj(`${dbgNs}prompting:`, this.userAnswers, `this.userAnswers - PRE-PROMPT (GROUP THREE): `);
      const groupThreeAnswers = await this.prompt(interviewQuestionGroups[3]) as InterviewAnswers;
      this.userAnswers = {
        ...this.userAnswers,
        ...groupThreeAnswers
      };
      SfdxFalconDebug.obj(`${dbgNs}prompting:`, this.userAnswers, `this.userAnswers - PRE-PROMPT (GROUP THREE): `);

      // Display ALL of the answers provided during the interview
      this._displayInterviewAnswers();
      
    } while (await this._promptProceedAbortRestart() === true);

    // Check if the user decided to proceed with the install.  If not, abort.
    if (this.confirmationAnswers.proceed !== true) {
      this.generatorStatus.abort({
        type:     'error',
        title:    'Command Aborted',
        message:  `${this.cliCommandName} command canceled by user`
      });
    }
  }

  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @method      configuring
   * @returns     {void}
   * @description STEP THREE in the Yeoman run-loop. Perform any pre-install
   *              configuration steps based on the answers provided by the User.
   * @protected
   */
  //───────────────────────────────────────────────────────────────────────────┘
  protected configuring() {

    // Call the default configuring() function. Replace with custom behavior if desired.
    return super._default_configuring();
  }

  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @method      writing
   * @returns     {void}
   * @description STEP FOUR in the Yeoman run-loop. Typically, this is where
   *              you perform filesystem writes, git clone operations, etc.
   * @protected
   */
  //───────────────────────────────────────────────────────────────────────────┘
  protected writing() {

    // Check if we need to abort the Yeoman interview/installation process.
    if (this.generatorStatus.aborted) {
      SfdxFalconDebug.msg(`${dbgNs}writing:`, `generatorStatus.aborted found as TRUE inside writing()`);
      return;
    }

    // Tell Yeoman the path to the SOURCE directory
    this.sourceRoot(path.dirname(this.sourceDirectory));

    // Tell Yeoman the path to DESTINATION (join of targetDir and project name)
    this.destinationRoot(path.resolve(this.userAnswers.targetDirectory,
                                      this.userAnswers.projectName));

    // DEBUG
    SfdxFalconDebug.str(`${dbgNs}writing:`, this.sourceRoot(),      `this.sourceRoot(): `);
    SfdxFalconDebug.str(`${dbgNs}writing:`, this.destinationRoot(), `this.destinationRoot(): `);

    // Determine the name to use for the default Package Directory.
    if (this.userAnswers.isCreatingManagedPackage === true) {
      // Managed package, so use the namespace prefix.
      this.userAnswers.packageDirectory  = this.userAnswers.namespacePrefix;
      this.userAnswers.projectType       = 'appx:managed1gp';
    }
    else {
      // NOT a managed package, so use the default value.
      this.userAnswers.packageDirectory = this.defaultAnswers.packageDirectory;
      this.userAnswers.projectType       = 'appx:unmanaged';
    }
    
    // Tell the user that we are preparing to create their project.
    this.log(chalk`{blue Preparing to write project files to ${this.destinationRoot()}...}\n`);

    // Merge "User Answers" from the interview with "Default Answers" to get "Final Answers".
    this.finalAnswers = {
      ...this.defaultAnswers,
      ...this.userAnswers
    };

    //─────────────────────────────────────────────────────────────────────────┐
    // *** IMPORTANT: READ CAREFULLY ******************************************
    // ALL of the fs.copyTpl() functions below are ASYNC.  Once we start calling
    // them we have no guarantee of synchronous execution until AFTER the
    // all of the copyTpl() functions resolve and the Yeoman Invoker decides to
    // call the install() function.
    //
    // If there are any problems with the file system operations carried out by
    // each copyTpl() function, or if the user chooses to ABORT rather than
    // overwrite or ignore a file conflict, an error is thrown inside Yeoman
    // and the CLI plugin command will terminate with an uncaught fatal error.
    //─────────────────────────────────────────────────────────────────────────┘

    // Copy directories from source to target (except for sfdx-source).
    this.fs.copyTpl(this.templatePath('.circleci'),
                    this.destinationPath('.circleci'),
                    this);
    this.fs.copyTpl(this.templatePath('.templates'),
                    this.destinationPath('.templates'),
                    this);
    this.fs.copyTpl(this.templatePath('config'),
                    this.destinationPath('config'),
                    this);
    this.fs.copyTpl(this.templatePath('data'),
                    this.destinationPath('data'),
                    this);
    this.fs.copyTpl(this.templatePath('docs'),
                    this.destinationPath('docs'),
                    this);
    this.fs.copyTpl(this.templatePath('mdapi-source'),
                    this.destinationPath('mdapi-source'),
                    this);
    this.fs.copyTpl(this.templatePath('temp'),
                    this.destinationPath('temp'),
                    this);
    this.fs.copyTpl(this.templatePath('tools'),
                    this.destinationPath('tools'),
                    this);

    // Copy root-level files from source to target.
    this.fs.copyTpl(this.templatePath('.forceignore'),
                    this.destinationPath('.forceignore'),
                    this);
    this.fs.copyTpl(this.templatePath('README.md'),
                    this.destinationPath('README.md'),
                    this);
    this.fs.copyTpl(this.templatePath('LICENSE'),
                    this.destinationPath('LICENSE'),
                    this);
    this.fs.copyTpl(this.templatePath('sfdx-project.json'),
                    this.destinationPath('sfdx-project.json'),
                    this);
    
    // Copy files and folders from sfdx-source.
    this.fs.copyTpl(this.templatePath('sfdx-source/my_ns_prefix'),
                    this.destinationPath(`sfdx-source/${this.userAnswers.packageDirectory}`),
                    this);
    this.fs.copyTpl(this.templatePath('sfdx-source/unpackaged'),
                    this.destinationPath('sfdx-source/unpackaged'),
                    this);
    this.fs.copyTpl(this.templatePath('sfdx-source/untracked'),
                    this.destinationPath('sfdx-source/untracked'),
                    this);

    // Determine if the template path has .npmignore or .gitignore files
    let ignoreFile = '.gitignore';
    try {

      // Check if the embedded template still has .gitignore files.
      this.fs.read(this.templatePath('.gitignore'));
    }
    catch {

      // .gitignore files were replaced with .npmignore files.
      ignoreFile = '.npmignore';
    }

    // Copy all .npmignore/.gitignore files over as .gitignore
    this.fs.copyTpl(this.templatePath(`${ignoreFile}`),
                    this.destinationPath('.gitignore'),
                    this);
    this.fs.copyTpl(this.templatePath(`config/${ignoreFile}`),
                    this.destinationPath('config/.gitignore'),
                    this);
    this.fs.copyTpl(this.templatePath(`tools/${ignoreFile}`),
                    this.destinationPath('tools/.gitignore'),
                    this);
    this.fs.copyTpl(this.templatePath(`mdapi-source/${ignoreFile}`),
                    this.destinationPath('mdapi-source/.gitignore'),
                    this);
    this.fs.copyTpl(this.templatePath(`sfdx-source/my_ns_prefix/main/default/aura/${ignoreFile}`),
                    this.destinationPath(`sfdx-source/${this.userAnswers.packageDirectory}/main/default/aura/.gitignore`),
                    this);
    this.fs.copyTpl(this.templatePath(`sfdx-source/my_ns_prefix/main/default/classes/${ignoreFile}`),
                    this.destinationPath(`sfdx-source/${this.userAnswers.packageDirectory}/main/default/classes/.gitignore`),
                    this);
    this.fs.copyTpl(this.templatePath(`sfdx-source/my_ns_prefix/main/default/layouts/${ignoreFile}`),
                    this.destinationPath(`sfdx-source/${this.userAnswers.packageDirectory}/main/default/layouts/.gitignore`),
                    this);
    this.fs.copyTpl(this.templatePath(`sfdx-source/my_ns_prefix/main/default/objects/${ignoreFile}`),
                    this.destinationPath(`sfdx-source/${this.userAnswers.packageDirectory}/main/default/objects/.gitignore`),
                    this);
    this.fs.copyTpl(this.templatePath(`sfdx-source/my_ns_prefix/main/default/permissionsets/${ignoreFile}`),
                    this.destinationPath(`sfdx-source/${this.userAnswers.packageDirectory}/main/default/permissionsets/.gitignore`),
                    this);
    this.fs.copyTpl(this.templatePath(`sfdx-source/my_ns_prefix/main/default/profiles/${ignoreFile}`),
                    this.destinationPath(`sfdx-source/${this.userAnswers.packageDirectory}/main/default/profiles/.gitignore`),
                    this);
    this.fs.copyTpl(this.templatePath(`sfdx-source/my_ns_prefix/main/default/remoteSiteSettings/${ignoreFile}`),
                    this.destinationPath(`sfdx-source/${this.userAnswers.packageDirectory}/main/default/remoteSiteSettings/.gitignore`),
                    this);
    this.fs.copyTpl(this.templatePath(`sfdx-source/my_ns_prefix/main/default/tabs/${ignoreFile}`),
                    this.destinationPath(`sfdx-source/${this.userAnswers.packageDirectory}/main/default/tabs/.gitignore`),
                    this);
    this.fs.copyTpl(this.templatePath(`sfdx-source/my_ns_prefix/main/default/triggers/${ignoreFile}`),
                    this.destinationPath(`sfdx-source/${this.userAnswers.packageDirectory}/main/default/triggers/.gitignore`),
                    this);
    this.fs.copyTpl(this.templatePath(`temp/${ignoreFile}`),
                    this.destinationPath('temp/.gitignore'),
                    this);

    // Update "meta answers" before copying .sfdx-falcon-config.json to the developer's local project
    // After refactoring, use these commented-out lines instead of the ones below
    this.metaAnswers.devHubAlias = this.userAnswers.devHubAlias;
    this.metaAnswers.envHubAlias = this.userAnswers.envHubAlias;
//    this.metaAnswers.devHubAlias = this.defaultAnswers.devHubAlias;
//    this.metaAnswers.envHubAlias = this.defaultAnswers.envHubAlias;
    this.metaAnswers.pkgOrgAlias = this.defaultAnswers.pkgOrgAlias;

    this.fs.copyTpl(this.templatePath('.templates/sfdx-falcon-config.json.ejs'),
                    this.destinationPath('.sfdx-falcon/sfdx-falcon-config.json'),
                    this);
    this.fs.copyTpl(this.templatePath('tools/templates/local-config-template.sh.ejs'),
                    this.destinationPath('tools/lib/local-config.sh'),
                    this);

    // Done with writing()
    return;
  }

  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @method      install
   * @returns     {void}
   * @description STEP FIVE in the Yeoman run-loop. Typically, this is where
   *              you perform operations that must happen AFTER files are
   *              written to disk. For example, if the "writing" step downloaded
   *              an app to install, the "install" step would run the
   *              installation.
   * @protected
   */
  //───────────────────────────────────────────────────────────────────────────┘
  protected install() {

    // Finalize the creation of the AppX Package Project.
    return this._finalizeProjectCreation();
  }

  //───────────────────────────────────────────────────────────────────────────┐
  /**
   * @method      end
   * @returns     {void}
   * @description STEP SIX in the Yeoman run-loop. This is the FINAL step that
   *              Yeoman runs and it gives us a chance to do any post-Yeoman
   *              updates and/or cleanup.
   * @protected
   */
  //───────────────────────────────────────────────────────────────────────────┘
  protected end() {

    // Call the default end() function. Replace with custom behavior if desired.
    return super._default_end();
  }
}
