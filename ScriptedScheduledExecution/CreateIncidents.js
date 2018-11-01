// Triggers AWS Support Case poller to create new Incidents for each account.
gs.include('AMSIncidentAPI');
(function CreateIncidents() {
    var aws_account = new GlideRecord('x_195647_aws__accounts');
    aws_account.addQuery();
    aws_account.query();
    while (aws_account.next()) {
        if (aws_account.active) {
            gs.info("Polling New Incidents from account " + aws_account.name);
            gs.eventQueue("x_195647_aws_.PullAwsCases", aws_account);
        }
    }
})();