# AWS Support to ServiceNow Incident connector app #

## Installation & Configuration ##

The AWS account must be subscribed to a Support product code, Internal (Isengard) accounts are not subscribed by default, 
Wiki page:
https://w.amazon.com/index.php/AWS_Developer_Support/EnterpriseSupportContracts
TT quick link:
https://portal.ant.amazon.com/sites/aws_cs/escforms/TT_Kiosk/TT_Kiosk.aspx?TT_ID=156

### 1 - Create IAM User ###

1 - Login into the AWS Account with IAM administrator privileges.

2 - Navigate to Services -> IAM ->. Users

3 - Click Add User, complete and click next.

    User Name: IE: snow_connector.
    Access Type: Programmatic access.

4 - Set Permissions: Attach existing policies directly.

    Policy Name: AwsSupportAccess.
    Click Next.

5 - Click Create User and Download Credentials CSV for the last configuration step.

### 1 - Install the application from github ###

1 - Login to ServiceNow with admin privileges.

2 - Navigate to ServiceNow Studio.

3 - Select Import From Source Control.

    URL: https://github.com/fborgnia/aws_support_snow_incident.git
    Username: a github account or blank.
    Password: a github password or blank.

4 - Select Application "AwsSupport"

### 2 - Set Table Permissions ###

1 - Login to ServiceNow with admin privileges.

2 - Navigate to System Definitions -> Tables.

3 - Set the permissions for the tables below:

| Table             | Accessible from         | Access                    |
| ----------------- |:-----------------------:| -------------------------:|
| sys_user          | All Application scopes  | can: read, create, update |
| sys_user_group    | All Application scopes  | can: read, create, update |
| sys_journal_field | All Application scopes  | can: read                 |
| incident          | All Application scopes  | can: read, create, update |
| sys_choice        | All Application scopes  | can: read, create, update |

### 3 - Create Global AwsSupportUtils ###

1 - Login to ServiceNow with admin privileges.

2 - Navigate to ServiceNow System Definitions -> Script Includes.

3 - Search by Name: copyToGlobalAwsSuportUtils, select.

4 - Copy the script content: IE: (the example below might be out of date, copy the actual script from ServiceNow)

```
var AwsSupportUtils = Class.create();
AwsSupportUtils.prototype = {
    initialize: function() {
        this.aws_user_name = gs.getProperty("x_195647_aws_.Config.AWS.username");
        var gr = new GlideRecord('sys_user');
        gr.addQuery('user_name', this.aws_user_name);
        gr.query();
        if (!gr.hasNext()) { throw "AWS Support user account is not setup.";}
        gr.next();
        this.aws_user = gr;
    },

    setJournalEntry: function(incident, object, user) {
      var originalUser = gs.getSession().impersonate(this.aws_user.sys_id);
      incident.comments.setJournalEntry(object, user);
      incident.update();
      gs.getSession().impersonate(originalUser);
    },

    type: 'AwsSupportUtils'
};
```

5 - Return to System Definitions -> Script Includes

6 - Create New:
    Set the application scope to global if the scope Application field is AwsSupport.
    (settings icon on the right top corner, developer section)

    Name: AwsSupportUtils
    API Name: global.AwsSupportUtils
    Application: global
    Accessible from: All application scopes
    Active: Checked (true)
    Script: (from step 4.)

### 4 - Grant Application Permissions ###

1 - Login to ServiceNow with admin privileges.

2 - Navigate to ServiceNow User Administration -> User Roles.

3 - Click New, complete the form and submit.

    User: Select User for Administrator Role
    Role: x_195647_aws_.Support Admin

### 5 - Configure AWS Accounts ###

1 - Login (or impersonate) with the user account granted 'x_195647_aws_.Support Admin' from the previous step.

2 - Navigate to ServiceNow AwsSupport -> Accounts.

3 - Click New, complete the form and submit.

    Account Name: A name for this account, IE: MegaCorp-MegaApp-Dev
    AWS API Key: Api Key Id from the AWS account crendentials.
    AWS Secret Key: Secret Api Key from the AWS account crendentials.
    IAM UserName: User Name for the credential pair.
    Active: checked (true).
    Assignment Group: blank.
    Automatically configure Group: checked (true).

### 6 - Import AWS Service Codes ###

1 - Login to ServiceNow with the Admin privileges.

2 - Navigate to System Definition -> Scheduled Jobs

3 - Find by Name: "CreateAWSSupportChoices"

4 - Click Execute Now on the right top corner

5 - Wait approximately 10 minutes for all service codes to be populated in the Incident form.


## Usage ##

### Create an AWS Support Case ###

To contact AWS Support from a Service Now Incidents create an Incident case, Complete AWS Support Codes section and assign the case to the Assignment Group for your AWS account.

1 - Login into ServiceNow with itsm permissions
2 - Create New Incident

    Complete required values: Caller, Short Description, Description.
    Assignment group: IE: AWS-MegaCorp-MegaApp-Dev
    AWS Support Codes:
      ServiceCode: Amazon Machine Learning
      Category: Job Flow Issue

3 - Verify Case is created in AWS
  
    a - Login into AWS Account
    b - Navigate to Support -> Support Center
    c - Confirm case is created

### More usage doc in the future, now go play ###


the text below is incomplete and innacurate.



































A Service Now Incident 

An AWS account has one assignment group. To configure multple AWS account, multiple groups need to be created, the app can create the group automatically if selected on the new account form.


## Case Status

AWS Support Engineers control the status of open cases, customers only open and resolve them. AWS cases are on pending-customer-action or pending-amazon-action status depending on who is expected to add communication next towards resolution. In Service now, the status is set to "InPogress" while the assignee is set to the AWS account associated group (AWS-<ACCOUNT> in the table). When cases are assigned back to the customer by AWS, the Service Now ticket is released as "New" status and the assignment group set to none.

AWS To Service Now status and assignment group mapping table

| AWS                        | Service Now   | Assignment Group |
| -------------------------- |:-------------:| ----------------:|
| unassigned (new/reopen)    | New           | AWS-<ACCOUNT>    |
| work-in-progress           | InProgress    | <unmodified>     |
| pending-amazon-action      | InProgress    | <unmodified>     |
| pending-customer-action    | New           | <unmodified>     |
| customer-action-completed  | InProgress    | <unmodified>     |

## Assignments

Assign a case to an AWS account by selecting the related assignment group in the Incident form.


## Communications

Communications and attachments can be added to a case in any state by any party. In ServiceNow, -additional notes (customer visible) are sent as communications to the AWS case, and communications added by AWS support engineers appear in the Incident case as the same. Work notes and other journal entries remain private to ServiceNow.

Case attachments are synchronized bidirectionally too, supporting up to 5MB files.

## Case Resolution

When a Service Now Incident is resolved or closed, the corresponding AWS case is resolved. If an AWS case is resolved remotely, either by the auto-resolver bot due to innactivity or by an AWS operator, the ServiceNow Incident record will be set to resolved.

To re-open a resolved case, add new correspondance and the related AWS case will be actioned by AWS Support Engineers.
