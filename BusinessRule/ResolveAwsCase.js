gs.include('IncidentUtils');
(function executeRule(current, previous) {
    (function() {
        //gs.info("Closing AWS Support Case "+current.number+' status '+current.incident_state);
        var aws_case = new GlideRecord('x_195647_aws__support_cases');
        aws_case.addQuery('incident','=', current.sys_id);
        aws_case.query();
        if (utils.caseIsOpen(aws_case.case_id)) {
            var result = utils.closeAwsCase(aws_case)
        }
    })();
})(current, previous);
