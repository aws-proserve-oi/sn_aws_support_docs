gs.include('SupportApi');

function getLastCommentTimeByUser(incident_id, user_name) {
    var timestamp;
    var activity = new GlideRecord('sys_journal_field');
    activity.addQuery('element_id','=', String(incident_id));
    activity.addQuery('element','=', "comments");
    activity.addQuery('sys_created_by','=', user_name);
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
}
//take this function to a script include
function setIncidentState(incident, incident_case, aws_incident, aws_account) {
    switch(incident_case.status) {
        case 'unassigned':
            incident.state = 1;
            break;
        case 'work-in-progress':
            incident.state = 2;
            incident.assigned_to = aws_account.assignment_user;
            break;
        case 'pending-customer-action':
            incident.state = 2;
            incident.assigned_to = 'NULL';
            break;
        case 'customer-action-completed':
            incident.state = 2;
            incident.assigned_to = aws_account.assignment_user;
            break;
        case 'opened':
            incident.state = 2;
            incident.assigned_to = aws_account.assignment_user;
            break;
        case 'resolved':
            incident.state = 6;
            //hardocded as there is no resolution code advertised by AWS
            incident.close_code = 'Resolved'; 
            incident.close_notes = 'Resolved by AWS';
            incident.resolved_by = aws_account.assignment_user;
            incident.assigned_to = aws_account.assignment_user;
            break;
        case 'reopened':
            incident.state = 1;
            break;
    }
    aws_incident.status = incident_case.status;
    aws_incident.update();
    incident.update();
    return incident;
}

function getActiveCasesForAccount(aws_account) {
    var caseIdList = [];
    var aws_incident = new GlideRecord('x_195647_aws__support_cases');
    aws_incident.addQuery('status','!=', 'closed');
    aws_incident.addQuery('aws_account','=', aws_account.sys_id);
    // should optimize query
    aws_incident.query();
    while (aws_incident.next()) {
        if (aws_incident.case_id != '') {
            caseIdList.push(String(aws_incident.case_id));
        }
    }
    //gs.info("caseIdList"+caseIdList);

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
}

function updateCommunications(aws_incident, aws_account) {
    // get last remote update sync.
    last_comment_time = getLastCommentTimeByUser(aws_incident.incident, 'admin');

    var params = {
        afterTime: last_comment_time,
        caseId: String(aws_incident.case_id)
    };

    //gs.info("Get comments for " + aws_incident.case_id + " incident " + aws_incident.incident.number + " since " + last_comment_time);
    var AwsApi = new SupportApi({
        accessKeyId: String(aws_account.aws_api_key),
        secretAccessKey: aws_account.aws_secret_key.getDecryptedValue()
    });
    var comms = AwsApi.getCaseCommunications(params);
    //gs.info("GET Case comms from "+last_comment_time+' for '+aws_incident.case_id+' cases '+JSON.stringify(comms));
    //use this regexp to check the source of the comments the api provides.
    var snow_user = new RegExp(aws_account.iam_user_name);
    var incident = aws_incident.incident.getRefRecord();
    if (incident.isNewRecord()) {return;}
    // update with a comment for each comment returned thats not created by user.
    for (var c = 0; c < comms.length; c++) {
        var comm = comms[c];
        if (comm.submittedBy.match(snow_user)) { return; }
        if (comm.attachmentSet.length > 0) {
            for (var a = 0; a < comm.attachmentSet.length; a++) {
                params = {
                    attachmentId: String(comm.attachmentSet[a].attachmentId)
                };
                attachment = AwsApi.describeAttachment(params).attachment;
                var sa = new GlideSysAttachment();
                sa.writeBase64( incident, String(attachment.fileName), 'text/plain', String(attachment.data));
            }
        }
        incident.autoSysFields(false);
        incident.comments = comm.body;
        incident.sys_updated_on = comm.timeCreated.substring(0,(comm.timeCreated.length-5)).replace("T", " ");
        incident.sys_updated_by = aws_account.assignment_user.user_name;
        incident.update();
        return incident;
    }
}

function createNewIncidentRecord(aws_incident, aws_case, aws_account) {
    // create the relation case first to ugly-prevent it ever getting dupplicated.
    var new_incident = new GlideRecord('incident');
    new_incident.initialize(); 
    new_incident.short_description = aws_case.subject;
    new_incident.description = aws_case.recentCommunications.communications[0].body;
    new_incident.caller_id = aws_account.assignment_user;
    new_incident.insert();
    
    aws_incident.incident = new_incident.sys_id;
    aws_incident.update();
    
    new_incident.update();
    return new_incident;
}

(function() {
    var aws_account = new GlideRecord('x_195647_aws__accounts');
    aws_account.addQuery();
    aws_account.query();
    while (aws_account.next()) {
        if (aws_account.active) {
            gs.info("UPDATE from account: " + aws_account.name);
            var aws_cases = getActiveCasesForAccount(aws_account);
            if (!aws_cases) {continue;}
            for (var i = 0; i < aws_cases.length; i++) {
                var aws_case = aws_cases[i];
                var aws_incident = new GlideRecord('x_195647_aws__support_cases');
                aws_incident.addQuery('case_id','=', aws_case.caseId);
                aws_incident.query();
                while (aws_incident.next()) {
                    var incident = aws_incident.incident.getRefRecord();
                    if (incident.state > 6) {continue;}
                    //if the incident is new, create it: prevents race condition
                    if (incident.isNewRecord()) {
                        incident = createNewIncidentRecord(aws_incident, aws_case, aws_account);
                    }
                    // if the assignment group of the incident is not AMS do not synchronize.
                    if (incident.assignment_group == aws_account.assignment_group) {
                        setIncidentState(incident, aws_case, aws_incident, aws_account);
                        updateCommunications(aws_incident, aws_account);
                    }
                }
            }

        }
    }
})();