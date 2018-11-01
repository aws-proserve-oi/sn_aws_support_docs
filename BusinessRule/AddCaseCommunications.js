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
            if (!utils.createdByAws(current)) {
                var incident = aws_incident.incident.getRefRecord();
                var aws_account = aws_incident.aws_account.getRefRecord();
                var creds = {
                    accessKeyId: String(aws_account.aws_api_key),
                    secretAccessKey: aws_account.aws_secret_key.getDecryptedValue()
                };
                var user = new GlideRecord('sys_user');
                user.addQuery('user_name', current.sys_created_by);
                user.query();
                if (user.hasNext()) {
                    user.next();
                    var communicationBody = current.value + '\n\n' +
                                            'Submitted by ' +  user.first_name + " " +
                                            user.last_name +
                                            " <" + user.email + ">";
                    var params = {
                        caseId: String(aws_incident.case_id),
                        communicationBody: communicationBody
                    };
                    AMSApi = new SupportApi(creds);
                    var result = AMSApi.addCaseCommunications(params);
                }
            }
        }
    })();
})(current, previous);