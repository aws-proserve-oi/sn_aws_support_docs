// Helper functions to interact with AWS Cases and Incident records.
gs.include('AwsSupportApi');
var AwsSupportUtils = Class.create();
AwsSupportUtils.prototype = {
    initialize: function(aws_account){
        gs.include('global.AwsSupportUtils');
        if (global.AwsSupportUtils) {
            this.global_utils = new global.AwsSupportUtils();
        } else {
            this.global_utils = this;
        }
        this.AwsSupportApi = new AwsSupportApi({
            accessKeyId: String(aws_account.aws_api_key),
            secretAccessKey: aws_account.aws_secret_key.getDecryptedValue()
        });
        this.aws_account = aws_account;
        this.aws_user_name = gs.getProperty(gs.getCurrentScopeName()+".Config.AWS.username");
        var user_record = new GlideRecord('sys_user');
        user_record.addQuery('user_name', this.aws_user_name);
        user_record.query();
        user_record.next();
        this.aws_user = user_record;
        this.StatusMap = JSON.parse(gs.getProperty(gs.getCurrentScopeName()+".Config.StatusMap"));
        this.SeverityCodeMap = JSON.parse(gs.getProperty(gs.getCurrentScopeName()+".Config.SeverityCodeMap"));
    },
    // default function to add entries to inident comments.
    setJournalEntry: function(incident, body, user){
        body += "\nsubmitted by " + user;
        incident.comments = body;
        incident.update();
    },
    // receives an incident and a comment JSON from a Support Case,
    // Writes an authored comment in the incident journal.
    addAuthoredComment: function(incident, comm) {
      if (comm.attachmentSet.length > 0) {
        this.addAttachments(incident, comm.attachmentSet);
      }
      this.global_utils.setJournalEntry(incident, comm.body, comm.submittedBy);
    },
    // writes an attachment for an incident.
    // receives an incident glide record and an AWS case attachment set.
    addAttachments: function(incident, attachmentSet) {
      for (var a in attachmentSet) {
          params = {
              attachmentId: attachmentSet[a].attachmentId
          };
          var attachment = this.AwsSupportApi.describeAttachment(params).attachment;
          var sa = new GlideSysAttachment();
          sa.writeBase64( incident, String(attachment.fileName), 'text/plain', String(attachment.data));
      }
    },
    // receives an instance of sys_attachment and a case reference record
    // Add the attachment to the AWS Support Case.
    addCaseAttachments: function(attachment, aws_case) {
        var sa = new GlideSysAttachment();
        var data = sa.getContentBase64(attachment);

        var params = {
            attachments: [
                {
                    fileName: String(attachment.file_name), 
                    data: data
                }
            ]
        };
        
        var attachmentSetId = this.AwsSupportApi.addAttachmentsToSet(params);
        var author = '\n';
        var user = new GlideRecord('sys_user');
        user.addQuery('user_name', attachment.sys_created_by);
        user.query();
        if (user.next()) {
            author = ' added by ';
            author += user.first_name + " "  +
                      user.last_name  + " <" + 
                      user.email      + ">";            
        }
        params = {
            caseId: String(aws_case.case_id),
            communicationBody: 'New attachment ' + attachment.file_name + author,
            attachmentSetId: attachmentSetId
        };
        var result = this.AwsSupportApi.addCommunicationsToCase(params);
    },
    // receives an instance of sys_journal_entry
    // returns an author line
    generateAuthor: function(entry) {
        var user = new GlideRecord('sys_user');
        user.addQuery('user_name', entry.sys_created_by);
        user.query();
        if (user.hasNext()) {
            user.next();
            var author = user.first_name + " "  +
                         user.last_name  + " <" + 
                         user.email      + "> ";
            var author_line = 'Submitted by ' + author + '\nAt ' + entry.sys_created_on;
            return author_line;
        }
    },
    //receives an instance of sys_journal_field and an aws case reference record.
    //posts a new case comunication with the comment and user info.
    addCaseCommunication: function(entry, aws_case) {
        if (entry.element != 'comments') {return;}
        var signature = this.generateAuthor(entry);
        var communicationBody = entry.value + '\n\n' + signature;
        var params = {
            caseId: String(aws_case.case_id),
            communicationBody: communicationBody
        };
        var result = this.AwsSupportApi.addCommunicationsToCase(params);
    },
    // receives an instance of sys_journal_field 
    // returns true if the entry was added by AWS.
    createdByAws: function(entry) {
        if ((entry.sys_created_by == this.aws_user_name) || 
           (entry.sys_created_by == 'system')) {
            return true;
        }
        return false;
    },
    // receives a GlideRecord object from support_cases table
    // sets the associated incident state and assignee.
    setIncidentState: function(case_ref) {
        var incident = case_ref.incident.getRefRecord();
        incident.state = Number(this.StatusMap[case_ref.status]["IncidentState"]);
        if (this.StatusMap[case_ref.status]["IncidentAssignee"]) {
            if (this.StatusMap[case_ref.status]["IncidentAssignee"] == 'AWS') {
                incident.assigned_to = this.aws_user_name;
            } else {
                incident.assigned_to = "";
            }            
        }
        if (incident.state == this.StatusMap['resolved']["IncidentState"]) {
            incident.close_code = 'Resolved'; 
            incident.close_notes = 'Resolved remotely.';
            incident.resolved_by = this.aws_user_name;
        }
        var result = incident.update();
        return incident;
    },

    setIncidentPriority: function(case_ref) {
        var incident = case_ref.incident.getRefRecord();
        incident.impact = this.SeverityCodeMap[case_ref.severity_code]['impact'];
        incident.urgency = this.SeverityCodeMap[case_ref.severity_code]['urgency'];
        incident.update();
        return incident;
    },

    getCaseSeverity: function(priority) {
        for (var severity in this.SeverityCodeMap) {
            if (this.SeverityCodeMap[severity]["priority"] == priority) {return severity;}
        }
    },

    caseIsActive: function(aws_case_id) {
        var case_ref = new GlideRecord(gs.getCurrentScopeName()+'_support_cases');
        case_ref.addQuery('case_id','=', aws_case_id);
        case_ref.addQuery('status','!=', 'closed');
        case_ref.query();
        if (case_ref.hasNext()) {
            return true;
        } else {
            return false;
        }
        return undefined;
    },
    // receives an aws case reference record for a re-opened case for a closed incident.
    // returns A digest of previous case communications with a reference to previous incidents.
    generateCommDigest: function(aws_case) {
        var previous_incidents = [];
        var closed_cases = new GlideRecord(gs.getCurrentScopeName()+'_support_cases');
        closed_cases.addQuery('status', 'closed');
        closed_cases.query();
        while (closed_cases.hasNext()) {
            closed_cases.next();
            var incident = closed_cases.incident.getRefRecord();
            previous_incidents.push(incident.number);
        }
        var digest = '\n\nThis Case has been re-opened externally';
        if (previous_incidents.length > 0) {
            digest += '\nIt was previsouly hadled by case/s '+ previous_incidents.join(' ');
        }
        
        var params = {
            caseId: String(aws_case.case_id)
        };
        var comms = this.AwsSupportApi.describeCommunications(params).slice(0).reverse();
        if (comms.length > 0) {
            digest += '\n\n###### Previous Communications digest ######';
            for (var c in comms) {
                digest += '\n---------------------------------------------';
                digest += '---------------------------------------------\n';
                digest += 'Submitted by ' + comms[c]["submittedBy"];
                digest += ' at ' + comms[c]["timeCreated"];
                digest += '\n' + comms[c]["body"];
            }
            return digest;
        }
    },
    getFirstCaseCommunication: function(aws_case_json) {
        var comms = [];
        var params = {
            "caseId": aws_case_json.caseId, 
            "beforeTime": aws_case_json.timeCreated
        };
        comms = this.AwsSupportApi.describeCommunications(params);
        return comms.reverse()[0].body;
    },
    // receives a Support case JSON from the AWS API
    // Creates the case reference record and the associated Incident.
    createIncidentRecord: function(aws_case_json) {
        var case_ref = new GlideRecord(gs.getCurrentScopeName()+'_support_cases');
        case_ref.initialize();
        case_ref.case_id = aws_case_json.caseId;
        case_ref.aws_account = this.aws_account.sys_id;
        case_ref.status = aws_case_json.status;
        case_ref.severity_code = aws_case_json.severityCode;
        case_ref.insert();
        
        var incident = new GlideRecord('incident');
        incident.initialize(); 
        incident.short_description = aws_case_json.subject;
        incident.description = this.getFirstCaseCommunication(aws_case_json);
        if (aws_case_json.status == 'reopened') {
            incident.description += this.generateCommDigest(case_ref);
        }
        incident.caller_id = this.aws_user.sys_id;
        incident.assignment_group = this.aws_account.assignment_group;
        incident[gs.getCurrentScopeName()+"_service_category"] = aws_case_json.categoryCode;
        incident[gs.getCurrentScopeName()+"_service_code"] = aws_case_json.serviceCode;
        incident.insert();
        
        case_ref.incident = incident.sys_id;
        case_ref.update();
        incident = this.setIncidentState(case_ref);
        incident = this.setIncidentPriority(case_ref);
        this.updateIncidentCase(case_ref);
        return incident;
    },
    // receives an aws case reference record
    // resolves the Support case associated
    closeAwsCase: function(aws_case) {
        // update AWS Incidents table
        var incident = aws_case.incident.getRefRecord();
        switch(Number(incident.state)) {
            case Number(this.StatusMap['resolved']['IncidentState']):
                aws_case.status = 'resolved';
                break;
            case Number(this.StatusMap['closed']['IncidentState']):
                aws_case.status = 'closed';
        }
        aws_case.update();
        var result = this.AwsSupportApi.resolveCase(aws_case.case_id);
        return result;
    },
    
    // returns a GlideRecord query of active AWS Support Case ids for the current account.
    getActiveCases: function() {
        var case_refs = new GlideRecord(gs.getCurrentScopeName()+'_support_cases');
        case_refs.addQuery('status','!=', 'closed');
        case_refs.addQuery('aws_account','=', this.aws_account.sys_id);
        case_refs.query();
        if (case_refs.hasNext()) {
            return case_refs;
        }
        return false;
    },

    updateCommunications: function(aws_case) {
        // get last remote update sync.
        last_comment_time = this.getLastCommentTimeByAwsUser(aws_case.incident);

        var params = {
            afterTime: last_comment_time,
            caseId: String(aws_case.case_id)
        };

        var comms = this.AwsSupportApi.describeCommunications(params).slice(0).reverse();
        //use this regexp to check the source of the comments the api provides.
        var snow_user = new RegExp(this.aws_account.iam_username);
        var incident = aws_case.incident.getRefRecord();
        if (incident.isNewRecord()) {return;}
        // update with a comment for each comment returned thats not created by user.
        
        for (var c = 0; c < comms.length; c++) {
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
        activity.addQuery('sys_created_by='+ this.aws_user_name +'^ORsys_created_by=system');
        activity.orderByDesc('sys_created_on');
        activity.setLimit(1);
        activity.query();
        if (activity.next()) {
            timestamp = activity.sys_created_on;
        } else {
            timestamp = new GlideDateTime();
            timestamp.setValue(0);
        }
        return this.formatTime(timestamp);
    },

    // this function returns the next interval
    // to schedule a case update poll.
    // uses a power of 1.05 over the previous interval
    // until the max interval of 24hrs.
    // to limit queries to the Support API.
    // 
    genNextSyncTime: function(miliseconds) {
        if (miliseconds < 30000) {
            return 30000;
        }
        var next = Math.pow(miliseconds, 1.05);
        if (next >= 86400000){
            return 86400000;
        }
        return next;
    },

    refIsOutdated: function(case_ref) {
        var last_sync = case_ref.last_sync ? new GlideDateTime(case_ref.last_sync) : new GlideDateTime("1970-01-01 00:00:00");
        var next_sync = case_ref.next_sync ? case_ref.next_sync : 30000;
        if (next_sync <= (new GlideDateTime().getNumericValue() - last_sync.getNumericValue())) {
            return true;
        }
        return false;
    },

    // this function updates a support case reference record
    // if the record is due to update, otherwise returns false.
    updateCaseReference: function(case_ref) {
        if (case_ref.status == "closed") {return;}
        if (this.refIsOutdated(case_ref)) {
            var aws_case = this.AwsSupportApi.describeCases({
                "caseIdList": [String(case_ref.case_id)],
                "includeResolvedCases": true,
                "includeCommunications": true
            })[0];
            var last_case_activity = new GlideDateTime(aws_case.recentCommunications.communications[0].timeCreated.replace("T", " ").replace("Z", ""));
            if (case_ref.last_sync < last_case_activity) {
                case_ref.status = aws_case.status;
                case_ref.last_sync = new GlideDateTime();
                case_ref.next_sync = 30000;
                case_ref.update();
                return true;
            }
            else {
                case_ref.last_sync = new GlideDateTime();
                case_ref.next_sync = this.genNextSyncTime(case_ref.next_sync);
                case_ref.update();
                return false;
            }
        }
        return false;
    },

    updateIncidentCase: function(case_ref) {
        var incident = case_ref.incident.getRefRecord();
        //if the incident is new, continue: prevents any race condition.
        if (incident.isNewRecord()) {return;}
        //if the incident is closed, continue, this should never get this far with a closed incident
        //but as extra protection in case it does.
        if (incident.incident_state == this.StatusMap['closed']['IncidentState']) {return;}
        this.setIncidentState(case_ref);
        this.updateCommunications(case_ref);
    },

    formatTime: function(time) {
        if (!time) {
            time = new GlideDateTime("1970-01-01 00:00:00");
        }
        return String(time).replace(" ", "T");
    },

    importNewCases: function() {
        var params = {
          includeCommunications: false,
          includeResolvedCases: false,
          afterTime: this.formatTime(this.aws_account.last_sync)
        };
        var aws_cases = this.AwsSupportApi.describeCases(params);
        this.aws_account.last_sync = new GlideDateTime();
        this.aws_account.update();
        for (var c in aws_cases) {
            if (this.caseIsActive(aws_cases[c]["caseId"])) {
                continue;
            } else {
                var incident = this.createIncidentRecord(aws_cases[c]);
            }
        }
    },

    getCaseForIncident: function(incident) {
        var aws_case = new GlideRecord(gs.getCurrentScopeName()+'_support_cases');
        aws_case.addQuery('incident','=', incident.sys_id);
        aws_case.addQuery('status','!=', 'closed');
        aws_case.query();
        if (aws_case.hasNext()) {
            return aws_case.next();
        } else {
            return undefined;
        }
    },

    createAwsCase: function(incident) {
        if ((incident[gs.getCurrentScopeName()+"_service_code"] == "") ||
            (incident[gs.getCurrentScopeName()+"_service_category"] == "")) {
            return;
        }
        var prefix = '';
        if (this.aws_account.production) {
            prefix = '['+ incident.number +'] ';
        } else {
            prefix = 'TEST CASE--Please ignore - ['+ incident.number +'] ';
        }

        commBody = incident.description + '\n';
        var comment = new GlideRecord('sys_journal_field');
        comment.addQuery('element_id','=', String(incident.sys_id));
        comment.addQuery('element','=', "comments");
        comment.orderBy('sys_created_on');
        comment.query();
        if (comment.hasNext()) {
            commBody += '\nThis case is being forwarded to AWS Support from an existing';
            commBody += '\nIncident record, see the digest below for a reference of previous communications.';
            commBody += '\nFeel free to request further details as needed.';
            commBody += '\n\n###### Previous Communications digest ######\n';
        }        
        while (comment.hasNext()) {
            comment.next();

            var signature = this.generateAuthor(comment);
            commBody += comment.value + '\n' + signature;
        }

        var params = {
            communicationBody: commBody,
            subject: String(prefix + incident.short_description),
            categoryCode: String(incident[gs.getCurrentScopeName()+"_service_category"]),
            serviceCode: String(incident[gs.getCurrentScopeName()+"_service_code"]),
            severityCode: this.getCaseSeverity(incident.priority)
        };
        
        var aws_case_id = this.AwsSupportApi.createCase(params);

        var new_aws_case = new GlideRecord(gs.getCurrentScopeName()+'_support_cases');
        new_aws_case.initialize();
        new_aws_case.case_id = aws_case_id;
        new_aws_case.aws_account = this.aws_account.sys_id;
        new_aws_case.incident = incident.sys_id;
        new_aws_case.insert();
        return new_aws_case;
    },
    
    type: 'AwsSupportUtils'
};