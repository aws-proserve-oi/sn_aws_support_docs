gs.include('AwsSupportUtils');
(function PullAwsCasesUpdates(aws_account) {
    //gs.info('RUN PullAwsCasesUpdates for ' + aws_account.name);
    var utils = new AwsSupportUtils(aws_account);
    var case_ref = utils.getActiveCases();
    while (case_ref && case_ref.next()) {
        gs.eventQueue("x_195647_aws_.PullAwsCase", case_ref);
    }
})(current);
