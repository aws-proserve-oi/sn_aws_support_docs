gs.include('AwsSupportUtils');
(function PullAwsCasesUpdates(aws_account) {
    //gs.info('RUN PullAwsCasesUpdates for ' + aws_account.name);
    var utils = new AwsSupportUtils(aws_account);
    var aws_cases = utils.getActiveCasesForAccount(aws_account);
    for (var c in aws_cases) {
        var aws_case = utils.updateAwsCaseReference(aws_cases[c]);
        if (aws_case) {
            //gs.info('update case ' + aws_case.case_id + " case status " + aws_case.status);
            var incident = aws_case.incident.getRefRecord();
            //if the incident is closed, continue.
            if (incident.state > 6) {continue;}
            //if the incident is new, continue: prevents race condition.
            if (incident.isNewRecord()) {continue;}
            // if the assignment group of the incident is not AMS do not synchronize.
            utils.setIncidentState(aws_case);
            utils.updateCommunications(aws_case, aws_account);
        }
    }
})(current);
