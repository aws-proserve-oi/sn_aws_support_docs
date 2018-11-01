gs.include('IncidentUtils');
(function PollAwsCases(aws_account) {
    var utils = new IncidentUtils();
    gs.info("Running PollAwsCases for account " + aws_account.name);
    var params = {
      includeCommunications: true,
      includeResolvedCases: false
    };
    var creds = {
        accessKeyId: String(aws_account.aws_api_key),
        secretAccessKey: aws_account.aws_secret_key.getDecryptedValue()
    };
    AWSApi = new SupportApi(creds);
    var aws_cases = AWSApi.listCases(params);

    for (var c in aws_cases) {
        if (utils.caseIsOpen(aws_cases[c])) {
            continue;
        } else {
            var incident = utils.createIncidentRecord(aws_cases[c],aws_account);
            //gs.info("New Incident: "+incident.number+" from case "+ams_incident.case_id);
        }
    }
})(current);