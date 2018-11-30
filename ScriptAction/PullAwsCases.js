gs.include('AwsSupportUtils');
(function PollAwsCases(aws_account) {
    var utils = new AwsSupportUtils(aws_account);
    utils.importNewCases();    
})(current);
