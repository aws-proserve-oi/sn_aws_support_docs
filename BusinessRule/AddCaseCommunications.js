//condition: current.element == 'comments'
//gs.info("RUN - AddCaseCommunications "+current.value);
gs.include('AwsSupportUtils');
(function(current, previous) {
    var aws_case = new GlideRecord('x_195647_aws__support_cases');
    aws_case.addQuery('incident','=', current.element_id);
    aws_case.query();
    if (aws_case.next() && aws_case.aws_account.active) {
        var aws_account = aws_case.aws_account.getRefRecord();
        var utils = new AwsSupportUtils(aws_account);
        if (!utils.createdByAws(current)) {
            var incident = aws_case.incident.getRefRecord();
            // re-open resolved cases if a comment is added.
            if (incident.state == this.AwsSupportUtils.StatusMap['resolved']['IncidentState'] ) {
                incident.state = this.AwsSupportUtils.StatusMap['opened']['IncidentState'];
                incident.update();
            }
            utils.addCaseCommunication(current, aws_case);
        }
    }
})(current, previous);