# Support to Snow Incident overnight app. #

https://github.com/fborgnia/aws_support_snow_incident.git

This app integrates Service Now Incidents with AWS Support Cases.

A Service Now Incident of AWS category and Service Code sub-category creates an AWS Support case to the corresponding service. The case is created in the AWS account that is associated with the assignment group configured.

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
