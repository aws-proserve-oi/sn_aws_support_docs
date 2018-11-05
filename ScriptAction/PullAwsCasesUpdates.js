gs.include('AwsSupportUtils');
(function PullAwsCasesUpdates(aws_account) {
    //gs.info('RUN PullAwsCasesUpdates for ' + aws_account.name);
    var utils = new AwsSupportUtils(aws_account);
    var aws_cases = utils.getActiveCasesForAccount(aws_account);
    for (var c in aws_cases) {
        var aws_case = utils.updateCaseReference(aws_cases[c]);
        if (aws_case) {
            //gs.info('update case ' + aws_case.case_id + " case status " + aws_case.status);
            var incident = aws_case.incident.getRefRecord();
            //if the incident is new, continue: prevents race condition.
            if (incident.isNewRecord()) {continue;}
            //if the incident is closed, continue, this should never get this far with a closed incident
            //but as extra protection in case it does.
            if (incident.state == utils.StatusMap['closed']['IncidentState']) {continue;}
            utils.setIncidentState(aws_case);
            utils.updateCommunications(aws_case, aws_account);
        }
    }
})(current);
