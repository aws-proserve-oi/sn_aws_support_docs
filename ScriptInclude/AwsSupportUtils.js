// Helper functions to interact with AWS Cases and Incident records.
gs.include('AwsSupportApi');
gs.include('global.AwsSupportUtils');
var AwsSupportUtils = Class.create();
AwsSupportUtils.prototype = {
    initialize: function(aws_account){
        this.AwsSupportUtils = new global.AwsSupportUtils();
        this.AwsSupportApi = new AwsSupportApi({
            accessKeyId: String(aws_account.aws_api_key),
            secretAccessKey: aws_account.aws_secret_key.getDecryptedValue()
        });
        this.aws_account = aws_account;
        this.aws_user_name = gs.getProperty("x_195647_aws_.Config.AWS.username");
        var user_record = new GlideRecord('sys_user');
        user_record.addQuery('user_name', this.aws_user_name);
        user_record.query();
        if (!user_record.hasNext()) { throw "AWS Support user account is not setup. Configure one account with auto_setup enabled.";}
        user_record.next();
        this.aws_user = user_record;
        this.StatusMap = JSON.parse(gs.getProperty("x_195647_aws_.Config.StatusMap"));
        this.SeverityCodeMap = JSON.parse(gs.getProperty("x_195647_aws_.Config.SeverityCodeMap"));
    },
    // receives an incident and a comment JSON from a Support Case,
    // Writes an authored comment in the incident journal.
    addAuthoredComment: function(incident, comm) {
      if (comm.attachmentSet.length > 0) {
        this.addAttachments(incident, comm);
      }
      this.AwsSupportUtils.setJournalEntry(incident, comm.body, comm.submittedBy);
    },
    // writes an attachment for an incident.
    // receives an incident glide record and an AWS case attachment set.
    addAttachments: function(incident, attachmentSet) {
      for (var a = 0; a < attachmentSet.length; a++) {
          params = {
              attachmentId: String(attachmentSet[a].attachmentId)
          };
          var attachment = this.AwsSupportApi.describeAttachment(params).attachment;
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
        var author = user.first_name + " "  +
                     user.last_name  + " <" + 
                     user.email      + ">";
        params = {
            caseId: String(aws_case.case_id),
            communicationBody: 'New attachment ' + attachment.file_name + ' added by ' + author,
            attachmentSetId: attachmentSetId
        };
        var result = this.AwsSupportApi.addCaseCommunications(params);
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
                         user.email      + ">";
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
        var result = this.AwsSupportApi.addCaseCommunications(params);
    },
    // receives an instance of sys_journal_field 
    // returns true if the entry was added by AWS.
    createdByAws: function(entry) {
      if (entry.sys_created_by == this.aws_user_name) {
        return true;
      }
      return false;
    },
    // receives a GlideRecord object from support_cases table
    // sets the associated incident state and assignee.
    setIncidentState: function(aws_case) {
        var incident = aws_case.incident.getRefRecord();
        incident.incident_state = this.StatusMap[aws_case.status]["IncidentState"];
        if (this.StatusMap[aws_case.status]["IncidentAssignee"]) {
            if (this.StatusMap[aws_case.status]["IncidentAssignee"] == 'AWS') {
                incident.assigned_to = this.aws_user_name;
            } else {
                incident.assigned_to = this.StatusMap[aws_case.status]["IncidentAssignee"];
            }            
        }
        if (this.StatusMap[aws_case.status]["IncidentState"] == this.StatusMap['resolved']["IncidentState"]) {
            incident.close_code = 'Resolved'; 
            incident.close_notes = 'Resolved remotely.';
            incident.resolved_by = this.aws_user_name;
        }
        incident.update();
        return incident;
    },

    setIncidentPriority: function(aws_case) {
        var incident = aws_case.incident.getRefRecord();
        incident.impact = this.SeverityCodeMap[aws_case.severity_code]['impact'];
        incident.urgency = this.SeverityCodeMap[aws_case.severity_code]['urgency'];
        incident.update();
        return incident;
    },

    getCaseSeverity: function(priority) {
        for (var severity in this.SeverityCodeMap) {
            if (this.SeverityCodeMap[severity]["priority"] == priority) {return severity;}
        }
    },

    caseIsActive: function(aws_case_id) {
        var case_record = new GlideRecord('x_195647_aws__support_cases');
        case_record.addQuery('case_id','=', aws_case_id);
        case_record.addQuery('status','!=', 'closed');
        case_record.query();
        if (case_record.hasNext()) {
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
        var closed_cases = new GlideRecord('x_195647_aws__support_cases');
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
        //gs.info("Get comments for " + aws_case.case_id + " incident " + aws_case.incident.number + " since " + last_comment_time);
        var comms = this.AwsSupportApi.getCaseCommunications(params).slice(0).reverse();
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
    // receives a Support case JSON from the AWS API
    // Creates the case reference record and the associated Incident.
    createIncidentRecord: function(aws_case_json) {
        var new_case = new GlideRecord('x_195647_aws__support_cases');
        new_case.initialize();
        new_case.case_id = aws_case_json.caseId;
        new_case.aws_account = this.aws_account.sys_id;
        new_case.status = aws_case_json.status;
        new_case.severity_code = aws_case_json.severityCode;
        new_case.insert();
        gs.info('inserted case reference recrod: ' + new_case.case_id);
        
        var new_incident = new GlideRecord('incident');
        new_incident.initialize(); 
        new_incident.short_description = aws_case_json.subject;
        new_incident.description = aws_case_json.recentCommunications.communications[0].body;
        if (aws_case_json.status == 'reopened') {
            new_incident.description += this.generateCommDigest(new_case);
        }
        new_incident.caller_id = this.aws_user.sys_id;
        new_incident.assignment_group = this.aws_account.assignment_group;
        new_incident.x_195647_aws__service_category = aws_case_json.categoryCode;
        new_incident.x_195647_aws__service_code = aws_case_json.serviceCode;
        new_incident.insert();
        gs.info('inserted incident recrod: ' + new_incident.number +" " + new_incident.caller_id);
        
        new_case.incident = new_incident.sys_id;
        new_case.update();
        new_incident = this.setIncidentState(new_case);
        new_incident = this.setIncidentPriority(new_case);
        return new_incident;
    },
    // receives an aws case reference record
    // resolves the Support case associated
    closeAwsCase: function(aws_case) {
        // update AWS Incidents table
        var incident = aws_case.incident.getRefRecord();
        switch(incident.incident_state) {
            case this.StatusMap['resolved']['IncidentState']:
                aws_case.status = 'resolved';
                break;
            case this.StatusMap['closed']['IncidentState']:
                aws_case.status = 'closed';
        }
        aws_case.update();
        var result = this.AwsSupportApi.resolveCase(caseId);
        return result;
    },
    // returns a list of active AWS Support Case ids for the current account.
    getActiveCasesForAccount: function() {
        var caseIdList = [];
        var aws_case = new GlideRecord('x_195647_aws__support_cases');
        aws_case.addQuery('status','!=', 'closed');
        aws_case.addQuery('aws_account','=', this.aws_account.sys_id);
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
            return this.AwsSupportApi.listCases(params);
        } 
        return [];
    },

    updateCommunications: function(aws_case) {
        // get last remote update sync.
        last_comment_time = this.getLastCommentTimeByAwsUser(aws_case.incident);

        var params = {
            afterTime: last_comment_time,
            caseId: String(aws_case.case_id)
        };

        //gs.info("Get comments for " + aws_case.case_id + " incident " + aws_case.incident.number + " since " + last_comment_time);
        var comms = this.AwsSupportApi.getCaseCommunications(params).slice(0).reverse();
        //use this regexp to check the source of the comments the api provides.
        var snow_user = new RegExp(this.aws_account.iam_username);
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

    updateCaseReference: function(aws_case_json) {
        var aws_case = new GlideRecord('x_195647_aws__support_cases');
        aws_case.addQuery('case_id', aws_case_json.caseId);
        aws_case.addQuery('status','!=', 'closed');
        aws_case.query();
        if (aws_case.hasNext()) {
            aws_case.next();
            if (aws_case.status != aws_case_json.status) {
                gs.info('estamos locos');
                aws_case.status = aws_case_json.status;
                aws_case.update();
            }
            return aws_case;
        } else {
          return undefined;
        }
    },

    getCaseForIncident: function(incident) {
        var aws_case = new GlideRecord('x_195647_aws__support_cases');
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
        if ((incident.x_195647_aws_service_code == "") ||
            (incident.x_195647_aws__service_category == "")) {
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
            categoryCode: String(incident.x_195647_aws__service_category),
            serviceCode: String(incident.x_195647_aws__service_code),
            severityCode: this.getCaseSeverity(incident.priority)
        };
        
        var aws_case_id = this.AwsSupportApi.createCase(params);

        var new_aws_case = new GlideRecord('x_195647_aws__support_cases');
        new_aws_case.initialize();
        new_aws_case.case_id = aws_case_id;
        new_aws_case.aws_account = this.aws_account.sys_id;
        new_aws_case.incident = incident.sys_id;
        new_aws_case.insert();
        return new_aws_case;
    },
    
    type: 'AwsSupportUtils'
};