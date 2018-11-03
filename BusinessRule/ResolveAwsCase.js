gs.include('AwsSupportUtils');
(function executeRule(current, previous) {
    //gs.info("Closing AWS Support Case "+current.number+' status '+current.incident_state);
    var aws_case = new GlideRecord('x_195647_aws__support_cases');
    aws_case.addQuery('incident','=', current.sys_id);
    aws_case.query();
    
    var utils = new AwsSupportUtils(aws_case.aws_account.getRefRecord());
    var resolved = [];
    for (var state in ['resolved', 'closed']) {
      resolved.push([utils.StatusMap[state]['IncidentState']]);      
    }
    if (resolved.indexOf(current.incident_state) > -1) {
        utils.closeAwsCase(aws_case);
    }
})(current, previous);
