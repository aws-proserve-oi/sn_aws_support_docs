//condition: current.element == 'comments'
//gs.info("RUN - PushIncidentComments "+current.value);
gs.include('SupportApi');
gs.include('JournalUtils');
(function executeRule(current, previous) {
    (function() {
        var utils = new JournalUtils();
        var aws_incident = new GlideRecord('x_195647_aws__support_cases');
        aws_incident.addQuery('incident','=', current.element_id);
        aws_incident.query();
        if (aws_incident.next() && aws_incident.aws_account.active) {
            if (!utils.created_by_aws(current)) {
                var incident = aws_incident.incident.getRefRecord();
                var aws_account = aws_incident.aws_account.getRefRecord();
                var creds = {
                    accessKeyId: String(aws_account.aws_api_key),
                    secretAccessKey: aws_account.aws_secret_key.getDecryptedValue()
                };
                var params = {
                    caseId: String(aws_incident.case_id),
                    communicationBody: String(current.value)
                };
                AMSApi = new SupportApi(creds);
                var result = AMSApi.addCaseCommunications(params);
            }
        }
    })();
})(current, previous);