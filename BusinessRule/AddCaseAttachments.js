//condition: (current.created_by != "system") && (current.table_name == "incident")
gs.include('AwsSupportApi');
(function executeRule(current, previous) {
    var aws_case = new GlideRecord('x_195647_aws__support_cases');
    aws_case.addQuery('incident','=', current.table_sys_id);
    aws_case.query();
    if (aws_case.hasNext()) {
        aws_case.next();
        var aws_account = aws_case.aws_account.getRefRecord();
        var utils = new AwsSupportUtils(aws_account);
        utils.addCaseAttachments(current, aws_case);
    }
})(current, previous);
