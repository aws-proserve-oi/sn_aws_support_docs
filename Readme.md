# AWS Support Center to ServiceNow Incident connector app #

This repository is is for code documentation only, the app is available [here](https://github.com/fborgnia/sn_aws_support_connector)

## Installation & Configuration ##

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

    URL: https://github.com/fborgnia/sn_aws_support_connector.git
    Username: a github account or blank.
    Password: a github password or blank.

4 - Select Application "AwsSupport"

### 2 - Set Table Permissions ###

1 - Login to ServiceNow with admin privileges.

2 - Navigate to System Definitions -> Tables.

3 - Set the permissions for the tables below:

| Table             | Accessible from         | Access                    | Reason                  |
| ----------------- |:-----------------------:| :------------------------:|------------------------:|
| sys_user          | All Application scopes  | can: read, create, update | Create assignment user  |
| sys_user_group    | All Application scopes  | can: read, create, update | Create assignment grup  |
| sys_journal_field | All Application scopes  | can: read                 | Read Incident comments  |
| incident          | All Application scopes  | can: read, create, update | Create/Update Incidents |
| sys_choice        | All Application scopes  | can: read, create, update | Create Support Codes    |

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

### More usage doc in the future, work in progress ###

## Supported Use Cases ##

### 0 - Create AWS Accounts ###

Provides access from ServiceNow to the AWS Support API for the accounts configured & relates accounts to assignment groups to manage Incident assignments.

1 - Login with 'x_195647_aws_.Support Admin' privileges.

2 - Navigate to ServiceNow AwsSupport -> Accounts.

3 - Click New, complete the form and submit.

    Account Name: A name for this account, IE: MegaCorp-MegaApp-Dev
    AWS API Key: Api Key Id from the AWS account crendentials.
    AWS Secret Key: Secret Api Key from the AWS account crendentials.
    IAM UserName: User Name for the credential pair.
    Active: checked (true).
    Assignment Group: blank.
    Automatically configure Group: checked (true).

### 1 - Assign an Incident to AWS Support ###

To assign an Incident to AWS Support, Complete AWS Support Codes section and assign the case to the Assignment Group for the AWS configured account.

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
    c - Confirm case is created with test title.


### 2 - Receive an Incident from AWS Support ###

When a Case is created in the account, either by AWS or by a third party, ServiceNow will automatically create an Incident case associated, and assigned to the corresponding AWS account assignment group.

1 - Login into AWS with support:* permissions
2 - Create new Support Case

    Complete required values: Subject, Body, Priority & categories.
    Create Case.

3 - Verify Incident is created in ServiceNow
  
    1 - Login into ServiceNow with itsm permissions
    b - Navigate to Incidents & verify Incident exists with:
        caller: Aws
        short_description
        description
        assignment_group
        status (as configured in StatusMap)
        priority/impact/urgency (as configured in SeverityCodeMap)
        communications
        attachments

### 3 - Send communications to an AWS Support Case ###

1 - Add a comment (Customer Visible) in the Incident activity journal

3 - Verify Comment is added in the AWS Support Case
  
### 3 - Receive communications from an AWS Support Case ###

1 - Add a communication to the AWS Support Case
2 - Verify the communication is added as a customer visible note.

### 4 - Send attachments to an AWS Support Case ###

1 - Add an attachment to the ServiceNow Incident.
2 - Verify the attachment is present in the AWS Support Case.

### 4 - Receive attachments from an AWS Support Case ###

1 - Add an attachment in the AWS Support Case.
2 - Verify the attachment is present the associated ServiceNow Incident.

### 5 - Resolve an AWS Case by resolving the Incident ###

1 - Configure the system property file with the configuration mapping.

IncidentState represents the number value for the state in ServiceNow. 1 being pending and 7 closed in the default configuration.
IncidentAssignee can be either NULL|AWS or not present at all, if NULL the value is set to blank, AWS sets it to the AWS user in ServiceNow and if the configuration key is not present there will be no modifications made to the field.

    [snip]
    {
      "unassigned" : {
        "IncidentState": 1,
        "IncidentAssignee":"NULL"
      },
      .
      .
      .
      "closed": {
        "IncidentState": 7
      }
    }

2 - Resolve the Incident in ServiceNow.

3 - Verify the AWS Case is now Closed.

### 6 - AWS resolves an integrated Case ###

1 - Configure the system property file (see above)

2 - Close the AWS Case

3 - Verify the ServiceNow Incident is set to Resolved, by aws as configured.

### 7 - Re-open a Case ###

1 - Add a communication to either end and verify
    
    Incident will be Pending
    Aws Support Case will be open with the new communication.

### 7 - Close an Incident permanently in ServiceNow ###

Once the Incident is set to the "closed" state mapped in the configuration file, it will not be further modified externally.
If the AWS Support case is opened externaly it will create a new Incident in ServiceNow.

1 - Set the Incident to the "closed" state in the mapping
2 - Verify updates to the case create a new Incident record.
