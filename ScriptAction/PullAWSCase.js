gs.include('AwsSupportUtils');
(function PullAwsCase(case_ref) {
    //gs.info('RUN PullAwsCase for ' + case_ref.case_id);
    var aws_account = case_ref.aws_account.getRefRecord();
    var utils = new AwsSupportUtils(aws_account);
    if (utils.updateCaseReference(case_ref)) {
        utils.updateIncidentCase(case_ref);
    }
})(current);
