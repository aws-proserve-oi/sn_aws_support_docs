gs.include('SupportApi');

function closeAwsCase(caseId, aws_account) {
    var creds = {
        accessKeyId: String(aws_account.aws_api_key),
        secretAccessKey: aws_account.aws_secret_key.getDecryptedValue()
    };

    AWSApi = new SupportApi(creds);
    var result = AWSApi.resolveCase(caseId);

    // update AWS Incidents table
    var aws_incident = new GlideRecord('x_195647_aws__support_cases');
    aws_incident.addQuery('case_id','=', caseId);
    aws_incident.query();
    if (aws_incident.next()) {
        aws_incident.status = 'resolved';
        aws_incident.update();
    }
    return result;
}


(function executeRule(current, previous) {
    (function() {
        gs.info("Closing AWS Support Case "+current.number+' status '+current.incident_state);
        var aws_incident = new GlideRecord('x_195647_aws__support_cases');
        aws_incident.addQuery('incident','=', current.sys_id);
        aws_incident.query();
        if (aws_incident.next()) {
            var aws_account = aws_incident.aws_account.getRefRecord();
            if (aws_account.active) {
                if (current.incident_state > 5) {
                    var result = closeAwsCase(aws_incident.case_id, aws_account);
                }
            }
        }
    })();
})(current, previous);