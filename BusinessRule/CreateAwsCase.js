gs.include('SupportApi');

function mapSeverity(priority) {
    var severityCode;
    switch(priority) {
        case 5:
            severityCode = 'low';
            break;
        case 4:
            severityCode = 'normal';
            break;
        case 3:
            severityCode = 'high';
            break;
        case 2:
            severityCode = 'urgent';
            break;
        case 1:
            severityCode = 'critical';
            break;
        default:
            severityCode = 'low';
    }
    return severityCode;
}

function createAwsCase(incident, aws_account) {
    var creds = {
        accessKeyId: String(aws_account.aws_api_key),
        secretAccessKey: aws_account.aws_secret_key.getDecryptedValue()
    };
    var params = {
      communicationBody: 'Integration Test Case - Please Ignore - ' + incident.description,
      subject: 'Integration Test Case - Please Ignore - ' + '['+ incident.number +'] ' + incident.short_description,
      categoryCode: String(incident.x_195647_aws__service_category),
      serviceCode: String(incident.x_195647_aws__service_code)
    };
    
    params.severityCode = mapSeverity(current.priority);

    AWSApi = new SupportApi(creds);
    var aws_case_id = AWSApi.describeServices();
    
    // insert in AWS Incidents table
    var new_aws_support_case = new GlideRecord('x_195647_aws__support_cases');
    new_aws_support_case.initialize();
    new_aws_support_case.case_id = aws_case_id;
    new_aws_support_case.aws_account = aws_account.sys_id;
    new_aws_support_case.incident = current.sys_id;
    new_aws_support_case.insert();
    return new_aws_support_case;
}

(function executeRule(current, previous) {
    (function() {
        gs.info("Creating new AWS Support Case "+current.number+' status '+current.incident_state);
        var aws_account;
        var aws_support_case = new GlideRecord('x_195647_aws__support_cases');
        aws_support_case.addQuery('incident','=', current.sys_id);
        aws_support_case.query();
        if (aws_support_case.next()) {return;}
        if (current.assignment_group != '') {
            aws_account = new GlideRecord('x_195647_aws__accounts');
            aws_account.addQuery('assignment_group','=', current.assignment_group.sys_id);
            aws_account.query();
            if (aws_account.next() && aws_account.active) {
                var new_aws_support_case = createAwsCase(current, aws_account);
                gs.info("Created new AWS Support case, Id: "+ new_aws_support_case.case_id );
            }
        }
    })();
})(current, previous);