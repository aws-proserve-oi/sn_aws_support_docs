// Triggers AWS Support Case poller to create new Incidents for each account.
(function CreateIncidents() {
    var aws_account = new GlideRecord('x_195647_aws__accounts');
    aws_account.addQuery('active', true);
    aws_account.query();
    while (aws_account.next()) {
        //gs.info("Polling New Incidents from account " + aws_account.name);
        gs.eventQueue("x_195647_aws_.PullAwsCases", aws_account);
    }
})();