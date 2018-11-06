//gs.info(
//    "Run CreateAwsCase BR - Incident Number: "+ current.number + "\n" +
//    "ServiceCode: "+ current.x_195647_aws_service_code +
//    " Category: " + current.x_195647_aws__service_category 
//);
gs.include('AwsSupportUtils');
(function executeRule(current, previous) {
    var group = current.assignment_group.getRefRecord();
    var aws_account = new GlideRecord('x_195647_aws__accounts');
    aws_account.addQuery('assignment_group','=', group.sys_id);
    aws_account.query();
    if (aws_account.next() && aws_account.active) {
        var utils = new AwsSupportUtils(aws_account);
        if (utils.getCaseForIncident(current)) {return;}
        var new_aws_case = utils.createAwsCase(current);
        /*gs.info(
            " New AWS Support case Id: "+ new_aws_support_case.case_id +
            " For Incident: " + current.number
        );*/
    }
})(current, previous);
