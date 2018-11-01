// Functions to interact with journal entries.
gs.include('global.AwsSupportUtils');
var IncidentUtils = Class.create();
IncidentUtils.prototype = {

    initialize: function(){
        this.AwsSupportUtils = new global.AwsSupportUtils();
        this.aws_user_name = gs.getProperty("x_195647_aws_.Config.AWS.username");
        var gr = new GlideRecord('sys_user');
        gr.addQuery('user_name', this.aws_user_name);
        gr.query();
        if (!gr.hasNext()) { throw "AWS Support user account is not setup.";}
        gr.next();
        this.aws_user = gr;
    },

    // receives a journal element (incident.comments),
    // an object to add to the journal and a user to attribute the changes.
    addAuthoredComment: function(incident, comm) {
      if (comm.attachmentSet.length > 0) {
        this.addAttachments(incident, comm);
      }
      this.AwsSupportUtils.setJournalEntry(incident, comm.body, comm.submittedBy);
    },
    // receives an instance of sys_journal_field 
    // returns true if the entry was added by AWS.
    createdByAws: function(entry) {
      var user_name = this.aws_user_name;
      if (entry.sys_created_by == user_name) {
        return true;
      }
      return false;
    },

    addAttachments: function(incident, attachmentSet) {
      for (var a = 0; a < attachmentSet.length; a++) {
          params = {
              attachmentId: String(attachmentSet[a].attachmentId)
          };
          var attachment = AwsApi.describeAttachment(params).attachment;
          sa.writeBase64( incident, String(attachment.fileName), 'text/plain', String(attachment.data));
      }
    },

    // receives a GlideRecord object from support_cases table
    // sets the associated incident state and assignee.
    setIncidentState: function(aws_case) {
        var incident = aws_case.incident.getRefRecord();
        switch(aws_case.status.getDisplayValue()) {
            case 'unassigned':
                incident.state = 1;
                break;
            case 'work-in-progress':
                incident.state = 2;
                incident.assigned_to = this.aws_user_name;
                break;
            case 'pending-customer-action':
                incident.state = 2;
                incident.assigned_to = 'NULL';
                break;
            case 'customer-action-completed':
                incident.state = 2;
                incident.assigned_to = this.aws_user_name;
                break;
            case 'opened':
                incident.state = 2;
                incident.assigned_to = this.aws_user_name;
                break;
            case 'resolved':
                incident.state = 6;
                //hardocded as there is no resolution code advertised by AWS
                incident.close_code = 'Resolved'; 
                incident.close_notes = 'Resolved by AWS';
                incident.resolved_by = this.aws_user_name;
                incident.assigned_to = this.aws_user_name;
                break;
            case 'reopened':
                incident.state = 1;
                break;
        }
        incident.update();
        return incident;
    },

    severityCodeMap: { 
        'low'     : {'impact': 3, 'urgency': 3, 'priority': 5},
        'normal'  : {'impact': 2, 'urgency': 3, 'priority': 4},
        'high'    : {'impact': 2, 'urgency': 2, 'priority': 3},
        'urgent'  : {'impact': 1, 'urgency': 2, 'priority': 2},
        'critical': {'impact': 1, 'urgency': 1, 'priority': 1}
    },

    setIncidentPriority: function(aws_case) {
        var incident = aws_case.incident.getRefRecord();
        incident.impact = this.severityCodeMap[aws_case.severity_code]['impact'];
        incident.urgency = this.severityCodeMap[aws_case.severity_code]['urgency'];
        incident.update();
        return incident;
    },

    caseIsOpen: function(aws_case) {
        var case_record = new GlideRecord('x_195647_aws__support_cases');
        case_record.addQuery('case_id','=', aws_case["caseId"]);
        case_record.addQuery('status','!=', 'closed');
        case_record.query();
        if (case_record.hasNext()) {
            return true;
        }
        return false;
    },

    createIncidentRecord: function(aws_case,aws_account) {
        var new_case = new GlideRecord('x_195647_aws__support_cases');
        new_case.initialize();
        new_case.case_id = aws_case.caseId;
        new_case.aws_account = aws_account.sys_id;
        new_case.status = aws_case.status;
        new_case.severity_code = aws_case.severityCode;
        new_case.insert();
        
        var new_incident = new GlideRecord('incident');
        new_incident.initialize(); 
        new_incident.short_description = aws_case.subject;
        new_incident.description = aws_case.recentCommunications.communications[0].body;
        new_incident.caller_id = this.aws_user.sys_id;
        new_incident.assignment_group = aws_account.assignment_group;
        new_incident.x_195647_aws__service_category = aws_case.categoryCode;
        new_incident.x_195647_aws__service_code = aws_case.serviceCode;
        new_incident.insert();
        
        new_case.incident = new_incident.sys_id;
        new_case.update();
        new_incident = this.setIncidentState(new_case);
        new_incident = this.setIncidentPriority(new_case);
        return new_incident;
    },

    getActiveCasesForAccount: function(aws_account) {
        var caseIdList = [];
        var aws_case = new GlideRecord('x_195647_aws__support_cases');
        aws_case.addQuery('status','!=', 'closed');
        aws_case.addQuery('aws_account','=', aws_account.sys_id);
        // should optimize query
        aws_case.query();
        while (aws_case.next()) {
            if (aws_case.case_id != '') {
                caseIdList.push(String(aws_case.case_id));
            }
        }

        var params = {
            includeCommunications: true,
            includeResolvedCases: true,
            caseIdList: caseIdList
        };
        
        if (caseIdList.length > 0) {
            var AwsApi = new SupportApi({
                accessKeyId: String(aws_account.aws_api_key),
                secretAccessKey: aws_account.aws_secret_key.getDecryptedValue()
            });
            return AwsApi.listCases(params);
        } 
        return [];
    },

    updateCommunications: function(aws_case) {
        var aws_account = aws_case.aws_account.getRefRecord();
        // get last remote update sync.
        last_comment_time = this.getLastCommentTimeByAwsUser(aws_case.incident);

        var params = {
            afterTime: last_comment_time,
            caseId: String(aws_case.case_id)
        };

        //gs.info("Get comments for " + aws_case.case_id + " incident " + aws_case.incident.number + " since " + last_comment_time);
        var AwsApi = new SupportApi({
            accessKeyId: String(aws_account.aws_api_key),
            secretAccessKey: aws_account.aws_secret_key.getDecryptedValue()
        });
        var comms = AwsApi.getCaseCommunications(params).slice(0).reverse();
        //use this regexp to check the source of the comments the api provides.
        var snow_user = new RegExp(aws_account.iam_username);
        var incident = aws_case.incident.getRefRecord();
        if (incident.isNewRecord()) {return;}
        // update with a comment for each comment returned thats not created by user.
        
        for (var c = 0; c < comms.length; c++) {
            //gs.info("COMM "+JSON.stringify(comms[c]));
            var comm = comms[c];
            if (comm.submittedBy.match(snow_user)) { continue; }
            this.addAuthoredComment(incident,comm);
        }
        return incident;
    },

    getLastCommentTimeByAwsUser: function (incident_id) {
        var timestamp;
        var activity = new GlideRecord('sys_journal_field');
        activity.addQuery('element_id','=', String(incident_id));
        activity.addQuery('element','=', "comments");
        activity.addQuery('sys_created_by','=', this.aws_user_name);
        activity.orderByDesc('sys_created_on');
        activity.setLimit(1);
        activity.query();
        if (activity.next()) {
            timestamp = activity.sys_created_on;
        } else {
            timestamp = new GlideDateTime();
            timestamp.setValue(0);
        }
        return String(timestamp).replace(" ", "T");
    },

    updateAwsCaseReference: function(aws_case_json) {
        var aws_case = new GlideRecord('x_195647_aws__support_cases');
        aws_case.addQuery('case_id', aws_case_json.caseId);
        aws_case.query();
        if (aws_case.hasNext()) {
            aws_case.next();
            if (aws_case.status != aws_case_json.status) {
                aws_case.status = aws_case_json.status;
                aws_case.update();
            }
            return aws_case;
        } else {
          return undefined;
        }

    },

    type: 'IncidentUtils'
};