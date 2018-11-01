//triggers update of open cases for all accounts.
(function() {
    var aws_account = new GlideRecord('x_195647_aws__accounts');
    aws_account.addQuery('active', true);
    aws_account.query();
    while (aws_account.next()) {
        gs.info("Updating Incidents from account " + aws_account.name);
        gs.eventQueue("x_195647_aws_.PullAwsCasesUpdates", aws_account);
    }
})();